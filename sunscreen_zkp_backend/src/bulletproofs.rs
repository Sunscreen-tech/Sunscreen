use bulletproofs::{
    r1cs::{ConstraintSystem, Prover, R1CSProof, Variable, Verifier},
    BulletproofGens, PedersenGens,
};
use curve25519_dalek::scalar::Scalar;
use merlin::Transcript;
use std::task::Context;

struct MulProof(R1CSProof);

impl MulProof {
    fn make_gens() -> (Transcript, PedersenGens, BulletproofGens) {
        let mut transcript = Transcript::new(b"Horse");
        transcript.append_message(b"dom-sep", b"MulProof");

        let pc_gens = PedersenGens::default();
        let bp_gens = BulletproofGens::new(128, 1);

        (transcript, pc_gens, bp_gens)
    }

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
}

#[test]
fn can_use_bulletproofs_contstraints() {
    let proof = MulProof::prove(Scalar::from(7u32), Scalar::from(9u32), Scalar::from(63u32));

    assert!(proof.verify());

    let proof = MulProof::prove(Scalar::from(7u32), Scalar::from(9u32), Scalar::from(64u32));

    assert!(!proof.verify());
}
