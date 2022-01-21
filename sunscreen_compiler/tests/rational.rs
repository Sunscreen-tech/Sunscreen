use sunscreen_compiler::{
    circuit,
    types::{bfv::{Rational}, Cipher},
    Compiler, PlainModulusConstraint, Runtime,
};

#[test]
fn can_encode_rational_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Rational>) -> Cipher<Rational> {
        a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();

    let result = runtime.run(&circuit, vec![a], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-3.14).try_into().unwrap());
}

type CipherRational = Cipher<Rational>;

#[test]
fn can_add_rational_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: CipherRational, b: CipherRational) -> CipherRational {
        a + b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(Rational::try_from(6.28).unwrap(), &public)
        .unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (3.14).try_into().unwrap());
}

#[test]
fn can_mul_rational_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Cipher<Rational>) -> Cipher<Rational> {
        a * b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(Rational::try_from(3.14).unwrap(), &public)
        .unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-3.14 * 3.14).try_into().unwrap());
}

#[test]
fn can_div_rational_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Cipher<Rational>) -> Cipher<Rational> {
        a / b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(Rational::try_from(3.14).unwrap(), &public)
        .unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-1.).try_into().unwrap());
}

#[test]
fn can_sub_rational_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Cipher<Rational>) -> Cipher<Rational> {
        a - b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(Rational::try_from(3.14).unwrap(), &public)
        .unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-6.28).try_into().unwrap());
}