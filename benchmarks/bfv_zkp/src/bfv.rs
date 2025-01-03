// TODO: Remove
#![allow(unused)]
#![allow(non_local_definitions)]

//! STOP. DO NOT USE THIS CODE FOR PRODUCTION.
//! Security is a non-goal for this library. In fact, this library is known
//! to be insecure.

use ark_ff::{BigInt, BigInteger, Fp, FpConfig, MontBackend, MontConfig, PrimeField};
use ark_poly::univariate::DensePolynomial;
use sunscreen::{
    types::zkp::{Field, FieldSpec, Mod, RnsRingPolynomial, Scale, ToBinary, ToResidues},
    zkp_program, Application, Compiler, Runtime, ZkpApplication, ZkpBackend, ZkpProgramInput,
    ZkpRuntime,
};
use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, BigInt as ZkpBigInt, Proof};

use crate::poly_ring::PolyRing;

const POLY_DEGREE: usize = 4;

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
const LOG_PLAIN_MODULUS: usize = 10;

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
        poly: DensePolynomial { coeffs },
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
        b_shift <<= i;

        let mut pow = BigInt::<N>::one();
        pow <<= i;

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

type BfvPoly<F> = RnsRingPolynomial<F, POLY_DEGREE, 1>;

#[zkp_program]
fn prove_enc<F: FieldSpec>(
    m: BfvPoly<F>,
    e_1: BfvPoly<F>,
    e_2: BfvPoly<F>,
    u: BfvPoly<F>,
    #[constant] expected_c_0: BfvPoly<F>,
    #[constant] expected_c_1: BfvPoly<F>,
    #[constant] p_0: BfvPoly<F>,
    #[constant] p_1: BfvPoly<F>,
    #[constant] delta: Field<F>,
) {
    let q = Field::<F>::from(CIPHER_MODULUS).into_program_node();

    fn log2(x: usize) -> usize {
        let log2 = 8 * std::mem::size_of::<usize>() - x.leading_zeros() as usize;

        if x.is_power_of_two() {
            log2
        } else {
            log2 + 1
        }
    }

    let log_q = log2(CIPHER_MODULUS as usize);

    let c_0 = m.clone().scale(delta) + p_0 * u.clone() + e_1.clone();
    let c_0 = RnsRingPolynomial::signed_reduce(c_0, q, log_q);

    let c_1 = p_1 * u.clone() + e_2.clone();
    let c_1 = RnsRingPolynomial::signed_reduce(c_1, q, log_q);

    // e_* coefficients are gaussian distributed from -19 to 19.
    // If we add 18 to these values, we get a distribution from
    // [0, 36], which we can range check.
    let chi_offset = Field::from(19).into_program_node();

    for i in 0..1 {
        for j in 0..POLY_DEGREE {
            // Check that u_* in [0, 2), m_* in [0, P),
            // e_1_* and e_2_* in [0, 32)
            u.residues()[i][j].to_unsigned::<1>();
            m.residues()[i][j].to_unsigned::<LOG_PLAIN_MODULUS>();
            (e_1.residues()[i][j] + chi_offset).to_unsigned::<6>();
            (e_2.residues()[i][j] + chi_offset).to_unsigned::<6>();

            c_0.residues()[i][j].constrain_eq(expected_c_0.residues()[i][j]);
            c_1.residues()[i][j].constrain_eq(expected_c_1.residues()[i][j]);
        }
    }
}

pub fn compile_proof() -> ZkpApplication {
    Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(prove_enc)
        .compile()
        .unwrap()
}

fn ark_bigint_to_native_field<B: ZkpBackend, F: MontConfig<N>, const N: usize>(
    x: Fp<MontBackend<F, N>, N>,
) -> Field<B::Field> {
    let x = x.into_bigint();
    let zkp_bigint = ark_bigint_to_zkp_bigint(x);
    Field::from(zkp_bigint)
}

type BpBackendField = <BulletproofsBackend as ZkpBackend>::Field;
type BpField = Field<BpBackendField>;

fn public_bfv_proof_params(
    ciphertext: &Ciphertext,
    public_key: &PublicKey,
) -> Vec<ZkpProgramInput> {
    let (p_0, p_1) = public_key.clone();
    let (c_0, c_1) = ciphertext.clone();

    let p_0 = into_rns_poly(p_0);
    let p_1 = into_rns_poly(p_1);

    let c_0 = into_rns_poly(c_0);
    let c_1 = into_rns_poly(c_1);

    let delta = BpField::from(CIPHER_MODULUS / PLAIN_MODULUS);

    vec![c_0.into(), c_1.into(), p_0.into(), p_1.into(), delta.into()]
}

fn into_rns_poly<F: MontConfig<N>, const N: usize>(
    x: PolyRing<F, N>,
) -> RnsRingPolynomial<BpBackendField, POLY_DEGREE, 1> {
    let mut coeffs = x
        .poly
        .iter()
        .map(|x| ark_bigint_to_native_field::<BulletproofsBackend, _, N>(*x))
        .collect::<Vec<BpField>>();

    coeffs.resize(POLY_DEGREE, BpField::from(0u8));

    let coeffs: [BpField; POLY_DEGREE] = coeffs.try_into().unwrap();

    RnsRingPolynomial::from([coeffs])
}

fn ark_bigint_to_zkp_bigint<const N: usize>(x: BigInt<N>) -> ZkpBigInt {
    assert!(N <= 8);

    let mut words = [0; 8];
    words[..N].copy_from_slice(&x.0[..N]);

    ZkpBigInt::from_words(words)
}

/**
 * First lifts a signed value in F_q into F_s before creating
 * a native field.
 */
fn signed_into_rns_poly<F: MontConfig<N>, const N: usize>(
    x: PolyRing<F, N>,
) -> RnsRingPolynomial<BpBackendField, POLY_DEGREE, 1> {
    let mut q_div_2 = F::MODULUS;
    q_div_2.div2();
    let q_div_2 = ark_bigint_to_zkp_bigint(q_div_2);
    let q = ark_bigint_to_zkp_bigint(F::MODULUS);

    let offset = BpBackendField::FIELD_MODULUS.wrapping_sub(&q);

    let mut coeffs = x
        .poly
        .iter()
        .map(|x| {
            let x = ark_bigint_to_zkp_bigint(x.into_bigint());

            let x = if x > q_div_2 {
                ZkpBigInt::from(x.wrapping_add(&offset))
            } else {
                x
            };

            x.into()
        })
        .collect::<Vec<BpField>>();

    coeffs.resize(POLY_DEGREE, BpField::from(0u8));

    let coeffs: [BpField; POLY_DEGREE] = coeffs.try_into().unwrap();

    RnsRingPolynomial::from([coeffs])
}

pub fn prove_public_encryption(
    app: &ZkpApplication,
    message: &Poly,
    encryption_data: &(Ciphertext, Noise, Poly),
    public_key: &PublicKey,
) -> Proof {
    let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

    let prog = app.get_zkp_program(prove_enc).unwrap();

    let (ciphertext, (e_1, e_2), u) = encryption_data.clone();

    let (p_0, p_1) = public_key.clone();

    let m = into_rns_poly(message.clone());

    let e_1 = signed_into_rns_poly(e_1);
    let e_2 = signed_into_rns_poly(e_2);
    let u = into_rns_poly(u);

    let private_args: Vec<ZkpProgramInput> = vec![m.into(), e_1.into(), e_2.into(), u.into()];

    let const_args = public_bfv_proof_params(&ciphertext, public_key);

    runtime
        .prove(prog, private_args, vec![], const_args)
        .unwrap()
}

pub fn verify_public_encryption(
    app: &ZkpApplication,
    proof: &Proof,
    ciphertext: &Ciphertext,
    public_key: &PublicKey,
) {
    let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

    let const_args = public_bfv_proof_params(ciphertext, public_key);

    let program = app.get_zkp_program(prove_enc).unwrap();

    runtime.verify(program, proof, vec![], const_args).unwrap();
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
fn can_prove_encryption() {
    env_logger::init();

    let (public, private) = gen_keys();

    let mut message = Poly::zero();

    for i in 0..POLY_DEGREE {
        message.poly.coeffs.push(Fp::from(i as u32));
    }

    let res = encrypt(&public, &message, POLY_DEGREE);

    let app = compile_proof();

    let proof = prove_public_encryption(&app, &message, &res, &public);

    verify_public_encryption(&app, &proof, &res.0, &public);
}

#[test]
fn can_roundtrip_ints() {
    let x = Fq::from(1234u32);
    let y = MontBackend::into_bigint(x);
    let y = Fq::from(y);

    assert_eq!(x, y);
}
