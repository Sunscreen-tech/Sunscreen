use bulletproofs::{
    r1cs::{ConstraintSystem, LinearCombination, Prover, R1CSProof, Verifier},
    BulletproofGens, PedersenGens,
};
use crypto_bigint::{Limb, UInt};
use curve25519_dalek::scalar::Scalar;
use merlin::Transcript;
use petgraph::stable_graph::NodeIndex;
use sunscreen_compiler_common::forward_traverse;

use crate::{
    BigInt, Error, Operation, Proof, Result, ZkpBackendCompilationResult, ZkpProverBackend,
    ZkpVerifierBackend,
};

pub struct BulletproofsR1CSCircuit {
    nodes: Vec<Option<LinearCombination>>,
}

pub struct BulletproofsR1CSProof(R1CSProof);

impl BulletproofsR1CSCircuit {
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
        graph: &ZkpBackendCompilationResult,
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

                    self.nodes[idx.index()] = Some(cs.allocate(input)?.into());
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

                    let (_, _, o) = cs.multiply(left, right);

                    self.nodes[idx.index()] = Some(o.into());
                }
                Operation::Constraint(x) => {
                    let operands = query.get_unordered_operands(idx)?;

                    let x = try_uint_to_scalar(&x)?;

                    for o in operands {
                        let o = self.nodes[o.index()]
                            .as_ref()
                            .unwrap_or_else(|| panic!("{}", dependency_not_found_msg(o)))
                            .clone();

                        cs.constrain(o - x);
                    }
                }
            }

            Ok::<(), Error>(())
        })?;

        Ok(())
    }
}

impl ZkpProverBackend for BulletproofsR1CSCircuit {
    fn prove(graph: &ZkpBackendCompilationResult, inputs: &[BigInt]) -> Result<Box<Proof>> {
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
            .map(try_uint_to_scalar)
            .collect::<Result<Vec<Scalar>>>()?;

        let transcript = Self::make_transcript(multiplier_count);
        let (pedersen_gens, bulletproof_gens) =
            BulletproofsR1CSCircuit::make_gens(multiplier_count);

        let mut circuit = Self::new(graph.node_count());

        let mut prover = Prover::new(&pedersen_gens, transcript);

        circuit.gen_circuit(graph, &mut prover, |x| Some(inputs[x]))?;

        Ok(Box::new(BulletproofsR1CSProof(
            prover.prove(&bulletproof_gens)?,
        )))
    }
}

impl ZkpVerifierBackend for BulletproofsR1CSCircuit {
    fn verify(graph: &ZkpBackendCompilationResult, proof: Box<Proof>) -> Result<()> {
        let proof: Box<BulletproofsR1CSProof> = match proof.downcast() {
            Ok(v) => v,
            Err(_) => {
                return Err(Error::IncorrectProofType);
            }
        };

        let multiplier_count = graph
            .node_weights()
            .filter(|n| matches!(n.operation, Operation::Input(_) | Operation::Mul))
            .count();

        let transcript = Self::make_transcript(multiplier_count);
        let (pedersen_gens, bulletproof_gens) =
            BulletproofsR1CSCircuit::make_gens(multiplier_count);

        let mut circuit = Self::new(graph.node_count());

        let mut verifier = Verifier::new(transcript);

        circuit.gen_circuit(graph, &mut verifier, |_| None)?;

        Ok(verifier.verify(&proof.0, &pedersen_gens, &bulletproof_gens)?)
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
            return Err(Error::OutOfRange(x.to_string()));
        }
    }

    let scalar = Scalar::from_canonical_bytes(scalar_data);

    scalar.ok_or_else(|| Error::OutOfRange(x.to_string()))
}

#[cfg(test)]
mod tests {
    use sunscreen_compiler_common::{EdgeInfo, NodeInfo};

    use super::*;
    use crate::Operation as BackendOperation;

    fn scalar_to_u512(x: &Scalar) -> BigInt {
        let mut data = x.to_bytes().to_vec();

        data.extend([0u8; 32].iter());

        BigInt::from_le_slice(&data)
    }

    #[test]
    fn can_convert_small_u512_to_scalar() {
        let a = BigInt::from_words([0x1234567890abcdef, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]);

        let scalar = try_uint_to_scalar(&a).unwrap();

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

        assert!(try_uint_to_scalar(&a).is_err());
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

        assert!(try_uint_to_scalar(&a).is_err());
    }

    #[test]
    fn barely_too_bit_u512_to_scalar_fails() {
        // l = 2^252+27742317777372353535851937790883648493,
        // the order of the Ristretto group.
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

        assert!(try_uint_to_scalar(&l).is_err());

        let l_min_1 = l.wrapping_sub(&BigInt::ONE);
        let scalar = try_uint_to_scalar(&l_min_1).unwrap();

        assert_eq!(l_min_1, scalar_to_u512(&scalar));
    }

    #[test]
    fn can_run_simple_proof() {
        let mut graph = ZkpBackendCompilationResult::new();

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
            BackendOperation::Constraint(BigInt::from_u32(42)),
            &[(add_1, EdgeInfo::Unordered)],
        );

        // 10 * 4 + 2 == 42
        let proof = BulletproofsR1CSCircuit::prove(
            &graph,
            &[
                BigInt::from_u32(10),
                BigInt::from_u32(4),
                BigInt::from_u32(2),
            ],
        )
        .unwrap();

        BulletproofsR1CSCircuit::verify(&graph, proof).unwrap();

        // 8 * 5 + 2 == 42
        let proof = BulletproofsR1CSCircuit::prove(
            &graph,
            &[
                BigInt::from_u32(8),
                BigInt::from_u32(5),
                BigInt::from_u32(2),
            ],
        )
        .unwrap();

        BulletproofsR1CSCircuit::verify(&graph, proof).unwrap();

        // 8 * 5 + 3 == 42.
        // Verification should fail.
        let proof = BulletproofsR1CSCircuit::prove(
            &graph,
            &[
                BigInt::from_u32(8),
                BigInt::from_u32(5),
                BigInt::from_u32(3),
            ],
        )
        .unwrap();

        assert!(BulletproofsR1CSCircuit::verify(&graph, proof).is_err());
    }
}
