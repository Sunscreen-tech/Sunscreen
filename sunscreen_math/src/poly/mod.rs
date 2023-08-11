use std::ops::{Add, Mul};

use crate::{refify, ring::Ring};

#[derive(Debug, Clone, PartialEq, Eq)]
/// A polynomial over the ring `T`.
///
/// # Remarks
/// The coefficient at index `i` corresponds to the `x^i` term. E.g.
/// index 0 is the constant coefficient term, 1 is x, ... n is x^n.
pub struct Polynomial<T>
where
    T: Ring,
{
    coeffs: Vec<T>,
}

impl<T> Polynomial<T>
where
    T: Ring,
{
    fn new(coeffs: &[T]) -> Self {
        Self {
            coeffs: coeffs.to_owned(),
        }
    }
}

impl<T> Add<&Polynomial<T>> for &Polynomial<T>
where
    T: Ring,
{
    type Output = Polynomial<T>;

    fn add(self, rhs: &Polynomial<T>) -> Self::Output {
        let out_len = usize::max(self.coeffs.len(), rhs.coeffs.len());

        let mut out_coeffs = Vec::with_capacity(out_len);

        for i in 0..self.coeffs.len() {
            let a = self.coeffs.get(i).unwrap_or(&T::ZERO).clone();
            let b = rhs.coeffs.get(i).unwrap_or(&T::ZERO).clone();

            out_coeffs.push(a + b);
        }

        Polynomial { coeffs: out_coeffs }
    }
}

refify! { Add, Polynomial, (T, (Ring)), T}

impl<T> Mul<&Polynomial<T>> for &Polynomial<T>
where
    T: Ring,
{
    type Output = Polynomial<T>;

    fn mul(self, rhs: &Polynomial<T>) -> Self::Output {
        let mut out_coeffs = vec![T::ZERO; (self.coeffs.len() - 1) + (rhs.coeffs.len() - 1) + 1];

        for i in 0..self.coeffs.len() {
            for j in 0..rhs.coeffs.len() {
                let a = self.coeffs.get(i).unwrap_or(&T::ZERO).clone();
                let b = rhs.coeffs.get(j).unwrap_or(&T::ZERO).clone();

                out_coeffs[i + j] = a * b + &out_coeffs[i + j];
            }
        }

        Polynomial { coeffs: out_coeffs }
    }
}

refify! { Mul, Polynomial, (T, (Ring)), T}

#[cfg(test)]
mod tests {
    use sunscreen_math_macros::BarrettConfig;

    use crate::{
        self as sunscreen_math,
        poly::Polynomial,
        ring::{BarrettBackend, Zq},
        Zero,
    };

    #[test]
    fn can_add_polynomials() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "5", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let a = TestPoly::new(&[R::from(1), R::from(2), R::from(3)]);

        let b = TestPoly::new(&[R::from(4), R::from(1)]);

        let expected = TestPoly::new(&[R::ZERO, R::from(3), R::from(3)]);

        assert_eq!(a + b, expected);
    }

    #[test]
    fn can_mul_polynomials() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "5", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let a = TestPoly::new(&[R::from(1), R::from(2), R::from(3)]);

        let b = TestPoly::new(&[R::from(4), R::from(1)]);

        let expected = TestPoly::new(&[R::from(4), R::from(4), R::from(4), R::from(3)]);

        assert_eq!(a * b, expected);
    }
}
