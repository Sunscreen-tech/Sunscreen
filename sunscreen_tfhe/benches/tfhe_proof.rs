use criterion::{criterion_group, criterion_main, Criterion};
use logproof::{
    InnerProductVerifierKnowledge, LogProof, LogProofGenerators, LogProofProverKnowledge,
};
use merlin::Transcript;
use sunscreen_tfhe::{
    high_level::*,
    zkp::{generate_tfhe_sdlp_prover_knowledge, ProofStatement, TorusZq, Witness},
    PlaintextBits, Torus, TorusOps, LWE_512_80,
};

fn make_proof<S: TorusOps + TorusZq>(pk: &LogProofProverKnowledge<S::Zq>) -> LogProof {
    let gen: LogProofGenerators = LogProofGenerators::new(pk.vk.l() as usize);
    let u = InnerProductVerifierKnowledge::get_u();
    let mut p_t = Transcript::new(b"test");

    LogProof::create(&mut p_t, pk, &gen.g, &gen.h, &u)
}

fn tfhe_secret_proof(c: &mut Criterion) {
    let params = LWE_512_80;
    let bits = PlaintextBits(1);

    let sk = keygen::generate_binary_lwe_sk(&params);

    let enc_data = (0..32)
        .map(|_| encryption::encrypt_lwe_secret_and_return_randomness(1, &sk, &params, bits))
        .collect::<Vec<_>>();
    let msg = vec![Torus::from(1u64); 32];

    let statement = enc_data
        .iter()
        .enumerate()
        .map(|(i, d)| ProofStatement::PrivateKeyEncryption {
            message_id: i,
            ciphertext: &d.0,
        })
        .collect::<Vec<_>>();

    let witness = enc_data
        .iter()
        .enumerate()
        .map(|(_i, d)| Witness::PrivateKeyEncryption {
            randomness: d.1,
            private_key: &sk,
        })
        .collect::<Vec<_>>();

    let pk = generate_tfhe_sdlp_prover_knowledge(&statement, &msg, &witness, &params, bits);

    let p = make_proof::<u64>(&pk);

    let mut g = c.benchmark_group("Secret key encryption");
    g.sample_size(10);

    g.bench_function("Prove 32-bit secret encryption", |b| {
        b.iter(|| {
            let _ = make_proof::<u64>(&pk);
        });
    });

    g.bench_function("Verify 32-bit secret encryption", |b| {
        let gen: LogProofGenerators = LogProofGenerators::new(pk.vk.l() as usize);
        let u = InnerProductVerifierKnowledge::get_u();

        b.iter(|| {
            let mut t = Transcript::new(b"test");

            p.verify(&mut t, &pk.vk, &gen.g, &gen.h, &u).unwrap();
        });
    });
}

fn tfhe_public_proof(c: &mut Criterion) {
    let params = LWE_512_80;
    let bits = PlaintextBits(1);

    let sk = keygen::generate_binary_lwe_sk(&params);
    let public = keygen::generate_lwe_pk(&sk, &params);

    let enc_data = (0..32)
        .map(|_| encryption::encrypt_lwe_and_return_randomness(1, &public, &params, bits))
        .collect::<Vec<_>>();
    let msg = vec![Torus::from(1u64); 32];

    let statement = enc_data
        .iter()
        .enumerate()
        .map(|(i, d)| ProofStatement::PublicKeyEncryption {
            public_key: &public,
            message_id: i,
            ciphertext: &d.0,
        })
        .collect::<Vec<_>>();

    let witness = enc_data
        .iter()
        .enumerate()
        .map(|(_i, d)| Witness::PublicKeyEncryption { randomness: &d.1 })
        .collect::<Vec<_>>();

    let pk = generate_tfhe_sdlp_prover_knowledge(&statement, &msg, &witness, &params, bits);

    let p = make_proof::<u64>(&pk);

    let mut g = c.benchmark_group("Public key encryption");
    g.sample_size(10);

    g.bench_function("Prove 32-bit public encryption", |b| {
        b.iter(|| {
            let _ = make_proof::<u64>(&pk);
        });
    });

    g.bench_function("Verify 32-bit public encryption", |b| {
        let gen: LogProofGenerators = LogProofGenerators::new(pk.vk.l() as usize);
        let u = InnerProductVerifierKnowledge::get_u();

        b.iter(|| {
            let mut t = Transcript::new(b"test");

            p.verify(&mut t, &pk.vk, &gen.g, &gen.h, &u).unwrap();
        });
    });
}

criterion_group!(benches, tfhe_secret_proof, tfhe_public_proof,);
criterion_main!(benches);
