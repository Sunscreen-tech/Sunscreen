#[cfg(feature = "gpu")]
use criterion::{criterion_group, criterion_main, Criterion};

#[cfg(feature = "gpu")]
mod benches {
    use criterion::Criterion;
    use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar};
    use rand::thread_rng;
    use std::time::Instant;
    use sunscreen_math::{GpuRistrettoPointVec, GpuScalarVec};

    use super::*;

    pub fn invert(_c: &mut Criterion) {
        println!("Invert scalars");

        let a = (0..(256 * 1024))
            .map(|_| Scalar::random(&mut thread_rng()))
            .collect::<Vec<_>>();

        let a_vec = GpuScalarVec::new(&a);

        let now = Instant::now();
        let _ = a_vec.invert();
        println!(
            "{} inversions/s",
            a.len() as f64 / now.elapsed().as_secs_f64()
        );
    }

    pub fn scalar_mul(_c: &mut Criterion) {
        println!("Scalar multiplication");

        let a = (0..(256 * 1024))
            .map(|_| RistrettoPoint::random(&mut thread_rng()))
            .collect::<Vec<_>>();

        let b = (0..(256 * 1024))
            .map(|_| Scalar::random(&mut thread_rng()))
            .collect::<Vec<_>>();

        let a_vec = GpuRistrettoPointVec::new(&a);
        let b_vec = GpuScalarVec::new(&b);

        let now = Instant::now();
        let _ = a_vec * b_vec;
        println!("{} sm/s", a.len() as f64 / now.elapsed().as_secs_f64());
    }
}

#[cfg(feature = "gpu")]
criterion_group!(benches, benches::invert, benches::scalar_mul);

#[cfg(feature = "gpu")]
criterion_main!(benches);

#[cfg(not(feature = "gpu"))]
fn main() {}
