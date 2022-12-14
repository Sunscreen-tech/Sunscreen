use ark_ff::{MontConfig, Fp, MontBackend, BigInt, BigInteger, FpConfig};
use ark_poly::univariate::DensePolynomial;

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

    let pk = (-(&a * &s + e), a);

    let ring_quotient = Poly::ring_quotient(POLY_DEGREE);

    let pk = (&pk.0 % &ring_quotient, &pk.1 % &ring_quotient);
    let s = &s % &ring_quotient;

    (pk, s)
}

/**
 * Returns `((c_0, c_1), (e_1, e_2), u)`
 */
pub fn encrypt(pk: &PublicKey, message: &Poly, degree: usize) -> (Ciphertext, Noise, Poly) {

    let q = BigInt::from(CIPHER_MODULUS);
    let p = BigInt::from(PLAIN_MODULUS);
    let (delta, _) = div_rem_bigint(q, p);

    let delta = MontBackend::from_bigint(delta).unwrap();

    let (p_0, p_1) = pk.clone(); 
    let e_1 = Poly::rand_gaussian(degree);
    let e_2 = Poly::rand_gaussian(degree);

    let m = message.clone();

    let u = Poly::rand_binary(degree);
    let r = Poly::ring_quotient(POLY_DEGREE);

    let c_0 = &m * &delta + &p_0 * &u + &e_1;

    let c_1 = &(&p_1 * &u) + &e_2;

    ((&c_0 % &r, &c_1 % &r), (&e_1 % &r, &e_2 % &r), &u % &r)
}

/**
 * Decrypt a ciphertext and return the message.
 */
pub fn decrypt(s: &PrivateKey, ct: &Ciphertext) -> Poly {
    let (c_0, c_1) = ct.clone();

    let sum = &c_0 + &c_1 * s;
    let sum = &sum % &PolyRing::ring_quotient(POLY_DEGREE);

    let q: BigInt<2> = BigInt::from(CIPHER_MODULUS);
    let p: BigInt<1> = BigInt::from(PLAIN_MODULUS);

    let mut coeffs = Vec::with_capacity(s.poly.coeffs.len());

    for i in sum.poly.coeffs {
        let i_int = MontConfig::into_bigint(i);
        let p_i = mul_bigint::<1, 2>(i_int, p);

        let val = div_round_bigint(p_i, q);

        // Make a BigInt<2>.
        let p = BigInt::from(PLAIN_MODULUS);
        let (_, val) = div_rem_bigint(val, p);

        coeffs.push(Fq::from(convert_bigint(val)));
    }

    Poly {
        poly: DensePolynomial { coeffs }
    }
}

fn convert_bigint<const N1: usize, const N2: usize>(a: BigInt<N1>) -> BigInt<N2> {
    let mut data = [0u64; N2];

    for (i, limb) in a.0.iter().enumerate() {
        if i < N2 {
            data[i] = *limb;
        }
    }

    BigInt(data)
}

/**
 * Multiplies 2 N-limb BigInt and produces a 2N-limb BigInt.
 */
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

/**
 * Computes the quotient and remainder of a / b.
 */
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

/**
 * Computes round(a / b) on BigInt values.
 */
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

#[test]
fn can_encrypt_decrypt() {
    let (public, private) = gen_keys();

    let mut message = Poly::zero();

    for i in 0..POLY_DEGREE {
        message.poly.coeffs.push(Fp::from(i as u32));
    }

    let (ct, _, _) = encrypt(&public, &message, POLY_DEGREE);

    let m = decrypt(&private, &ct);

    assert_eq!(m.poly, message.poly);
}

#[test]
fn can_roundtrip_ints() {
    let x = Fq::from(1234u32);
    let y = MontBackend::into_bigint(x);
    let y = Fq::from(y);

    assert_eq!(x, y);
}