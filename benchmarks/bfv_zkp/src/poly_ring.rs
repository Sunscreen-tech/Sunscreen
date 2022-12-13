use std::ops::{Add, Mul, Rem, Neg};

use ark_ff::{Field, MontConfig, Fp, MontBackend, Zero, One, UniformRand};
use ark_poly::univariate::DensePolynomial;
use rand::{thread_rng, RngCore};
use rand_distr::{Normal, Distribution};

#[derive(Debug, Clone)]
pub struct _PolyRing<F: Field> {
    pub poly: DensePolynomial<F>,
}

impl<F: MontConfig<N>, const N: usize> PolyRing<F, N> {
    pub fn rand_binary(degree: usize) -> Self {
        let mut coeffs = Vec::with_capacity(degree);

        for i in 0..degree {
            if thread_rng().next_u32() % 2 == 1
            {
                coeffs.push(Fp::one());
            } else {
                coeffs.push(Fp::zero());
            }
        }

        Self {
            poly: DensePolynomial { coeffs }
        }
    }

    pub fn rand_gaussian(degree: usize) -> Self {
        const MAX_VAL: i64 = 19;

        let dist = Normal::new(0., 3.2).unwrap();
        let mut coeffs = Vec::with_capacity(degree);

        for i in 0..degree {
            let mut val = 0;

            while i64::abs(val) > MAX_VAL {
                val = dist.sample(&mut thread_rng()) as i64;
            }
            
            coeffs.push(Fp::from(val));
        }

        Self {
            poly: DensePolynomial { coeffs }
        }
    }

    pub fn rand_uniform(degree: usize) -> Self {
        let mut coeffs = Vec::with_capacity(degree);

        for i in 0..degree {
            coeffs.push(Fp::rand(&mut thread_rng()));
        }

        Self {
            poly: DensePolynomial { coeffs }
        }
    }

    /**
     * Return X^d+1.
     */
    fn quotient(degree: usize) -> PolyRing<F, N> {
        let mut coeffs = vec![Fp::zero(); degree];

        coeffs[0] = Fp::one();
        coeffs[degree - 1] = Fp::one();

        Self {
            poly: DensePolynomial { coeffs }
        }
    }
}

pub type PolyRing<F, const N: usize> = _PolyRing<Fp<MontBackend<F, N>, N>>;

impl<F: MontConfig<N>, const N: usize> Add<&PolyRing<F, N>> for &PolyRing<F, N> {
    type Output = PolyRing<F, N>;

    fn add(self, rhs: &PolyRing<F, N>) -> Self::Output {
        assert_eq!(self.poly.coeffs.len(), rhs.poly.coeffs.len());

        Self::Output {
            poly: &self.poly + &rhs.poly
        }
    }
}

impl<F: MontConfig<N>, const N: usize> Mul<&PolyRing<F, N>> for &PolyRing<F, N> {
    type Output = PolyRing<F, N>;

    fn mul(self, rhs: &PolyRing<F, N>) -> Self::Output {
        assert_eq!(self.poly.coeffs.len(), rhs.poly.coeffs.len());

        let tmp = PolyRing { poly: self.poly.naive_mul(&rhs.poly) };
        let tmp =  &tmp % &PolyRing::quotient(self.poly.coeffs.len());

        tmp
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
            poly: DensePolynomial { coeffs }
        }
    }
}

impl<F: MontConfig<N>, const N: usize> Rem<&PolyRing<F, N>> for &PolyRing<F, N> {
    type Output = PolyRing<F, N>;

    fn rem(self, rhs: &PolyRing<F, N>) -> Self::Output {
        let tmp = &self.poly / &rhs.poly;
        let rem = &self.poly - &tmp.naive_mul(&rhs.poly);

        Self::Output {
            poly: rem
        }
    }
}

impl<F: MontConfig<N>, const N: usize> Neg for &PolyRing<F, N> {
    type Output = PolyRing<F, N>;

    fn neg(self) -> Self::Output {
        Self::Output {
            poly: -self.poly.clone()
        }
    }
}