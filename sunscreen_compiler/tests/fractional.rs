use float_cmp::ApproxEq;
use sunscreen_compiler::{
    circuit,
    types::{bfv::Fractional, Cipher},
    CircuitFn, CircuitInput, CompiledCircuit, Compiler, Params, PlainModulusConstraint, Runtime,
};

use std::ops::*;

type CipherFractional = Cipher<Fractional<64>>;

fn compile<F: CircuitFn>(c: F) -> CompiledCircuit {
    Compiler::with_circuit(c)
        .noise_margin_bits(30)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap()
}

fn compile_with_params<F: CircuitFn>(c: F, params: &Params) -> CompiledCircuit {
    Compiler::with_circuit(c)
        .with_params(params)
        .compile()
        .unwrap()
}

#[test]
fn can_add() {
    fn add_fn<T, U, R>(a: T, b: U) -> R
    where
        T: Add<U, Output = R>,
    {
        a + b
    }

    #[circuit(scheme = "bfv")]
    fn add_c_c(a: CipherFractional, b: CipherFractional) -> CipherFractional {
        add_fn(a, b)
    }

    #[circuit(scheme = "bfv")]
    fn add_c_p(a: CipherFractional, b: Fractional<64>) -> CipherFractional {
        add_fn(a, b)
    }

    #[circuit(scheme = "bfv")]
    fn add_p_c(a: Fractional<64>, b: CipherFractional) -> CipherFractional {
        add_fn(a, b)
    }

    #[circuit(scheme = "bfv")]
    fn add_c_l(a: CipherFractional, _b: CipherFractional) -> CipherFractional {
        add_fn(a, 3.14)
    }

    #[circuit(scheme = "bfv")]
    fn add_l_c(a: CipherFractional, _b: CipherFractional) -> CipherFractional {
        add_fn(3.14, a)
    }

    let (c_add_c_c, c_add_c_p, c_add_p_c, c_add_c_l, c_add_l_c) = (
        compile(add_c_c),
        compile(add_c_p),
        compile(add_p_c),
        compile(add_c_l),
        compile(add_l_c),
    );

    let runtime = Runtime::new(&c_add_c_c.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let do_add = |a: f64, b: f64| {
        let a_p = Fractional::<64>::try_from(a).unwrap();
        let a_c = runtime.encrypt(a_p, &public).unwrap();
        let b_p = Fractional::<64>::try_from(b).unwrap();
        let b_c = runtime.encrypt(b_p, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_0 = runtime.run(&c_add_c_c, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_p.clone().into()];
        let c_1 = runtime.run(&c_add_c_p, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_p.clone().into(), b_c.clone().into()];
        let c_2 = runtime.run(&c_add_p_c, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_3 = runtime.run(&c_add_c_l, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_4 = runtime.run(&c_add_l_c, args, &public).unwrap();

        let c_0: Fractional<64> = runtime.decrypt(&c_0[0], &secret).unwrap();
        let c_1: Fractional<64> = runtime.decrypt(&c_1[0], &secret).unwrap();
        let c_2: Fractional<64> = runtime.decrypt(&c_2[0], &secret).unwrap();
        let c_3: Fractional<64> = runtime.decrypt(&c_3[0], &secret).unwrap();
        let c_4: Fractional<64> = runtime.decrypt(&c_4[0], &secret).unwrap();

        assert!(c_0.approx_eq((add_fn(a, b)).into(), (0.0, 1)));
        assert!(c_1.approx_eq((add_fn(a, b)).into(), (0.0, 1)));
        assert!(c_2.approx_eq((add_fn(a, b)).into(), (0.0, 1)));
        assert!(c_3.approx_eq((add_fn(a, 3.14)).into(), (0.0, 1)));
        assert!(c_4.approx_eq((add_fn(3.14, a)).into(), (0.0, 1)));
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
fn can_mul() {
    fn mul_fn<T, U, R>(a: T, b: U) -> R
    where
        T: Mul<U, Output = R>,
    {
        a * b
    }

    #[circuit(scheme = "bfv")]
    fn mul_c_c(a: CipherFractional, b: CipherFractional) -> CipherFractional {
        mul_fn(a, b)
    }

    #[circuit(scheme = "bfv")]
    fn mul_c_p(a: CipherFractional, b: Fractional<64>) -> CipherFractional {
        mul_fn(a, b)
    }

    #[circuit(scheme = "bfv")]
    fn mul_p_c(a: Fractional<64>, b: CipherFractional) -> CipherFractional {
        mul_fn(a, b)
    }

    #[circuit(scheme = "bfv")]
    fn mul_c_l(a: CipherFractional) -> CipherFractional {
        mul_fn(a, 3.14)
    }

    #[circuit(scheme = "bfv")]
    fn mul_l_c(a: CipherFractional) -> CipherFractional {
        mul_fn(3.14, a)
    }

    let c_mul_c_c = compile(mul_c_c);

    let (c_mul_c_p, c_mul_p_c, c_mul_c_l, c_mul_l_c) = (
        compile_with_params(mul_c_p, &c_mul_c_c.metadata.params),
        compile_with_params(mul_p_c, &c_mul_c_c.metadata.params),
        compile_with_params(mul_c_l, &c_mul_c_c.metadata.params),
        compile_with_params(mul_l_c, &c_mul_c_c.metadata.params),
    );

    let runtime = Runtime::new(&c_mul_c_c.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let do_mul = |a: f64, b: f64| {
        let a_p = Fractional::<64>::try_from(a).unwrap();
        let a_c = runtime.encrypt(a_p, &public).unwrap();
        let b_p = Fractional::<64>::try_from(b).unwrap();
        let b_c = runtime.encrypt(b_p, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_0 = runtime.run(&c_mul_c_c, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_p.clone().into()];
        let c_1 = runtime.run(&c_mul_c_p, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_p.clone().into(), b_c.clone().into()];
        let c_2 = runtime.run(&c_mul_p_c, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into()];
        let c_3 = runtime.run(&c_mul_c_l, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into()];
        let c_4 = runtime.run(&c_mul_l_c, args, &public).unwrap();

        assert_ne!(runtime.measure_noise_budget(&c_0[0], &secret).unwrap(), 0);
        assert_ne!(runtime.measure_noise_budget(&c_1[0], &secret).unwrap(), 0);
        assert_ne!(runtime.measure_noise_budget(&c_2[0], &secret).unwrap(), 0);
        assert_ne!(runtime.measure_noise_budget(&c_3[0], &secret).unwrap(), 0);
        assert_ne!(runtime.measure_noise_budget(&c_4[0], &secret).unwrap(), 0);

        let c_0: Fractional<64> = runtime.decrypt(&c_0[0], &secret).unwrap();
        let c_1: Fractional<64> = runtime.decrypt(&c_1[0], &secret).unwrap();
        let c_2: Fractional<64> = runtime.decrypt(&c_2[0], &secret).unwrap();
        let c_3: Fractional<64> = runtime.decrypt(&c_3[0], &secret).unwrap();
        let c_4: Fractional<64> = runtime.decrypt(&c_4[0], &secret).unwrap();

        assert!(c_0.approx_eq(mul_fn(a, b).into(), (0.0, 1)));
        assert!(c_1.approx_eq(mul_fn(a, b).into(), (0.0, 1)));
        assert!(c_2.approx_eq(mul_fn(a, b).into(), (0.0, 1)));
        assert!(c_3.approx_eq(mul_fn(a, 3.14).into(), (0.0, 1)));
        assert!(c_4.approx_eq(mul_fn(3.14, a).into(), (0.0, 1)));
    };

    do_mul(3.14, 3.14);
    do_mul(-3.14, 3.14);
    do_mul(7., 3.);
    do_mul(1e9, 1e9);
    do_mul(1e-8, 1e-7);
    do_mul(-3.14, -3.14);
    do_mul(3.14, -3.14);
    do_mul(-7., -3.);
    do_mul(-1e9, -1e9);
    do_mul(-1e-8, -1e-7);
}

#[test]
fn can_sub() {
    fn sub_fn<T, U, R>(a: T, b: U) -> R
    where
        T: Sub<U, Output = R>,
    {
        a - b
    }

    #[circuit(scheme = "bfv")]
    fn sub_c_c(a: CipherFractional, b: CipherFractional) -> CipherFractional {
        sub_fn(a, b)
    }

    #[circuit(scheme = "bfv")]
    fn sub_c_p(a: CipherFractional, b: Fractional<64>) -> CipherFractional {
        sub_fn(a, b)
    }

    #[circuit(scheme = "bfv")]
    fn sub_p_c(a: Fractional<64>, b: CipherFractional) -> CipherFractional {
        sub_fn(a, b)
    }

    #[circuit(scheme = "bfv")]
    fn sub_c_l(a: CipherFractional, _b: CipherFractional) -> CipherFractional {
        sub_fn(a, 3.14)
    }

    #[circuit(scheme = "bfv")]
    fn sub_l_c(a: CipherFractional, _b: CipherFractional) -> CipherFractional {
        sub_fn(3.14, a)
    }

    let (c_sub_c_c, c_sub_c_p, c_sub_p_c, c_sub_c_l, c_sub_l_c) = (
        compile(sub_c_c),
        compile(sub_c_p),
        compile(sub_p_c),
        compile(sub_c_l),
        compile(sub_l_c),
    );

    let runtime = Runtime::new(&c_sub_c_c.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let do_sub = |a: f64, b: f64| {
        let a_p = Fractional::<64>::try_from(a).unwrap();
        let a_c = runtime.encrypt(a_p, &public).unwrap();
        let b_p = Fractional::<64>::try_from(b).unwrap();
        let b_c = runtime.encrypt(b_p, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_0 = runtime.run(&c_sub_c_c, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_p.clone().into()];
        let c_1 = runtime.run(&c_sub_c_p, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_p.clone().into(), b_c.clone().into()];
        let c_2 = runtime.run(&c_sub_p_c, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_3 = runtime.run(&c_sub_c_l, args, &public).unwrap();

        let args: Vec<CircuitInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_4 = runtime.run(&c_sub_l_c, args, &public).unwrap();

        let c_0: Fractional<64> = runtime.decrypt(&c_0[0], &secret).unwrap();
        let c_1: Fractional<64> = runtime.decrypt(&c_1[0], &secret).unwrap();
        let c_2: Fractional<64> = runtime.decrypt(&c_2[0], &secret).unwrap();
        let c_3: Fractional<64> = runtime.decrypt(&c_3[0], &secret).unwrap();
        let c_4: Fractional<64> = runtime.decrypt(&c_4[0], &secret).unwrap();

        assert!(c_0.approx_eq((sub_fn(a, b)).into(), (0.0, 1)));
        assert!(c_1.approx_eq((sub_fn(a, b)).into(), (0.0, 1)));
        assert!(c_2.approx_eq((sub_fn(a, b)).into(), (0.0, 1)));
        assert!(c_3.approx_eq((sub_fn(a, 3.14)).into(), (0.0, 1)));
        assert!(c_4.approx_eq((sub_fn(3.14, a)).into(), (0.0, 1)));
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
fn can_div_cipher_const() {
    #[circuit(scheme = "bfv")]
    fn mul(a: Cipher<Fractional<64>>) -> Cipher<Fractional<64>> {
        a / 3.14
    }

    let circuit = Compiler::with_circuit(mul)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(100000))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let test_div = |a: f64| {
        let a_c = runtime
            .encrypt(Fractional::<64>::try_from(a).unwrap(), &public)
            .unwrap();

        let args: Vec<CircuitInput> = vec![a_c.into()];

        let result = runtime.run(&circuit, args, &public).unwrap();

        let c: Fractional<64> = runtime.decrypt(&result[0], &secret).unwrap();

        assert!(c.approx_eq((a / 3.14).try_into().unwrap(), (0.0, 1)));
    };

    test_div(-3.14);
    test_div(1234.);
    test_div(-1234.);
    test_div(0.);
    test_div(1.);
    test_div(-1.);
    test_div(1e-23);
    test_div(4294967295.);
}

#[test]
fn can_negate() {
    #[circuit(scheme = "bfv")]
    fn neg(a: Cipher<Fractional<64>>) -> Cipher<Fractional<64>> {
        -a
    }

    let circuit = Compiler::with_circuit(neg)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(100000))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let test_div = |a: f64| {
        let a_c = runtime
            .encrypt(Fractional::<64>::try_from(a).unwrap(), &public)
            .unwrap();

        let args: Vec<CircuitInput> = vec![a_c.into()];

        let result = runtime.run(&circuit, args, &public).unwrap();

        let c: Fractional<64> = runtime.decrypt(&result[0], &secret).unwrap();

        assert_eq!(c, (-a).into());
    };

    test_div(-3.14);
    test_div(1234.);
    test_div(-1234.);
    test_div(0.);
    test_div(1.);
    test_div(-1.);
    test_div(1e-23);
    test_div(4294967295.);
}
