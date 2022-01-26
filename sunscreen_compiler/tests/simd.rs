use sunscreen_compiler::{
    circuit,
    types::{bfv::Simd, Cipher},
    CircuitInput, Compiler, PlainModulusConstraint, Runtime,
};

#[test]
fn can_swap_rows_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        a.swap_rows()
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = runtime
        .encrypt(Simd::<4>::try_from(data).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

    let expected = [vec![5, 6, 7, 8], vec![1, 2, 3, 4]];

    assert_eq!(c, expected.try_into().unwrap());
}

#[test]
fn can_rotate_left_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        a << 1
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = runtime
        .encrypt(Simd::<4>::try_from(data).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

    let expected = [vec![2, 3, 4, 1], vec![6, 7, 8, 5]];

    assert_eq!(c, expected.try_into().unwrap());
}

#[test]
fn can_rotate_right_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        a >> 1
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = runtime
        .encrypt(Simd::<4>::try_from(data).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

    let expected = [vec![4, 1, 2, 3], vec![8, 5, 6, 7]];

    assert_eq!(c, expected.try_into().unwrap());
}

#[test]
fn can_add_cipher_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Simd<4>>, b: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        a + b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = runtime
        .encrypt(Simd::<4>::try_from(data.clone()).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(Simd::<4>::try_from(data).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

    let expected = [vec![2, 4, 6, 8], vec![10, 12, 14, 16]];

    assert_eq!(c, expected.try_into().unwrap());
}

#[test]
fn can_sub_cipher_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Simd<4>>, b: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        a - b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = runtime
        .encrypt(Simd::<4>::try_from(data.clone()).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(Simd::<4>::try_from(data).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

    let expected = [vec![0, 0, 0, 0], vec![0, 0, 0, 0]];

    assert_eq!(c, expected.try_into().unwrap());
}

#[test]
fn can_mul_cipher_cipher() {
    #[circuit(scheme = "bfv")]
    fn add(a: Cipher<Simd<4>>, b: Cipher<Simd<4>>) -> Cipher<Simd<4>> {
        a * b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(0))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let data = [vec![1, 2, 3, 4], vec![5, 6, 7, 8]];

    let a = runtime
        .encrypt(Simd::<4>::try_from(data.clone()).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(Simd::<4>::try_from(data).unwrap(), &public)
        .unwrap();

    let args: Vec<CircuitInput> = vec![a.into(), b.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();

    let c: Simd<4> = runtime.decrypt(&result[0], &secret).unwrap();

    let expected = [vec![1, 4, 9, 16], vec![25, 36, 49, 64]];

    assert_eq!(c, expected.try_into().unwrap());
}
