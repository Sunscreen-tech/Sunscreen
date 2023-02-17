use std::borrow::Borrow;

use ark_ff::{
    BigInt, BigInteger, Fp, Fp128, Fp256, FpConfig, MontBackend, MontConfig, One as ArkOne,
    PrimeField, Zero as ArkZero,
};
use curve25519_dalek::scalar::Scalar;

use crate::math::{ModSwitch, One, SmartMul, Zero};

#[derive(MontConfig)]
#[modulus = "7237005577332262213973186563042994240857116359379907606001950938285454250989"]
#[generator = "17"]
/**
 * The configuration type to set up the Ristretto field
 */
pub struct RistrettoConfig {}

/**
 * An Arkworks analogue to curve25519-dalek::scalar::Scalar. An integer
 * modulo Ord(Ristretto).
 */
pub type FpRistretto = Fp256<MontBackend<RistrettoConfig, 4>>;

impl<F, const N: usize> Zero for Fp<MontBackend<F, N>, N>
where
    F: MontConfig<N>,
{
    fn zero() -> Self {
        <Self as ArkZero>::zero()
    }
}

impl<F, const N: usize> One for Fp<MontBackend<F, N>, N>
where
    F: MontConfig<N>,
{
    fn one() -> Self {
        <Self as ArkOne>::one()
    }
}

/**
 * The configuration type for q modulus SEAL BFV uses with 128-bit security
 * an lattice dimension 8192.
 *
 * # Remarks
 *
 * SEAL uses Q =
 * 0x7fffffd8001 * 0x7fffffc8001 * 0xfffffffc001 * 0xffffff6c001 * 0xfffffebc001
 */
#[derive(MontConfig)]
#[modulus = "421249101157150430150591791601812858371395928330411389778873040897"]
#[generator = "3"]
pub struct SealQ128_8192 {}

/**
 * The configuration type for q modulus SEAL BFV uses with 128-bit security
 * an lattice dimension 4096.
 *
 * # Remarks
 *
 * SEAL uses Q =
 * 0xffffee001, 0xffffc4001, 0x1ffffe0001
 */
#[derive(MontConfig)]
#[generator = "3"]
#[modulus = "649033470896967801447398927572993"]
pub struct SealQ128_4096 {}

#[allow(unused)]
/**
 * The field SEAL's BFV scheme uses with 128-bit security and a poly degree
 * of 8192.
 *
 * # Remarks
 * Fp expects the modulus to be prime, but ours isn't. We need to be good
 * children and not use anything that relies on field primality.
 */
pub type FqSeal128_8192 = Fp256<MontBackend<SealQ128_8192, 4>>;

#[allow(unused)]
/**
 * The field SEAL's BFV scheme uses with 128-bit security and a poly degree
 * of 4096.
 *
 * # Remarks
 * Fp expects the modulus to be prime, but ours isn't. We need to be good
 * children and not use anything that relies on field primality.
 */
pub type FqSeal128_4096 = Fp128<MontBackend<SealQ128_4096, 2>>;

/**
 * Extend a [BigInt<M>] to a [BigInt<N>] by appending zeros.
 *
 * # Panics
 * If M > N
 */
pub fn extend_bigint<const N: usize, const M: usize>(x: &BigInt<M>) -> BigInt<N> {
    assert!(M <= N);

    let mut val = BigInt::<N>::zero();

    for (i, limb) in x.0.iter().enumerate() {
        val.0[i] = *limb;
    }

    val
}

impl<F1, F2, const N: usize, const M: usize> ModSwitch<Fp<MontBackend<F2, N>, N>>
    for Fp<MontBackend<F1, M>, M>
where
    F1: MontConfig<M>,
    F2: MontConfig<N>,
{
    fn mod_switch_unsigned(&self) -> Fp<MontBackend<F2, N>, N> {
        let a = MontBackend::into_bigint(self.clone());

        Fp::from(extend_bigint(&a))
    }

    fn mod_switch_signed(&self) -> Fp<MontBackend<F2, N>, N> {
        let val = MontBackend::into_bigint(self.clone());
        let mut mod_div_2 = F1::MODULUS;
        mod_div_2.div2();

        // Assume the value is negative
        let mut as_neg = F1::MODULUS;
        as_neg.sub_with_borrow(&val);

        let abs_value = BigInt::min(val, as_neg);

        let mut as_neg = F2::MODULUS;
        as_neg.sub_with_borrow(&extend_bigint(&abs_value));

        // TODO: Is this timing invariant?
        if val > mod_div_2 {
            Fp::from_bigint(as_neg).unwrap()
        } else {
            Fp::from_bigint(extend_bigint(&val)).unwrap()
        }
    }
}

/**
 * Does the same thing as `From` in core, but copied here to allow
 * implementation on foreign types.
 */
pub trait FieldFrom<T> {
    /**
     * Creates `Self` from a `T`. See [`core::convert::From`].
     */
    fn field_from(x: T) -> Self;
}

/**
 * Does the same thing as `Into` in core, but copied here to allow
 * implementation on foreign types.
 */
pub trait FieldInto<T> {
    /**
     * Creates a `T` from `self`. See [`core::convert::Into`].
     */
    fn field_into(self) -> T;
}

impl<T, U> FieldInto<U> for T
where
    U: FieldFrom<T>,
{
    fn field_into(self) -> U {
        U::field_from(self)
    }
}

impl FieldFrom<FpRistretto> for Scalar {
    fn field_from(x: FpRistretto) -> Self {
        let x = MontBackend::into_bigint(x);
        let x: [u8; 32] = unsafe { std::mem::transmute(x.0) };

        Self::from_bits(x)
    }
}

impl FieldFrom<Scalar> for FpRistretto {
    fn field_from(x: Scalar) -> Self {
        let x = x.to_bytes();
        let x: [u64; 4] = unsafe { std::mem::transmute(x) };

        Self::from(BigInt::new(x))
    }
}

impl<F1, F2> FieldFrom<&[F1]> for Vec<F2>
where
    F1: Copy,
    F2: FieldFrom<F1>,
{
    fn field_from(x: &[F1]) -> Self {
        x.iter().map(|v| (*v).field_into()).collect()
    }
}

impl<Rhs> SmartMul<Rhs> for Scalar
where
    Rhs: Borrow<Scalar>,
{
    type Output = Self;

    fn smart_mul(self, rhs: Rhs) -> Self::Output {
        (&self).smart_mul(rhs)
    }
}

impl<Rhs> SmartMul<Rhs> for &Scalar
where
    Rhs: Borrow<Scalar>,
{
    type Output = Scalar;

    fn smart_mul(self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();

        self * rhs
    }
}

#[cfg(test)]
mod tests {
    use ark_poly::univariate::DensePolynomial;

    use crate::math::{FieldModulus, Log2};

    use super::*;

    #[test]
    fn can_add_numbers() {
        let a = FpRistretto::from(7);
        let b = FpRistretto::from(3);

        let c = a + b;

        let expected = FpRistretto::from(10);

        assert_eq!(c, expected);
    }

    #[test]
    fn can_multiply_numbers() {
        let a = FpRistretto::from(7);
        let b = FpRistretto::from(3);

        let c = a * b;

        let expected = FpRistretto::from(21);

        assert_eq!(c, expected);

        let a = FqSeal128_8192::from(7);
        let b = FqSeal128_8192::from(3);

        let c = a * b;

        let expected = FqSeal128_8192::from(21);

        assert_eq!(c, expected);
    }

    #[test]
    fn can_multiply_polynomials() {
        let mut coeffs = vec![];

        for i in 1..9 {
            coeffs.push(FpRistretto::from(i));
        }

        let (left, right) = coeffs.split_at(4);

        let a = DensePolynomial {
            coeffs: left.to_owned(),
        };
        let b = DensePolynomial {
            coeffs: right.to_owned(),
        };

        let c = a.naive_mul(&b);

        // 32 x^6 + 52 x^5 + 61 x^4 + 60 x^3 + 34 x^2 + 16 x + 5
        let expected = DensePolynomial {
            coeffs: vec![
                FpRistretto::from(5),
                FpRistretto::from(16),
                FpRistretto::from(34),
                FpRistretto::from(60),
                FpRistretto::from(61),
                FpRistretto::from(52),
                FpRistretto::from(32),
            ],
        };

        assert_eq!(c, expected);
    }

    #[test]
    fn seal_prime_field() {
        use ark_ff::Field;

        let a = FqSeal128_8192::from(7);

        let mut e = a.to_base_prime_field_elements();

        assert_eq!(e.len(), 1);
        assert_eq!(e.next().unwrap(), a);
        assert_eq!(1, FqSeal128_8192::extension_degree());
    }

    #[test]
    fn can_mod_switch_unsigned() {
        let a = FqSeal128_8192::from(7);

        let b: FpRistretto = a.mod_switch_unsigned();

        assert_eq!(MontBackend::into_bigint(a), MontBackend::into_bigint(b));
    }

    #[test]
    fn mod_switch_ristretto_is_nop() {
        let a = FpRistretto::from(21);

        assert_eq!(a.mod_switch_unsigned(), FpRistretto::from(21));
    }

    #[test]
    fn can_mod_switch_signed() {
        assert_eq!(
            FqSeal128_8192::from(-42).mod_switch_signed(),
            FpRistretto::from(-42)
        );
        assert_eq!(
            FqSeal128_8192::from(42).mod_switch_signed(),
            FpRistretto::from(42)
        );
    }

    #[test]
    fn can_log_2_modulus() {
        let modulus: BigInt<4> = FqSeal128_8192::field_modulus();
        assert_eq!(Log2::log2(&modulus), 217);
    }

    #[test]
    fn can_convert_fp_ristretto_to_scalar() {
        let x = FpRistretto::from(42);

        let y = Scalar::field_from(x);

        assert_eq!(y, Scalar::from(42u64));
    }

    #[test]
    fn can_convert_scalar_to_fp_ristretto() {
        let x = Scalar::from(42u32);

        let y = FpRistretto::field_from(x);

        assert_eq!(y, FpRistretto::from(42u64));
    }
}
