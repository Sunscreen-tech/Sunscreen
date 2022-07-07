use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, FheProgramInput, PlainModulusConstraint, Runtime,
};

use std::ops::*;

fn add_fn<T, U, R>(a: T, b: U) -> R
where
    T: Add<U, Output = R>,
{
    a + b
}

#[test]
fn can_add_cipher_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        add_fn(a, b)
    }

    let app = Compiler::new()
        .fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Signed::from(-5);
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b_c.into()];

    let result = runtime
        .run(app.get_program(add).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_fn(a, b));
}

#[test]
fn can_add_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
        add_fn(a, b)
    }

    let app = Compiler::new()
        .fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Signed::from(-5);

    let args: Vec<FheProgramInput> = vec![a_c.into(), b.into()];

    let result = runtime
        .run(app.get_program(add).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_fn(a, b));
}

#[test]
fn can_add_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Signed, b: Cipher<Signed>) -> Cipher<Signed> {
        add_fn(a, b)
    }

    let app = Compiler::new()
        .fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(-5);
    let b = Signed::from(15);
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a.into(), b_c.into()];

    let result = runtime
        .run(app.get_program(add).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_fn(a, b));
}

#[test]
fn can_add_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>) -> Cipher<Signed> {
        add_fn(a, -4)
    }

    let app = Compiler::new()
        .fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(add).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_fn(a, -4));
}

#[test]
fn can_add_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>) -> Cipher<Signed> {
        add_fn(-4, a)
    }

    let app = Compiler::new()
        .fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(add).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_fn(-4, a));
}

fn sub_fn<T, U, R>(a: T, b: U) -> R
where
    T: Sub<U, Output = R>,
{
    a - b
}

#[test]
fn can_sub_cipher_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        sub_fn(a, b)
    }

    let app = Compiler::new()
        .fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Signed::from(-5);
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b_c.into()];

    let result = runtime
        .run(app.get_program(sub).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_fn(a, b));
}

#[test]
fn can_sub_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
        sub_fn(a, b)
    }

    let app = Compiler::new()
        .fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Signed::from(-5);

    let args: Vec<FheProgramInput> = vec![a_c.into(), b.into()];

    let result = runtime
        .run(app.get_program(sub).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_fn(a, b));
}

#[test]
fn can_sub_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Signed, b: Cipher<Signed>) -> Cipher<Signed> {
        sub_fn(a, b)
    }

    let app = Compiler::new()
        .fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(-5);
    let b = Signed::from(15);
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a.into(), b_c.into()];

    let result = runtime
        .run(app.get_program(sub).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_fn(a, b));
}

#[test]
fn can_sub_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Signed>) -> Cipher<Signed> {
        sub_fn(a, -4)
    }

    let app = Compiler::new()
        .fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(sub).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_fn(a, -4));
}

#[test]
fn can_sub_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Signed>) -> Cipher<Signed> {
        sub_fn(-4, a)
    }

    let app = Compiler::new()
        .fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(sub).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_fn(-4, a));
}

fn mul_fn<T, U, R>(a: T, b: U) -> R
where
    T: Mul<U, Output = R>,
{
    a * b
}

#[test]
fn can_mul_cipher_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        mul_fn(a, b)
    }

    let app = Compiler::new()
        .fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Signed::from(-5);
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b_c.into()];

    let result = runtime
        .run(app.get_program(mul).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_fn(a, b));
}

#[test]
fn can_mul_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
        mul_fn(a, b)
    }

    let app = Compiler::new()
        .fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Signed::from(-5);

    let args: Vec<FheProgramInput> = vec![a_c.into(), b.into()];

    let result = runtime
        .run(app.get_program(mul).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_fn(a, b));
}

#[test]
fn can_mul_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Signed, b: Cipher<Signed>) -> Cipher<Signed> {
        mul_fn(a, b)
    }

    let app = Compiler::new()
        .fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(-5);
    let b = Signed::from(15);
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a.into(), b_c.into()];

    let result = runtime
        .run(app.get_program(mul).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_fn(a, b));
}

#[test]
fn can_mul_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Signed>) -> Cipher<Signed> {
        mul_fn(a, -4)
    }

    let app = Compiler::new()
        .fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(mul).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_fn(a, -4));
}

#[test]
fn can_mul_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Signed>) -> Cipher<Signed> {
        mul_fn(-4, a)
    }

    let app = Compiler::new()
        .fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::from(15);
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(mul).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_fn(-4, a));
}

#[test]
fn can_create_default() {
    assert_eq!(Into::<i64>::into(Signed::default()), 0);
}
