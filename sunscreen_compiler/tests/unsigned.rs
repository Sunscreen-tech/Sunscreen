use sunscreen_compiler::{
    circuit,
    types::{bfv::Unsigned, Cipher},
    CircuitInput, Compiler, PlainModulusConstraint, Runtime,
};

#[test]
fn can_add_unsigned_cipher_plain() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Unsigned>, b: Unsigned) -> Cipher<Unsigned> {
        a + b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Unsigned::from(15), &public).unwrap();
    let b = Unsigned::from(5);

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Unsigned = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 20.into());
}

#[test]
fn can_add_unsigned_plain_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Unsigned>, b: Unsigned) -> Cipher<Unsigned> {
        b + a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Unsigned::from(15), &public).unwrap();
    let b = Unsigned::from(5);

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Unsigned = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 20.into());
}

#[test]
fn can_add_unsigned_cipher_literal() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Unsigned>) -> Cipher<Unsigned> {
        a + 4
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Unsigned::from(15), &public).unwrap();
    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Unsigned = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 19.into());
}

#[test]
fn can_add_unsigned_literal_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Unsigned>) -> Cipher<Unsigned> {
        4 + a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Unsigned::from(15), &public).unwrap();
    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Unsigned = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 19.into());
}

#[test]
fn can_add_multiply_cipher_plain() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Unsigned>, b: Unsigned) -> Cipher<Unsigned> {
        a * b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Unsigned::from(15), &public).unwrap();
    let b = Unsigned::from(3);

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Unsigned = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 45.into());
}

#[test]
fn can_add_multiply_cipher_literal() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Unsigned>) -> Cipher<Unsigned> {
        a * 3
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Unsigned::from(15), &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Unsigned = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 45.into());
}

#[test]
fn can_add_multiply_literal_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Unsigned>) -> Cipher<Unsigned> {
        3 * a
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Unsigned::from(15), &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Unsigned = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 45.into());
}