use sunscreen_compiler::{circuit, Compiler, PlainModulusConstraint, Runtime, types::Signed, types::Rational};

#[test]
fn can_encode_signed() {
    #[circuit(scheme = "bfv")]
    fn add(a: Signed) -> Signed {
        a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(10), &public).unwrap();

    let result = runtime.run(&circuit, vec![a], &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 10.into());
}

#[test]
fn can_add_signed_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: Signed, b: Signed) -> Signed {
        a + b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public).unwrap();
    let b = runtime.encrypt(Signed::from(-5), &public).unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 10.into());
}

#[test]
fn can_multiply_signed_numbers() {
    #[circuit(scheme = "bfv")]
    fn mul(a: Signed, b: Signed) -> Signed {
        a * b
    }

    let circuit = Compiler::with_circuit(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(17), &public).unwrap();
    let b = runtime.encrypt(Signed::from(-4), &public).unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-68).into());
}

#[test]
fn can_encode_rational_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: Rational) -> Rational {
        a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Rational::try_from(-3.14).unwrap(), &public).unwrap();

    let result = runtime.run(&circuit, vec![a], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-3.14).try_into().unwrap());
}

#[test]
fn can_add_rational_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: Rational, b: Rational) -> Rational {
        a + b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Rational::try_from(-3.14).unwrap(), &public).unwrap();
    let b = runtime.encrypt(Rational::try_from(6.28).unwrap(), &public).unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (3.14).try_into().unwrap());
}

#[test]
fn can_mul_rational_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: Rational, b: Rational) -> Rational {
        a * b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Rational::try_from(-3.14).unwrap(), &public).unwrap();
    let b = runtime.encrypt(Rational::try_from(3.14).unwrap(), &public).unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-3.14 * 3.14).try_into().unwrap());
}