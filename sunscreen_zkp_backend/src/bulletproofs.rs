use bulletproofs::{
    r1cs::{ConstraintSystem, Prover, R1CSProof, LinearCombination},
    BulletproofGens, PedersenGens,
};
use crypto_bigint::{UInt, Limb};
use curve25519_dalek::scalar::{Scalar};
use merlin::Transcript;
use sunscreen_compiler_common::forward_traverse;

use crate::{ZkpProverBackend, ZkpBackendCompilationResult, Operation, Error, Result, BigInt, Proof};

pub struct BulletproofsR1CSCircuit {
    nodes: Vec<Option<LinearCombination>>,
}

pub struct BulletproofsR1CSProof(R1CSProof);

impl Proof for BulletproofsR1CSProof {}

impl BulletproofsR1CSCircuit {
    pub fn new(circuit_size: usize) -> Self {
        Self {
            nodes: vec![None; circuit_size]
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

    fn gen_circuit<CS, I>(&mut self, graph: &mut ZkpBackendCompilationResult, cs: &mut CS, get_input: I) -> Result<()>
    where CS: ConstraintSystem, I: Fn(usize) -> Option<Scalar> {

        // The graph won't actually be mutated. 
        forward_traverse(&mut graph.0, |query, idx| {
            let node = query.get_node(idx).unwrap();

            match node.operation {
                Operation::Input(x) => {
                    let input = get_input(x);

                    self.nodes[idx.index()] = Some(cs.allocate(input)?.into());
                }
                Operation::Add => {

                }
                _ => {}
            }

            Ok::<(), Error>(())
        })?;

        Ok(())
    }
}

impl ZkpProverBackend for BulletproofsR1CSCircuit {
    fn prove(mut graph: ZkpBackendCompilationResult, inputs: &[BigInt]) -> Result<Box<dyn crate::Proof>> {
        let expected_input_count = graph.node_weights().filter(|x| matches!(x.operation, Operation::Input(_))).count();

        if expected_input_count != inputs.len() {
            return Err(Error::InputsMismatch);
        }

        let multiplier_count = graph.node_weights().filter(|n| matches!(n.operation, Operation::Input(_) | Operation::Mul) ).count();

        // Convert the inputs to Scalars
        let inputs = inputs.iter().map(|x| try_uint_to_scalar(x)).collect::<Result<Vec<Scalar>>>()?;

        let transcript = Self::make_transcript(multiplier_count);
        let (pedersen_gens, bulletproof_gens) = BulletproofsR1CSCircuit::make_gens(multiplier_count);

        let mut circuit = Self::new(multiplier_count);

        let mut prover = Prover::new(&pedersen_gens, transcript);

        circuit.gen_circuit(&mut graph, &mut prover, |x| { Some(inputs[x]) })?;

        Ok(Box::new(BulletproofsR1CSProof(prover.prove(&bulletproof_gens)?)))
    }
}

/*
impl MulProof {
    pub fn prove(x: Scalar, y: Scalar, o: Scalar) -> Self {
        let (transcript, pc_gens, bp_gens) = Self::make_gens();

        let mut prover = Prover::new(&pc_gens, transcript);

        let inputs = vec![
            prover.allocate(Some(x)).unwrap(),
            prover.allocate(Some(y)).unwrap(),
        ];

        let outputs = vec![prover.allocate(Some(o)).unwrap()];

        Self::gadget(&mut prover, inputs, outputs);

        Self(prover.prove(&bp_gens).unwrap())
    }

    pub fn verify(&self) -> bool {
        let (transcript, pc_gens, bp_gens) = Self::make_gens();

        let mut verifier = Verifier::new(transcript);

        let inputs = vec![
            verifier.allocate(None).unwrap(),
            verifier.allocate(None).unwrap(),
        ];

        let outputs = vec![verifier.allocate(None).unwrap()];

        Self::gadget(&mut verifier, inputs, outputs);

        verifier.verify(&self.0, &pc_gens, &bp_gens).is_ok()
    }

    fn gadget<CS: ConstraintSystem>(cs: &mut CS, inputs: Vec<Variable>, outputs: Vec<Variable>) {
        let (_, _, o) = cs.multiply(
            inputs[0] + Scalar::from(0u32),
            inputs[1] + Scalar::from(0u32),
        );

        inputs[0];

        cs.constrain(o - outputs[0]);
    }
}*/

fn try_uint_to_scalar<const N: usize>(x: &UInt<N>) -> Result<Scalar> {
    let as_words = x.as_words();
    const LIMB_SIZE: usize = std::mem::size_of::<Limb>();
    const SCALAR_SIZE: usize = std::mem::size_of::<Scalar>();

    let num_scalar_words = SCALAR_SIZE / LIMB_SIZE;

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
    use super::*;

    #[test]
    fn can_convert_small_u512_to_scalar() {
        fn scalar_to_u512(x: &Scalar) -> BigInt {
            let mut data = x.to_bytes().to_vec();

            data.extend([0u8; 32].iter());

            BigInt::from_le_slice(&data)
        }

        let a = BigInt::from_words([
            0x1234567890abcdef,
            0x0,
            0x0,
            0x0,
            0x0,
            0x0,
            0x0,
            0x0,
        ]);

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
        // l = 2^252+27742317777372353535851937790883648493
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

        let l_min_1 = l.wrapping_sub(&BigInt::ONE);

        assert!(try_uint_to_scalar(&l).is_err());

        fn scalar_to_u512(x: &Scalar) -> BigInt {
            let mut data = x.to_bytes().to_vec();

            data.extend([0u8; 32].iter());

            BigInt::from_le_slice(&data)
        }

        let scalar = try_uint_to_scalar(&l_min_1).unwrap();

        assert_eq!(l_min_1, scalar_to_u512(&scalar));
    }
}