use std::time::Instant;

use ark_ff::Field;
use ark_poly::univariate::DensePolynomial;
use criterion::{criterion_group, criterion_main, Criterion};
use logproof::{
    fields::FqSeal128_4096,
    linear_algebra::{Matrix, ScalarRem},
    math::make_poly,
    InnerProductVerifierKnowledge, LogProof, LogProofGenerators, LogProofProverKnowledge,
};
use merlin::Transcript;

type MatrixPoly<Q> = Matrix<DensePolynomial<Q>>;

fn f<F: Field>(degree: usize) -> DensePolynomial<F> {
    let mut coeffs = Vec::with_capacity(degree + 1);
    coeffs.push(F::ONE);

    for _ in 0..degree - 1 {
        coeffs.push(F::ZERO);
    }

    coeffs.push(F::ONE);

    DensePolynomial { coeffs }
}

fn bfv_3ct_benchmark(_: &mut Criterion) {
    // Secret key
    // a = random in q
    // e_1 = q / 2p
    // c_1 = s * a + e_1 + del * m
    // c_2 = a

    type Q = FqSeal128_4096;

    const POLY_DEGREE: u64 = 4096u64;
    const BIT_SIZE: u64 = 2 << 8;

    println!("Generating data...");

    let coeffs = (0..POLY_DEGREE).map(|x| x % 2).collect::<Vec<u64>>();

    let delta = make_poly::<Q>(&[1234]);
    let p_0 = make_poly::<Q>(&coeffs);
    let p_1 = p_0.clone();

    let one = make_poly(&[1]);
    let zero = make_poly(&[0]);

    let a = MatrixPoly::from([
        [delta.clone(), p_0.clone(), one.clone(), zero.clone()],
        [zero.clone(), p_1.clone(), zero.clone(), one.clone()],
        [delta.clone(), p_0.clone(), one.clone(), zero.clone()],
        [zero.clone(), p_1.clone(), zero.clone(), one.clone()],
        [delta, p_0.clone(), one.clone(), zero.clone()],
        [zero.clone(), p_1, zero, one],
    ]);

    // Secret key
    // a = random in q
    // e_1 = q / 2p
    // c_1 = s * a + e_1 + del * m
    // c_2 = a

    let m = p_0.clone();
    let u = p_0.clone();
    let e_1 = p_0.clone();
    let e_2 = p_0;

    let s = MatrixPoly::from([[m], [u], [e_1], [e_2]]);

    let f = f::<FqSeal128_4096>(POLY_DEGREE as usize);

    let t = &a * &s;
    let t = t.scalar_rem(&f);

    let mut transcript = Transcript::new(b"test");

    println!("Generating prover knowlege");

    let now = Instant::now();

    let pk = LogProofProverKnowledge::new(&a, &s, &t, BIT_SIZE, &f);

    println!("Generate PK {}s", now.elapsed().as_secs_f64());

    println!("b={}", pk.vk.b());
    println!("b_1={}", pk.vk.b_1());
    println!("b_2={}", pk.vk.b_2());
    println!("mkdb={}", pk.vk.mkdb());
    println!("nk(2d-1)b_1={}", pk.vk.nk_2d_min_1_b_1());
    println!("nk(d-1)b_2={}", pk.vk.nk_d_min_1_b_2());
    println!("l={}", pk.vk.l());

    println!("Starting proof...");

    let gens = LogProofGenerators::new(pk.vk.l() as usize);
    let u = InnerProductVerifierKnowledge::get_u();

    let now = Instant::now();

    let proof = LogProof::create(&mut transcript, &pk, &gens.g, &gens.h, &u);

    println!("Prover time {}s", now.elapsed().as_secs_f64());
    println!("Proof size {}B", bincode::serialize(&proof).unwrap().len());

    let mut transcript = Transcript::new(b"test");

    let now = Instant::now();

    proof
        .verify(&mut transcript, &pk.vk, &gens.g, &gens.h, &u)
        .unwrap();

    println!("Verifier time {}s", now.elapsed().as_secs_f64());
}

criterion_group!(benches, bfv_3ct_benchmark);

criterion_main!(benches);
