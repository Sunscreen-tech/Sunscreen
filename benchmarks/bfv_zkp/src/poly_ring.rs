//! STOP. DO NOT USE THIS CODE FOR PRODUCTION.
//! Security is a non-goal for this library. In fact, this library is known
//! to be insecure.

use std::{
    borrow::Borrow,
    ops::{Add, Div, Mul, Neg, Rem},
};

use ark_ff::{Field, Fp, MontBackend, MontConfig, One, UniformRand, Zero};
use ark_poly::univariate::DensePolynomial;
use rand::{thread_rng, RngCore};
use rand_distr::{Distribution, Normal};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct _PolyRing<F: Field> {
    pub poly: DensePolynomial<F>,
}

impl<F: MontConfig<N>, const N: usize> PolyRing<F, N> {
    pub fn zero() -> Self {
        Self {
            poly: DensePolynomial { coeffs: vec![] },
        }
    }

    pub fn rand_binary(degree: usize) -> Self {
        let mut coeffs = Vec::with_capacity(degree);

        for _ in 0..degree {
            if thread_rng().next_u32() % 2 == 1 {
                coeffs.push(Fp::one());
            } else {
                coeffs.push(Fp::zero());
            }
        }

        coeffs = Self::trim_coeffs(coeffs);

        Self {
            poly: DensePolynomial { coeffs },
        }
    }

    pub fn rand_gaussian(degree: usize) -> Self {
        const MAX_VAL: i64 = 19;

        let dist = Normal::new(0., 3.2).unwrap();
        let mut coeffs = Vec::with_capacity(degree);

        for _ in 0..degree {
            let mut val = dist.sample(&mut thread_rng()) as i64;

            while i64::abs(val) > MAX_VAL {
                val = dist.sample(&mut thread_rng()) as i64;
            }

            coeffs.push(Fp::from(val));
        }

        coeffs = Self::trim_coeffs(coeffs);

        Self {
            poly: DensePolynomial { coeffs },
        }
    }

    pub fn rand_uniform(degree: usize) -> Self {
        let mut coeffs = Vec::with_capacity(degree);

        for _ in 0..degree {
            coeffs.push(Fp::rand(&mut thread_rng()));
        }

        coeffs = Self::trim_coeffs(coeffs);

        Self {
            poly: DensePolynomial { coeffs },
        }
    }

    /**
     * Return X^{d + 1}+1.
     */
    pub fn ring_quotient(degree: usize) -> PolyRing<F, N> {
        assert!((degree).is_power_of_two());

        let mut coeffs = vec![Fp::zero(); degree + 1];

        coeffs[0] = Fp::one();
        coeffs[degree] = Fp::one();

        Self {
            poly: DensePolynomial { coeffs },
        }
    }

    /**
     * Trims leading zeros from the polynomial so Arkworks won't cry.
     */
    fn trim_coeffs(mut coeffs: Vec<Fp<MontBackend<F, N>, N>>) -> Vec<Fp<MontBackend<F, N>, N>> {
        loop {
            if coeffs.is_empty() {
                break;
            }

            let leading_coef = coeffs.last().unwrap();

            if leading_coef != &Fp::zero() {
                break;
            }

            coeffs.pop();
        }

        coeffs
    }
}

pub type PolyRing<F, const N: usize> = _PolyRing<Fp<MontBackend<F, N>, N>>;

impl<F: MontConfig<N>, const N: usize, Rhs> Add<Rhs> for PolyRing<F, N>
where
    Rhs: Borrow<PolyRing<F, N>>,
{
    type Output = PolyRing<F, N>;

    fn add(self, rhs: Rhs) -> Self::Output {
        &self + rhs
    }
}

impl<F: MontConfig<N>, const N: usize, Rhs> Add<Rhs> for &PolyRing<F, N>
where
    Rhs: Borrow<PolyRing<F, N>>,
{
    type Output = PolyRing<F, N>;

    fn add(self, rhs: Rhs) -> Self::Output {
        Self::Output {
            poly: &self.poly + &rhs.borrow().poly,
        }
    }
}

impl<F: MontConfig<N>, const N: usize, Rhs> Mul<Rhs> for PolyRing<F, N>
where
    Rhs: Borrow<PolyRing<F, N>>,
{
    type Output = PolyRing<F, N>;

    fn mul(self, rhs: Rhs) -> Self::Output {
        &self * rhs
    }
}

impl<F: MontConfig<N>, const N: usize, Rhs> Mul<Rhs> for &PolyRing<F, N>
where
    Rhs: Borrow<PolyRing<F, N>>,
{
    type Output = PolyRing<F, N>;

    fn mul(self, rhs: Rhs) -> Self::Output {
        PolyRing {
            poly: self.poly.naive_mul(&rhs.borrow().poly),
        }
    }
}

impl<F: MontConfig<N>, const N: usize> Mul<&Fp<MontBackend<F, N>, N>> for &PolyRing<F, N> {
    type Output = PolyRing<F, N>;

    fn mul(self, rhs: &Fp<MontBackend<F, N>, N>) -> Self::Output {
        let mut coeffs = Vec::with_capacity(self.poly.coeffs.len());

        for i in &self.poly.coeffs {
            coeffs.push(i * rhs);
        }

        Self::Output {
            poly: DensePolynomial { coeffs },
        }
    }
}

impl<F: MontConfig<N>, const N: usize> Rem<&PolyRing<F, N>> for &PolyRing<F, N> {
    type Output = PolyRing<F, N>;

    fn rem(self, rhs: &PolyRing<F, N>) -> Self::Output {
        let tmp = &self.poly / &rhs.poly;
        let rem = &self.poly - &tmp.naive_mul(&rhs.poly);

        Self::Output { poly: rem }
    }
}

impl<F: MontConfig<N>, const N: usize, Rhs> Div<Rhs> for PolyRing<F, N>
where
    Rhs: Borrow<PolyRing<F, N>>,
{
    type Output = PolyRing<F, N>;

    fn div(self, rhs: Rhs) -> Self::Output {
        &self / rhs
    }
}

impl<F: MontConfig<N>, const N: usize, Rhs> Div<Rhs> for &PolyRing<F, N>
where
    Rhs: Borrow<PolyRing<F, N>>,
{
    type Output = PolyRing<F, N>;

    fn div(self, rhs: Rhs) -> Self::Output {
        let tmp = &self.poly / &rhs.borrow().poly;

        Self::Output { poly: tmp }
    }
}

impl<F: MontConfig<N>, const N: usize> Neg for PolyRing<F, N> {
    type Output = PolyRing<F, N>;

    fn neg(self) -> Self::Output {
        -&self
    }
}

impl<F: MontConfig<N>, const N: usize> Neg for &PolyRing<F, N> {
    type Output = PolyRing<F, N>;

    fn neg(self) -> Self::Output {
        Self::Output {
            poly: -self.poly.clone(),
        }
    }
}

impl<F: MontConfig<N>, const N: usize, const M: usize> From<[i64; M]> for PolyRing<F, N> {
    fn from(data: [i64; M]) -> Self {
        Self {
            poly: DensePolynomial {
                coeffs: data.iter().map(|x| Fp::from(*x)).collect(),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::bfv::FqConfig;

    use super::*;

    #[test]
    fn can_div_rem_simple() {
        let a = PolyRing::<FqConfig, 1>::from([1, 2, 3, 4]);
        let b = PolyRing::<FqConfig, 1>::from([0, 0, 0, 1]);

        let expected = PolyRing::<FqConfig, 1>::from([4]);

        let expected_rem = PolyRing::<FqConfig, 1>::from([1, 2, 3]);

        assert_eq!(&a / &b, expected);
        assert_eq!(&a % &b, expected_rem);

        let x = &(&expected * &b) + &expected_rem;

        assert_eq!(x, a)
    }

    #[test]
    fn can_div_rem() {
        let a = PolyRing::<FqConfig, 1>::rand_gaussian(8);
        let b = PolyRing::<FqConfig, 1>::rand_gaussian(4);

        let q = &a / &b;
        let r = &a % &b;

        let actual = &(&q * &b) + &r;

        assert_eq!(actual, a);
    }
}
