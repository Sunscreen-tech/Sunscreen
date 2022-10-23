use sunscreen::{
    fhe_program,
    types::{bfv::Batched, Cipher, SwapRows},
    Compiler, FheProgramInput, PlainModulusConstraint, Runtime,
};

use std::ops::*;

#[test]
fn can_swap_rows_cipher() {
    fn swap_impl<T>(a: T) -> T
    where
        T: SwapRows<Output = T>,
    {
        a.swap_rows()
    }

    #[fhe_program(scheme = "bfv")]
    fn swap_rows(a: Cipher<Batched<4>>) -> Cipher<Batched<4>> {
        swap_impl(a)
    }

    let app = Compiler::new()
        .fhe_program(swap_rows)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Batched::<4>::try_from(data).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(swap_rows).unwrap(), args, &public_key)
        .unwrap();

    let c: Batched<4> = runtime.decrypt(&result[0], &private_key).unwrap();

    let expected = [vec![5, 6, 7, 8], vec![1, 2, 3, 4]];

    assert_eq!(c, swap_impl(a));
    assert_eq!(c, expected.try_into().unwrap());
}

#[test]
fn can_rotate_left_cipher() {
    fn shl_impl<T>(x: T, y: u64) -> T
    where
        T: Shl<u64, Output = T>,
    {
        x << y
    }

    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Batched<4>>) -> Cipher<Batched<4>> {
        shl_impl(a, 1)
    }

    let app = Compiler::new()
        .fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Batched::<4>::try_from(data).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(add).unwrap(), args, &public_key)
        .unwrap();

    let c: Batched<4> = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, shl_impl(a, 1));
}

#[test]
fn can_rotate_right_cipher() {
    fn shr_impl<T>(x: T, y: u64) -> T
    where
        T: Shr<u64, Output = T>,
    {
        x >> y
    }

    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Batched<4>>) -> Cipher<Batched<4>> {
        shr_impl(a, 1)
    }

    let app = Compiler::new()
        .fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Batched::<4>::try_from(data).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(add).unwrap(), args, &public_key)
        .unwrap();

    let c: Batched<4> = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, shr_impl(a, 1));
}

#[test]
fn can_add_cipher_cipher() {
    fn add_impl<T>(a: T, b: T) -> T
    where
        T: Add<T, Output = T>,
    {
        a + b
    }

    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Batched<4>>, b: Cipher<Batched<4>>) -> Cipher<Batched<4>> {
        add_impl(a, b)
    }

    let app = Compiler::new()
        .fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Batched::<4>::try_from(data.clone()).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Batched::<4>::try_from(data).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b_c.into()];

    let result = runtime
        .run(app.get_program(add).unwrap(), args, &public_key)
        .unwrap();

    let c: Batched<4> = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_impl(a, b));
}

#[test]
fn can_sub_cipher_cipher() {
    fn sub_impl<T>(a: T, b: T) -> T
    where
        T: Sub<T, Output = T>,
    {
        a - b
    }

    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Batched<4>>, b: Cipher<Batched<4>>) -> Cipher<Batched<4>> {
        sub_impl(a, b)
    }

    let app = Compiler::new()
        .fhe_program(sub)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Batched::<4>::try_from(data.clone()).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Batched::<4>::try_from(data).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b_c.into()];

    let result = runtime
        .run(app.get_program(sub).unwrap(), args, &public_key)
        .unwrap();

    let c: Batched<4> = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, sub_impl(a, b));
}

#[test]
fn can_mul_cipher_cipher() {
    fn mul_impl<T>(a: T, b: T) -> T
    where
        T: Mul<T, Output = T>,
    {
        a * b
    }

    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Batched<4>>, b: Cipher<Batched<4>>) -> Cipher<Batched<4>> {
        mul_impl(a, b)
    }

    let app = Compiler::new()
        .fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Batched::<4>::try_from(data.clone()).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();
    let b = Batched::<4>::try_from(data).unwrap();
    let b_c = runtime.encrypt(b, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into(), b_c.into()];

    let result = runtime
        .run(app.get_program(mul).unwrap(), args, &public_key)
        .unwrap();

    let c: Batched<4> = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, mul_impl(a, b));
}

#[test]
fn can_neg_cipher_cipher() {
    fn neg_impl<T>(a: T) -> T
    where
        T: Neg<Output = T>,
    {
        -a
    }

    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Batched<4>>) -> Cipher<Batched<4>> {
        neg_impl(a)
    }

    let app = Compiler::new()
        .fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Batched::<4>::try_from(data).unwrap();
    let a_c = runtime.encrypt(a, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_c.into()];

    let result = runtime
        .run(app.get_program(mul).unwrap(), args, &public_key)
        .unwrap();

    let c: Batched<4> = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, neg_impl(a));
}
