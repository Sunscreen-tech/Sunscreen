use std::sync::Mutex;
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
use once_cell::sync::Lazy;

// Change these two lines to change how much time is spent sleeping between
// benchmarks to cool down the machine.
const THERMAL_THROTTLE: bool = true;
const THERMAL_THROTTLE_TIME: u64 = 30;

type MatrixPoly<Q> = Matrix<DensePolynomial<Q>>;

static RESULTS: Lazy<Mutex<String>> = Lazy::new(|| {
    Mutex::new(
        "Degree, Ciphertexts, Setup Time [s], Prover Time [s], Verifier Time [s], Prover Size [B]\n"
            .to_string(),
    )
});

fn append_result(
    degree: u64,
    ciphertexts: usize,
    setup_time: f64,
    prover_time: f64,
    verifier_time: f64,
    prover_size: usize,
) {
    let new_row = format!(
        "{degree}, {ciphertexts}, {setup_time}, {prover_time}, {verifier_time}, {prover_size}\n"
    );
    let mut r = RESULTS.lock().unwrap();
    (*r).push_str(&new_row);
}

fn f<F: Field>(degree: usize) -> DensePolynomial<F> {
    let mut coeffs = Vec::with_capacity(degree + 1);
    coeffs.push(F::ONE);

    for _ in 0..degree - 1 {
        coeffs.push(F::ZERO);
    }

    coeffs.push(F::ONE);

    DensePolynomial { coeffs }
}

fn bfv_benchmark<Q, const POLY_DEGREE: u64, const CT: usize, const CT2: usize>()
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

    if THERMAL_THROTTLE {
        println!(
        "Sleeping for {THERMAL_THROTTLE_TIME} seconds to prevent thermal throttling of successive benchmarks..."
    );
        std::thread::sleep(Duration::from_secs(THERMAL_THROTTLE_TIME));
    }

    // Secret key
    // a = random in q
    // e_1 = q / 2p
    // c_1 = s * a + e_1 + del * m
    // c_2 = a
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
    let setup_time = now.elapsed().as_secs_f64();

    let now = Instant::now();
    let proof = LogProof::create(&mut transcript, &pk, &gens.g, &gens.h, &u);
    let prover_time = now.elapsed().as_secs_f64();
    let prover_size = bincode::serialize(&proof).unwrap().len();

    let mut transcript = Transcript::new(b"test");

    let now = Instant::now();
    proof
        .verify(&mut transcript, &pk.vk, &gens.g, &gens.h, &u)
        .unwrap();
    let verifier_time = now.elapsed().as_secs_f64();

    println!("Setup time: {setup_time}");
    println!("Prover time: {prover_time}");
    println!("Verifier time: {verifier_time}");
    println!("Prover size: {prover_size}");

    append_result(
        POLY_DEGREE,
        CT,
        setup_time,
        prover_time,
        verifier_time,
        prover_size,
    );
}

fn params_1024_3ct(_: &mut Criterion) {
    println!("n=1024, ct=3");
    bfv_benchmark::<FqSeal128_1024, 1024, 3, 6>();
}

fn params_1024_2ct(_: &mut Criterion) {
    println!("n=1024, ct=2");
    bfv_benchmark::<FqSeal128_1024, 1024, 2, 4>();
}

fn params_1024_1ct(_: &mut Criterion) {
    println!("n=1024, ct=1");
    bfv_benchmark::<FqSeal128_1024, 1024, 1, 2>();
}

fn params_2048_3ct(_: &mut Criterion) {
    println!("n=2048, ct=3");
    bfv_benchmark::<FqSeal128_2048, 2048, 3, 6>();
}

fn params_2048_2ct(_: &mut Criterion) {
    println!("n=2048, ct=2");
    bfv_benchmark::<FqSeal128_2048, 2048, 2, 4>();
}

fn params_2048_1ct(_: &mut Criterion) {
    println!("n=2048, ct=1");
    bfv_benchmark::<FqSeal128_2048, 2048, 1, 2>();
}

fn params_4096_3ct(_: &mut Criterion) {
    println!("n=4096, ct=3");
    bfv_benchmark::<FqSeal128_4096, 4096, 3, 6>();
}

fn params_4096_2ct(_: &mut Criterion) {
    println!("n=4096, ct=2");
    bfv_benchmark::<FqSeal128_4096, 4096, 2, 4>();
}

fn params_4096_1ct(_: &mut Criterion) {
    println!("n=4096, ct=1");
    bfv_benchmark::<FqSeal128_4096, 4096, 1, 2>();
}

fn print_results(_: &mut Criterion) {
    println!("Printing out results as a csv table\n");
    println!("{}", *RESULTS.lock().unwrap());
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
    params_4096_3ct,
    print_results
);

criterion_main!(benches);
