use sunscreen_compiler::{
    circuit,
    types::{bfv::Rational, Cipher},
    Compiler, PlainModulusConstraint, Runtime, CircuitInput
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
fn can_add_cipher_cipher() {
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
fn can_add_cipher_plain() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
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
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (3.14).try_into().unwrap());
}

#[test]
fn can_add_plain_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        b + a
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
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (3.14).try_into().unwrap());
}

#[test]
fn can_add_cipher_literal() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Rational>) -> Cipher<Rational> {
        a + 3.14
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-6.28).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-3.14).try_into().unwrap());
}


#[test]
fn can_add_literal_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Rational>) -> Cipher<Rational> {
        3.14 + a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-6.28).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-3.14).try_into().unwrap());
}


#[test]
fn can_mul_cipher_cipher() {
    #[circuit(scheme = "bfv")]
    fn mul(a: Cipher<Rational>, b: Cipher<Rational>) -> Cipher<Rational> {
        a * b
    }

    let circuit = Compiler::with_circuit(mul)
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
fn can_mul_cipher_plain() {
    #[circuit(scheme = "bfv")]
    fn mul(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        a * b
    }

    let circuit = Compiler::with_circuit(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();
    let b = Rational::try_from(3.14).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-3.14 * 3.14).try_into().unwrap());
}

#[test]
fn can_mul_plain_cipher() {
    #[circuit(scheme = "bfv")]
    fn mul(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        a * b
    }

    let circuit = Compiler::with_circuit(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();
    let b = Rational::try_from(3.14).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-3.14 * 3.14).try_into().unwrap());
}

#[test]
fn can_mul_cipher_literal() {
    #[circuit(scheme = "bfv")]
    fn mul(a: Cipher<Rational>) -> Cipher<Rational> {
        a * 3.14
    }

    let circuit = Compiler::with_circuit(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

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
fn can_sub_cipher_cipher() {
    #[circuit(scheme = "bfv")]
    fn sub(a: Cipher<Rational>, b: Cipher<Rational>) -> Cipher<Rational> {
        a - b
    }

    let circuit = Compiler::with_circuit(sub)
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
fn can_sub_cipher_plain() {
    #[circuit(scheme = "bfv")]
    fn sub(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        a - b
    }

    let circuit = Compiler::with_circuit(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();
    let b = Rational::try_from(3.14).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-6.28).try_into().unwrap());
}

#[test]
fn can_sub_plain_cipher() {
    #[circuit(scheme = "bfv")]
    fn sub(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        b - a
    }

    let circuit = Compiler::with_circuit(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();
    let b = Rational::try_from(3.14).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-6.28).try_into().unwrap());
}

#[test]
fn can_sub_cipher_literal() {
    #[circuit(scheme = "bfv")]
    fn sub(a: Cipher<Rational>) -> Cipher<Rational> {
        a - 1.5
    }

    let circuit = Compiler::with_circuit(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-4.64).try_into().unwrap());
}

#[test]
fn can_sub_literal_cipher() {
    #[circuit(scheme = "bfv")]
    fn sub(a: Cipher<Rational>) -> Cipher<Rational> {
        -1.5 - a
    }

    let circuit = Compiler::with_circuit(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (1.64).try_into().unwrap());
}