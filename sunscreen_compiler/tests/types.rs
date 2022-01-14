use sunscreen_compiler::{
    circuit, types::Fractional, types::Rational, types::Signed, Compiler, PlainModulusConstraint, Runtime,
};

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

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();

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
    fn add(a: Rational, b: Rational) -> Rational {
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
    fn add(a: Rational, b: Rational) -> Rational {
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

#[test]
fn can_add_fractional_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: Fractional::<64>, b: Fractional::<64>) -> Fractional::<64> {
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
        .encrypt(Fractional::<64>::try_from(-3.14).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(Fractional::<64>::try_from(-3.14).unwrap(), &public)
        .unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Fractional::<64> = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-6.28).try_into().unwrap());
}

#[test]
fn can_mul_fractional_numbers() {
    #[circuit(scheme = "bfv")]
    fn mul(a: Fractional::<64>, b: Fractional::<64>) -> Fractional::<64> {
        a * b
    }

    let circuit = Compiler::with_circuit(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(100000))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let test_mul = |a: f64, b: f64| {
        let a_c = runtime
            .encrypt(Fractional::<64>::try_from(a).unwrap(), &public)
            .unwrap();
        let b_c = runtime
            .encrypt(Fractional::<64>::try_from(b).unwrap(), &public)
            .unwrap();

        let result = runtime.run(&circuit, vec![a_c, b_c], &public).unwrap();

        let c: Fractional::<64> = runtime.decrypt(&result[0], &secret).unwrap();

        assert_eq!(c, (a * b).try_into().unwrap());
    };
    
    test_mul(-3.14, -3.14);
    test_mul(1234., 5678.);
    test_mul(-1234., 5678.);
    test_mul(0., -3.14);
    test_mul(0., 0.);
    test_mul(1., -3.14);
    test_mul(1., 3.14);
    test_mul(1e-23, 1.234e-4);
    // 4294967296 is 2^32. This should be about the largest multiplication we
    // can do with 64-bits of precision for the integer.
    test_mul(4294967295., 4294967296.);
}