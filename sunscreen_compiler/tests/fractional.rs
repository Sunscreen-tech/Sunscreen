use sunscreen_compiler::{
    circuit,
    types::{bfv::{Fractional}, Cipher},
    Compiler, PlainModulusConstraint, Runtime,
};

type CipherFractional = Cipher<Fractional<64>>;

#[test]
fn can_add_fractional_numbers() {
    #[circuit(scheme = "bfv")]
    fn add(a: CipherFractional, b: CipherFractional) -> CipherFractional {
        a + b
    }

    let circuit = Compiler::with_circuit(add)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let do_add = |a: f64, b: f64| {
        let a_c = runtime
            .encrypt(Fractional::<64>::try_from(a).unwrap(), &public)
            .unwrap();
        let b_c = runtime
            .encrypt(Fractional::<64>::try_from(b).unwrap(), &public)
            .unwrap();

        let result = runtime.run(&circuit, vec![a_c, b_c], &public).unwrap();

        let c: Fractional<64> = runtime.decrypt(&result[0], &secret).unwrap();

        assert_eq!(c, (a + b).try_into().unwrap());
    };

    do_add(3.14, 3.14);
    do_add(-3.14, 3.14);
    do_add(0., 0.);
    do_add(7., 3.);
    do_add(1e9, 1e9);
    do_add(1e-8, 1e-7);
    do_add(-3.14, -3.14);
    do_add(3.14, -3.14);
    do_add(-7., -3.);
    do_add(-1e9, -1e9);
    do_add(-1e-8, -1e-7);
}

#[test]
fn can_sub_fractional_numbers() {
    #[circuit(scheme = "bfv")]
    fn sub(a: Cipher<Fractional<64>>, b: Cipher<Fractional<64>>) -> Cipher<Fractional<64>> {
        a - b
    }

    let circuit = Compiler::with_circuit(sub)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let do_sub = |a: f64, b: f64| {
        let a_c = runtime
            .encrypt(Fractional::<64>::try_from(a).unwrap(), &public)
            .unwrap();
        let b_c = runtime
            .encrypt(Fractional::<64>::try_from(b).unwrap(), &public)
            .unwrap();

        let result = runtime.run(&circuit, vec![a_c, b_c], &public).unwrap();

        let c: Fractional<64> = runtime.decrypt(&result[0], &secret).unwrap();

        assert_eq!(c, (a - b).try_into().unwrap());
    };

    do_sub(3.14, 3.14);
    do_sub(-3.14, 3.14);
    do_sub(0., 0.);
    do_sub(7., 3.);
    do_sub(1e9, 1e9);
    do_sub(1e-8, 1e-7);
    do_sub(-3.14, -3.14);
    do_sub(3.14, -3.14);
    do_sub(-7., -3.);
    do_sub(-1e9, -1e9);
    do_sub(-1e-8, -1e-7);
}

#[test]
fn can_mul_fractional_numbers() {
    #[circuit(scheme = "bfv")]
    fn mul(a: Cipher<Fractional<64>>, b: Cipher<Fractional<64>>) -> Cipher<Fractional<64>> {
        a * b
    }

    let circuit = Compiler::with_circuit(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(100000))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let test_mul = |a: f64, b: f64| {
        let a_c = runtime
            .encrypt(Fractional::<64>::try_from(a).unwrap(), &public)
            .unwrap();
        let b_c = runtime
            .encrypt(Fractional::<64>::try_from(b).unwrap(), &public)
            .unwrap();

        let result = runtime.run(&circuit, vec![a_c, b_c], &public).unwrap();

        let c: Fractional<64> = runtime.decrypt(&result[0], &secret).unwrap();

        assert_eq!(c, (a * b).try_into().unwrap());
    };

    test_mul(-3.14, -3.14);
    test_mul(1234., 5678.);
    test_mul(-1234., 5678.);
    test_mul(0., -3.14);
    test_mul(0., 0.);
    test_mul(1., -3.14);
    test_mul(1., 3.14);
    test_mul(1e-23, 1.234e-4);
    // 4294967296 is 2^32. This should be about the largest multiplication we
    // can do with 64-bits of precision for the integer.
    test_mul(4294967295., 4294967296.);
}
