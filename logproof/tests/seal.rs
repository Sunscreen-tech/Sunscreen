use ark_ff::{BigInt, Field, Fp, MontBackend, MontConfig};
use ark_poly::univariate::DensePolynomial;
use merlin::Transcript;
use seal_fhe::{
    BFVEncoder, BfvEncryptionParametersBuilder, CoefficientModulus, Context, Decryptor, Encryptor,
    KeyGenerator, Modulus, PlainModulus, PolynomialArray, SecurityLevel,
};

use logproof::{
    fields::{FpRistretto, SealQ128_1024, SealQ128_2048, SealQ128_4096, SealQ128_8192},
    linear_algebra::Matrix,
    math::{div_rem_bigint, make_poly, next_higher_power_of_two, Rem, Zero},
    InnerProductVerifierKnowledge, LatticeProblem, LogProof, LogProofGenerators,
    LogProofProverKnowledge, LogProofTranscript,
};

/**
 * Remove an element trailing in a vector. This can be helpful for types
 * like `DensePolynomial`, which do not work properly if the polynomials
 * passed in have a leading polynomial coefficient of zero.
 */
fn strip_trailing_value<T>(mut v: Vec<T>, trim_value: T) -> Vec<T>
where
    T: Eq,
{
    while v.last().map_or(false, |c| *c == trim_value) {
        v.pop();
    }

    v
}

/**
 * Converts a polynomial known to have coefficients less than all of the
 * moduli in its associated modulus set into regular integers. The main
 * advantage here over using a polynomial in its normal field is that the
 * polynomial can be moved to a new field without modulus switching.
 */
#[allow(unused)]
fn convert_to_smallint(coeff_modulus: &[Modulus], poly_array: PolynomialArray) -> Vec<Vec<i64>> {
    let first_coefficient = coeff_modulus[0].value();

    let rns = poly_array.as_rns_u64s().unwrap();

    let num_polynomials = poly_array.num_polynomials() as usize;
    let poly_modulus_degree = poly_array.poly_modulus_degree() as usize;
    let coeff_modulus_size = poly_array.coeff_modulus_size() as usize;

    let mut result = vec![vec![0; poly_modulus_degree]; num_polynomials];

    // Clippy suggests this odd way of indexing so we are going with it.
    for (i, r_i) in result.iter_mut().enumerate() {
        for (j, r_i_j) in r_i.iter_mut().enumerate() {
            let index = i * poly_modulus_degree * coeff_modulus_size + j;
            let coeff = rns[index];

            let small_coeff = if coeff > first_coefficient / 2 {
                ((coeff as i128) - (first_coefficient as i128)) as i64
            } else {
                coeff as i64
            };

            *r_i_j = small_coeff;
        }
    }

    result
}

/**
 * Convert a PolynomialArray of small coefficients into a vector of
 * coefficients. Each outer vector element is one polynomial.
 */
#[allow(unused)]
fn convert_to_small_coeffs(
    coeff_modulus: &[Modulus],
    poly_array: PolynomialArray,
) -> Vec<Vec<i64>> {
    convert_to_smallint(coeff_modulus, poly_array)
        .into_iter()
        .map(|v| strip_trailing_value(v, 0))
        .collect()
}

/**
 * Convert a `PolynomialArray` to a vector of `DensePolynomial`, where all
 * the coefficients are small.
 */
#[allow(unused)]
fn convert_to_polynomial_by_small_coeffs<Q>(
    coeff_modulus: &[Modulus],
    poly_array: PolynomialArray,
) -> Vec<DensePolynomial<Q>>
where
    Q: Field,
{
    convert_to_small_coeffs(coeff_modulus, poly_array)
        .into_iter()
        .map(|v| make_poly(&v))
        .collect::<Vec<DensePolynomial<Q>>>()
}

/**
 * Converts a `PolynomialArray` into a vector of `DensePolynomial`
 * regardless of the size of the coefficients.
 */
fn convert_to_polynomial<Q, const N: usize>(
    poly_array: PolynomialArray,
) -> Vec<DensePolynomial<Fp<MontBackend<Q, N>, N>>>
where
    Q: MontConfig<N>,
{
    let chunk_size = poly_array.coeff_modulus_size() as usize;

    let bigint_values = poly_array
        .as_multiprecision_u64s()
        .unwrap()
        .chunks(chunk_size)
        // SEAL sometimes encodes a multiprecision integer with more limbs
        // than needed. The trailing limbs can be safely removed since they
        // are 0.
        .map(|x| BigInt::<N>(x[0..N].try_into().unwrap()))
        .collect::<Vec<BigInt<N>>>();

    bigint_values
        .chunks(poly_array.poly_modulus_degree() as usize)
        .map(|x| {
            let leading_zeros_removed = strip_trailing_value(x.to_vec(), BigInt::<N>::zero());
            DensePolynomial {
                coeffs: leading_zeros_removed
                    .iter()
                    .map(|y| Fp::<MontBackend<Q, N>, N>::from(*y))
                    .collect::<Vec<Fp<MontBackend<Q, N>, N>>>(),
            }
        })
        .collect()
}

fn full_knowledge_proof<F, const N: usize>(
    degree: u64,
    plain_modulus: u64,
) -> LatticeProblem<Fp<MontBackend<F, N>, N>>
where
    F: MontConfig<N>,
{
    let degree = degree;

    let plain_modulus = PlainModulus::raw(plain_modulus).unwrap();
    let coeff_modulus = CoefficientModulus::bfv_default(degree, SecurityLevel::TC128).unwrap();

    // Calculate the data coefficient modulus, which for fields with more
    // that one modulus in the coefficient modulus set is equal to the
    // product of all but the last moduli in the set.
    let mut data_modulus = FpRistretto::from(1);

    if coeff_modulus.len() == 1 {
        data_modulus *= FpRistretto::from(coeff_modulus[0].value());
    } else {
        for modulus in coeff_modulus.iter().take(coeff_modulus.len() - 1) {
            data_modulus *= FpRistretto::from(modulus.value());
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
    let m = DensePolynomial {
        coeffs: strip_trailing_value(
            (0..plaintext.len())
                .map(|i| Fp::from(plaintext.get_coefficient(i)))
                .collect::<Vec<Fp<MontBackend<F, N>, N>>>(),
            Fp::zero(),
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
    let r = DensePolynomial {
        coeffs: r_coeffs
            .iter()
            .map(|r_i| Fp::from(*r_i))
            .collect::<Vec<Fp<MontBackend<F, N>, N>>>(),
    };

    // Delta is the constant polynomial with floor (q/t) as it's DC compopnent.
    let modulus_bigint = MontConfig::into_bigint(data_modulus);
    let modulus_bigint_lowered = BigInt::<N>(modulus_bigint.0[0..N].try_into().unwrap());
    let plain_modulus_bigint = BigInt::<N>::from(plain_modulus.value());
    let delta_dc = div_rem_bigint(modulus_bigint_lowered, plain_modulus_bigint).0;
    let delta_dc = Fp::from(delta_dc);

    let delta = DensePolynomial {
        coeffs: vec![delta_dc],
    };

    // Set up the BFV equations.
    let one = make_poly(&[1]);
    let zero = make_poly(&[]);

    let a = Matrix::<DensePolynomial<Fp<MontBackend<F, N>, N>>>::from([
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

    let s = Matrix::<DensePolynomial<Fp<MontBackend<F, N>, N>>>::from([
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
    let t_0 = Rem::rem(&t[(0, 0)], &f);
    let t_1 = Rem::rem(&t[(1, 0)], &f);
    t[(0, 0)] = t_0;
    t[(1, 0)] = t_1;

    // Test that our equations match the matrix result.
    let t_0_from_eq =
        Rem::rem(delta.naive_mul(&m), &f) + r.clone() + Rem::rem(p_0.naive_mul(&u), &f) + e_1;

    let t_1_from_eq = Rem::rem(p_1.naive_mul(&u), &f) + e_2;

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
    assert_eq!(
        t,
        Matrix::<DensePolynomial<Fp<MontBackend<F, N>, N>>>::from([[c_0], [c_1]])
    );

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
            v.into_iter()
                .map(|x| {
                    if x == 0 {
                        0
                    } else {
                        next_higher_power_of_two(x.unsigned_abs())
                    }
                })
                .collect::<Vec<u64>>()
        })
        .collect::<Vec<Vec<u64>>>();

    let b: Matrix<Vec<u64>> = Matrix::from(s_components_bounds);

    LatticeProblem { a, s, t, f, b }
}

fn zero_knowledge_proof<F, const N: usize>(degree: u64, plain_modulus: u64)
where
    F: MontConfig<N>,
{
    let LatticeProblem { a, s, t, f, b } = full_knowledge_proof::<F, N>(degree, plain_modulus);

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
    full_knowledge_proof::<SealQ128_2048, 1>(2048, 1032193);
}

#[test]
fn full_knowledge_bfv_proof_4096() {
    full_knowledge_proof::<SealQ128_4096, 2>(4096, 1032193);
}

#[test]
fn full_knowledge_bfv_proof_8192() {
    full_knowledge_proof::<SealQ128_8192, 3>(8192, 1032193);
}
