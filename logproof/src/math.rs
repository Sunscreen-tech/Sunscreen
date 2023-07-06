use std::{borrow::Borrow, ops::Mul};

use ark_ff::{BigInt, BigInteger, FftField, Field, Fp, MontBackend, MontConfig, Zero as ArkZero};
use ark_poly::univariate::DensePolynomial;
use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar, traits::VartimeMultiscalarMul};
use rand::Rng;
use rayon::prelude::{IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator};

use crate::fields::extend_bigint;

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
 * A wrapper trait for getting the zero element of a field.
 */
pub trait Zero {
    /**
     * Returns the zero element.
     */
    fn zero() -> Self;
}

impl Zero for Scalar {
    fn zero() -> Self {
        Self::zero()
    }
}

impl<F: Field> Zero for DensePolynomial<F> {
    fn zero() -> Self {
        <Self as ArkZero>::zero()
    }
}

/**
 * A trait for getting the one element of a field.
 */
pub trait One {
    /**
     * Returns the one element.
     */
    fn one() -> Self;
}

impl One for Scalar {
    fn one() -> Self {
        Self::one()
    }
}

impl<F: Field> One for DensePolynomial<F> {
    fn one() -> Self {
        Self {
            coeffs: vec![F::one()],
        }
    }
}

/**
 * Methods for switching elements between finite fields.
 */
pub trait ModSwitch<F> {
    /**
     * Treat the input value as unsigned in the current field and produce
     * the same unsigned value in the field `F`.
     */
    fn mod_switch_unsigned(&self) -> F;

    /**
     * Treat the input value as signed in the current field
     * (i.e. [-q/2, q/2]) and produce the same signed value in `F`
     * (i.e. [-p/2, p/2]).
     */
    fn mod_switch_signed(&self) -> F;
}

impl<F1: Field, F2: Field> ModSwitch<DensePolynomial<F2>> for DensePolynomial<F1>
where
    F1: Field + ModSwitch<F2>,
    F2: Field,
{
    fn mod_switch_unsigned(&self) -> DensePolynomial<F2> {
        let new_coeffs = self
            .coeffs
            .iter()
            .map(|x| x.mod_switch_unsigned())
            .collect();

        DensePolynomial { coeffs: new_coeffs }
    }

    fn mod_switch_signed(&self) -> DensePolynomial<F2> {
        let new_coeffs = self.coeffs.iter().map(|x| x.mod_switch_signed()).collect();

        DensePolynomial { coeffs: new_coeffs }
    }
}

/**
 * For Z_q fields, returns q.
 */
pub trait FieldModulus<const N: usize> {
    /**
     * The modulus of the field.
     */
    fn field_modulus() -> BigInt<N>;

    /**
     * The modulus of the field divided by 2.
     */
    fn field_modulus_div_2() -> BigInt<N>;
}

impl<F: MontConfig<M>, const M: usize, const N: usize> FieldModulus<N>
    for Fp<MontBackend<F, M>, M>
{
    fn field_modulus() -> BigInt<N> {
        extend_bigint(&F::MODULUS)
    }

    fn field_modulus_div_2() -> BigInt<N> {
        let mut a = F::MODULUS;
        a.div2();

        extend_bigint(&a)
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

impl<F: Field> InfinityNorm for DensePolynomial<F> {
    type Output = F;

    fn infinity_norm(&self) -> Self::Output {
        self.coeffs
            .iter()
            .fold(F::zero(), |max, x| if x > &max { *x } else { max })
    }
}

/**
 * This unfortunate trait exists because ark_poly's DensePolynomial
 * multiplication algorithm relies on an FFT, which isn't possible for
 * all fields. This trait abstracts this issue away, using `naive_mul`
 * when an FFT isn't possible
 */
pub trait SmartMul<Rhs> {
    /**
     * The type that results from the multiplication.
     */
    type Output;

    /**
     * Multiplies 2 values together and returns the result.
     */
    fn smart_mul(self, rhs: Rhs) -> Self::Output;
}

impl<Rhs, F> SmartMul<Rhs> for DensePolynomial<F>
where
    F: Field + FftField,
    Rhs: Borrow<Self>,
{
    type Output = DensePolynomial<F>;

    fn smart_mul(self, rhs: Rhs) -> Self::Output {
        (&self).smart_mul(rhs)
    }
}

impl<Rhs, F> SmartMul<Rhs> for &DensePolynomial<F>
where
    F: Field + FftField,
    Rhs: Borrow<DensePolynomial<F>>,
{
    type Output = DensePolynomial<F>;

    fn smart_mul(self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();

        // TODO: Use FFT polynomial multiplcation if possible.
        self.naive_mul(rhs)
    }
}

impl<F, Rhs, const N: usize> SmartMul<Rhs> for Fp<MontBackend<F, N>, N>
where
    F: MontConfig<N>,
    Rhs: Borrow<Fp<MontBackend<F, N>, N>>,
{
    type Output = Fp<MontBackend<F, N>, N>;

    fn smart_mul(self, rhs: Rhs) -> Self::Output {
        (&self).smart_mul(rhs)
    }
}

impl<F, Rhs, const N: usize> SmartMul<Rhs> for &Fp<MontBackend<F, N>, N>
where
    F: MontConfig<N>,
    Rhs: Borrow<Fp<MontBackend<F, N>, N>>,
{
    type Output = Fp<MontBackend<F, N>, N>;

    fn smart_mul(self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();

        *self * rhs
    }
}

/**
 * For debugging. Prints a Polynomial to stdout. Coefficients are in
 * hexadecimal.
 */
pub fn print_polynomial<F: Field>(p: &DensePolynomial<F>) {
    for (i, coef) in p.coeffs.iter().enumerate() {
        let coef_str = coef.to_string();

        let val = coef_str
            .split('(')
            .last()
            .unwrap()
            .split(')')
            .next()
            .unwrap()
            .trim_start_matches('0');

        let val = if val.is_empty() { "0" } else { val };

        if i == 0 {
            print!("{}", val);
        } else {
            print!("{} * x^{}", val, i);
        }

        if i < p.coeffs.len() - 1 {
            print!(" + ")
        }
    }
}

#[allow(unused)]
/**
 * For debugging. Makes a polynomial with the given i64 coefficients in converted to field Fp.
 */
pub fn make_poly<F: Field + From<u64>>(coeffs: &[i64]) -> DensePolynomial<F> {
    let zero = F::zero();
    let coeffs = coeffs
        .iter()
        .map(|x| {
            if *x >= 0 {
                F::from(*x as u64)
            } else {
                zero - F::from(-*x as u64)
            }
        })
        .collect();

    DensePolynomial { coeffs }
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

fn is_power_of_two_bigint<const N: usize>(b: &BigInt<N>) -> bool {
    b.as_ref().iter().map(|u| u.count_ones()).sum::<u32>() == 1
}

impl<const N: usize> Log2 for BigInt<N> {
    fn log2(x: &Self) -> u64 {
        for i in 0..x.0.len() {
            let i = x.0.len() - i - 1;
            let limb = x.0[i];

            if limb == 0 {
                continue;
            }

            return Log2::log2(&limb) + (i as u64) * 64;
        }

        panic!("Value was zero.");
    }

    fn ceil_log2(x: &Self) -> u64 {
        let ceil_factor = if is_power_of_two_bigint(x) { 0 } else { 1 };

        Self::log2(x) + ceil_factor
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

impl<F: Field, Rhs> Rem<Rhs> for DensePolynomial<F>
where
    Rhs: Borrow<DensePolynomial<F>>,
{
    type Output = DensePolynomial<F>;

    fn rem(self, rhs: Rhs) -> Self::Output {
        (&self).rem(rhs)
    }
}

impl<F: Field, Rhs> Rem<Rhs> for &DensePolynomial<F>
where
    Rhs: Borrow<DensePolynomial<F>>,
{
    type Output = DensePolynomial<F>;

    fn rem(self, rhs: Rhs) -> Self::Output {
        let rhs: &DensePolynomial<F> = rhs.borrow();

        let div: DensePolynomial<F> = self / rhs;

        self - &(rhs.naive_mul(&div))
    }
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

impl<F, const N: usize> Powers for Fp<MontBackend<F, N>, N>
where
    F: MontConfig<N>,
{
    fn powers(&self, d: usize) -> Vec<Self> {
        let mut x = Self::one();
        let mut result = Vec::with_capacity(d);

        for _ in 0..d {
            result.push(x);

            x *= *self;
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
        .map(|(s, p)| RistrettoPoint::vartime_multiscalar_mul(s.into_iter(), p.into_iter()))
        .reduce(RistrettoPoint::default, |x, p| x + p);

    msm
}

impl<F, const N: usize> TwosComplementCoeffs for Fp<MontBackend<F, N>, N>
where
    F: MontConfig<N>,
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
            cur_power *= two;
        }

        let last = results.len() - 1;
        let r = -results[last];
        results[last] = r;

        results
    }
}

#[cfg(test)]
mod test {
    use crate::fields::{FpRistretto, FqSeal128_8192};
    use ark_poly::Polynomial;

    use super::*;

    #[test]
    fn can_mod_switch_polynomial() {
        let a: DensePolynomial<FqSeal128_8192> = DensePolynomial {
            coeffs: vec![
                FqSeal128_8192::from(1),
                FqSeal128_8192::from(2),
                FqSeal128_8192::from(3),
            ],
        };

        let b: DensePolynomial<FpRistretto> = a.mod_switch_unsigned();

        assert_eq!(
            b.coeffs,
            vec![
                FpRistretto::from(1),
                FpRistretto::from(2),
                FpRistretto::from(3)
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
        let a = BigInt::new([1, 2, 3, 4]);

        assert_eq!(Log2::log2(&a), 194);
    }

    #[test]
    #[should_panic]
    fn log_2_panic_on_zero_bigint() {
        let a = BigInt::new([0, 0, 0, 0]);

        Log2::log2(&a);
    }

    #[test]
    fn modulus_in_standard_form() {
        let m = FqSeal128_8192::field_modulus();
        // 0x3fffff5_9001c92abc42a839_730ec3bf0a9c26b9_923cfd7defdc4001
        // == 421249101157150430150591791601812858371395928330411389778873040897
        let expected = BigInt::new([
            0x923cfd7defdc4001,
            0x730ec3bf0a9c26b9,
            0x9001c92abc42a839,
            0x3fffff5,
        ]);

        assert_eq!(m, expected);
    }

    #[test]
    fn field_modulus_div_2_in_standard_form() {
        let m = FqSeal128_8192::field_modulus_div_2();

        // 421249101157150430150591791601812858371395928330411389778873040897 / 2
        // = 210624550578575215075295895800906429185697964165205694889436520448
        // = 0x1fffffa_c800e4955e21541c_b98761df854e135c_c91e7ebef7ee2000
        let expected = BigInt::new([
            0xc91e7ebef7ee2000,
            0xb98761df854e135c,
            0xc800e4955e21541c,
            0x1fffffa,
        ]);

        assert_eq!(m, expected);
    }

    #[test]
    fn can_poly_rem() {
        type Fp = FqSeal128_8192;

        let f = make_poly::<Fp>(&[1, 0, 0, 0, 1]);

        let a = make_poly::<Fp>(&[1, 2, 3, 4, 5, 6, 7, 8, 9]);

        let r = (&a).rem(&f);

        let div = &a / &f;

        let val = &(f.naive_mul(&div)) + &r;

        assert_eq!(r.degree(), 3);
        assert_eq!(f.degree(), 4);
        assert_eq!(a, val);
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
        type Fq = FqSeal128_8192;

        let a = vec![Fq::from(1), Fq::from(2), Fq::from(3)];

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
        type Fp = FpRistretto;

        let coeffs = Fp::twos_complement_coeffs(8);

        assert_eq!(
            coeffs,
            vec![
                Fp::from(1),
                Fp::from(2),
                Fp::from(4),
                Fp::from(8),
                Fp::from(16),
                Fp::from(32),
                Fp::from(64),
                -Fp::from(128),
            ]
        );

        let assert_encoding = |val: i8| {
            let expected = Fp::from(val);

            let bits: u8 = unsafe { std::mem::transmute(val) };
            let mut actual = <Fp as Zero>::zero();

            for (i, c) in coeffs.iter().enumerate() {
                let bit = ((0x1 << i) & bits) >> i;
                actual += Fp::from(bit) * c;
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
            let b: BigInt<1> = BigInt::from(value);
            assert_eq!(is_power_of_two_bigint(&b), expected);
        }

        // Testing higher limbs
        // value is 1 << 68
        let b: BigInt<2> = BigInt!("295147905179352825856");
        assert!(is_power_of_two_bigint(&b));

        let b: BigInt<2> = BigInt!("295147905179352825857");
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

            let b: BigInt<1> = BigInt::from(value);
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
