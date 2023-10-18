use std::{
    ops::{Add, Deref, Mul, Neg, Sub},
    time::Instant,
};

use bulletproofs::{
    r1cs::{ConstraintSystem, LinearCombination, Metrics, Prover, R1CSError, R1CSProof, Verifier},
    BulletproofGens, PedersenGens,
};
use crypto_bigint::{Limb, Uint};
use curve25519_dalek::scalar::Scalar;
use log::trace;
use merlin::Transcript;
use petgraph::stable_graph::NodeIndex;
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use sunscreen_compiler_common::{forward_traverse, GraphQuery};

use crate::{
    exec::Operation, jit::jit_verifier, jit_prover, BigInt, CompiledZkpProgram, Error,
    ExecutableZkpProgram, FieldSpec, Proof, Result, ZkpBackend,
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
struct BulletproofsCircuit {
    nodes: Vec<Option<Node>>,
}

#[derive(Clone, Serialize, Deserialize)]
/**
 * A verifiable proof in the Bulletproofs R1CS system.
 */
pub struct BulletproofsR1CSProof(pub R1CSProof);

impl BulletproofsCircuit {
    /**
     * Create a [`BulletproofsCircuit`].
     */
    pub fn new(circuit_size: usize) -> Self {
        Self {
            nodes: vec![None; circuit_size],
        }
    }

    fn make_base_transcript() -> Transcript {
        let mut transcript = Transcript::new(b"R1CS");
        transcript.append_message(b"dom-sep", b"R1CS proof");

        transcript
    }

    fn make_gens(len: usize) -> (PedersenGens, BulletproofGens) {
        let len = len.next_power_of_two();

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
        let mut unprocessed_child_count = graph
            .node_indices()
            .map(|n| graph.neighbors(n).count())
            .collect::<Vec<usize>>();

        // The graph won't actually be mutated.
        forward_traverse(&graph.0, |query, idx| {
            let node = query.get_node(idx).unwrap();

            // Each linear combination object in Bulletproofs has a Vec
            // in it and thus ain't cheap to store. As such, we reference
            // count the output of a given node when all its children have
            // been processed.
            let ref_count = |nodes: &mut Vec<Option<Node>>,
                             idx: NodeIndex,
                             unprocessed_child_count: &mut Vec<usize>| {
                unprocessed_child_count[idx.index()] -= 1;

                if unprocessed_child_count[idx.index()] == 0 {
                    nodes[idx.index()] = None;
                }
            };

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
                    let (left_idx, right_idx) = query.get_binary_operands(idx)?;

                    let left = self.nodes[left_idx.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(left_idx)))
                        .clone();

                    let right = self.nodes[right_idx.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(right_idx)))
                        .clone();

                    self.nodes[idx.index()] = Some(left + right);

                    ref_count(&mut self.nodes, left_idx, &mut unprocessed_child_count);
                    ref_count(&mut self.nodes, right_idx, &mut unprocessed_child_count);
                }
                Operation::Sub => {
                    let (left_idx, right_idx) = query.get_binary_operands(idx)?;

                    let left = self.nodes[left_idx.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(left_idx)))
                        .clone();

                    let right = self.nodes[right_idx.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(right_idx)))
                        .clone();

                    self.nodes[idx.index()] = Some(left - right);

                    ref_count(&mut self.nodes, left_idx, &mut unprocessed_child_count);
                    ref_count(&mut self.nodes, right_idx, &mut unprocessed_child_count);
                }
                Operation::Neg => {
                    let left_idx = query.get_unary_operand(idx)?;

                    let left = self.nodes[left_idx.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(left_idx)))
                        .clone();

                    self.nodes[idx.index()] = Some(-left);

                    ref_count(&mut self.nodes, left_idx, &mut unprocessed_child_count);
                }
                Operation::Mul => {
                    let (left_idx, right_idx) = query.get_binary_operands(idx)?;

                    let left = self.nodes[left_idx.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(left_idx)))
                        .clone();

                    let right = self.nodes[right_idx.index()]
                        .as_ref()
                        .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(right_idx)))
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

                    ref_count(&mut self.nodes, left_idx, &mut unprocessed_child_count);
                    ref_count(&mut self.nodes, right_idx, &mut unprocessed_child_count);
                }
                Operation::Constraint(x) => {
                    let operands = query.get_unordered_operands(idx)?;

                    let x: Scalar = x.try_into()?;

                    for o_idx in operands {
                        let o = self.nodes[o_idx.index()]
                            .as_ref()
                            .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(o_idx)))
                            .clone();

                        match o {
                            Node::LinearCombination(o) => {
                                cs.constrain(o - x);
                            }
                            Node::Scalar(o) => {
                                // Don't know why you would do this, but whatever.
                                if x != o {
                                    let err_string =
                                        format!("Constant {x:?} does not equal {o:#?}");

                                    return Err(R1CSError::GadgetError {
                                        description: err_string,
                                    })?;
                                }
                            }
                        }

                        ref_count(&mut self.nodes, o_idx, &mut unprocessed_child_count);
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

#[derive(Debug, Clone, Copy)]
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

    /// Generate a prover from a given circuit. The purpose of this is to be
    /// able to extract information from the prover without actually running it.
    fn prover_with_circuit<'g>(
        &'g self,
        program: &CompiledZkpProgram,
        private_inputs: &[BigInt],
        public_inputs: &[BigInt],
        constant_inputs: &[BigInt],
        pc_gens: &'g PedersenGens,
        transcript: &'g mut Transcript,
    ) -> Result<Prover<'g, &mut Transcript>> {
        let prog = self.jit_prover(program, private_inputs, public_inputs, constant_inputs)?;

        let inputs = [public_inputs, private_inputs].concat();
        // Convert the inputs to Scalars
        let inputs = inputs
            .iter()
            .map(|x| x.try_into())
            .collect::<Result<Vec<Scalar>>>()
            .unwrap();

        let mut circuit = BulletproofsCircuit::new(prog.node_count());

        let mut prover = Prover::new(pc_gens, transcript);

        let _ = circuit.gen_circuit(&prog, &mut prover, |x| Some(inputs[x]));

        Ok(prover)
    }

    /// Returns the prover metrics for the given program.
    pub fn metrics(
        &self,
        program: &CompiledZkpProgram,
        private_inputs: &[BigInt],
        public_inputs: &[BigInt],
        constant_inputs: &[BigInt],
    ) -> Result<Metrics> {
        let pc_gens = PedersenGens::default();
        let mut transcript = Transcript::new(b"dummy");

        let prover = self.prover_with_circuit(
            program,
            private_inputs,
            public_inputs,
            constant_inputs,
            &pc_gens,
            &mut transcript,
        )?;

        Ok(prover.metrics())
    }

    /// Returns the number of constraints in the given program.
    pub fn constraint_count(
        &self,
        program: &CompiledZkpProgram,
        private_inputs: &[BigInt],
        public_inputs: &[BigInt],
        constant_inputs: &[BigInt],
    ) -> Result<usize> {
        let prog = self.jit_prover(program, private_inputs, public_inputs, constant_inputs)?;

        let constraint_count = constraint_count(&prog)?;

        Ok(constraint_count)
    }
}

impl Default for BulletproofsBackend {
    fn default() -> Self {
        Self::new()
    }
}

/// Get the number of constraints in the given program.
fn constraint_count(graph: &ExecutableZkpProgram) -> Result<usize> {
    let mut count = 0;
    let mut input_count = 0usize;

    let query = GraphQuery::new(graph);

    for i in graph.node_indices() {
        let node = &graph[i];

        match node.operation {
            Operation::Input(_) => {
                if input_count % 2 == 0 {
                    count += 1;
                }

                input_count += 1;
            }
            Operation::Constraint(_) => count += 1,
            Operation::Mul => {
                let (left, right) = query.get_binary_operands(i)?;

                // Constant operands don't contribute to constraints.
                match (&graph[left].operation, &graph[right].operation) {
                    (Operation::Constant(_), _) => {}
                    (_, Operation::Constant(_)) => {}
                    _ => count += 1,
                }
            }
            _ => {}
        }
    }

    Ok(count)
}

/// Parameters for verifying Bulletproof circuit.
#[derive(Clone)]
pub struct BulletproofVerifierParameters {
    pedersen_generators: PedersenGens,
    bulletproof_generators: BulletproofGens,
    shared_length: usize,
}

/// Parameters for proving a Bulletproof circuit.
#[derive(Clone)]
pub struct BulletproofProverParameters {
    verifier_parameters: BulletproofVerifierParameters,
    blinding_factor: Scalar,
}

impl BulletproofVerifierParameters {
    /// Create a [`BulletproofVerifierParameters`].
    pub fn new(
        pedersen_generators: PedersenGens,
        bulletproof_generators: BulletproofGens,
        shared_length: usize,
    ) -> Self {
        Self {
            pedersen_generators,
            bulletproof_generators,
            shared_length,
        }
    }

    /// Return the Pedersen generators.
    pub fn pedersen_generators(&self) -> &PedersenGens {
        &self.pedersen_generators
    }

    /// Return the Bulletproof generators.
    pub fn bulletproof_generators(&self) -> &BulletproofGens {
        &self.bulletproof_generators
    }
}

impl BulletproofProverParameters {
    /// Create a [`BulletproofProverParameters`].
    pub fn new(
        verifier_parameters: BulletproofVerifierParameters,
        blinding_factor: Scalar,
    ) -> Self {
        Self {
            verifier_parameters,
            blinding_factor,
        }
    }
}

impl ZkpBackend for BulletproofsBackend {
    type Field = BulletproofsFieldSpec;

    type ProverParameters = BulletproofProverParameters;
    type VerifierParameters = BulletproofVerifierParameters;

    /**
     * Create a proof for the given executable Sunscreen
     * program with the given inputs.
     */
    fn prove(&self, graph: &ExecutableZkpProgram, inputs: &[BigInt]) -> Result<Proof> {
        let mut transcript = BulletproofsCircuit::make_base_transcript();

        let constraint_count = constraint_count(graph)?;

        let mut rng = {
            let mut builder = transcript.build_rng();

            // commit to all the inputs, including the private ones.
            for input in inputs {
                let words = input.0.as_words();
                let bytes: Vec<u8> = words.iter().flat_map(|x| x.to_le_bytes()).collect();

                builder = builder.rekey_with_witness_bytes(b"input", &bytes);
            }

            // And throw in some thread RNG for good measure. The bulletproofs
            // library does this as well.
            builder.finalize(&mut thread_rng())
        };
        let blinding_factor = Scalar::random(&mut rng);

        let verifier_parameters = Self::VerifierParameters::new(
            PedersenGens::default(),
            BulletproofGens::new(2 * constraint_count, 1),
            0,
        );

        let parameters = Self::ProverParameters::new(verifier_parameters, blinding_factor);
        self.prove_with_parameters(graph, inputs, &parameters, &mut transcript)
    }

    fn prove_with_parameters(
        &self,
        graph: &ExecutableZkpProgram,
        inputs: &[BigInt],
        parameters: &Self::ProverParameters,
        transcript: &mut Transcript,
    ) -> Result<Proof> {
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

        transcript.append_message(b"dom-sep", b"R1CS proof");
        transcript.append_u64(b"gen-len", constraint_count as u64);

        let mut circuit = BulletproofsCircuit::new(graph.node_count());

        let mut prover = Prover::new(
            &parameters.verifier_parameters.pedersen_generators,
            transcript,
        );

        let now = Instant::now();

        circuit.gen_circuit(graph, &mut prover, |x| Some(inputs[x]))?;

        trace!("Bulletproofs encode time {}s", now.elapsed().as_secs_f64());
        trace!("{:#?}", prover.metrics());

        let now = Instant::now();

        let proof = prover
            .prove_with_parameters_and_return_transcript(
                &parameters.verifier_parameters.bulletproof_generators,
                parameters.verifier_parameters.shared_length,
                &parameters.blinding_factor,
            )
            .map(|(proof, _)| proof)?;

        trace!("Bulletproofs prover time {}s", now.elapsed().as_secs_f64());

        Ok(Proof::Bulletproofs(Box::new(BulletproofsR1CSProof(proof))))
    }

    fn verify(&self, graph: &ExecutableZkpProgram, proof: &Proof) -> Result<()> {
        let constraint_count = constraint_count(graph)?;
        let mut transcript = BulletproofsCircuit::make_base_transcript();

        let (pedersen_gens, bulletproof_gens) =
            BulletproofsCircuit::make_gens(2 * constraint_count);

        let parameters = Self::VerifierParameters::new(pedersen_gens, bulletproof_gens, 0);

        self.verify_with_parameters(graph, proof, &parameters, &mut transcript)
    }

    fn verify_with_parameters(
        &self,
        graph: &ExecutableZkpProgram,
        proof: &Proof,
        parameters: &Self::VerifierParameters,
        transcript: &mut Transcript,
    ) -> Result<()> {
        let proof = match proof {
            Proof::Bulletproofs(x) => x,
            _ => {
                return Err(Error::IncorrectProofType);
            }
        };

        trace!("Starting backend verify...");

        let constraint_count = constraint_count(graph)?;

        transcript.append_message(b"dom-sep", b"R1CS proof");
        transcript.append_u64(b"gen-len", constraint_count as u64);

        let mut circuit = BulletproofsCircuit::new(graph.node_count());

        let mut verifier = Verifier::new(transcript);

        let now = Instant::now();

        circuit.gen_circuit(graph, &mut verifier, |_| None)?;

        trace!("Bulletproofs encode time {}s", now.elapsed().as_secs_f64());

        let now = Instant::now();

        verifier.verify(
            &proof.0,
            &parameters.pedersen_generators,
            &parameters.bulletproof_generators,
        )?;

        trace!("Bulletproofs verify time {}s", now.elapsed().as_secs_f64());

        Ok(())
    }

    fn jit_prover(
        &self,
        prog: &crate::CompiledZkpProgram,
        private_inputs: &[BigInt],
        public_inputs: &[BigInt],
        constant_inputs: &[BigInt],
    ) -> Result<ExecutableZkpProgram> {
        let private_inputs = private_inputs
            .iter()
            .map(Scalar::try_from)
            .collect::<Result<Vec<Scalar>>>()?;
        let public_inputs = public_inputs
            .iter()
            .map(Scalar::try_from)
            .collect::<Result<Vec<Scalar>>>()?;
        let constant_inputs = constant_inputs
            .iter()
            .map(Scalar::try_from)
            .collect::<Result<Vec<Scalar>>>()?;

        jit_prover::<BulletproofsFieldSpec>(prog, &private_inputs, &public_inputs, &constant_inputs)
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

        jit_verifier::<BulletproofsFieldSpec>(prog, &constant_inputs, &public_inputs)
    }
}

fn try_uint_to_scalar<const N: usize>(x: &Uint<N>) -> Result<Scalar> {
    let as_words = x.as_words();
    const LIMB_SIZE: usize = std::mem::size_of::<Limb>();
    const SCALAR_SIZE: usize = std::mem::size_of::<Scalar>();

    let num_scalar_words = SCALAR_SIZE / LIMB_SIZE;

    // Uint<N> values are little endian. Thus, we attempt to convert the
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

#[derive(Debug, Copy, Clone)]
/// The specification for a field in the Bulletproofs proof system.
pub struct BulletproofsFieldSpec {}

impl FieldSpec for BulletproofsFieldSpec {
    type BackendField = Scalar;

    // 2^252+27742317777372353535851937790883648493,
    const FIELD_MODULUS: BigInt = BigInt::from_words([
        6346243789798364141,
        1503914060200516822,
        0x0,
        0x1000000000000000,
        0x0,
        0x0,
        0x0,
        0x0,
    ]);
}

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

fn scalar_to_uint<const N: usize>(x: &Scalar) -> Uint<N> {
    assert!(std::mem::size_of::<Uint<N>>() >= std::mem::size_of::<Scalar>());

    let mut uint_data = x.as_bytes().to_vec();

    let remainder = std::mem::size_of::<Uint<N>>() - std::mem::size_of::<Scalar>();

    uint_data.extend((0..remainder).map(|_| 0u8));

    Uint::from_le_slice(&uint_data)
}

impl crate::ZkpFrom<Scalar> for BigInt {
    fn zkp_from(val: Scalar) -> BigInt {
        BigInt(scalar_to_uint(&val))
    }
}

impl crate::ZkpFrom<&Scalar> for BigInt {
    fn zkp_from(val: &Scalar) -> BigInt {
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

        assert_eq!(a, <BigInt as crate::ZkpFrom<Scalar>>::zkp_from(scalar));
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
        let l = BulletproofsFieldSpec::FIELD_MODULUS;

        assert!(Scalar::try_from(l).is_err());

        let l_min_1 = l.0.wrapping_sub(&U512::ONE);
        let scalar = try_uint_to_scalar(&l_min_1).unwrap();

        assert_eq!(
            BigInt(l_min_1),
            <BigInt as crate::ZkpFrom<Scalar>>::zkp_from(scalar)
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
