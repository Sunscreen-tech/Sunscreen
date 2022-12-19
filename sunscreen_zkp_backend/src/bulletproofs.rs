use std::ops::{Add, Deref, Mul, Neg, Sub};

use bulletproofs::{
    r1cs::{ConstraintSystem, LinearCombination, Prover, R1CSError, R1CSProof, Verifier},
    BulletproofGens, PedersenGens,
};
use crypto_bigint::{Limb, UInt};
use curve25519_dalek::scalar::Scalar;
use merlin::Transcript;
use petgraph::stable_graph::NodeIndex;
use serde::{Deserialize, Serialize};
use sunscreen_compiler_common::{forward_traverse, GraphQuery};

use crate::{
    exec::Operation, jit::jit_verifier, jit_prover, BackendField, BigInt, Error,
    ExecutableZkpProgram, Proof, Result, ZkpBackend,
};

#[derive(Clone)]
enum Node {
    LinearCombination(LinearCombination),
    Scalar(Scalar),
}

impl From<Scalar> for Node {
    fn from(x: Scalar) -> Self {
        Self::Scalar(x)
    }
}

impl From<LinearCombination> for Node {
    fn from(x: LinearCombination) -> Self {
        Self::LinearCombination(x)
    }
}

impl Add<Node> for Node {
    type Output = Self;

    fn add(self, rhs: Node) -> Self::Output {
        use Node::*;

        match (self, rhs) {
            (LinearCombination(x), LinearCombination(y)) => Node::LinearCombination(x + y),
            (LinearCombination(x), Scalar(y)) => Node::LinearCombination(x + y),
            (Scalar(x), LinearCombination(y)) => Node::LinearCombination(y + x),
            (Scalar(x), Scalar(y)) => Node::Scalar(x + y),
        }
    }
}

impl Mul<Node> for Node {
    type Output = Self;

    fn mul(self, rhs: Node) -> Self::Output {
        use Node::*;

        match (self, rhs) {
            (LinearCombination(_), LinearCombination(_)) => panic!("Illegal operation."),
            (LinearCombination(x), Scalar(y)) => (x * y).into(),
            (Scalar(x), LinearCombination(y)) => (y * x).into(),
            (Scalar(x), Scalar(y)) => (x * y).into(),
        }
    }
}

impl Sub<Node> for Node {
    type Output = Node;

    fn sub(self, rhs: Node) -> Self::Output {
        use Node::*;

        match (self, rhs) {
            (LinearCombination(x), LinearCombination(y)) => (x - y).into(),
            (LinearCombination(x), Scalar(y)) => (x - y).into(),
            (Scalar(x), LinearCombination(y)) => (-y + x).into(),
            (Scalar(x), Scalar(y)) => (x - y).into(),
        }
    }
}

impl Neg for Node {
    type Output = Node;

    fn neg(self) -> Self::Output {
        use Node::*;

        match self {
            LinearCombination(x) => (-x).into(),
            Scalar(x) => (-x).into(),
        }
    }
}

/**
 * A Bulletproofs R1CS circuit.
 */
pub struct BulletproofsCircuit {
    nodes: Vec<Option<Node>>,
}

#[derive(Clone, Serialize, Deserialize)]
/**
 * A verifiable proof in the Bulletproofs R1CS system.
 */
pub struct BulletproofsR1CSProof(R1CSProof);

impl BulletproofsCircuit {
    /**
     * Create a [`BulletproofsCircuit`].
     */
    pub fn new(circuit_size: usize) -> Self {
        Self {
            nodes: vec![None; circuit_size],
        }
    }

    fn make_transcript(len: usize) -> Transcript {
        let mut transcript = Transcript::new(b"R1CS");
        transcript.append_message(b"dom-sep", b"R1CS proof");
        transcript.append_u64(b"gen-len", len as u64);

        transcript
    }

    fn make_gens(len: usize) -> (PedersenGens, BulletproofGens) {
        let pc_gens = PedersenGens::default();
        let bp_gens = BulletproofGens::new(len, 1);

        (pc_gens, bp_gens)
    }

    /**
     * # Notes
     * `graph` is declared as mutable, but the value won't actually be
     * mutated. This is due to [`forward_traverse`] requiring such.
     */
    fn gen_circuit<CS, I>(
        &mut self,
        graph: &ExecutableZkpProgram,
        cs: &mut CS,
        get_input: I,
    ) -> Result<()>
    where
        CS: ConstraintSystem,
        I: Fn(usize) -> Option<Scalar>,
    {
        // The graph won't actually be mutated.
        forward_traverse(&graph.0, |query, idx| {
            let node = query.get_node(idx).unwrap();

            let dependency_not_found_msg =
                |x: NodeIndex| format!("traversal error: dependency {} not found", x.index());

            match node.operation {
                Operation::Input(x) => {
                    let input = get_input(x);
                    let input: LinearCombination = cs.allocate(input)?.into();

                    self.nodes[idx.index()] = Some(input.into());
                }
                Operation::HiddenInput(x) => {
                    let x = match x {
                        Some(x) => Some(Scalar::try_from(x)?),
                        None => None,
                    };

                    let input: LinearCombination = cs.allocate(x)?.into();

                    self.nodes[idx.index()] = Some(input.into());
                }
                Operation::Add => {
                    let (left, right) = query.get_binary_operands(idx)?;

                    let left = self.nodes[left.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(left)))
                        .clone();

                    let right = self.nodes[right.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(right)))
                        .clone();

                    self.nodes[idx.index()] = Some(left + right);
                }
                Operation::Sub => {
                    let (left, right) = query.get_binary_operands(idx)?;

                    let left = self.nodes[left.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(left)))
                        .clone();

                    let right = self.nodes[right.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(right)))
                        .clone();

                    self.nodes[idx.index()] = Some(left - right);
                }
                Operation::Neg => {
                    let left = query.get_unary_operand(idx)?;

                    let left = self.nodes[left.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(left)))
                        .clone();

                    self.nodes[idx.index()] = Some(-left);
                }
                Operation::Mul => {
                    let (left, right) = query.get_binary_operands(idx)?;

                    let left = self.nodes[left.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(left)))
                        .clone();

                    let right = self.nodes[right.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(right)))
                        .clone();

                    if let (Node::LinearCombination(x), Node::LinearCombination(y)) =
                        (&left, &right)
                    {
                        let (_, _, o) = cs.multiply(x.clone(), y.clone());
                        let o: LinearCombination = o.into();

                        self.nodes[idx.index()] = Some(o.into());
                    } else {
                        self.nodes[idx.index()] = Some(left * right);
                    }
                }
                Operation::Constraint(x) => {
                    let operands = query.get_unordered_operands(idx)?;

                    let x: Scalar = x.try_into()?;

                    for o in operands {
                        let o = self.nodes[o.index()]
                            .as_ref()
                            .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(o)))
                            .clone();

                        match o {
                            Node::LinearCombination(o) => {
                                cs.constrain(o - x);
                            }
                            Node::Scalar(o) => {
                                // Don't know why you would do this, but whatever.
                                if x != o {
                                    let err_string =
                                        format!("Constant {:#?} does not equal {:#?}", x, o);

                                    return Err(R1CSError::GadgetError {
                                        description: err_string,
                                    })?;
                                }
                            }
                        }
                    }
                }
                Operation::Constant(x) => {
                    let x: Scalar = x.try_into()?;

                    self.nodes[idx.index()] = Some(x.into());
                }
            }

            Ok::<(), Error>(())
        })?;

        Ok(())
    }
}

#[derive(Debug, Clone)]
/**
 * A Bulletproofs backend.
 */
pub struct BulletproofsBackend;

impl BulletproofsBackend {
    /**
     * Create a [`BulletproofsBackend`].
     */
    pub fn new() -> Self {
        Self
    }
}

impl Default for BulletproofsBackend {
    fn default() -> Self {
        Self::new()
    }
}

fn constraint_count(graph: &ExecutableZkpProgram) -> Result<usize> {
    let mut count = 0;

    let query = GraphQuery::new(graph);

    for i in graph.node_indices() {
        let node = &graph[i];

        match node.operation {
            Operation::Constant(_) => count += 1,
            Operation::Mul => {
                let (left, right) = query.get_binary_operands(i)?;

                // Constant operands don't contribute to constraints.
                match (&graph[left].operation, &graph[right].operation) {
                    (Operation::Constant(_), _) => {}
                    (_, Operation::Constant(_)) => {}
                    _ => count += 2,
                }
            }
            _ => {}
        }
    }

    Ok(count)
}

impl ZkpBackend for BulletproofsBackend {
    fn prove(&self, graph: &ExecutableZkpProgram, inputs: &[BigInt]) -> Result<Proof> {
        let expected_input_count = graph
            .node_weights()
            .filter(|x| matches!(x.operation, Operation::Input(_)))
            .count();

        if expected_input_count != inputs.len() {
            return Err(Error::inputs_mismatch(&format!(
                "Internal error: Bulletproofs runtime arguments mismatch. Expected {}, got {}.",
                expected_input_count,
                inputs.len()
            )));
        }

        let constraint_count = constraint_count(graph)?;

        // Convert the inputs to Scalars
        let inputs = inputs
            .iter()
            .map(|x| x.try_into())
            .collect::<Result<Vec<Scalar>>>()?;

        let transcript = BulletproofsCircuit::make_transcript(constraint_count);

        let (pedersen_gens, bulletproof_gens) =
            BulletproofsCircuit::make_gens(2 * constraint_count);

        let mut circuit = BulletproofsCircuit::new(graph.node_count());

        let mut prover = Prover::new(&pedersen_gens, transcript);

        circuit.gen_circuit(graph, &mut prover, |x| Some(inputs[x]))?;

        Ok(Proof::Bulletproofs(Box::new(BulletproofsR1CSProof(
            prover.prove(&bulletproof_gens)?,
        ))))
    }

    fn verify(&self, graph: &ExecutableZkpProgram, proof: &Proof) -> Result<()> {
        let proof = match proof {
            Proof::Bulletproofs(x) => x,
            _ => {
                return Err(Error::IncorrectProofType);
            }
        };

        let constraint_count = constraint_count(graph)?;

        let transcript = BulletproofsCircuit::make_transcript(constraint_count);
        let (pedersen_gens, bulletproof_gens) =
            BulletproofsCircuit::make_gens(2 * constraint_count);

        let mut circuit = BulletproofsCircuit::new(graph.node_count());

        let mut verifier = Verifier::new(transcript);

        circuit.gen_circuit(graph, &mut verifier, |_| None)?;

        Ok(verifier.verify(&proof.0, &pedersen_gens, &bulletproof_gens)?)
    }

    fn jit_prover(
        &self,
        prog: &crate::CompiledZkpProgram,
        constant_inputs: &[BigInt],
        public_inputs: &[BigInt],
        private_inputs: &[BigInt],
    ) -> Result<ExecutableZkpProgram> {
        let constant_inputs = constant_inputs
            .iter()
            .map(Scalar::try_from)
            .collect::<Result<Vec<Scalar>>>()?;
        let public_inputs = public_inputs
            .iter()
            .map(Scalar::try_from)
            .collect::<Result<Vec<Scalar>>>()?;
        let private_inputs = private_inputs
            .iter()
            .map(Scalar::try_from)
            .collect::<Result<Vec<Scalar>>>()?;

        jit_prover::<Scalar>(prog, &constant_inputs, &public_inputs, &private_inputs)
    }

    fn jit_verifier(
        &self,
        prog: &crate::CompiledZkpProgram,
        constant_inputs: &[BigInt],
        public_inputs: &[BigInt],
    ) -> Result<ExecutableZkpProgram> {
        let constant_inputs = constant_inputs
            .iter()
            .map(Scalar::try_from)
            .collect::<Result<Vec<Scalar>>>()?;

        let public_inputs = public_inputs
            .iter()
            .map(Scalar::try_from)
            .collect::<Result<Vec<Scalar>>>()?;

        jit_verifier(prog, &constant_inputs, &public_inputs)
    }
}

fn try_uint_to_scalar<const N: usize>(x: &UInt<N>) -> Result<Scalar> {
    let as_words = x.as_words();
    const LIMB_SIZE: usize = std::mem::size_of::<Limb>();
    const SCALAR_SIZE: usize = std::mem::size_of::<Scalar>();

    let num_scalar_words = SCALAR_SIZE / LIMB_SIZE;

    // UInt<N> values are little endian. Thus, we attempt to convert the
    // lower 256 bits to a scalar and assert the upper bytes are zero.
    let (lower, upper) = as_words.split_at(num_scalar_words);

    let mut scalar_data = [0u8; 32];

    for (i, val) in lower.iter().enumerate() {
        scalar_data[LIMB_SIZE * i..][..LIMB_SIZE].copy_from_slice(&val.to_le_bytes());
    }

    for i in upper {
        if *i != 0 {
            return Err(Error::out_of_range(&x.to_string()));
        }
    }

    let scalar = Scalar::from_canonical_bytes(scalar_data);

    scalar.ok_or_else(|| Error::out_of_range(&x.to_string()))
}

impl BackendField for Scalar {}

impl TryFrom<BigInt> for Scalar {
    type Error = Error;

    fn try_from(value: BigInt) -> Result<Self> {
        try_uint_to_scalar(value.deref())
    }
}

impl TryFrom<&BigInt> for Scalar {
    type Error = Error;

    fn try_from(value: &BigInt) -> Result<Self> {
        try_uint_to_scalar(value.deref())
    }
}

fn scalar_to_uint<const N: usize>(x: &Scalar) -> UInt<N> {
    assert!(std::mem::size_of::<UInt<N>>() >= std::mem::size_of::<Scalar>());

    let mut uint_data = x.as_bytes().to_vec();

    let remainder = std::mem::size_of::<UInt<N>>() - std::mem::size_of::<Scalar>();

    uint_data.extend((0..remainder).into_iter().map(|_| 0u8));

    UInt::from_le_slice(&uint_data)
}

impl crate::ZkpFrom<Scalar> for BigInt {
    fn from(val: Scalar) -> BigInt {
        BigInt(scalar_to_uint(&val))
    }
}

impl crate::ZkpFrom<&Scalar> for BigInt {
    fn from(val: &Scalar) -> BigInt {
        BigInt(scalar_to_uint(val))
    }
}

#[cfg(test)]
mod tests {
    use crypto_bigint::U512;
    use sunscreen_compiler_common::{EdgeInfo, NodeInfo};

    use super::*;
    use crate::exec::Operation as BackendOperation;

    #[test]
    fn can_convert_small_u512_to_scalar() {
        let a = BigInt::from_words([0x1234567890abcdef, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]);

        let scalar = Scalar::try_from(a).unwrap();

        assert_eq!(a, <BigInt as crate::ZkpFrom<Scalar>>::from(scalar));
    }

    #[test]
    fn big_u512_to_scalar_fails() {
        let a = BigInt::from_words([
            0x1234567890abcdef,
            0x0,
            0x0,
            0x8000000000000000,
            0x0,
            0x0,
            0x0,
            0x8000000000000000,
        ]);

        assert!(Scalar::try_from(&a).is_err());
    }

    #[test]
    fn medium_u512_to_scalar_fails() {
        let a = BigInt::from_words([
            0x1234567890abcdef,
            0x0,
            0x0,
            0x8000000000000000,
            0x0,
            0x0,
            0x0,
            0x0,
        ]);

        assert!(Scalar::try_from(&a).is_err());
    }

    #[test]
    fn barely_too_bit_u512_to_scalar_fails() {
        // 2^252+27742317777372353535851937790883648493,
        let l = BigInt::from_words([
            6346243789798364141,
            1503914060200516822,
            0x0,
            0x1000000000000000,
            0x0,
            0x0,
            0x0,
            0x0,
        ]);

        assert!(Scalar::try_from(&l).is_err());

        let l_min_1 = l.0.wrapping_sub(&U512::ONE);
        let scalar = try_uint_to_scalar(&l_min_1).unwrap();

        assert_eq!(
            BigInt(l_min_1),
            <BigInt as crate::ZkpFrom<Scalar>>::from(scalar)
        );
    }

    #[test]
    fn can_run_simple_proof() {
        let mut graph = ExecutableZkpProgram::new();

        let mut add_node = |op: BackendOperation, edges: &[(NodeIndex, EdgeInfo)]| {
            let n = graph.add_node(NodeInfo { operation: op });

            for (source, edge) in edges {
                graph.add_edge(*source, n, *edge);
            }

            n
        };

        let in_0 = add_node(BackendOperation::Input(0), &[]);
        let in_1 = add_node(BackendOperation::Input(1), &[]);
        let in_2 = add_node(BackendOperation::Input(2), &[]);

        let mul_1 = add_node(
            BackendOperation::Mul,
            &[(in_0, EdgeInfo::Left), (in_1, EdgeInfo::Right)],
        );
        let add_1 = add_node(
            BackendOperation::Add,
            &[(in_2, EdgeInfo::Left), (mul_1, EdgeInfo::Right)],
        );

        let _ = add_node(
            BackendOperation::Constraint(BigInt(U512::from_u32(42))),
            &[(add_1, EdgeInfo::Unordered)],
        );

        let backend = BulletproofsBackend::new();

        // 10 * 4 + 2 == 42
        let proof = backend
            .prove(
                &graph,
                &[
                    BigInt::from_u32(10),
                    BigInt::from_u32(4),
                    BigInt::from_u32(2),
                ],
            )
            .unwrap();

        backend.verify(&graph, &proof).unwrap();

        // 8 * 5 + 2 == 42
        let proof = backend
            .prove(
                &graph,
                &[
                    BigInt::from_u32(8),
                    BigInt::from_u32(5),
                    BigInt::from_u32(2),
                ],
            )
            .unwrap();

        backend.verify(&graph, &proof).unwrap();

        // 8 * 5 + 3 == 42.
        // Verification should fail.
        let proof = backend
            .prove(
                &graph,
                &[
                    BigInt(U512::from_u32(8)),
                    BigInt(U512::from_u32(5)),
                    BigInt(U512::from_u32(3)),
                ],
            )
            .unwrap();

        assert!(backend.verify(&graph, &proof).is_err());
    }
}
