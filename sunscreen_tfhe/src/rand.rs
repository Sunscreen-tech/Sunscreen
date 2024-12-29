use std::fmt::Debug;

use rand::{thread_rng, Rng, RngCore};
use rand_distr::Normal;
use serde::{Deserialize, Serialize};

use crate::{
    entities::PolynomialRef,
    math::{Torus, TorusOps},
};

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(transparent)]
/// The standard deviation of a Gaussian distribution normalized over the torus
/// `T_q`.
pub struct Stddev(pub f64);

/// Sample a random torus element from the a normal distribution
/// with a mean of 0 and the given stddev
pub fn normal_torus<S: TorusOps>(std: Stddev) -> Torus<S> {
    let dist = Normal::new(0., std.0).unwrap();

    let e_0 = thread_rng().sample(dist);
    let q = (S::BITS as f64).exp2();

    let e = f64::round(e_0 * q) as i64;
    let e: u64 = unsafe { std::mem::transmute(e) };

    Torus::from(S::from_u64(e))
}

/// Generate a random torus element uniformly
pub fn uniform_torus<S: TorusOps>() -> Torus<S> {
    Torus::from(S::from_u64(thread_rng().next_u64()))
}

/// Generate a random binary torus element
pub fn binary<S: TorusOps>() -> S {
    S::from_u64(thread_rng().next_u64() % 2)
}

/// Fill in a polynomial with random binary coefficients
pub fn binary_torus_polynomial<S: TorusOps>(out: &mut PolynomialRef<S>) {
    for c in out.coeffs_mut().iter_mut() {
        *c = binary();
    }
}

/// Sample a random polynomial with coefficients chosen from a normal distribution
/// with a mean of 0 and the given stddev
pub fn normal_torus_polynomial<S: TorusOps>(out: &mut PolynomialRef<Torus<S>>, std: Stddev) {
    for c in out.coeffs_mut().iter_mut() {
        *c = normal_torus(std);
    }
}

#[cfg(test)]
mod tests {
    use std::mem::transmute_copy;

    use crate::math::ToF64;

    use super::*;

    #[test]
    fn can_produce_random_torus() {
        pub fn case<S, I>()
        where
            S: TorusOps,
            I: ToF64 + Copy + Debug,
            <S as TryFrom<u64>>::Error: Debug,
        {
            let q = (S::BITS as f64).exp2();
            let n: i32 = 100_000;

            let dev = Stddev(0.000_448_516_698_238_696_5);

            let data = (0..n)
                .map(|_| {
                    let t = normal_torus::<S>(dev).inner();
                    unsafe { transmute_copy::<S, I>(&t) }
                })
                .collect::<Vec<_>>();

            // Reinterpreting the torus points as i64 values should give a mean of approximately zero.
            let mean = data
                .iter()
                .copied()
                .map(|x| x.to_f64())
                .fold(0., |s, x| s + x)
                / (q * n as f64);

            assert!(mean < 1e-5);

            // Scale the integer values back to the range [0, 1) and compute the stddev
            let measured_std = data
                .iter()
                .copied()
                .map(|x| {
                    let val = (x.to_f64() / q) - mean;

                    val * val
                })
                .fold(0f64, |s, x| s + x)
                / n as f64;

            let measured_std = measured_std.sqrt();

            assert!((measured_std - dev.0).abs() < 0.00001);
        }

        case::<u32, i32>();
        case::<u64, i64>();
    }
}
