use std::ops::{Add, Index, IndexMut, Mul, Neg, Sub};

use sunscreen_math_macros::refify_binary_op;

use crate::{ring::Ring, One, Zero};

#[derive(Debug, Clone, Eq)]
/// A polynomial over the ring `T`.
///
/// # Remarks
/// The coefficient at index `i` corresponds to the `x^i` term. E.g.
/// index 0 is the constant coefficient term, 1 is x, ... n is x^n.
pub struct Polynomial<R>
where
    R: Ring,
{
    /// The coefficients of the polynomial.
    pub coeffs: Vec<R>,
}

impl<R> PartialEq for Polynomial<R>
where
    R: Ring,
{
    /// Computes polynomial equality.
    ///
    /// # Remarks
    /// Variable time
    fn eq(&self, other: &Self) -> bool {
        // Need to handle zero polynomial specially, as calling degree will panic.
        let lhs_is_zero = self.vartime_is_zero();
        let rhs_is_zero = other.vartime_is_zero();

        if lhs_is_zero || rhs_is_zero {
            return lhs_is_zero && rhs_is_zero;
        }

        let lhs_degree = self.vartime_degree();
        let rhs_degree = other.vartime_degree();

        if lhs_degree != rhs_degree {
            return false;
        }

        for i in 0..lhs_degree {
            if self.coeffs[i] != other.coeffs[i] {
                return false;
            }
        }

        true
    }
}

impl<R> Polynomial<R>
where
    R: Ring,
{
    /// Construct a new polynomial with the given coefficients.
    pub fn new(coeffs: &[R]) -> Self {
        Self {
            coeffs: coeffs.to_owned(),
        }
    }

    /// Evaluate the polynomial at x.
    pub fn evaluate(&self, x: &R) -> R {
        let mut eval = R::zero();
        let mut cur_pow = R::one();

        for i in &self.coeffs {
            eval = eval + i.clone() * &cur_pow;
            cur_pow = cur_pow.clone() * x;
        }

        eval
    }

    /// Returns the degree of the polynomial
    ///
    /// # Remarks
    /// Runtime varies depending on the number of leading zeros.
    ///
    /// # Panics
    /// The degree of the zero polynomial is undefined, and thus this function will
    /// panic.
    pub fn vartime_degree(&self) -> usize {
        for (i, coeff) in self.coeffs.iter().rev().enumerate() {
            if !coeff.vartime_is_zero() {
                return self.coeffs.len() - i - 1;
            }
        }

        panic!("Zero polynomial has undefined degree.");
    }

    /// Computes the quotient and remainder of `self / rhs`.
    ///
    /// # Remarks
    /// Runtime is variable except for very restricted use cases.
    /// This function will be constant time so long as:
    /// * Neither the numerator nor denominator have leading zeros.
    /// * The numerator is always of higher degree than the denominator
    /// * The numerator's and denominator's degrees are fixed across invocations
    /// * The inner type R supports constant time subtraction and multiplication.
    ///
    /// In order for polynomial division to work in a ring, `rhs` has restrictions.
    /// Specifically, the highest order non-zero coefficient in `rhs` must be 1 so as to avoid
    /// inverse operations. While multiplicative inverses are not guaranteed to exist
    /// for a [`Ring`] element, the inverse of one will always be one.
    ///
    /// # Panics
    /// If the divisor's leading non-zero coefficient isn't one.
    ///
    /// If rhs is the zero polynomial.
    pub fn vartime_div_rem_restricted_rhs(&self, rhs: &Self) -> (Self, Self) {
        let mut rem = self.clone();

        if self.vartime_is_zero() {
            return (Self::zero(), Self::zero());
        }

        let lhs_degree = self.vartime_degree();

        // Will panic if rhs is `Self::zero()`
        let rhs_degree = rhs.vartime_degree();

        // If the denominator is higher degree than the numerator, then we're done.
        if lhs_degree < rhs_degree {
            return (Self::zero(), rem);
        }

        let iter_count = lhs_degree - rhs_degree + 1;
        let mut q = Polynomial {
            coeffs: vec![R::zero(); iter_count],
        };

        for i in 0..iter_count {
            // Normally, we would compute the scale factor as coeff_i(rem) * coeff_i(rhs)^-1,
            // but inverse isn't defined for rings. Since we leverage the fact that the
            // leading coefficient is always 1, we don't have this problem.
            let scale = rem.coeffs[lhs_degree - i].clone();

            for j in 0..=rhs_degree {
                let lhs_index = lhs_degree - i - j;
                let rhs_index = rhs_degree - j;

                rem.coeffs[lhs_index] =
                    rem.coeffs[lhs_index].clone() - rhs.coeffs[rhs_index].clone() * &scale;
            }

            q.coeffs[iter_count - i - 1] = scale;
        }

        (q, rem)
    }
}

impl<T> Index<usize> for Polynomial<T>
where
    T: Ring,
{
    type Output = T;

    fn index(&self, index: usize) -> &Self::Output {
        &self.coeffs[index]
    }
}

impl<T> IndexMut<usize> for Polynomial<T>
where
    T: Ring,
{
    fn index_mut(&mut self, index: usize) -> &mut Self::Output {
        &mut self.coeffs[index]
    }
}

#[refify_binary_op]
impl<T> Add<&Polynomial<T>> for &Polynomial<T>
where
    T: Ring,
{
    type Output = Polynomial<T>;

    fn add(self, rhs: &Polynomial<T>) -> Self::Output {
        let out_len = usize::max(self.coeffs.len(), rhs.coeffs.len());

        let mut out_coeffs = Vec::with_capacity(out_len);
        let len = usize::max(self.coeffs.len(), rhs.coeffs.len());

        for i in 0..len {
            let a = self.coeffs.get(i).unwrap_or(&T::zero()).clone();
            let b = rhs.coeffs.get(i).unwrap_or(&T::zero()).clone();

            out_coeffs.push(a + b);
        }

        Polynomial { coeffs: out_coeffs }
    }
}

#[refify_binary_op]
impl<T> Sub<&Polynomial<T>> for &Polynomial<T>
where
    T: Ring,
{
    type Output = Polynomial<T>;

    fn sub(self, rhs: &Polynomial<T>) -> Self::Output {
        let out_len = usize::max(self.coeffs.len(), rhs.coeffs.len());

        let mut out_coeffs = Vec::with_capacity(out_len);
        let len = usize::max(self.coeffs.len(), rhs.coeffs.len());

        for i in 0..len {
            let a = self.coeffs.get(i).unwrap_or(&T::zero()).clone();
            let b = rhs.coeffs.get(i).unwrap_or(&T::zero()).clone();

            out_coeffs.push(a - b);
        }

        Polynomial { coeffs: out_coeffs }
    }
}

#[refify_binary_op]
impl<T> Mul<&Polynomial<T>> for &Polynomial<T>
where
    T: Ring,
{
    type Output = Polynomial<T>;

    fn mul(self, rhs: &Polynomial<T>) -> Self::Output {
        // TODO: Fix vartime
        if self.coeffs.is_empty() || rhs.coeffs.is_empty() {
            return Self::Output::zero();
        }

        let mut out_coeffs = vec![T::zero(); (self.coeffs.len() - 1) + (rhs.coeffs.len() - 1) + 1];

        for i in 0..self.coeffs.len() {
            for j in 0..rhs.coeffs.len() {
                let a = self.coeffs.get(i).unwrap_or(&T::zero()).clone();
                let b = rhs.coeffs.get(j).unwrap_or(&T::zero()).clone();

                out_coeffs[i + j] = a * b + &out_coeffs[i + j];
            }
        }

        Polynomial { coeffs: out_coeffs }
    }
}

#[refify_binary_op]
impl<T> Mul<&T> for &Polynomial<T>
where
    T: Ring,
{
    type Output = Polynomial<T>;

    fn mul(self, rhs: &T) -> Self::Output {
        Self::Output {
            coeffs: self
                .coeffs
                .iter()
                .map(|x| x.clone() * rhs)
                .collect::<Vec<_>>(),
        }
    }
}

impl<T> Zero for Polynomial<T>
where
    T: Ring,
{
    #[inline(always)]
    fn zero() -> Self {
        Self { coeffs: vec![] }
    }

    fn vartime_is_zero(&self) -> bool {
        self.coeffs.iter().all(|x| x.vartime_is_zero())
    }
}

impl<T> One for Polynomial<T>
where
    T: Ring,
{
    #[inline(always)]
    fn one() -> Self {
        Self {
            coeffs: vec![T::one()],
        }
    }
}

impl<T> Neg for Polynomial<T>
where
    T: Ring,
{
    type Output = Polynomial<T>;

    fn neg(self) -> Self::Output {
        Self {
            coeffs: self.coeffs.iter().map(|x| -x.clone()).collect::<Vec<_>>(),
        }
    }
}

impl<T> Ring for Polynomial<T> where T: Ring {}

#[cfg(test)]
mod tests {
    use rand::{distributions::Uniform, prelude::Distribution, thread_rng};
    use sunscreen_math_macros::BarrettConfig;

    use crate::{
        self as sunscreen_math,
        poly::Polynomial,
        ring::{BarrettBackend, Zq},
        One, Zero,
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

        let expected = TestPoly::new(&[R::zero(), R::from(3), R::from(3)]);

        assert_eq!(&a + &b, expected);
        assert_eq!(b + a, expected);
    }
    #[test]
    fn can_sub_polynomials() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "5", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let a = TestPoly::new(&[R::from(1), R::from(2), R::from(3)]);

        let b = TestPoly::new(&[R::from(4), R::from(1)]);

        let expected_1 = TestPoly::new(&[R::from(2), R::from(1), R::from(3)]);

        assert_eq!(&a - &b, expected_1);

        let expected_2 = TestPoly::new(&[R::from(3), R::from(4), R::from(2)]);

        assert_eq!(b - a, expected_2);
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

    #[test]
    fn can_get_poly_degree_constant_coeff() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "5", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let x = TestPoly {
            coeffs: vec![R::try_from(1).unwrap()],
        };

        assert_eq!(x.vartime_degree(), 0);
    }

    #[test]
    fn can_get_poly_degree() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "5", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let x = TestPoly {
            coeffs: vec![
                R::try_from(0).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(3).unwrap(),
            ],
        };

        assert_eq!(x.vartime_degree(), 3);
    }

    #[test]
    fn can_get_poly_degree_padded_zeros() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "5", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let x = TestPoly {
            coeffs: vec![
                R::try_from(0).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(3).unwrap(),
                R::try_from(0).unwrap(),
            ],
        };

        assert_eq!(x.vartime_degree(), 3);
    }

    #[test]
    #[should_panic]
    fn zero_poly_degree_should_panic() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "5", num_limbs = 1)]
        struct Cfg;

        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let x = TestPoly::zero();

        x.vartime_degree();
    }

    #[test]
    #[should_panic]
    fn zero_poly_padded_zeros_degree_should_panic() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "5", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let x = TestPoly {
            coeffs: vec![R::zero(); 3],
        };

        x.vartime_degree();
    }

    #[test]
    fn polynomial_equality() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "6", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        assert_eq!(TestPoly::zero(), TestPoly::zero());

        let a = TestPoly {
            coeffs: vec![
                R::try_from(0).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
            ],
        };

        let b = TestPoly {
            coeffs: vec![
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(3).unwrap(),
            ],
        };

        let c = TestPoly {
            coeffs: vec![
                R::try_from(0).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(3).unwrap(),
            ],
        };

        assert_eq!(a, a);
        assert_ne!(a, b);
        assert_ne!(a, c);
    }

    #[test]
    fn polynomial_equality_padded() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "6", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        assert_eq!(
            TestPoly::zero(),
            TestPoly {
                coeffs: vec![R::zero()]
            }
        );

        let a = TestPoly {
            coeffs: vec![
                R::try_from(0).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(0).unwrap(),
            ],
        };

        let b = TestPoly {
            coeffs: vec![
                R::try_from(0).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(0).unwrap(),
                R::try_from(0).unwrap(),
            ],
        };

        let c = TestPoly {
            coeffs: vec![
                R::try_from(0).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(3).unwrap(),
                R::try_from(0).unwrap(),
            ],
        };

        assert_eq!(a, a);
        assert_eq!(a, b);
        assert_ne!(a, c);
    }

    #[test]
    fn can_div_rem_basic_polynomial() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "6", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let a = TestPoly {
            coeffs: vec![
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(0).unwrap(),
                R::try_from(4).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(3).unwrap(),
            ],
        };

        let b = TestPoly {
            coeffs: vec![
                R::try_from(1).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(1).unwrap(),
            ],
        };

        let (q, rem) = a.vartime_div_rem_restricted_rhs(&b);

        let actual = q * b + rem;

        assert_eq!(actual, a);
    }

    #[test]
    fn can_div_rem_basic_padded_polynomial() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "6", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        let a = TestPoly {
            coeffs: vec![
                R::try_from(1).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(0).unwrap(),
                R::try_from(4).unwrap(),
                R::try_from(2).unwrap(),
                R::try_from(3).unwrap(),
                R::try_from(0).unwrap(),
            ],
        };

        let b = TestPoly {
            coeffs: vec![
                R::try_from(1).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(1).unwrap(),
                R::try_from(0).unwrap(),
            ],
        };

        let (q, rem) = a.vartime_div_rem_restricted_rhs(&b);

        let actual = q * b + rem;

        assert_eq!(actual, a);
    }

    #[test]
    fn can_div_rem_random_polynomials() {
        #[derive(BarrettConfig)]
        #[barrett_config(modulus = "1234", num_limbs = 1)]
        struct Cfg;

        type R = Zq<1, BarrettBackend<1, Cfg>>;
        type TestPoly = Polynomial<Zq<1, BarrettBackend<1, Cfg>>>;

        fn test_case() {
            let target_den_degree = Uniform::from(2..50).sample(&mut thread_rng());
            let target_num_degree = Uniform::from(1..200).sample(&mut thread_rng());

            let mut num = TestPoly { coeffs: vec![] };

            let mut den = num.clone();

            for _ in 0..target_den_degree {
                let coeff = Uniform::from(0..1234u64).sample(&mut thread_rng());
                den.coeffs.push(R::try_from(coeff).unwrap());
            }

            // Leading coefficient in denominator must be a 1.
            den.coeffs.push(R::one());

            for _ in 0..=target_num_degree {
                let coeff = Uniform::from(0..1234u64).sample(&mut thread_rng());
                num.coeffs.push(R::try_from(coeff).unwrap());
            }

            let (q, rem) = num.vartime_div_rem_restricted_rhs(&den);

            assert_eq!(q * &den + &rem, num);
            assert!(rem.vartime_degree() < den.vartime_degree());
        }

        for _ in 0..100 {
            test_case();
        }
    }
}
