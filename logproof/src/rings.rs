use crypto_bigint::{
    subtle::{ConditionallySelectable, ConstantTimeGreater},
    Uint,
};
use curve25519_dalek::scalar::Scalar;
use sunscreen_math::{
    ring::{extend_bigint, ArithmeticBackend, BarrettBackend, Zq},
    BarrettConfig,
};

use crate::math::ModSwitch;

#[derive(BarrettConfig)]
#[barrett_config(
    modulus = "7237005577332262213973186563042994240857116359379907606001950938285454250989",
    num_limbs = 4,
    is_field = true
)]
/**
 * The configuration type to set up the Ristretto field
 */
pub struct RistrettoConfig {}

/**
 * An Arkworks analogue to curve25519-dalek::scalar::Scalar. An integer
 * modulo Ord(Ristretto).
 */
pub type ZqRistretto = Zq<4, BarrettBackend<4, RistrettoConfig>>;

/**
 * The configuration type for q modulus SEAL BFV uses with 128-bit security
 * an lattice dimension 8192.
 *
 * # Remarks
 *
 * SEAL uses Q =
 * 0x7fffffd8001 * 0x7fffffc8001 * 0xfffffffc001 * 0xffffff6c001 * 0xfffffebc001
 *
 * This can be derived by running
 * `CoefficientModulus::bfv_default(8192, SecurityLevel::TC128)`
 * or by running the underlying SEAL function
 * `CoeffModulus::BFVDefault(8192, sec_level_type::tc128)`
 */
#[derive(BarrettConfig)]
#[barrett_config(
    modulus = "23945240908173643396739775218143152511335532357255169",
    num_limbs = 3
)]
pub struct SealQ128_8192 {}
impl SealQ128_8192 {
    /// The SEAL modulus chain
    pub const Q: &'static [u64] = &[
        0x7fffffd8001,
        0x7fffffc8001,
        0xfffffffc001,
        0xffffff6c001,
        0xfffffebc001,
    ];
}

/**
 * The configuration type for q modulus SEAL BFV uses with 128-bit security
 * an lattice dimension 4096.
 *
 * # Remarks
 *
 * SEAL uses Q =
 * 0xffffee001, 0xffffc4001, 0x1ffffe0001
 *
 * This can be derived by running
 * `CoefficientModulus::bfv_default(4096, SecurityLevel::TC128)`
 * or by running the underlying SEAL function
 * `CoeffModulus::BFVDefault(4096, sec_level_type::tc128)`
 */
#[derive(BarrettConfig)]
#[barrett_config(modulus = "4722344527977019809793", num_limbs = 2)]
pub struct SealQ128_4096 {}
impl SealQ128_4096 {
    /// The SEAL modulus chain
    pub const Q: &'static [u64] = &[0xffffee001, 0xffffc4001, 0x1ffffe0001];
}

/**
 * The configuration type for q modulus SEAL BFV uses with 128-bit security
 * an lattice dimension 2048.
 *
 * # Remarks
 *
 * SEAL uses Q =
 * 0x3fffffff000001
 *
 * This can be derived by running
 * `CoefficientModulus::bfv_default(2048, SecurityLevel::TC128)`
 * or by running the underlying SEAL function
 * `CoeffModulus::BFVDefault(2048, sec_level_type::tc128)`
 */
#[derive(BarrettConfig)]
#[barrett_config(modulus = "18014398492704769", num_limbs = 1)]
pub struct SealQ128_2048 {}
impl SealQ128_2048 {
    /// The SEAL modulus chain
    pub const Q: &'static [u64] = &[0x3fffffff000001];
}

/**
 * The configuration type for q modulus SEAL BFV uses with 128-bit security
 * an lattice dimension 4096.
 *
 * # Remarks
 *
 * SEAL uses Q =
 * 0x7e00001
 *
 * This can be derived by running
 * `CoefficientModulus::bfv_default(1024, SecurityLevel::TC128)`
 * or by running the underlying SEAL function
 * `CoeffModulus::BFVDefault(1024, sec_level_type::tc128)`
 */
#[derive(BarrettConfig)]
#[barrett_config(modulus = "132120577", num_limbs = 1)]
pub struct SealQ128_1024 {}
impl SealQ128_1024 {
    /// The SEAL modulus chain
    pub const Q: &'static [u64] = &[0x7e00001];
}

#[allow(unused)]
/**
 * The field SEAL's BFV scheme uses with 128-bit security and a poly degree
 * of 8192.
 */
pub type ZqSeal128_8192 = Zq<3, BarrettBackend<3, SealQ128_8192>>;

#[allow(unused)]
/**
 * The field SEAL's BFV scheme uses with 128-bit security and a poly degree
 * of 4096.
 */
pub type ZqSeal128_4096 = Zq<2, BarrettBackend<2, SealQ128_4096>>;

#[allow(unused)]
/**
 * The field SEAL's BFV scheme uses with 128-bit security and a poly degree
 * of 2048.
 */
pub type ZqSeal128_2048 = Zq<1, BarrettBackend<1, SealQ128_2048>>;

#[allow(unused)]
/**
 * The field SEAL's BFV scheme uses with 128-bit security and a poly degree
 * of 1024.
 */
pub type ZqSeal128_1024 = Zq<1, BarrettBackend<1, SealQ128_1024>>;

impl<Q1, Q2, const N: usize, const M: usize> ModSwitch<Zq<N, Q2>> for Zq<M, Q1>
where
    Q1: ArithmeticBackend<M>,
    Q2: ArithmeticBackend<N>,
{
    fn mod_switch_unsigned(&self) -> Zq<N, Q2> {
        assert!(N >= M);

        Zq::try_from(extend_bigint(&self.into_bigint())).unwrap()
    }

    fn mod_switch_signed(&self) -> Zq<N, Q2> {
        let val = self.into_bigint();
        let mod_div_2 = Q1::MODULUS_DIV_2;

        // Assume the value is negative
        let as_neg = Q1::MODULUS.wrapping_sub(&val);

        let abs_value = Uint::min(val, as_neg);

        let as_neg = Q2::MODULUS.wrapping_sub(&extend_bigint(&abs_value));

        let gt = val.ct_gt(&mod_div_2);

        let zq_pos = extend_bigint(&val);

        Zq::try_from(Uint::conditional_select(&zq_pos, &as_neg, gt)).unwrap()
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

impl FieldFrom<ZqRistretto> for Scalar {
    fn field_from(x: ZqRistretto) -> Self {
        let x = x.into_bigint();
        let x: [u8; 32] = unsafe { std::mem::transmute(*x.as_words()) };

        Self::from_bits(x)
    }
}

impl FieldFrom<Scalar> for ZqRistretto {
    fn field_from(x: Scalar) -> Self {
        let x = x.to_bytes();
        let x: [u64; 4] = unsafe { std::mem::transmute(x) };

        Self::try_from(Uint::from_words(x)).unwrap()
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

#[cfg(test)]
mod tests {
    use sunscreen_math::{poly::Polynomial, ring::RingModulus};

    use crate::math::Log2;

    use super::*;

    #[test]
    fn can_add_numbers() {
        let a = ZqRistretto::from(7);
        let b = ZqRistretto::from(3);

        let c = a + b;

        let expected = ZqRistretto::from(10);

        assert_eq!(c, expected);
    }

    #[test]
    fn can_multiply_numbers() {
        let a = ZqRistretto::from(7);
        let b = ZqRistretto::from(3);

        let c = a * b;

        let expected = ZqRistretto::from(21);

        assert_eq!(c, expected);

        let a = ZqSeal128_8192::from(7);
        let b = ZqSeal128_8192::from(3);

        let c = a * b;

        let expected = ZqSeal128_8192::from(21);

        assert_eq!(c, expected);
    }

    #[test]
    fn can_multiply_polynomials() {
        let mut coeffs = vec![];

        for i in 1..9 {
            coeffs.push(ZqRistretto::from(i));
        }

        let (left, right) = coeffs.split_at(4);

        let a = Polynomial {
            coeffs: left.to_owned(),
        };
        let b = Polynomial {
            coeffs: right.to_owned(),
        };

        let c = a * &b;

        // 32 x^6 + 52 x^5 + 61 x^4 + 60 x^3 + 34 x^2 + 16 x + 5
        let expected = Polynomial {
            coeffs: vec![
                ZqRistretto::from(5),
                ZqRistretto::from(16),
                ZqRistretto::from(34),
                ZqRistretto::from(60),
                ZqRistretto::from(61),
                ZqRistretto::from(52),
                ZqRistretto::from(32),
            ],
        };

        assert_eq!(c, expected);
    }

    #[test]
    fn can_mod_switch_unsigned() {
        let a = ZqSeal128_8192::from(7);

        let b: ZqRistretto = a.mod_switch_unsigned();

        assert_eq!(extend_bigint(&a.into_bigint()), b.into_bigint());
    }

    #[test]
    fn mod_switch_ristretto_is_nop() {
        let a = ZqRistretto::from(21);

        assert_eq!(a.mod_switch_unsigned(), ZqRistretto::from(21));
    }

    #[test]
    fn can_mod_switch_signed() {
        assert_eq!(
            ZqSeal128_8192::from(-42).mod_switch_signed(),
            ZqRistretto::from(-42)
        );
        assert_eq!(
            ZqSeal128_8192::from(42).mod_switch_signed(),
            ZqRistretto::from(42)
        );
    }

    #[test]
    fn can_log_2_modulus() {
        let modulus: Uint<4> = ZqSeal128_8192::field_modulus();
        assert_eq!(Log2::log2(&modulus), 173);
    }

    #[test]
    fn can_convert_fp_ristretto_to_scalar() {
        let x = ZqRistretto::from(42);

        let y = Scalar::field_from(x);

        assert_eq!(y, Scalar::from(42u64));
    }

    #[test]
    fn can_convert_scalar_to_fp_ristretto() {
        let x = Scalar::from(42u32);

        let y = ZqRistretto::field_from(x);

        assert_eq!(y, ZqRistretto::from(42u64));
    }
}
