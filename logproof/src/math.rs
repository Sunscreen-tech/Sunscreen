use std::{borrow::Borrow, ops::Mul};

use crypto_bigint::Uint;
use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar, traits::VartimeMultiscalarMul};
use rand::Rng;
use rayon::prelude::{IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator};
use sunscreen_math::{
    poly::Polynomial,
    ring::{ArithmeticBackend, Ring, Zq},
    One, Zero,
};

/**
 * Creates a random 256-bit value.
 */
pub fn rand256() -> [u8; 32] {
    let mut data = [0u8; 32];

    rand::thread_rng().fill(&mut data);

    data
}

/**
 * Finds the next highest power of two. If the value is a power of two, then this function will return the following power of two. For example:
 *
 * input `is_power_of_two` `next_power_of_two` `next_higher_power_of_two`
 *     0        no                  1                      1
 *     1     yes (2^0)              1                      2
 *     2     yes (2^1)              2                      4
 *     3        no                  4                      4
 */
pub fn next_higher_power_of_two(x: u64) -> u64 {
    let offset = if x.is_power_of_two() { 1 } else { 0 };

    (x + offset).next_power_of_two()
}

/**
 * Methods for switching elements between finite fields.
 */
pub trait ModSwitch<R> {
    /// Treat the input value as unsigned in the current [`Ring`] and produce
    /// the same unsigned value in the [`Ring`] `R`.
    ///
    /// # Panics
    /// If [`self`] doesn't fit in the returned ring `R`.
    fn mod_switch_unsigned(&self) -> R;

    /// Treat the input value as signed in the current field
    /// (i.e. [-q/2, q/2]) and produce the same signed value in `F`
    /// (i.e. [-p/2, p/2]).
    fn mod_switch_signed(&self) -> R;
}

impl<R1, R2> ModSwitch<Polynomial<R2>> for Polynomial<R1>
where
    R1: Ring + ModSwitch<R2>,
    R2: Ring,
{
    fn mod_switch_unsigned(&self) -> Polynomial<R2> {
        let new_coeffs = self
            .coeffs
            .iter()
            .map(|x| x.mod_switch_unsigned())
            .collect();

        Polynomial { coeffs: new_coeffs }
    }

    fn mod_switch_signed(&self) -> Polynomial<R2> {
        let new_coeffs = self.coeffs.iter().map(|x| x.mod_switch_signed()).collect();

        Polynomial { coeffs: new_coeffs }
    }
}

/**
 * A trait for computing the infinity norm of a type.
 */
pub trait InfinityNorm {
    /**
     * The result type containing the norm.
     */
    type Output;

    /**
     * Compute the infinity norm.
     */
    fn infinity_norm(&self) -> Self::Output;
}

impl<R> InfinityNorm for Polynomial<R>
where
    R: Ring + Ord,
{
    type Output = R;

    fn infinity_norm(&self) -> Self::Output {
        self.coeffs
            .iter()
            .fold(R::zero(), |max, x| if x > &max { x.clone() } else { max })
    }
}

#[allow(unused)]
/**
 * For debugging. Makes a polynomial with the given i64 coefficients in converted to field Fp.
 */
pub fn make_poly<R: Ring + From<u64>>(coeffs: &[i64]) -> Polynomial<R> {
    let zero = R::zero();
    let coeffs = coeffs
        .iter()
        .map(|x| {
            if *x >= 0 {
                R::from(*x as u64)
            } else {
                zero.clone() - R::from(x.unsigned_abs())
            }
        })
        .collect();

    Polynomial { coeffs }
}

/**
 * A trait for computing log base 2 of a given value.
 */
pub trait Log2 {
    /**
     * Compute the log2 of the given value.
     *
     * # Panics
     * When the given value is zero.
     */
    fn log2(x: &Self) -> u64;

    /**
     * Compute the ceiling of the log2 of the given value.
     *
     * # Panics
     * When the given value is zero.
     */
    fn ceil_log2(x: &Self) -> u64;
}

impl Log2 for u64 {
    /**
     * An implementation of log2 that works on stable.
     */
    fn log2(x: &Self) -> u64 {
        let mut mask = 0x8000_0000_0000_0000;

        for i in 0..64 {
            if mask & x != 0 {
                return 63 - i;
            }

            mask >>= 1;
        }

        panic!("Value was zero.");
    }

    fn ceil_log2(x: &Self) -> u64 {
        let ceil_factor = if x.is_power_of_two() { 0 } else { 1 };
        Self::log2(x) + ceil_factor
    }
}

fn is_power_of_two_bigint<const N: usize>(b: &Uint<N>) -> bool {
    b.as_limbs().iter().map(|u| u.0.count_ones()).sum::<u32>() == 1
}

impl<const N: usize> Log2 for Uint<N> {
    fn log2(x: &Self) -> u64 {
        for i in 0..x.as_limbs().len() {
            let i = x.as_limbs().len() - i - 1;
            let limb = x.as_limbs()[i];

            if limb.0 == 0 {
                continue;
            }

            return Log2::log2(&limb.0) + (i as u64) * 64;
        }

        panic!("Value was zero.");
    }

    fn ceil_log2(x: &Self) -> u64 {
        let ceil_factor = if is_power_of_two_bigint(x) { 0 } else { 1 };

        Self::log2(x) + ceil_factor
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> Log2 for Zq<N, B> {
    fn log2(x: &Self) -> u64 {
        Uint::<N>::log2(&x.val)
    }

    fn ceil_log2(x: &Self) -> u64 {
        Uint::<N>::ceil_log2(&x.val)
    }
}

/**
 * A custom [`std::ops::Rem`] trait so we can implement
 * modulus on foreign crate types.
 *
 * # Remarks
 * see [`std::ops::Rem`].
 */
pub trait Rem<Rhs = Self> {
    /**
     * The type resulting from the Rem operation.
     */
    type Output;

    /**
     * Compute `self % rhs`.
     *
     * # Remarks
     * see [`std::ops::Rem::rem`].
     */
    fn rem(self, rhs: Rhs) -> Self::Output;
}

/**
 * A trait for computing a tensor product.
 */
pub trait Tensor<Rhs> {
    /**
     * The type resulting from the tensor operation.
     */
    type Output;

    /**
     * Compute the tensor product of two objects.
     */
    fn tensor(self, rhs: Rhs) -> Self::Output;
}

impl<T, U> Tensor<U> for Vec<T>
where
    U: Borrow<[T]>,
    T: Clone + Mul<T, Output = T>,
{
    type Output = Self;

    fn tensor(self, rhs: U) -> Self::Output {
        self.as_slice().tensor(rhs)
    }
}

impl<T, U> Tensor<U> for &[T]
where
    U: Borrow<[T]>,
    T: Clone + Mul<T, Output = T>,
{
    type Output = Vec<T>;

    fn tensor(self, rhs: U) -> Self::Output {
        let rhs = rhs.borrow();

        let mut output = Vec::with_capacity(self.len().checked_mul(rhs.len()).unwrap());

        for i in self {
            for j in rhs {
                output.push(i.clone() * j.clone());
            }
        }

        output
    }
}

/**
 * A trait that appends zero elements to a vector to make its length a
 * power of 2.
 */
pub trait Pad {
    /**
     * The type resulting from the pad operation.
     */
    type Output;

    /**
     * Takes a slice of length n and pads it with zeros until the length
     * is a power of 2.
     */
    fn pad_to_power_of_2(&self) -> Self::Output;
}

impl<T> Pad for [T]
where
    T: Clone + Zero,
{
    type Output = Vec<T>;

    fn pad_to_power_of_2(&self) -> Self::Output {
        if self.is_empty() || self.len().is_power_of_two() {
            return self.to_owned();
        }

        let new_len = self.len().next_power_of_two();

        if new_len == 0 {
            panic!("Slice too long.");
        }

        let mut new_vec = self.to_owned();

        for _ in self.len()..new_len {
            new_vec.push(T::zero());
        }

        new_vec
    }
}

/**
 * A trait that given `x` and `d`, computes `[x^0, x^1, x^2, ... x^(d-1)]`.
 */
pub trait Powers
where
    Self: Sized,
{
    /**
     * Computes the powers as defined in the trait.
     */
    fn powers(&self, d: usize) -> Vec<Self>;
}

impl Powers for Scalar {
    fn powers(&self, d: usize) -> Vec<Self> {
        let mut x = Self::one();
        let mut result = Vec::with_capacity(d);

        for _ in 0..d {
            result.push(x);

            x *= self;
        }

        result
    }
}

impl<B, const N: usize> Powers for Zq<N, B>
where
    B: ArithmeticBackend<N>,
{
    fn powers(&self, d: usize) -> Vec<Self> {
        let mut x = Self::one();
        let mut result = Vec::with_capacity(d);

        for _ in 0..d {
            result.push(x);

            x = x * *self;
        }

        result
    }
}

/**
 * Computes the powers for 2's complement of b bits.
 *
 * # Example
 * ```rust,ignore
 * let powers = FpRistretto::twos_complement_coeffs(6);
 *
 * assert_eq!(
 *   powers,
 *   vec![
 *     FpRistretto::from(1),
 *     FpRistretto::from(2),
 *     FpRistretto::from(4),
 *     FpRistretto::from(8),
 *     FpRistretto::from(16),
 *     FpRistretto::from(-32)
 *   ]
 * );
 * ```
 */
pub trait TwosComplementCoeffs
where
    Self: Sized,
{
    /**
     * Decompose the coefficients into binary 2's complement values. If the
     * input is zero, then an empty vector is returned.
     *
     */
    fn twos_complement_coeffs(b: usize) -> Vec<Self>;
}

impl TwosComplementCoeffs for Scalar {
    fn twos_complement_coeffs(b: usize) -> Vec<Self> {
        if b == 0 {
            return Vec::new();
        }

        let mut results = Vec::with_capacity(b);

        let mut cur_power = Scalar::one();
        let two = Scalar::from(2u32);

        for _ in 0..b {
            results.push(cur_power);
            cur_power *= two;
        }

        let last = results.len() - 1;
        let r = -results[last];
        results[last] = r;

        results
    }
}

/**
 * A parallelized multiscalar multiplication.
 */
pub fn parallel_multiscalar_multiplication(s: &[Scalar], p: &[RistrettoPoint]) -> RistrettoPoint {
    let msm = s
        .par_iter()
        .chunks(16384)
        .zip(p.par_iter().chunks(16384))
        .map(|(s, p)| RistrettoPoint::vartime_multiscalar_mul(s, p))
        .reduce(RistrettoPoint::default, |x, p| x + p);

    msm
}

impl<B, const N: usize> TwosComplementCoeffs for Zq<N, B>
where
    B: ArithmeticBackend<N>,
{
    fn twos_complement_coeffs(b: usize) -> Vec<Self> {
        if b == 0 {
            return Vec::new();
        }

        let mut results = Vec::with_capacity(b);

        let mut cur_power = Self::one();
        let two = Self::from(2);

        for _ in 0..b {
            results.push(cur_power);
            cur_power = cur_power * two;
        }

        let last = results.len() - 1;
        let r = -results[last];
        results[last] = r;

        results
    }
}

#[cfg(test)]
mod test {
    use sunscreen_math::ring::RingModulus;

    use crate::rings::{ZqRistretto, ZqSeal128_8192};

    use super::*;

    #[test]
    fn can_mod_switch_polynomial() {
        let a = Polynomial::<ZqSeal128_8192> {
            coeffs: vec![
                ZqSeal128_8192::from(1),
                ZqSeal128_8192::from(2),
                ZqSeal128_8192::from(3),
            ],
        };

        let b: Polynomial<ZqRistretto> = a.mod_switch_unsigned();

        assert_eq!(
            b.coeffs,
            vec![
                ZqRistretto::from(1),
                ZqRistretto::from(2),
                ZqRistretto::from(3)
            ]
        );
    }

    #[test]
    fn can_compute_log2_u64() {
        assert_eq!(Log2::log2(&(0x1 << 63)), 63);
        assert_eq!(Log2::log2(&((0x1 << 63) + 7)), 63);
    }

    #[test]
    #[should_panic]
    fn log_2_panic_on_zero_u64() {
        Log2::log2(&0);
    }

    #[test]
    fn can_compute_log2_bigint() {
        let a = Uint::from_words([1, 2, 3, 4]);

        assert_eq!(Log2::log2(&a), 194);
    }

    #[test]
    #[should_panic]
    fn log_2_panic_on_zero_bigint() {
        let a = Uint::from_words([0, 0, 0, 0]);

        Log2::log2(&a);
    }

    #[test]
    fn modulus_in_standard_form() {
        let m = ZqSeal128_8192::field_modulus();
        // [0x1b9f30440ff08001, 0x25d3e81a62469512, 0x3fffffaa0018]
        // == 23945240908173643396739775218143152511335532357255169
        let expected = Uint::from_words([0x1b9f30440ff08001, 0x25d3e81a62469512, 0x3fffffaa0018]);

        assert_eq!(m, expected);
    }

    #[test]
    fn field_modulus_div_2_in_standard_form() {
        let m = ZqSeal128_8192::field_modulus_div_2();

        // 23945240908173643396739775218143152511335532357255169 / 2
        // = 11972620154086821698369887609071576255667766178627584
        // = [[0xdcf982207f84000, 0x12e9f40d31234a89, 0x1fffffd5000c]
        let expected = Uint::from_words([0xdcf982207f84000, 0x12e9f40d31234a89, 0x1fffffd5000c]);

        assert_eq!(m, expected);
    }

    #[test]
    fn can_tensor() {
        let a = vec![1, 2, 3];
        let b = vec![4, 5];

        let c = a.tensor(b);

        assert_eq!(c[0], 4);
        assert_eq!(c[1], 5);
        assert_eq!(c[2], 8);
        assert_eq!(c[3], 10);
        assert_eq!(c[4], 12);
        assert_eq!(c[5], 15);
    }

    #[test]
    fn can_pad() {
        type Fq = ZqSeal128_8192;

        let a = [Fq::from(1), Fq::from(2), Fq::from(3)];

        let b = a.pad_to_power_of_2();

        assert_eq!(b.len(), 4);
        assert_eq!(a[0], b[0]);
        assert_eq!(a[1], b[1]);
        assert_eq!(a[2], b[2]);
        assert_eq!(<Fq as super::Zero>::zero(), b[3]);
    }

    #[test]
    fn can_powers() {
        let d = 16;
        let powers = Scalar::from(2u32).powers(d);

        for (i, p) in powers.iter().enumerate() {
            assert_eq!(*p, Scalar::from(0x1u32 << i));
        }
    }

    #[test]
    fn can_twos_complement_coeffs() {
        type Zq = ZqRistretto;

        let coeffs = Zq::twos_complement_coeffs(8);

        assert_eq!(
            coeffs,
            vec![
                Zq::from(1),
                Zq::from(2),
                Zq::from(4),
                Zq::from(8),
                Zq::from(16),
                Zq::from(32),
                Zq::from(64),
                -Zq::from(128),
            ]
        );

        let assert_encoding = |val: i8| {
            let expected = Zq::from(val as i64);

            let bits: u8 = unsafe { std::mem::transmute(val) };
            let mut actual = <Zq as Zero>::zero();

            for (i, c) in coeffs.iter().enumerate() {
                let bit = ((0x1 << i) & bits) >> i;
                actual = actual + Zq::from(bit as u64) * c;
            }

            assert_eq!(actual, expected);
        };

        // Assert the powers actually produce a 2s complement encoding.
        assert_encoding(-42);
        assert_encoding(-1);
        assert_encoding(i8::MIN);
        assert_encoding(i8::MAX);
        assert_encoding(42);
    }

    #[test]
    fn big_int_pow_two() {
        let options = [
            (1u64, true),
            (2, true),
            (4, true),
            (5, false),
            (19, false),
            (8192, true),
            (8193, false),
        ];

        for (value, expected) in options {
            println!("{:?}, {:?}", value, expected);
            let b: Uint<1> = Uint::from(value);
            assert_eq!(is_power_of_two_bigint(&b), expected);
        }

        // Testing higher limbs
        // value is 1 << 68
        let b: Uint<2> = Uint::from_words([0x0, 0x10]);
        assert!(is_power_of_two_bigint(&b));

        let b: Uint<2> = Uint::from_words([0x1, 0x10]);
        assert!(!is_power_of_two_bigint(&b));
    }

    #[test]
    fn ceil_log2_u64() {
        let options = [1u64, 2, 4, 5, 19, 8192, 8193];

        for value in options {
            let f = value as f64;
            let expected = f.log2().ceil() as u64;

            let calculated = Log2::ceil_log2(&value);

            assert_eq!(calculated, expected);
        }
    }

    #[test]
    fn ceil_log2_bitint() {
        let options = [1u64, 2, 4, 5, 19, 8192, 8193];

        for value in options {
            let f = value as f64;
            let expected = f.log2().ceil() as u64;

            let b: Uint<1> = Uint::from(value);
            let calculated = Log2::ceil_log2(&b);

            assert_eq!(calculated, expected);
        }
    }

    #[test]
    fn test_next_higher_power_of_two() {
        assert_eq!(next_higher_power_of_two(0), 1);
        assert_eq!(next_higher_power_of_two(1), 2);
        assert_eq!(next_higher_power_of_two(2), 4);
        assert_eq!(next_higher_power_of_two(3), 4);
        assert_eq!(next_higher_power_of_two(4), 8);
    }
}
