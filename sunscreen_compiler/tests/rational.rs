use sunscreen_compiler::{
    fhe_program,
    types::{bfv::Rational, Cipher},
    CircuitInput, Compiler, PlainModulusConstraint, Runtime,
};

use std::ops::*;

#[test]
fn can_encode_rational_numbers() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>) -> Cipher<Rational> {
        a
    }

    let circuit = Compiler::with_fhe_program(add)
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

    let circuit = Compiler::with_fhe_program(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let result = runtime.run(&circuit, vec![a_c, b_c], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, add_impl(a, b));
}

#[test]
fn can_add_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        add_impl(a, b)
    }

    let circuit = Compiler::with_fhe_program(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, add_impl(a, b));
}

#[test]
fn can_add_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        add_impl(b, a)
    }

    let circuit = Compiler::with_fhe_program(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, add_impl(b, a));
}

#[test]
fn can_add_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>) -> Cipher<Rational> {
        add_impl(a, 3.14)
    }

    let circuit = Compiler::with_fhe_program(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, add_impl(a, 3.14));
}

#[test]
fn can_add_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>) -> Cipher<Rational> {
        add_impl(3.14, a)
    }

    let circuit = Compiler::with_fhe_program(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

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

    let circuit = Compiler::with_fhe_program(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let result = runtime.run(&circuit, vec![a_c, b_c], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, sub_impl(a, b));
}

#[test]
fn can_sub_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        sub_impl(a, b)
    }

    let circuit = Compiler::with_fhe_program(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, sub_impl(a, b));
}

#[test]
fn can_sub_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Rational, b: Cipher<Rational>) -> Cipher<Rational> {
        sub_impl(a, b)
    }

    let circuit = Compiler::with_fhe_program(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();

    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, sub_impl(b, a));
}

#[test]
fn can_sub_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Rational>) -> Cipher<Rational> {
        sub_impl(a, 3.14)
    }

    let circuit = Compiler::with_fhe_program(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, sub_impl(a, 3.14));
}

#[test]
fn can_sub_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Rational>) -> Cipher<Rational> {
        sub_impl(3.14, a)
    }

    let circuit = Compiler::with_fhe_program(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

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

    let circuit = Compiler::with_fhe_program(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let result = runtime.run(&circuit, vec![a_c, b_c], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, mul_impl(a, b));
}

#[test]
fn can_mul_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        mul_impl(a, b)
    }

    let circuit = Compiler::with_fhe_program(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, mul_impl(a, b));
}

#[test]
fn can_mul_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Rational, b: Cipher<Rational>) -> Cipher<Rational> {
        mul_impl(a, b)
    }

    let circuit = Compiler::with_fhe_program(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();

    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, mul_impl(b, a));
}

#[test]
fn can_mul_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Rational>) -> Cipher<Rational> {
        mul_impl(a, 3.14)
    }

    let circuit = Compiler::with_fhe_program(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, mul_impl(a, 3.14));
}

#[test]
fn can_mul_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Rational>) -> Cipher<Rational> {
        mul_impl(3.14, a)
    }

    let circuit = Compiler::with_fhe_program(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, mul_impl(3.14, a));
}

fn div_impl<T, U, R>(a: T, b: U) -> R
where
    T: Mul<U, Output = R>,
{
    a * b
}

#[test]
fn can_div_cipher_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: CipherRational, b: CipherRational) -> CipherRational {
        div_impl(a, b)
    }

    let circuit = Compiler::with_fhe_program(div)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let result = runtime.run(&circuit, vec![a_c, b_c], &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, div_impl(a, b));
}

#[test]
fn can_div_cipher_plain() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: Cipher<Rational>, b: Rational) -> Cipher<Rational> {
        div_impl(a, b)
    }

    let circuit = Compiler::with_fhe_program(div)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Rational::try_from(6.28).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, div_impl(a, b));
}

#[test]
fn can_div_plain_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: Rational, b: Cipher<Rational>) -> Cipher<Rational> {
        div_impl(a, b)
    }

    let circuit = Compiler::with_fhe_program(div)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-3.14).unwrap();

    let b = Rational::try_from(6.28).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, div_impl(b, a));
}

#[test]
fn can_div_cipher_literal() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: Cipher<Rational>) -> Cipher<Rational> {
        div_impl(a, 3.14)
    }

    let circuit = Compiler::with_fhe_program(div)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, div_impl(a, 3.14));
}

#[test]
fn can_div_literal_cipher() {
    #[fhe_program(scheme = "bfv")]
    fn div(a: Cipher<Rational>) -> Cipher<Rational> {
        div_impl(3.14, a)
    }

    let circuit = Compiler::with_fhe_program(div)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

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

    let circuit = Compiler::with_fhe_program(neg)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = Rational::try_from(-6.28).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Rational = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, neg_impl(a));
}
