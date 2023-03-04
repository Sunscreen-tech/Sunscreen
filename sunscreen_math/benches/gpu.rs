#[cfg(feature = "gpu")]
use criterion::{criterion_group, criterion_main, Criterion};

#[cfg(feature = "gpu")]
mod benches {
    use curve25519_dalek::scalar::Scalar;
    use rand::thread_rng;
    use std::time::Instant;
    use sunscreen_math::GpuScalarVec;

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
}

#[cfg(feature = "gpu")]
criterion_group!(benches, benches::invert);

#[cfg(feature = "gpu")]
criterion_main!(benches);

#[cfg(not(feature = "gpu"))]
fn main() {}
