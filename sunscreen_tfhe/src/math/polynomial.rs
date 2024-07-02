use std::{
    num::Wrapping,
    ops::{Add, AddAssign, Mul, Neg, Sub, SubAssign},
};

use num::traits::MulAdd;

use crate::{
    dst::FromMutSlice, entities::PolynomialRef, scratch::allocate_scratch, ToF64, Torus, TorusOps,
};

/// Polynomial subtraction in place. This is equivalent to `a -= b` for each
/// coefficient in the polynomial.
pub fn polynomial_sub_assign<S>(lhs: &mut PolynomialRef<S>, rhs: &PolynomialRef<S>)
where
    S: SubAssign + Copy,
{
    for (a, b) in lhs
        .coeffs_mut()
        .iter_mut()
        .zip(rhs.coeffs().iter().copied())
    {
        *a -= b;
    }
}

/// Negate a polynomial in place. This is equivalent to `a = -a` for each
/// coefficient in the polynomial.
pub fn polynomial_negate<S>(c: &mut PolynomialRef<S>)
where
    S: Clone + Copy + Neg<Output = S>,
{
    for c in c.coeffs_mut().iter_mut() {
        *c = -*c;
    }
}

/// Compute `c = a * s` where `s` is scalar.
pub fn polynomial_scalar_mul<S, T, U>(c: &mut PolynomialRef<S>, a: &PolynomialRef<T>, s: U)
where
    S: Clone,
    T: Clone + Copy + Mul<U, Output = S>,
    U: Clone + Copy,
{
    for (c, a) in c.coeffs_mut().iter_mut().zip(a.coeffs().iter()) {
        *c = *a * s
    }
}

/// Compute `c += a * s`, where `s` is scalar.
pub fn polynomial_scalar_mad<S, T, U>(c: &mut PolynomialRef<S>, a: &PolynomialRef<T>, s: U)
where
    S: Clone + Copy + Add<S, Output = S>,
    T: Clone + Copy + MulAdd<U, S, Output = S>,
    U: Clone + Copy,
{
    for (c, a) in c.coeffs_mut().iter_mut().zip(a.coeffs().iter()) {
        *c = a.mul_add(s, *c);
    }
}

/// Compute `c = a + b` where a, b, and c are polynomials.
pub fn polynomial_add<S>(c: &mut PolynomialRef<S>, a: &PolynomialRef<S>, b: &PolynomialRef<S>)
where
    S: Clone + Copy + Add<S, Output = S>,
{
    assert_eq!(c.len(), a.len());
    assert_eq!(c.len(), b.len());

    for (c, (a, b)) in c
        .as_mut_slice()
        .iter_mut()
        .zip(a.as_slice().iter().zip(b.as_slice().iter()))
    {
        *c = *a + *b;
    }
}

/// Polynomial addition in place. This is equivalent to `a += b` for each
/// coefficient in the polynomial.
pub fn polynomial_add_assign<S>(lhs: &mut PolynomialRef<S>, rhs: &PolynomialRef<S>)
where
    S: AddAssign + Copy,
{
    for (a, b) in lhs
        .coeffs_mut()
        .iter_mut()
        .zip(rhs.coeffs().iter().copied())
    {
        *a += b;
    }
}

/// Compute `c = a - b` where a, b, and c are polynomials.
pub fn polynomial_sub<S>(c: &mut PolynomialRef<S>, a: &PolynomialRef<S>, b: &PolynomialRef<S>)
where
    S: Clone + Copy + Sub<S, Output = S>,
{
    assert_eq!(c.len(), a.len());
    assert_eq!(c.len(), b.len());

    for (c, (a, b)) in c
        .as_mut_slice()
        .iter_mut()
        .zip(a.as_slice().iter().zip(b.as_slice().iter()))
    {
        *c = *a - *b;
    }
}

/// Compute `c += a \[*\] b` where `a` in Z\[X\]/f and `c, b` in T\[X\]/f, and
/// \[*\] is the external product between these rings.
pub fn polynomial_external_mad<S>(
    c: &mut PolynomialRef<Torus<S>>,
    a: &PolynomialRef<Torus<S>>,
    b: &PolynomialRef<S>,
) where
    S: TorusOps,
{
    polynomial_mad_impl(c, a, b);
}

/// Compute `c += a * b` where `*` the multiplication of the two polynomials of
/// degree (N - 1) modulo (X^N + 1). This is done with the naive algorithm, and
/// hence has O(N^2) time.
pub fn polynomial_mad<S>(
    c: &mut PolynomialRef<Wrapping<S>>,
    a: &PolynomialRef<Wrapping<S>>,
    b: &PolynomialRef<Wrapping<S>>,
) where
    S: TorusOps,
    Wrapping<S>: Sub<Wrapping<S>, Output = Wrapping<S>>
        + Add<Wrapping<S>, Output = Wrapping<S>>
        + Mul<Wrapping<S>, Output = Wrapping<S>>,
{
    polynomial_mad_impl(c, a, b);
}

/// Compute `c += a * b` where `*` the multiplication of the two polynomials of
/// degree (N - 1) modulo (X^N + 1). This is done with the naive algorithm, and
/// hence has O(N^2) time.
fn polynomial_mad_impl<S, T, U>(
    c: &mut PolynomialRef<S>,
    a: &PolynomialRef<T>,
    b: &PolynomialRef<U>,
) where
    U: Clone + Copy + ToF64,
    T: Mul<U, Output = S> + Clone + Copy + ToF64,
    S: Sub<S, Output = S> + Add<S, Output = S> + Clone + Copy,
{
    assert!(a.len().is_power_of_two());
    assert_eq!(a.len(), b.len());
    assert_eq!(a.len(), c.len());

    let len = a.len();

    // Polynomial's length is a power of 2, so use mask to perform modulus.
    let mask = len - 1;

    let coeffs = c.coeffs_mut();

    let mut poly_f64 = allocate_scratch::<f64>(a.len());
    let poly_f64_ref = PolynomialRef::from_mut_slice(poly_f64.as_mut_slice());

    a.map_into(poly_f64_ref, |x| x.to_f64());

    for (i, l) in a.coeffs().iter().copied().enumerate() {
        for (j, r) in b.coeffs().iter().copied().enumerate() {
            if i + j >= len {
                // Reduce mod len and subtract due to negacyclic
                // polynomials.
                let index = (i + j) & mask;
                coeffs[index] = coeffs[index] - l * r;
            } else {
                let index = i + j;
                coeffs[index] = coeffs[index] + l * r;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    #[derive(BarrettConfig)]
    #[barrett_config(modulus = "18446744073709551616", num_limbs = 2)]
    pub struct U64Config;

    pub type Zq64 = Zq<2, BarrettBackend<2, U64Config>>;

    use crate::{
        entities::{Polynomial, PolynomialFft},
        normalized_torus_distance, ReinterpretAsSigned, ReinterpretAsUnsigned,
    };

    use super::*;
    use num::{Complex, Zero};
    use rand::{thread_rng, RngCore};
    use sunscreen_math::{
        poly::Polynomial as BasePolynomial,
        ring::{BarrettBackend, Zq},
        BarrettConfig, One,
    };

    #[test]
    fn can_multiply_polynomials() {
        // Compare our negacyclic polynomial implementation against
        // sunscreen_math computing (a * b) mod (X^N + 1).
        fn case(a: &PolynomialRef<Torus<u64>>, b: &PolynomialRef<u64>) {
            let actual = a * b;

            let mut f = vec![<Zq64 as sunscreen_math::Zero>::zero(); a.len() + 1];

            let len = a.len();

            f[0] = Zq64::one();
            f[a.len()] = Zq64::one();

            let f = BasePolynomial { coeffs: f };

            let a = BasePolynomial {
                coeffs: a
                    .coeffs()
                    .iter()
                    .map(|x| Zq64::from(x.inner()))
                    .collect::<Vec<_>>(),
            };

            let b = BasePolynomial {
                coeffs: b.coeffs().iter().map(|x| Zq64::from(*x)).collect(),
            };

            let expected = a * b;

            let (_, expected) = expected.vartime_div_rem_restricted_rhs(&f);

            let expected = expected
                .coeffs
                .iter()
                .take(len)
                .map(|x| Torus::from(x.val.as_words()[0]))
                .collect::<Vec<_>>();

            let expected = Polynomial::new(&expected);

            assert_eq!(actual, expected);
        }

        for _ in 0..50 {
            let len = thread_rng().next_u64() % 8 + 1;
            let len = 0x1 << len;

            let a = (0..len)
                .map(|_| Torus::from(thread_rng().next_u64()))
                .collect::<Vec<_>>();
            let a = Polynomial::new(&a);

            let b = (0..len)
                .map(|_| thread_rng().next_u64())
                .collect::<Vec<_>>();
            let b = Polynomial::new(&b);

            case(&a, &b);
        }
    }

    #[test]
    fn can_roundtrip_polynomial() {
        let poly = (0..1024u64).collect::<Vec<_>>();
        let poly = Polynomial::new(&poly);

        let mut actual = Polynomial::<u64>::zero(poly.len());

        let mut out = PolynomialFft::new(&vec![Complex::zero(); poly.len() / 2]);

        poly.fft(&mut out);
        out.ifft(&mut actual);

        assert_eq!(poly, actual);
    }

    #[test]
    fn can_multiply_polynomials_fft() {
        for _ in 0..100 {
            let a = (0..1024u64)
                .map(|x| Torus::from(x % 0x8000_0000))
                .collect::<Vec<_>>();
            let a = Polynomial::new(&a);
            let b = (0..1024u64).map(|x| x % 16).collect::<Vec<_>>();
            let b = Polynomial::new(&b);

            let mut expected = Polynomial::<Torus<u64>>::zero(a.len());

            polynomial_external_mad(&mut expected, &a, &b);

            let mut a_fft = PolynomialFft::new(&vec![Complex::zero(); a.len() / 2]);
            let mut b_fft = a_fft.clone();
            let mut c_fft = a_fft.clone();

            a.fft(&mut a_fft);
            b.fft(&mut b_fft);

            c_fft.multiply_add(&a_fft, &b_fft);

            let mut actual = Polynomial::<Torus<u64>>::zero(a.len());
            c_fft.ifft(&mut actual);

            assert_eq!(actual, expected);
        }
    }

    #[test]
    fn can_approx_multiply_large_polynomials_fft() {
        let n = 1024;

        for _ in 0..100 {
            // a is uniform torus elements, b is "small" as we'll encounter
            // during radix decomposition.
            let a = (0..n)
                .map(|_| Torus::from(rand::thread_rng().next_u64()))
                .collect::<Vec<_>>();
            let a = Polynomial::new(&a);
            let b = (0..n)
                .map(|_| {
                    let signed =
                        (rand::thread_rng().next_u64() % (0x1 << 16)).reinterpret_as_signed() - 16;

                    signed.reinterpret_as_unsigned()
                })
                .collect::<Vec<_>>();
            let b = Polynomial::new(&b);

            let mut expected = Polynomial::<Torus<u64>>::zero(a.len());

            polynomial_external_mad(&mut expected, &a, &b);

            let mut a_fft = PolynomialFft::new(&vec![Complex::zero(); a.len() / 2]);
            let mut b_fft = a_fft.clone();
            let mut c_fft = a_fft.clone();

            a.fft(&mut a_fft);
            b.fft(&mut b_fft);

            c_fft.multiply_add(&a_fft, &b_fft);

            let mut actual = Polynomial::<Torus<u64>>::zero(a.len());
            c_fft.ifft(&mut actual);

            let error_limit = 1e-9;
            for (a, e) in actual.coeffs().iter().zip(expected.coeffs().iter()) {
                let err = normalized_torus_distance(a, e).abs();
                assert!(err < error_limit, "Error: {} >= {}", err, error_limit);
            }
        }
    }
}
