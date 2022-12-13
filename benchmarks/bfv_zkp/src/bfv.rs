use ark_ff::{MontConfig, Fp, MontBackend, BigInt, BigInteger};

use crate::poly_ring::PolyRing;

const POLY_DEGREE: usize = 1024;

#[derive(MontConfig)]
#[modulus = "132120577"]
#[generator = "2"]
pub struct FqConfig;

pub type Fq = Fp<MontBackend<FqConfig, 1>, 1>;
pub type Poly = PolyRing<FqConfig, 1>;
pub type PrivateKey = Poly;
pub type PublicKey = (Poly, Poly);
pub type Ciphertext = (Poly, Poly);
pub type Noise = (Poly, Poly);

const CIPHER_MODULUS: u64 = 132120577;
const PLAIN_MODULUS: u64 = 1024;

pub fn gen_keys() -> (PublicKey, PrivateKey) {
    let s = PolyRing::rand_binary(POLY_DEGREE);

    let e = PolyRing::rand_gaussian(POLY_DEGREE);
    let a = PolyRing::rand_uniform(POLY_DEGREE);
    let neg_a = -&a;
    let neg_a_s = &neg_a * &s;

    let pk = (&neg_a_s + &e, a);

    (pk, s)
}

/**
 * Returns `((c_0, c_1), (e_1, e_2), u)`
 */
pub fn encrypt(pk: &PublicKey, message: Poly, degree: usize) -> (Ciphertext, Noise, Poly) {

    let q = Fq::from(CIPHER_MODULUS);
    let p = Fq::from(PLAIN_MODULUS);
    let delta = q / p;

    let (p_0, p_1) = pk.clone(); 
    let e_1 = Poly::rand_gaussian(degree);
    let e_2 = Poly::rand_gaussian(degree);


    let del_m = &message * &delta;

    let u = Poly::rand_binary(degree);
    let p_0_u = &p_0 * &u;

    let c_0 = &(&del_m + &p_0_u) + &e_1;

    let c_1 = &(&p_1 * &u) + &e_2;

    ((c_0, c_1), (e_1, e_2), u)
}

/**
 * Decrypt a ciphertext and return the message.
 */
pub fn decrypt(s: &PrivateKey, ct: &Ciphertext) -> Poly {
    let (c_0, c_1) = ct.clone();

    let c_1_s = &c_1 * s;
    let sum = &c_0 + &c_1;

    let q: BigInt<1> = BigInt::from(CIPHER_MODULUS);
    let p: BigInt<2> = BigInt::from(PLAIN_MODULUS);

    for i in sum.poly.coeffs {
        let i_int = MontConfig::into_bigint(i);
        let q_i = mul_bigint::<1, 2>(i_int, q);

        let div_rem = div_rem_bigint(q_i, p);

    }

    todo!();
}

fn convert_bigint<const N1: usize, const N2: usize>(a: BigInt<N1>) -> BigInt<N2> {
    assert!(N2 >= N1);

    let mut data = [0u64; N2];

    for (i, limb) in a.0.iter().enumerate() {
        data[i] = *limb;
    }

    BigInt(data)
}

fn mul_bigint<const N1: usize, const N2: usize>(a: BigInt<N1>, b: BigInt<N1>) -> BigInt<N2> {
    assert_eq!(N2, 2 * N1);

    let mut result = BigInt::zero();
    let mut pow = convert_bigint::<N1, N2>(a);

    for i in 0..64 * N1 {
        if b.get_bit(i) {
            result.add_with_carry(&pow);
        }

        pow.mul2();
    }
    
    result
}

fn div_rem_bigint<const N: usize>(a: BigInt<N>, b: BigInt<N>) -> (BigInt<N>, BigInt<N>) {
    let mut rem = a;
    let mut div = BigInt::zero();

    let mut leading_b = 0;

    if b == BigInt::zero() {
        panic!("Divide by zero.");
    }

    // Find the position of the leading 1 in b.
    for i in 0..64 * N {
        let i = 64 * N - 1 - i;

        if b.get_bit(i) {
            leading_b = i;
            break;
        }
    }

    for i in leading_b..N * 64 {
        let i = 64 * N as u32 - 1 - i as u32; 

        let mut b_shift = b;
        b_shift.muln(i);
    
        let mut pow = BigInt::<N>::one();
        pow.muln(i);

        if b_shift <= rem {
            rem.sub_with_borrow(&b_shift);
            div.add_with_carry(&pow);
        }

        b_shift.div2();
    }

    (div, rem)
}

fn div_round_bigint<const N: usize>(a: BigInt<N>, b: BigInt<N>) -> BigInt<N> {
    let (mut b_2, r) = div_rem_bigint(b, BigInt::from(2u64));
    b_2.add_with_carry(&r);

    let (mut div, rem) = div_rem_bigint(a, b);

    if rem >= b_2 {
        div.add_with_carry(&BigInt::one());
    }
    
    div
}

#[test]
fn can_bigint_mul() {
    let test_mul = |a_u32: u32, b_u32: u32| {
        let a = BigInt::<3>::from(a_u32);
        let b = BigInt::<3>::from(b_u32);

        let expected = BigInt::<6>::from(a_u32 as u64 * b_u32 as u64);

        assert_eq!(mul_bigint(a, b), expected);
    };

    test_mul(7, 3);
    test_mul(3, 7);
    
    test_mul(u32::MAX, u32::MAX);
}

#[test]
fn can_bigint_div() {
    let test_div = |a_u32: u32, b_u32: u32| {
        let a = BigInt::<3>::from(a_u32);
        let b = BigInt::<3>::from(b_u32);

        let div = BigInt::<3>::from(a_u32 as u64 / b_u32 as u64);
        let rem = BigInt::<3>::from(a_u32 as u64 % b_u32 as u64);

        assert_eq!(div_rem_bigint(a, b), (div, rem));
    };

    test_div(7, 3);
    test_div(3, 7);
    test_div(12, 6);
    test_div(15, 4);
    test_div(123456, 1234);
    test_div(6, 3);
    test_div(11, 7);
    
    for i in 0..47 {
        for j in 1..47 {
            test_div(i, j);
        }
    }

    test_div(u32::MAX, u32::MAX);
}

#[test]
fn can_div_round() {
    let test_div = |a_u32: u32, b_u32: u32| {
        let a = BigInt::<3>::from(a_u32);
        let b = BigInt::<3>::from(b_u32);

        let expected = f64::round(a_u32 as f64 / b_u32 as f64);
        let expected = BigInt::<3>::from(expected as u32);

        assert_eq!(div_round_bigint(a, b), expected);
    };

    for i in 0..42 {
        for j in 1..42 {
            test_div(i, j);
        }
    }
}