/**
 * Types and functions for testing logproof setups. Not meant to be used in
 * production, only for testing.
 */
use crypto_bigint::{NonZero, Uint};
use seal_fhe::{
    BFVEncoder, BFVScalarEncoder, BfvEncryptionParametersBuilder, CoefficientModulus, Context,
    Decryptor, Encryptor, KeyGenerator, Modulus, PlainModulus, PolynomialArray, SecurityLevel,
};
use sunscreen_math::{
    poly::Polynomial,
    ring::{ArithmeticBackend, BarrettBackend, BarrettConfig, Ring, Zq},
    Zero,
};

use crate::{linear_algebra::Matrix, math::make_poly, rings::ZqRistretto, Bounds};

/**
 * All information for a problem of the form `AS = T` in `Z_q[X]/f`. Useful for
 * demonstrating full knowledge proofs before performing zero knowledge proofs.
 * Similar to [LogProofProverKnowledge](crate::LogProofProverKnowledge) except
 * any field limb size is allowed.
 */
pub struct LatticeProblem<Q>
where
    Q: Ring,
{
    /// Public A
    pub a: Matrix<Polynomial<Q>>,

    /// Private message and encryption components S
    pub s: Matrix<Polynomial<Q>>,

    /// Result of A * S
    pub t: Matrix<Polynomial<Q>>,

    /// Polynomial divisor
    pub f: Polynomial<Q>,

    /// Bounds on elements in S
    pub b: Matrix<Bounds>,
}

/**
 * Remove an element trailing in a vector. This can be helpful for types
 * like `DensePolynomial`, which do not work properly if the polynomials
 * passed in have a leading polynomial coefficient of zero.
 */
pub fn strip_trailing_value<T>(mut v: Vec<T>, trim_value: T) -> Vec<T>
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
pub fn convert_to_smallint(
    coeff_modulus: &[Modulus],
    poly_array: PolynomialArray,
) -> Vec<Vec<i64>> {
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
 * coefficients. Each outer vector element is one polynomial. Leading zeros are
 * automatically trimmed.
 */
pub fn convert_to_small_coeffs(
    coeff_modulus: &[Modulus],
    poly_array: PolynomialArray,
) -> Vec<Vec<i64>> {
    convert_to_smallint(coeff_modulus, poly_array)
        .into_iter()
        .map(|v| strip_trailing_value(v, 0))
        .collect()
}

/**
 * Convert a `PolynomialArray` to a vector of `DensePolynomial`, where all the
 * coefficients are small (less than any of the constituent coefficient moduli).
 */
pub fn convert_to_polynomial_by_small_coeffs<Q>(
    coeff_modulus: &[Modulus],
    poly_array: PolynomialArray,
) -> Vec<Polynomial<Q>>
where
    Q: Ring + From<u64>,
{
    convert_to_small_coeffs(coeff_modulus, poly_array)
        .into_iter()
        .map(|v| make_poly(&v))
        .collect::<Vec<Polynomial<Q>>>()
}

/**
 * Converts a `PolynomialArray` into a vector of `DensePolynomial`
 * regardless of the magnitude of the coefficients.
 */
pub fn convert_to_polynomial<B, const N: usize>(
    poly_array: PolynomialArray,
) -> Vec<Polynomial<Zq<N, B>>>
where
    B: ArithmeticBackend<N>,
{
    let chunk_size = poly_array.coeff_modulus_size() as usize;

    let bigint_values = poly_array
        .as_multiprecision_u64s()
        .unwrap()
        .chunks(chunk_size)
        // SEAL sometimes encodes a multiprecision integer with more limbs
        // than needed. The trailing limbs can be safely removed since they
        // are 0.
        .map(|x| Uint::<N>::from_words(x[0..N].try_into().unwrap()))
        .collect::<Vec<_>>();

    bigint_values
        .chunks(poly_array.poly_modulus_degree() as usize)
        .map(|x| {
            let leading_zeros_removed = strip_trailing_value(x.to_vec(), Uint::<N>::ZERO);
            Polynomial {
                coeffs: leading_zeros_removed
                    .iter()
                    .map(|y| Zq::try_from(*y).unwrap())
                    .collect::<Vec<_>>(),
            }
        })
        .collect()
}

/**
 * Calculate the $\Delta$ parameter (floor(q/t)) for the BFV encryption scheme.
 * This is a public parameter in the BFV scheme.
 *
 * # Remarks
 * Since Zq is technically a [`Ring`], division may not be defined.
 * We calculate `q/t` using integer division.
 */
pub fn bfv_delta<const N: usize>(coeff_modulus: ZqRistretto, plaintext_modulus: u64) -> Uint<N> {
    let plain_modulus_bigint = NonZero::new(Uint::from(plaintext_modulus)).unwrap();

    let delta = coeff_modulus.into_bigint().div_rem(&plain_modulus_bigint).0;

    let limbs = delta.as_limbs().map(|l| l.into());
    Uint::<N>::from_words(limbs[0..N].try_into().unwrap())
}

/**
 * Generate a lattice problem for the BFV scheme.
 */
pub fn seal_bfv_encryption_linear_relation<B, const N: usize>(
    message: u64,
    degree: u64,
    plain_modulus: u64,
    batch_encoder: bool,
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

    let public_key = gen.create_public_key();
    let secret_key = gen.secret_key();

    let encryptor = Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();
    let decryptor = Decryptor::new(&ctx, &secret_key).unwrap();

    // Generate plaintext data
    let (plaintext, ciphertext, u_exported, e_exported, r_exported) = if batch_encoder {
        let encoder = BFVEncoder::new(&ctx).unwrap();
        let mut data = vec![0; encoder.get_slot_count()];

        data[0] = message;
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

        (plaintext, ciphertext, u_exported, e_exported, r_exported)
    } else {
        let encoder = BFVScalarEncoder::new();
        // Generate plaintext data
        let plaintext = encoder.encode_unsigned(message).unwrap();

        let (ciphertext, u_exported, e_exported, r_exported) =
            encryptor.encrypt_return_components(&plaintext).unwrap();

        let decrypted = decryptor.decrypt(&ciphertext).unwrap();

        let data = encoder.decode_unsigned(&decrypted).unwrap();

        assert_eq!(message, data, "decryption failed.");

        (plaintext, ciphertext, u_exported, e_exported, r_exported)
    };

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
    let mut m_coeffs = (0..plaintext.len())
        .map(|i| plaintext.get_coefficient(i) as i64)
        .collect::<Vec<i64>>();

    m_coeffs.resize(degree as usize, 0);

    let mut r_coeffs = (0..r_exported.len())
        .map(|i| r_exported.get_coefficient(i) as i64)
        .collect::<Vec<i64>>();

    r_coeffs.resize(degree as usize, 0);

    // Calculate the bounds for each element in S. m and r should have bounds of
    // the plaintext modulus, while u is ternary and e is sampled from the
    // centered binomial distribution with a standard deviation of 3.2.

    let m_bounds = if batch_encoder {
        Bounds(vec![plain_modulus.value(); m_coeffs.len()])
    } else {
        let mut bounds = vec![0; m_coeffs.len()];
        bounds[0] = plain_modulus.value();

        Bounds(bounds)
    };

    let r_bounds = Bounds(vec![plain_modulus.value(); r_coeffs.len()]);
    let u_bounds = Bounds(vec![2; u_small[0].len()]);
    let e1_bounds = Bounds(vec![16; e_small[0].len()]);
    let e2_bounds = Bounds(vec![16; e_small[1].len()]);

    let s_components_bounds = vec![m_bounds, r_bounds, u_bounds, e1_bounds, e2_bounds];
    let b: Matrix<Bounds> = Matrix::from(s_components_bounds);

    LatticeProblem { a, s, t, f, b }
}
