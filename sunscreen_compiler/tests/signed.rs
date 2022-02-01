use sunscreen_compiler::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    CircuitInput, Compiler, PlainModulusConstraint, Runtime,
};

use std::ops::*;

fn add_fn<T, U, R>(a: T, b: U) -> R
where
    T: Add<U, Output = R>,
{
    a + b
}

#[test]
fn can_add_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
        add_fn(a, b)
    }

    let circuit = Compiler::with_fhe_program(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Signed::from(-5);

    let args: Vec<CircuitInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, add_fn(a, b));
}

#[test]
fn can_add_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Signed, b: Cipher<Signed>) -> Cipher<Signed> {
        add_fn(a, b)
    }

    let circuit = Compiler::with_fhe_program(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(-5);
    let b = Signed::from(15);
    let b_c = runtime.encrypt(b, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, add_fn(a, b));
}

#[test]
fn can_add_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>) -> Cipher<Signed> {
        add_fn(a, -4)
    }

    let circuit = Compiler::with_fhe_program(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public).unwrap();
    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, add_fn(a, -4));
}

#[test]
fn can_add_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>) -> Cipher<Signed> {
        add_fn(-4, a)
    }

    let circuit = Compiler::with_fhe_program(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public).unwrap();
    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, add_fn(-4, a));
}

fn sub_fn<T, U, R>(a: T, b: U) -> R
where
    T: Sub<U, Output = R>,
{
    a - b
}

#[test]
fn can_sub_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
        sub_fn(a, b)
    }

    let circuit = Compiler::with_fhe_program(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Signed::from(-5);

    let args: Vec<CircuitInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, sub_fn(a, b));
}

#[test]
fn can_sub_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Signed, b: Cipher<Signed>) -> Cipher<Signed> {
        sub_fn(a, b)
    }

    let circuit = Compiler::with_fhe_program(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(-5);
    let b = Signed::from(15);
    let b_c = runtime.encrypt(b, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, sub_fn(a, b));
}

#[test]
fn can_sub_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Signed>) -> Cipher<Signed> {
        sub_fn(a, -4)
    }

    let circuit = Compiler::with_fhe_program(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public).unwrap();
    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, sub_fn(a, -4));
}

#[test]
fn can_sub_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Signed>) -> Cipher<Signed> {
        sub_fn(-4, a)
    }

    let circuit = Compiler::with_fhe_program(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public).unwrap();
    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, sub_fn(-4, a));
}

fn mul_fn<T, U, R>(a: T, b: U) -> R
where
    T: Mul<U, Output = R>,
{
    a * b
}

#[test]
fn can_mul_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
        mul_fn(a, b)
    }

    let circuit = Compiler::with_fhe_program(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Signed::from(-5);

    let args: Vec<CircuitInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, mul_fn(a, b));
}

#[test]
fn can_mul_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Signed, b: Cipher<Signed>) -> Cipher<Signed> {
        mul_fn(a, b)
    }

    let circuit = Compiler::with_fhe_program(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(-5);
    let b = Signed::from(15);
    let b_c = runtime.encrypt(b, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, mul_fn(a, b));
}

#[test]
fn can_mul_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Signed>) -> Cipher<Signed> {
        mul_fn(a, -4)
    }

    let circuit = Compiler::with_fhe_program(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public).unwrap();
    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, mul_fn(a, -4));
}

#[test]
fn can_mul_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Signed>) -> Cipher<Signed> {
        mul_fn(-4, a)
    }

    let circuit = Compiler::with_fhe_program(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public).unwrap();
    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, mul_fn(-4, a));
}
