use merlin::Transcript;
use seal_fhe::{
    BFVEncoder, BfvEncryptionParametersBuilder, CoefficientModulus, Context, Decryptor, Encryptor,
    KeyGenerator, PlainModulus, PolynomialArray, SecurityLevel,
};

use logproof::{
    linear_algebra::Matrix,
    math::{make_poly, next_higher_power_of_two},
    rings::{SealQ128_1024, SealQ128_2048, SealQ128_4096, SealQ128_8192, ZqRistretto},
    test::{
        bfv_delta, convert_to_polynomial, convert_to_smallint, strip_trailing_value, LatticeProblem,
    },
    Bounds, InnerProductVerifierKnowledge, LogProof, LogProofGenerators, LogProofProverKnowledge,
    LogProofTranscript,
};
use sunscreen_math::{
    poly::Polynomial,
    ring::{BarrettBackend, BarrettConfig, Zq},
    Zero,
};

fn test_seal_linear_relation<B, const N: usize>(
    degree: u64,
    plain_modulus: u64,
) -> LatticeProblem<Zq<N, BarrettBackend<N, B>>>
where
    B: BarrettConfig<N>,
{
    let plain_modulus = PlainModulus::raw(plain_modulus).unwrap();
    let coeff_modulus = CoefficientModulus::bfv_default(degree, SecurityLevel::TC128).unwrap();

    // Calculate the data coefficient modulus, which for fields with more
    // that one modulus in the coefficient modulus set is equal to the
    // product of all but the last moduli in the set.
    let mut data_modulus = ZqRistretto::from(1);

    if coeff_modulus.len() == 1 {
        data_modulus = data_modulus * ZqRistretto::from(coeff_modulus[0].value());
    } else {
        for modulus in coeff_modulus.iter().take(coeff_modulus.len() - 1) {
            data_modulus = data_modulus * ZqRistretto::from(modulus.value());
        }
    }

    // Generate encryption parameters and encrypt/decrypt functions.
    let params = BfvEncryptionParametersBuilder::new()
        .set_poly_modulus_degree(degree)
        .set_coefficient_modulus(coeff_modulus.clone())
        .set_plain_modulus(plain_modulus.clone())
        .build()
        .unwrap();

    let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
    let gen = KeyGenerator::new(&ctx).unwrap();

    let encoder = BFVEncoder::new(&ctx).unwrap();

    let public_key = gen.create_public_key();
    let secret_key = gen.secret_key();

    let encryptor = Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();
    let decryptor = Decryptor::new(&ctx, &secret_key).unwrap();

    // Generate plaintext data
    let mut data = vec![];

    for i in 0..(encoder.get_slot_count() as u64) {
        data.push(i % plain_modulus.value());
    }

    let plaintext = encoder.encode_unsigned(&data).unwrap();

    // Generate an encrypted message with components
    let (ciphertext, u_exported, e_exported, r_exported) = encryptor
        // .encrypt_return_components(&plaintext, true, None)
        .encrypt_return_components(&plaintext)
        .unwrap();

    // Assert that the decryption is correct. If this fails then there is no
    // reason to perform the matrix proof.
    let decrypted = decryptor.decrypt(&ciphertext).unwrap();
    let data_2 = encoder.decode_unsigned(&decrypted).unwrap();
    assert_eq!(data, data_2, "decryption failed.");

    // Convert all components into their polynomial representations in the
    // fields we use in this package.
    let m = Polynomial {
        coeffs: strip_trailing_value(
            (0..plaintext.len())
                .map(|i| Zq::from(plaintext.get_coefficient(i)))
                .collect::<Vec<_>>(),
            Zq::zero(),
        ),
    };

    let u = convert_to_polynomial(u_exported.clone()).pop().unwrap();
    let u_small = convert_to_smallint(&coeff_modulus, u_exported.clone());

    let mut es = convert_to_polynomial(e_exported.clone());
    let e_1 = es.remove(0);
    let e_2 = es.remove(0);
    let e_small = convert_to_smallint(&coeff_modulus, e_exported.clone());

    let mut cs =
        convert_to_polynomial(PolynomialArray::new_from_ciphertext(&ctx, &ciphertext).unwrap());
    let c_0 = cs.remove(0);
    let c_1 = cs.remove(0);

    let mut pk =
        convert_to_polynomial(PolynomialArray::new_from_public_key(&ctx, &public_key).unwrap());
    let p_0 = pk.remove(0);
    let p_1 = pk.remove(0);

    let r_coeffs = (0..r_exported.len())
        .map(|i| r_exported.get_coefficient(i))
        .collect::<Vec<u64>>();
    let r = Polynomial {
        coeffs: r_coeffs
            .iter()
            .map(|r_i| Zq::from(*r_i))
            .collect::<Vec<_>>(),
    };

    // Delta is the constant polynomial with floor (q/t) as it's DC compopnent.
    let delta_dc = bfv_delta(data_modulus, plain_modulus.value());
    let delta_dc = Zq::try_from(delta_dc).unwrap();

    let delta = Polynomial {
        coeffs: vec![delta_dc],
    };

    // Set up the BFV equations.
    let one = make_poly(&[1]);
    let zero = make_poly(&[]);

    let a = Matrix::<Polynomial<_>>::from([
        [
            delta.clone(),
            one.clone(),
            p_0.clone(),
            one.clone(),
            zero.clone(),
        ],
        [
            zero.clone(),
            zero.clone(),
            p_1.clone(),
            zero.clone(),
            one.clone(),
        ],
    ]);

    let s = Matrix::<Polynomial<_>>::from([
        [m.clone()],
        [r.clone()],
        [u.clone()],
        [e_1.clone()],
        [e_2.clone()],
    ]);

    // Set up the field polymonial divisor (x^N + 1).
    let mut f_components = vec![0; (degree + 1) as usize];
    f_components[0] = 1;
    f_components[degree as usize] = 1;
    let f = make_poly(&f_components);

    // We do this without the polynomial division and then perform that at
    // the end.
    let mut t = &a * &s;

    // Divide back to a polynomial of at max degree `degree`
    let t_0 = t[(0, 0)].vartime_div_rem_restricted_rhs(&f).1;
    let t_1 = t[(1, 0)].vartime_div_rem_restricted_rhs(&f).1;
    t[(0, 0)] = t_0;
    t[(1, 0)] = t_1;

    // Test that our equations match the matrix result.
    let t_0_from_eq = (delta * &m).vartime_div_rem_restricted_rhs(&f).1
        + r.clone()
        + (p_0 * &u).vartime_div_rem_restricted_rhs(&f).1
        + e_1;

    let t_1_from_eq = (p_1 * &u).vartime_div_rem_restricted_rhs(&f).1 + e_2;

    // Assertions that the SEAL ciphertext matches our calculated one. We
    // use panics here to avoid the large printout from assert_eq.

    if t[(0, 0)] != t_0_from_eq {
        panic!("Matrix and written out equation match for t_0");
    }

    if t[(1, 0)] != t_1_from_eq {
        panic!("Matrix and written out equation match for t_1");
    }

    if t[(0, 0)] != c_0 {
        panic!("t_0 and c_0 are not equal");
    }

    if t[(1, 0)] != c_1 {
        panic!("t_1 and c_1 are not equal");
    }

    // Assert that the equations are equal when written up as a matrix (this
    // should trivially pass if the above assertions pass)
    assert_eq!(t, Matrix::<Polynomial<_>>::from([[c_0], [c_1]]));

    // Calculate bounds for the zero knowledge proof
    let m_coeffs = (0..degree as usize)
        .map(|i| plaintext.get_coefficient(i) as i64)
        .collect::<Vec<i64>>();

    let r_coeffs = (0..degree as usize)
        .map(|i| r_exported.get_coefficient(i) as i64)
        .collect::<Vec<i64>>();

    let s_components = vec![
        m_coeffs,
        r_coeffs,
        u_small[0].clone(),
        e_small[0].clone(),
        e_small[1].clone(),
    ];

    let s_components_bounds = s_components
        .into_iter()
        .map(|v| {
            Bounds(
                v.into_iter()
                    .map(|x| {
                        if x == 0 {
                            0
                        } else {
                            next_higher_power_of_two(x.unsigned_abs())
                        }
                    })
                    .collect::<Vec<u64>>(),
            )
        })
        .collect::<Vec<Bounds>>();

    let b: Matrix<Bounds> = Matrix::from(s_components_bounds);

    LatticeProblem { a, s, t, f, b }
}

fn zero_knowledge_proof<B, const N: usize>(degree: u64, plain_modulus: u64)
where
    B: BarrettConfig<N>,
{
    let LatticeProblem { a, s, t, f, b } = test_seal_linear_relation::<B, N>(degree, plain_modulus);

    let pk = LogProofProverKnowledge::new(&a, &s, &t, &b, &f);

    let mut transcript = Transcript::new(b"test");
    let mut verify_transcript = transcript.clone();

    let gens = LogProofGenerators::new(pk.vk.l() as usize);
    let u = InnerProductVerifierKnowledge::get_u();

    let proof = LogProof::create(&mut transcript, &pk, &gens.g, &gens.h, &u);

    proof
        .verify(&mut verify_transcript, &pk.vk, &gens.g, &gens.h, &u)
        .unwrap();

    let l = transcript.challenge_scalar(b"verify");
    let r = verify_transcript.challenge_scalar(b"verify");

    assert_eq!(l, r);
}

// This will run the full knowledge proof (which is a trivial amount of time
// in comparison to the zero knowledge proof) before running the zero
// knowledge proof.
#[test]
fn zero_knowledge_bfv_proof_1024() {
    zero_knowledge_proof::<SealQ128_1024, 1>(1024, 12289);
}

#[test]
fn full_knowledge_bfv_proof_2048() {
    test_seal_linear_relation::<SealQ128_2048, 1>(2048, 1032193);
}

#[test]
fn full_knowledge_bfv_proof_4096() {
    test_seal_linear_relation::<SealQ128_4096, 2>(4096, 1032193);
}

#[test]
fn full_knowledge_bfv_proof_8192() {
    test_seal_linear_relation::<SealQ128_8192, 3>(8192, 1032193);
}
