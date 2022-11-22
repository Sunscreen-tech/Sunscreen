use seal_fhe::{CoefficientModulus, SecurityLevel};
use sunscreen::types::bfv::Signed;
use sunscreen_fhe_program::SchemeType;
use sunscreen_runtime::{Ciphertext, Params, Runtime};

#[test]
fn can_roundtrip_ciphertexts_bincode() {
    let runtime = Runtime::new_fhe(&Params {
        lattice_dimension: 8192,
        plain_modulus: 1024,
        coeff_modulus: CoefficientModulus::bfv_default(8192, SecurityLevel::TC128)
            .unwrap()
            .iter()
            .map(|c| c.value())
            .collect(),
        security_level: SecurityLevel::TC128,
        scheme_type: SchemeType::Bfv,
    })
    .unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let expected: i64 = 42;

    let c = runtime
        .encrypt(Signed::from(expected), &public_key)
        .unwrap();
    let c: Ciphertext = bincode::deserialize(&bincode::serialize(&c).unwrap()).unwrap();

    let v: Signed = runtime.decrypt(&c, &private_key).unwrap();

    let actual: i64 = v.into();
    assert_eq!(actual, expected);
}

#[test]
fn can_roundtrip_ciphertexts_json() {
    let runtime = Runtime::new_fhe(&Params {
        lattice_dimension: 8192,
        plain_modulus: 1024,
        coeff_modulus: CoefficientModulus::bfv_default(8192, SecurityLevel::TC128)
            .unwrap()
            .iter()
            .map(|c| c.value())
            .collect(),
        security_level: SecurityLevel::TC128,
        scheme_type: SchemeType::Bfv,
    })
    .unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let expected: i64 = 42;

    let c = runtime
        .encrypt(Signed::from(expected), &public_key)
        .unwrap();
    let c: Ciphertext = serde_json::from_str(&serde_json::to_string(&c).unwrap()).unwrap();

    let v: Signed = runtime.decrypt(&c, &private_key).unwrap();

    let actual: i64 = v.into();
    assert_eq!(actual, expected);
}
