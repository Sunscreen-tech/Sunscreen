use std::time::{Duration, Instant};

use ark_ff::{FftField, Field};
use ark_poly::univariate::DensePolynomial;
use criterion::{criterion_group, criterion_main, Criterion};
use logproof::{
    crypto::CryptoHash,
    fields::{FpRistretto, FqSeal128_1024, FqSeal128_2048, FqSeal128_4096},
    linear_algebra::{Matrix, ScalarRem},
    math::{make_poly, FieldModulus, ModSwitch, SmartMul, Zero},
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

fn bfv_benchmark<Q, const CT: usize, const CT2: usize>()
where
    Q: Field
        + CryptoHash
        + FieldModulus<4>
        + ModSwitch<FpRistretto>
        + Zero
        + Clone
        + SmartMul<Q, Output = Q>
        + FftField,
{
    // Really wish we had `generic_const_exprs` in stable...
    assert_eq!(2 * CT, CT2);

    println!("Sleeping for 120s to prevent thermal throttling of successive benchmarks...");
    std::thread::sleep(Duration::from_secs(120));

    // Secret key
    // a = random in q
    // e_1 = q / 2p
    // c_1 = s * a + e_1 + del * m
    // c_2 = a

    const POLY_DEGREE: u64 = 4096u64;
    const BIT_SIZE: u64 = 2 << 8;

    println!("Generating data...");

    let coeffs = (0..POLY_DEGREE).map(|x| x % 2).collect::<Vec<u64>>();

    let delta = make_poly::<Q>(&[1234]);
    let p_0 = make_poly::<Q>(&coeffs);
    let p_1 = p_0.clone();

    let one = make_poly(&[1]);
    let zero = make_poly(&[0]);

    let mut a = vec![];

    for _ in 0..CT {
        a.push([delta.clone(), p_0.clone(), one.clone(), zero.clone()]);
        a.push([zero.clone(), p_1.clone(), zero.clone(), one.clone()]);
    }

    let a: [[DensePolynomial<Q>; 4]; CT2] = a.try_into().unwrap();

    let a = MatrixPoly::from(a);

    let m = p_0.clone();
    let u = p_0.clone();
    let e_1 = p_0.clone();
    let e_2 = p_0;

    let s = MatrixPoly::from([[m], [u], [e_1], [e_2]]);

    let f = f::<Q>(POLY_DEGREE as usize);

    let t = &a * &s;
    let t = t.scalar_rem(&f);

    let mut transcript = Transcript::new(b"test");

    let pk = LogProofProverKnowledge::new(&a, &s, &t, BIT_SIZE, &f);

    let now = Instant::now();
    let gens = LogProofGenerators::new(pk.vk.l() as usize);
    let u = InnerProductVerifierKnowledge::get_u();
    println!("Setup time {}s", now.elapsed().as_secs_f64());

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

fn params_1024_3ct(_: &mut Criterion) {
    println!("n=1024, ct=3");
    bfv_benchmark::<FqSeal128_1024, 3, 6>();
}

fn params_1024_2ct(_: &mut Criterion) {
    println!("n=1024, ct=2");
    bfv_benchmark::<FqSeal128_1024, 2, 4>();
}

fn params_1024_1ct(_: &mut Criterion) {
    println!("n=1024, ct=1");
    bfv_benchmark::<FqSeal128_1024, 1, 2>();
}

fn params_2048_3ct(_: &mut Criterion) {
    println!("n=2048, ct=3");
    bfv_benchmark::<FqSeal128_2048, 3, 6>();
}

fn params_2048_2ct(_: &mut Criterion) {
    println!("n=2048, ct=2");
    bfv_benchmark::<FqSeal128_2048, 2, 4>();
}

fn params_2048_1ct(_: &mut Criterion) {
    println!("n=2048, ct=1");
    bfv_benchmark::<FqSeal128_2048, 1, 2>();
}

fn params_4096_3ct(_: &mut Criterion) {
    println!("n=4096, ct=3");
    bfv_benchmark::<FqSeal128_4096, 3, 6>();
}

fn params_4096_2ct(_: &mut Criterion) {
    println!("n=4096, ct=2");
    bfv_benchmark::<FqSeal128_4096, 2, 4>();
}

fn params_4096_1ct(_: &mut Criterion) {
    println!("n=4096, ct=1");
    bfv_benchmark::<FqSeal128_4096, 1, 2>();
}

criterion_group!(
    benches,
    params_1024_1ct,
    params_1024_2ct,
    params_1024_3ct,
    params_2048_1ct,
    params_2048_2ct,
    params_2048_3ct,
    params_4096_1ct,
    params_4096_2ct,
    params_4096_3ct
);

criterion_main!(benches);
