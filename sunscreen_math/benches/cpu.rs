use std::time::Instant;

use criterion::{criterion_group, criterion_main, Criterion};
use curve25519_dalek::scalar::Scalar;
use rand::thread_rng;
use sunscreen_math::CpuScalarVec;

fn invert(_c: &mut Criterion) {
    println!("Invert scalars");

    let a = (0..(256 * 1024))
        .map(|_| Scalar::random(&mut thread_rng()))
        .collect::<Vec<_>>();

    let a_vec = CpuScalarVec::new(&a);

    let now = Instant::now();
    let _ = a_vec.invert();
    println!(
        "{} inversions/s",
        a.len() as f64 / now.elapsed().as_secs_f64()
    );
}

criterion_group!(benches, invert);
criterion_main!(benches);
