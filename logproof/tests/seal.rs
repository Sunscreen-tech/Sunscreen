use merlin::Transcript;

use logproof::{
    rings::{SealQ128_1024, SealQ128_2048, SealQ128_4096, SealQ128_8192},
    test::seal_bfv_encryption_linear_relation,
    InnerProductVerifierKnowledge, LogProof, LogProofGenerators, LogProofTranscript,
};
use sunscreen_math::ring::BarrettConfig;

fn zero_knowledge_proof<B, const N: usize>(message: u64, degree: u64, plain_modulus: u64)
where
    B: BarrettConfig<N>,
{
    let pk = seal_bfv_encryption_linear_relation::<B, N>(message, degree, plain_modulus);

    let mut transcript = Transcript::new(b"test");
    let mut verify_transcript = transcript.clone();

    let gens = LogProofGenerators::new(pk.vk.l() as usize);
    let u = InnerProductVerifierKnowledge::get_u();

    let proof = LogProof::create(&mut transcript, &pk, &gens.g, &gens.h, &u);

    proof
        .verify(&mut verify_transcript, &pk.vk, &gens.g, &gens.h, &u)
        .unwrap();

    let l = transcript.challenge_scalar(b"verify");
    let r = verify_transcript.challenge_scalar(b"verify");

    assert_eq!(l, r);
}

// This will run the full knowledge proof (which is a trivial amount of time
// in comparison to the zero knowledge proof) before running the zero
// knowledge proof.
#[test]
fn zero_knowledge_bfv_proof_1024() {
    zero_knowledge_proof::<SealQ128_1024, 1>(12, 1024, 12289);
}

#[test]
fn full_knowledge_bfv_proof_2048() {
    seal_bfv_encryption_linear_relation::<SealQ128_2048, 1>(12, 2048, 1032193);
}

#[test]
fn full_knowledge_bfv_proof_4096() {
    seal_bfv_encryption_linear_relation::<SealQ128_4096, 2>(12, 4096, 1032193);
}

#[test]
fn full_knowledge_bfv_proof_8192() {
    seal_bfv_encryption_linear_relation::<SealQ128_8192, 3>(12, 8192, 1032193);
}
