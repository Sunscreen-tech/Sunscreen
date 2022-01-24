use sunscreen_compiler::{
    circuit,
    types::{bfv::Signed, Cipher},
    CircuitInput, Compiler, PlainModulusConstraint, Runtime,
};

#[test]
fn can_add_cipher_plain() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
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
    let b = Signed::from(-5);

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 10.into());
}

#[test]
fn can_add_plain_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Signed, b: Cipher<Signed>) -> Cipher<Signed> {
        b + a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(-5);
    let b = runtime.encrypt(Signed::from(15), &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 10.into());
}

#[test]
fn can_add_cipher_literal() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Signed>) -> Cipher<Signed> {
        a + -4
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public).unwrap();
    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 11.into());
}

#[test]
fn can_add_literal_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Signed>) -> Cipher<Signed> {
        -4 + a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public).unwrap();
    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 11.into());
}

#[test]
fn can_multiply_cipher_plain() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
        a * b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public).unwrap();
    let b = Signed::from(-3);

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-45).into());
}

#[test]
fn can_multiply_plain_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Signed, b: Cipher<Signed>) -> Cipher<Signed> {
        a * b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let b = runtime.encrypt(Signed::from(-3), &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-45).into());
}

#[test]
fn can_multiply_cipher_literal() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Signed>) -> Cipher<Signed> {
        a * -3
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-45).into());
}

#[test]
fn can_multiply_literal_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Signed>) -> Cipher<Signed> {
        -3 * a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, (-45).into());
}
