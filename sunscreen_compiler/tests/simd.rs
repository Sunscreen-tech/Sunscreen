use sunscreen_compiler::{
    circuit,
    types::{bfv::Simd, Cipher, SwapRows},
    CircuitInput, Compiler, PlainModulusConstraint, Runtime,
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

    #[circuit(scheme = "bfv")]
    fn swap_rows(a: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        swap_impl(a)
    }

    let circuit = Compiler::with_circuit(swap_rows)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Simd::<4>::try_from(data).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

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

    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        shl_impl(a, 1)
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Simd::<4>::try_from(data).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

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

    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        shr_impl(a, 1)
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Simd::<4>::try_from(data).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

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

    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Simd<4>>, b: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        add_impl(a, b)
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Simd::<4>::try_from(data.clone()).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Simd::<4>::try_from(data).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into(), b_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

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

    #[circuit(scheme = "bfv")]
    fn sub(a: Cipher<Simd<4>>, b: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        sub_impl(a, b)
    }

    let circuit = Compiler::with_circuit(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Simd::<4>::try_from(data.clone()).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Simd::<4>::try_from(data.clone()).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into(), b_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

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

    #[circuit(scheme = "bfv")]
    fn mul(a: Cipher<Simd<4>>, b: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        mul_impl(a, b)
    }

    let circuit = Compiler::with_circuit(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Simd::<4>::try_from(data.clone()).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();
    let b = Simd::<4>::try_from(data).unwrap();
    let b_c = runtime.encrypt(b, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into(), b_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

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

    #[circuit(scheme = "bfv")]
    fn mul(a: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        neg_impl(a)
    }

    let circuit = Compiler::with_circuit(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = Simd::<4>::try_from(data.clone()).unwrap();
    let a_c = runtime.encrypt(a, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_c.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, neg_impl(a));
}
