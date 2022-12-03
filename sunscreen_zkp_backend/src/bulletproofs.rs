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
use sunscreen_compiler_common::forward_traverse;

use crate::{
    exec::Operation, jit, BackendField, BigInt, Error, ExecutableZkpProgram, Proof, Result,
    ZkpBackend,
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

pub struct BulletproofsCircuit {
    nodes: Vec<Option<Node>>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct BulletproofsR1CSProof(R1CSProof);

impl BulletproofsCircuit {
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
pub struct BulletproofsBackend;

impl BulletproofsBackend {
    pub fn new() -> Self {
        Self
    }
}

impl Default for BulletproofsBackend {
    fn default() -> Self {
        Self::new()
    }
}

impl ZkpBackend for BulletproofsBackend {
    fn prove(&self, graph: &ExecutableZkpProgram, inputs: &[BigInt]) -> Result<Proof> {
        let expected_input_count = graph
            .node_weights()
            .filter(|x| matches!(x.operation, Operation::Input(_)))
            .count();

        if expected_input_count != inputs.len() {
            return Err(Error::InputsMismatch);
        }

        let multiplier_count = graph
            .node_weights()
            .filter(|n| matches!(n.operation, Operation::Input(_) | Operation::Mul))
            .count();

        // Convert the inputs to Scalars
        let inputs = inputs
            .iter()
            .map(|x| x.try_into())
            .collect::<Result<Vec<Scalar>>>()?;

        let transcript = BulletproofsCircuit::make_transcript(multiplier_count);
        let (pedersen_gens, bulletproof_gens) = BulletproofsCircuit::make_gens(multiplier_count);

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

        let multiplier_count = graph
            .node_weights()
            .filter(|n| matches!(n.operation, Operation::Input(_) | Operation::Mul))
            .count();

        let transcript = BulletproofsCircuit::make_transcript(multiplier_count);
        let (pedersen_gens, bulletproof_gens) = BulletproofsCircuit::make_gens(multiplier_count);

        let mut circuit = BulletproofsCircuit::new(graph.node_count());

        let mut verifier = Verifier::new(transcript);

        circuit.gen_circuit(graph, &mut verifier, |_| None)?;

        Ok(verifier.verify(&proof.0, &pedersen_gens, &bulletproof_gens)?)
    }

    fn jit(&self, prog: &crate::CompiledZkpProgram) -> Result<ExecutableZkpProgram> {
        jit::<Scalar>(prog)
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

#[cfg(test)]
mod tests {
    use crypto_bigint::U512;
    use sunscreen_compiler_common::{EdgeInfo, NodeInfo};

    use super::*;
    use crate::exec::Operation as BackendOperation;

    fn scalar_to_u512(x: &Scalar) -> BigInt {
        let mut data = x.to_bytes().to_vec();

        data.extend([0u8; 32].iter());

        BigInt::from(U512::from_le_slice(&data))
    }

    #[test]
    fn can_convert_small_u512_to_scalar() {
        let a = BigInt::from_words([0x1234567890abcdef, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]);

        let scalar = Scalar::try_from(a).unwrap();

        assert_eq!(a, scalar_to_u512(&scalar));
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

        assert_eq!(BigInt::from(l_min_1), scalar_to_u512(&scalar));
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
            BackendOperation::Constraint(BigInt::from(U512::from_u32(42))),
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
                    BigInt::from(U512::from_u32(8)),
                    BigInt::from(U512::from_u32(5)),
                    BigInt::from(U512::from_u32(3)),
                ],
            )
            .unwrap();

        assert!(backend.verify(&graph, &proof).is_err());
    }
}
