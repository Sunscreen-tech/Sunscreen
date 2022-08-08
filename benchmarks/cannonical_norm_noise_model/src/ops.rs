use seal_fhe::*;
use std::sync::Mutex;
use sunscreen_fhe_program::SchemeType;

use crate::*;

use sunscreen_backend::noise_model::{
    create_ciphertext_with_noise_level,
    CanonicalEmbeddingNormModel, NoiseModel, TargetNoiseLevel,
};

pub fn make_context(
    lattice_dimension: u64,
    plain_modulus: u64,
    security_level: SecurityLevel,
) -> (Context, EncryptionParameters) {
    let params = BfvEncryptionParametersBuilder::new()
        .set_poly_modulus_degree(lattice_dimension)
        .set_coefficient_modulus(
            CoefficientModulus::bfv_default(lattice_dimension, security_level).unwrap(),
        )
        .set_plain_modulus(PlainModulus::raw(plain_modulus).unwrap())
        .build()
        .unwrap();

    let context = Context::new(&params, true, security_level).unwrap();

    (context, params)
}

fn make_keys(
    context: &Context,
) -> (
    PublicKey,
    SecretKey,
    Option<RelinearizationKeys>,
    Option<GaloisKeys>,
) {
    let keygen = KeyGenerator::new(context).unwrap();

    let public_key = keygen.create_public_key();
    let private_key = keygen.secret_key();
    let relin_keys = match keygen.create_relinearization_keys() {
        Ok(v) => Some(v),
        Err(_) => None,
    };
    let galois_keys = match keygen.create_galois_keys() {
        Ok(v) => Some(v),
        Err(_) => None,
    };

    (public_key, private_key, relin_keys, galois_keys)
}

/**
 * Makes all the things needed to evaluate operations.
 */
fn make_seal_things(
    lattice_dimension: u64,
    plain_modulus: u64,
    security_level: SecurityLevel,
) -> (
    Context,
    CanonicalEmbeddingNormModel,
    PublicKey,
    SecretKey,
    Option<RelinearizationKeys>,
    Option<GaloisKeys>,
    Encryptor,
    Decryptor,
    BFVEvaluator,
) {
    let (context, params) = make_context(lattice_dimension, plain_modulus, security_level);

    let params = Params {
        lattice_dimension,
        plain_modulus,
        coeff_modulus: params
            .get_coefficient_modulus()
            .iter()
            .map(|x| x.value())
            .collect(),
        security_level,
        scheme_type: SchemeType::Bfv,
    };

    let model = CanonicalEmbeddingNormModel::new(&params).unwrap();

    let (public_key, private_key, relinearization_keys, galois_keys) = make_keys(&context);

    let encryptor = Encryptor::with_public_key(&context, &public_key).unwrap();

    let decryptor = Decryptor::new(&context, &private_key).unwrap();

    let evaluator = BFVEvaluator::new(&context).unwrap();

    (
        context,
        model,
        public_key,
        private_key,
        relinearization_keys,
        galois_keys,
        encryptor,
        decryptor,
        evaluator,
    )
}

pub fn encryption_noise(
    results: &Mutex<Results>,
    lattice_dimension: u64,
    plain_modulus: u64,
    security_level: SecurityLevel,
) -> Stats {
    let (
        _context,
        model,
        _public_key,
        _private_key,
        _relin_keys,
        _galois,
        encryptor,
        decryptor,
        _evaluator,
    ) = make_seal_things(lattice_dimension, plain_modulus, security_level);

    let predicted_noise = model.encrypt();

    let mut noise = vec![];

    for _ in 0..SAMPLES {
        let plaintext = Plaintext::new().unwrap();
        let ciphertext = encryptor.encrypt(&plaintext).unwrap();
        noise.push(decryptor.invariant_noise(&ciphertext).unwrap() as f64);
    }

    let stats = stats(&noise);

    results.lock().unwrap().output_row(
        &model.params,
        "encrypt",
        predicted_noise,
        None,
        None,
        &stats,
        true,
    );

    stats
}

pub fn add_noise(
    results: &Mutex<Results>,
    n_a: f64,
    n_b: f64,
    lattice_dimension: u64,
    plain_modulus: u64,
    security_level: SecurityLevel,
) {
    let (
        context,
        model,
        public_key,
        private_key,
        relin_keys,
        _galois,
        _encryptor,
        decryptor,
        evaluator,
    ) = make_seal_things(lattice_dimension, plain_modulus, security_level);

    let predicted_noise = model.add_ct_ct(
        n_a,
        n_b,
    );

    let mut noise = vec![];

    for _ in 0..1 {
        let a = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();
        let b = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_b),
        )
        .unwrap();

        let c = evaluator.add(&a, &b).unwrap();

        noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let stats = stats(&noise);

    results.lock().unwrap().output_row(
        &model.params,
        "add",
        predicted_noise,
        Some(n_a),
        Some(n_b),
        &stats,
        true,
    );
}

pub fn add_pt_noise(
    results: &Mutex<Results>,
    n_a: f64,
    lattice_dimension: u64,
    plain_modulus: u64,
    security_level: SecurityLevel,
) {
    let (
        context,
        model,
        public_key,
        private_key,
        relin_keys,
        _galois,
        _encryptor,
        decryptor,
        evaluator,
    ) = make_seal_things(lattice_dimension, plain_modulus, security_level);

    let predicted_noise = model.add_ct_pt(n_a);

    let mut noise = vec![];

    for _ in 0..1 {
        let a = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();
        let mut b = Plaintext::new().unwrap();
        b.resize(1);
        b.set_coefficient(0, 1);

        let c = evaluator.add_plain(&a, &b).unwrap();

        noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let stats = stats(&noise);

    results.lock().unwrap().output_row(
        &model.params,
        "add_plain",
        predicted_noise,
        Some(n_a),
        None,
        &stats,
        true,
    );
}

pub fn mul_noise(
    results: &Mutex<Results>,
    n_a: f64,
    n_b: f64,
    lattice_dimension: u64,
    plain_modulus: u64,
    security_level: SecurityLevel,
) {
    let (
        context,
        model,
        public_key,
        private_key,
        relin_keys,
        _galois,
        _encryptor,
        decryptor,
        evaluator,
    ) = make_seal_things(lattice_dimension, plain_modulus, security_level);

    let predicted_noise = model.mul_ct_ct(
        n_a,
        n_b,
    );
    let mut noise = vec![];

    for _ in 0..SAMPLES {
        let a = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();
        let b = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_b),
        )
        .unwrap();

        let c = evaluator.multiply(&a, &b).unwrap();

        noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let stats = stats(&noise);

    results.lock().unwrap().output_row(
        &model.params,
        "mul",
        predicted_noise,
        Some(n_a),
        Some(n_b),
        &stats,
        relin_keys.is_some(),
    );
}

pub fn mul_pt_noise(
    results: &Mutex<Results>,
    n_a: f64,
    lattice_dimension: u64,
    plain_modulus: u64,
    security_level: SecurityLevel,
) {
    let (
        context,
        model,
        public_key,
        private_key,
        relin_keys,
        _galois,
        _encryptor,
        decryptor,
        evaluator,
    ) = make_seal_things(lattice_dimension, plain_modulus, security_level);

    let predicted_noise = model.mul_ct_pt(n_a);

    let mut noise = vec![];

    for _ in 0..1 {
        let a = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();
        let mut b = Plaintext::new().unwrap();
        b.resize(1);
        b.set_coefficient(0, 1);

        let c = evaluator.multiply_plain(&a, &b).unwrap();

        noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let stats = stats(&noise);

    results.lock().unwrap().output_row(
        &model.params,
        "mul_plain",
        predicted_noise,
        Some(n_a),
        None,
        &stats,
        true,
    );
}

pub fn _swap_noise(
    results: &Mutex<Results>,
    n_a: f64,
    lattice_dimension: u64,
    plain_modulus: u64,
    security_level: SecurityLevel,
) {
    let (
        context,
        model,
        public_key,
        private_key,
        relin_keys,
        galois_keys,
        _encryptor,
        decryptor,
        evaluator,
    ) = make_seal_things(lattice_dimension, plain_modulus, security_level);

    if galois_keys.is_none() {
        return;
    }

    let predicted_noise = model.swap_rows(n_a);

    let mut noise = vec![];

    for _ in 0..SAMPLES {
        let a = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();

        let c = evaluator
            .rotate_columns(&a, &galois_keys.as_ref().unwrap())
            .unwrap();

        noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let stats = stats(&noise);

    results.lock().unwrap().output_row(
        &model.params,
        "swap_rows",
        predicted_noise,
        Some(n_a),
        None,
        &stats,
        true,
    );
}

pub fn _shift_noise(
    results: &Mutex<Results>,
    n_a: f64,
    shift_places: i32,
    lattice_dimension: u64,
    plain_modulus: u64,
    security_level: SecurityLevel,
) {
    let (
        context,
        model,
        public_key,
        private_key,
        relin_keys,
        galois_keys,
        _encryptor,
        decryptor,
        evaluator,
    ) = make_seal_things(lattice_dimension, plain_modulus, security_level);

    if galois_keys.is_none() {
        return;
    }

    let predicted_noise =
        model.shift_left(n_a, shift_places);

    let mut noise = vec![];

    for _ in 0..SAMPLES {
        let a = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();

        let c = evaluator
            .rotate_rows(&a, shift_places, galois_keys.as_ref().unwrap())
            .unwrap();

        noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let stats = stats(&noise);

    results.lock().unwrap().output_row(
        &model.params,
        "shift",
        predicted_noise,
        Some(n_a),
        None,
        &stats,
        true,
    );
}
