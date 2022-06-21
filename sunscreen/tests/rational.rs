use sunscreen::{
    fhe_program,
    types::{bfv::Rational, Cipher},
    Compiler, FheProgramInput, PlainModulusConstraint, Runtime,
};

use std::ops::*;

#[test]
fn can_encode_rational_numbers() {
    #[fhe_program(scheme = "bfv")]
    fn no_op(a: Cipher<Rational>) -> Cipher<Rational> {
        a
    }

    let fhe_program = Compiler::with_fhe_program(no_op)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime
        .encrypt(Rational::try_from(-3.14).unwrap(), &public_key)
        .unwrap();

    let result = runtime.run(&fhe_program, vec![a], &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, (-3.14).try_into().unwrap());
}

type CipherRational = Cipher<Rational>;

fn add_impl<T, U, R>(a: T, b: U) -> R
where
    T: Add<U, Output = R>,
{
    a + b
}

#[test]
fn can_add_cipher_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: CipherRational, b: CipherRational) -> CipherRational {
        add_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let result = runtime
        .run(&fhe_program, vec![a_c, b_c], &public_key)
        .unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_impl(a, b));
}

#[test]
fn can_add_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        add_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_impl(a, b));
}

#[test]
fn can_add_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        add_impl(b, a)
    }

    let fhe_program = Compiler::with_fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_impl(b, a));
}

#[test]
fn can_add_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>) -> Cipher<Rational> {
        add_impl(a, 3.14)
    }

    let fhe_program = Compiler::with_fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_impl(a, 3.14));
}

#[test]
fn can_add_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>) -> Cipher<Rational> {
        add_impl(3.14, a)
    }

    let fhe_program = Compiler::with_fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_impl(3.14, a));
}

fn sub_impl<T, U, R>(a: T, b: U) -> R
where
    T: Sub<U, Output = R>,
{
    a - b
}

#[test]
fn can_sub_cipher_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: CipherRational, b: CipherRational) -> CipherRational {
        sub_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let result = runtime
        .run(&fhe_program, vec![a_c, b_c], &public_key)
        .unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_impl(a, b));
}

#[test]
fn can_sub_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        sub_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_impl(a, b));
}

#[test]
fn can_sub_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Rational, b: Cipher<Rational>) -> Cipher<Rational> {
        sub_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();

    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a.into(), b_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_impl(b, a));
}

#[test]
fn can_sub_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Rational>) -> Cipher<Rational> {
        sub_impl(a, 3.14)
    }

    let fhe_program = Compiler::with_fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_impl(a, 3.14));
}

#[test]
fn can_sub_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Rational>) -> Cipher<Rational> {
        sub_impl(3.14, a)
    }

    let fhe_program = Compiler::with_fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_impl(3.14, a));
}

fn mul_impl<T, U, R>(a: T, b: U) -> R
where
    T: Mul<U, Output = R>,
{
    a * b
}

#[test]
fn can_mul_cipher_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: CipherRational, b: CipherRational) -> CipherRational {
        mul_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let result = runtime
        .run(&fhe_program, vec![a_c, b_c], &public_key)
        .unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_impl(a, b));
}

#[test]
fn can_mul_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        mul_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_impl(a, b));
}

#[test]
fn can_mul_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Rational, b: Cipher<Rational>) -> Cipher<Rational> {
        mul_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();

    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a.into(), b_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_impl(b, a));
}

#[test]
fn can_mul_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Rational>) -> Cipher<Rational> {
        mul_impl(a, 3.14)
    }

    let fhe_program = Compiler::with_fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_impl(a, 3.14));
}

#[test]
fn can_mul_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Rational>) -> Cipher<Rational> {
        mul_impl(3.14, a)
    }

    let fhe_program = Compiler::with_fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_impl(3.14, a));
}

fn div_impl<T, U, R>(a: T, b: U) -> R
where
    T: Div<U, Output = R>,
{
    a / b
}

#[test]
fn can_div_cipher_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: CipherRational, b: CipherRational) -> CipherRational {
        div_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(div)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let result = runtime
        .run(&fhe_program, vec![a_c, b_c], &public_key)
        .unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, div_impl(a, b));
}

#[test]
fn can_div_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        div_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(div)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, div_impl(a, b));
}

#[test]
fn can_div_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: Rational, b: Cipher<Rational>) -> Cipher<Rational> {
        div_impl(a, b)
    }

    let fhe_program = Compiler::with_fhe_program(div)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();

    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a.into(), b_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, div_impl(a, b));
}

#[test]
fn can_div_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: Cipher<Rational>) -> Cipher<Rational> {
        div_impl(a, 3.14)
    }

    let fhe_program = Compiler::with_fhe_program(div)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, div_impl(a, 3.14));
}

#[test]
fn can_div_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: Cipher<Rational>) -> Cipher<Rational> {
        div_impl(3.14, a)
    }

    let fhe_program = Compiler::with_fhe_program(div)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, div_impl(3.14, a));
}

#[test]
fn can_neg_cipher() {
    fn neg_impl<T>(x: T) -> T
    where
        T: Neg<Output = T>,
    {
        -x
    }

    #[fhe_program(scheme = "bfv")]
    fn neg(x: Cipher<Rational>) -> Cipher<Rational> {
        neg_impl(x)
    }

    let app = Compiler::new()
        .fhe_program(neg)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&app.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, neg_impl(a));
}

#[test]
fn can_create_default() {
    assert_eq!(Into::<f64>::into(Rational::default()), 0.0f64);
}
