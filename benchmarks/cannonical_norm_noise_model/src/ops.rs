use seal_fhe::*;
use std::sync::Mutex;
use sunscreen_backend::{Error, Result};
use sunscreen_fhe_program::SchemeType;

use crate::*;

use sunscreen_backend::noise_model::{
    create_ciphertext_with_noise_level, CanonicalEmbeddingNormModel, NoiseModel, TargetNoiseLevel,
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

    let predicted_noise = vec![model.encrypt(); SAMPLES];

    let mut measured_noise = vec![];

    for _ in 0..SAMPLES {
        let plaintext = Plaintext::new().unwrap();
        let ciphertext = encryptor.encrypt(&plaintext).unwrap();
        measured_noise.push(decryptor.invariant_noise(&ciphertext).unwrap() as f64);
    }

    let measured = stats(&measured_noise);
    let predicted = stats(&predicted_noise);
    let diff = stats(&relative_diff(&predicted_noise, &measured_noise));

    results.lock().unwrap().output_row(
        &model.params,
        "encrypt",
        true,
        None,
        None,
        &measured,
        &predicted,
        &diff,
    );

    measured
}

/**
 * Creates a ciphertext with approximately the specified
 * noise level. Guarantees that the noise does not exceed
 * the target. Retries up to 100 times before giving up.
 */
fn create_ciphertext(
    context: &Context,
    public_key: &PublicKey,
    private_key: &SecretKey,
    relin_keys: Option<&RelinearizationKeys>,
    noise_level: TargetNoiseLevel,
) -> Result<Ciphertext> {
    for _ in 0..100 {
        match create_ciphertext_with_noise_level(
            context,
            public_key,
            private_key,
            relin_keys,
            noise_level,
        ) {
            Ok(v) => {
                return Ok(v);
            }
            Err(Error::ImpossibleNoiseFloor) => {
                continue;
            }
            Err(e) => {
                return Err(e);
            }
        }
    }

    Err(Error::ImpossibleNoiseFloor)
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

    let mut measured_noise = vec![];
    let mut predicted_noise = vec![];

    for _ in 0..SAMPLES {
        let a = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();
        let b = create_ciphertext(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_b),
        )
        .unwrap();

        predicted_noise.push(model.add_ct_ct(
            decryptor.invariant_noise(&a).unwrap(),
            decryptor.invariant_noise(&b).unwrap(),
        ));

        let c = evaluator.add(&a, &b).unwrap();

        measured_noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let measured = stats(&measured_noise);
    let predicted = stats(&predicted_noise);
    let diff = stats(&relative_diff(&predicted_noise, &measured_noise));

    results.lock().unwrap().output_row(
        &model.params,
        "add",
        true,
        Some(n_a),
        Some(n_b),
        &measured,
        &predicted,
        &diff,
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

    let mut measured_noise = vec![];
    let mut predicted_noise = vec![];

    let mut b = Plaintext::new().unwrap();
    b.resize(lattice_dimension as usize);

    for i in 0..lattice_dimension {
        b.set_coefficient(i as usize, 1);
    }

    for _ in 0..SAMPLES {
        let a = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();

        let c = evaluator.add_plain(&a, &b).unwrap();

        predicted_noise.push(model.add_ct_pt(decryptor.invariant_noise(&a).unwrap()));
        measured_noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let measured = stats(&measured_noise);
    let predicted = stats(&predicted_noise);
    let diff = stats(&relative_diff(&predicted_noise, &measured_noise));

    results.lock().unwrap().output_row(
        &model.params,
        "add_plain",
        true,
        Some(n_a),
        None,
        &measured,
        &predicted,
        &diff,
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

    let mut measured_noise = vec![];
    let mut predicted_noise = vec![];

    for _ in 0..SAMPLES {
        let a = create_ciphertext(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();
        let b = create_ciphertext(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_b),
        )
        .unwrap();

        let c = evaluator.multiply(&a, &b).unwrap();

        predicted_noise.push(model.mul_ct_ct(
            decryptor.invariant_noise(&a).unwrap(),
            decryptor.invariant_noise(&b).unwrap(),
        ));

        measured_noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let measured = stats(&measured_noise);
    let predicted = stats(&predicted_noise);
    let diff = stats(&relative_diff(&predicted_noise, &measured_noise));

    results.lock().unwrap().output_row(
        &model.params,
        "mul",
        relin_keys.is_some(),
        Some(n_a),
        Some(n_b),
        &measured,
        &predicted,
        &diff,
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

    let mut measured_noise = vec![];
    let mut predicted_noise = vec![];

    let mut b = Plaintext::new().unwrap();
    b.resize(lattice_dimension as usize);

    for i in 0..lattice_dimension {
        b.set_coefficient(i as usize, 1);
    }

    for _ in 0..SAMPLES {
        let a = create_ciphertext_with_noise_level(
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            TargetNoiseLevel::InvariantNoise(n_a),
        )
        .unwrap();

        let c = evaluator.multiply_plain(&a, &b).unwrap();

        predicted_noise.push(model.mul_ct_pt(decryptor.invariant_noise(&a).unwrap()));
        measured_noise.push(decryptor.invariant_noise(&c).unwrap() as f64);
    }

    let measured = stats(&measured_noise);
    let predicted = stats(&predicted_noise);
    let diff = stats(&relative_diff(&predicted_noise, &measured_noise));

    results.lock().unwrap().output_row(
        &model.params,
        "mul_plain",
        true,
        Some(n_a),
        None,
        &measured,
        &predicted,
        &diff,
    );
}
