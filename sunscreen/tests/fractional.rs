use float_cmp::ApproxEq;
use sunscreen::{
    fhe_program,
    types::{bfv::Fractional, Cipher},
    Compiler, FheProgramInput, PlainModulusConstraint, Runtime,
};

use std::ops::*;

type CipherFractional = Cipher<Fractional<64>>;

#[test]
fn can_add() {
    fn add_fn<T, U, R>(a: T, b: U) -> R
    where
        T: Add<U, Output = R>,
    {
        a + b
    }

    #[fhe_program(scheme = "bfv")]
    fn add_c_c(a: CipherFractional, b: CipherFractional) -> CipherFractional {
        add_fn(a, b)
    }

    #[fhe_program(scheme = "bfv")]
    fn add_c_p(a: CipherFractional, b: Fractional<64>) -> CipherFractional {
        add_fn(a, b)
    }

    #[fhe_program(scheme = "bfv")]
    fn add_p_c(a: Fractional<64>, b: CipherFractional) -> CipherFractional {
        add_fn(a, b)
    }

    #[fhe_program(scheme = "bfv")]
    fn add_c_l(a: CipherFractional, _b: CipherFractional) -> CipherFractional {
        add_fn(a, 3.14)
    }

    #[fhe_program(scheme = "bfv")]
    fn add_l_c(a: CipherFractional, _b: CipherFractional) -> CipherFractional {
        add_fn(3.14, a)
    }

    let app = Compiler::new()
        .fhe_program(add_c_c)
        .fhe_program(add_c_p)
        .fhe_program(add_p_c)
        .fhe_program(add_c_l)
        .fhe_program(add_l_c)
        .additional_noise_budget(30)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let do_add = |a: f64, b: f64| {
        let a_p = Fractional::<64>::try_from(a).unwrap();
        let a_c = runtime.encrypt(a_p, &public_key).unwrap();
        let b_p = Fractional::<64>::try_from(b).unwrap();
        let b_c = runtime.encrypt(b_p, &public_key).unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_0 = runtime
            .run(app.get_program(add_c_c).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_p.into()];
        let c_1 = runtime
            .run(app.get_program(add_c_p).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_p.into(), b_c.clone().into()];
        let c_2 = runtime
            .run(app.get_program(add_p_c).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_3 = runtime
            .run(app.get_program(add_c_l).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.into(), b_c.into()];
        let c_4 = runtime
            .run(app.get_program(add_l_c).unwrap(), args, &public_key)
            .unwrap();

        let c_0: Fractional<64> = runtime.decrypt(&c_0[0], &private_key).unwrap();
        let c_1: Fractional<64> = runtime.decrypt(&c_1[0], &private_key).unwrap();
        let c_2: Fractional<64> = runtime.decrypt(&c_2[0], &private_key).unwrap();
        let c_3: Fractional<64> = runtime.decrypt(&c_3[0], &private_key).unwrap();
        let c_4: Fractional<64> = runtime.decrypt(&c_4[0], &private_key).unwrap();

        assert!(c_0.approx_eq(add_fn(a, b), (0.0, 1)));
        assert!(c_1.approx_eq(add_fn(a, b), (0.0, 1)));
        assert!(c_2.approx_eq(add_fn(a, b), (0.0, 1)));
        assert!(c_3.approx_eq(add_fn(a, 3.14), (0.0, 1)));
        assert!(c_4.approx_eq(add_fn(3.14, a), (0.0, 1)));
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

    #[fhe_program(scheme = "bfv")]
    fn mul_c_c(a: CipherFractional, b: CipherFractional) -> CipherFractional {
        mul_fn(a, b)
    }

    #[fhe_program(scheme = "bfv")]
    fn mul_c_p(a: CipherFractional, b: Fractional<64>) -> CipherFractional {
        mul_fn(a, b)
    }

    #[fhe_program(scheme = "bfv")]
    fn mul_p_c(a: Fractional<64>, b: CipherFractional) -> CipherFractional {
        mul_fn(a, b)
    }

    #[fhe_program(scheme = "bfv")]
    fn mul_c_l(a: CipherFractional) -> CipherFractional {
        mul_fn(a, 3.14)
    }

    #[fhe_program(scheme = "bfv")]
    fn mul_l_c(a: CipherFractional) -> CipherFractional {
        mul_fn(3.14, a)
    }

    let app = Compiler::new()
        .fhe_program(mul_c_c)
        .fhe_program(mul_c_p)
        .fhe_program(mul_p_c)
        .fhe_program(mul_c_l)
        .fhe_program(mul_l_c)
        .additional_noise_budget(30)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let do_mul = |a: f64, b: f64| {
        let a_p = Fractional::<64>::try_from(a).unwrap();
        let a_c = runtime.encrypt(a_p, &public_key).unwrap();
        let b_p = Fractional::<64>::try_from(b).unwrap();
        let b_c = runtime.encrypt(b_p, &public_key).unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_0 = runtime
            .run(app.get_program(mul_c_c).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_p.into()];
        let c_1 = runtime
            .run(app.get_program(mul_c_p).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_p.into(), b_c.into()];
        let c_2 = runtime
            .run(app.get_program(mul_p_c).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.clone().into()];
        let c_3 = runtime
            .run(app.get_program(mul_c_l).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.into()];
        let c_4 = runtime
            .run(app.get_program(mul_l_c).unwrap(), args, &public_key)
            .unwrap();

        assert_ne!(
            runtime.measure_noise_budget(&c_0[0], &private_key).unwrap(),
            0
        );
        assert_ne!(
            runtime.measure_noise_budget(&c_1[0], &private_key).unwrap(),
            0
        );
        assert_ne!(
            runtime.measure_noise_budget(&c_2[0], &private_key).unwrap(),
            0
        );
        assert_ne!(
            runtime.measure_noise_budget(&c_3[0], &private_key).unwrap(),
            0
        );
        assert_ne!(
            runtime.measure_noise_budget(&c_4[0], &private_key).unwrap(),
            0
        );

        let c_0: Fractional<64> = runtime.decrypt(&c_0[0], &private_key).unwrap();
        let c_1: Fractional<64> = runtime.decrypt(&c_1[0], &private_key).unwrap();
        let c_2: Fractional<64> = runtime.decrypt(&c_2[0], &private_key).unwrap();
        let c_3: Fractional<64> = runtime.decrypt(&c_3[0], &private_key).unwrap();
        let c_4: Fractional<64> = runtime.decrypt(&c_4[0], &private_key).unwrap();

        assert!(c_0.approx_eq(mul_fn(a, b), (0.0, 1)));
        assert!(c_1.approx_eq(mul_fn(a, b), (0.0, 1)));
        assert!(c_2.approx_eq(mul_fn(a, b), (0.0, 1)));
        assert!(c_3.approx_eq(mul_fn(a, 3.14), (0.0, 1)));
        assert!(c_4.approx_eq(mul_fn(3.14, a), (0.0, 1)));
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

    #[fhe_program(scheme = "bfv")]
    fn sub_c_c(a: CipherFractional, b: CipherFractional) -> CipherFractional {
        sub_fn(a, b)
    }

    #[fhe_program(scheme = "bfv")]
    fn sub_c_p(a: CipherFractional, b: Fractional<64>) -> CipherFractional {
        sub_fn(a, b)
    }

    #[fhe_program(scheme = "bfv")]
    fn sub_p_c(a: Fractional<64>, b: CipherFractional) -> CipherFractional {
        sub_fn(a, b)
    }

    #[fhe_program(scheme = "bfv")]
    fn sub_c_l(a: CipherFractional, _b: CipherFractional) -> CipherFractional {
        sub_fn(a, 3.14)
    }

    #[fhe_program(scheme = "bfv")]
    fn sub_l_c(a: CipherFractional, _b: CipherFractional) -> CipherFractional {
        sub_fn(3.14, a)
    }

    let app = Compiler::new()
        .fhe_program(sub_c_c)
        .fhe_program(sub_c_p)
        .fhe_program(sub_p_c)
        .fhe_program(sub_c_l)
        .fhe_program(sub_l_c)
        .additional_noise_budget(30)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let do_sub = |a: f64, b: f64| {
        let a_p = Fractional::<64>::try_from(a).unwrap();
        let a_c = runtime.encrypt(a_p, &public_key).unwrap();
        let b_p = Fractional::<64>::try_from(b).unwrap();
        let b_c = runtime.encrypt(b_p, &public_key).unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_0 = runtime
            .run(app.get_program(sub_c_c).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_p.into()];
        let c_1 = runtime
            .run(app.get_program(sub_c_p).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_p.into(), b_c.clone().into()];
        let c_2 = runtime
            .run(app.get_program(sub_p_c).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_c.clone().into()];
        let c_3 = runtime
            .run(app.get_program(sub_c_l).unwrap(), args, &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.into(), b_c.into()];
        let c_4 = runtime
            .run(app.get_program(sub_l_c).unwrap(), args, &public_key)
            .unwrap();

        let c_0: Fractional<64> = runtime.decrypt(&c_0[0], &private_key).unwrap();
        let c_1: Fractional<64> = runtime.decrypt(&c_1[0], &private_key).unwrap();
        let c_2: Fractional<64> = runtime.decrypt(&c_2[0], &private_key).unwrap();
        let c_3: Fractional<64> = runtime.decrypt(&c_3[0], &private_key).unwrap();
        let c_4: Fractional<64> = runtime.decrypt(&c_4[0], &private_key).unwrap();

        assert!(c_0.approx_eq(sub_fn(a, b), (0.0, 1)));
        assert!(c_1.approx_eq(sub_fn(a, b), (0.0, 1)));
        assert!(c_2.approx_eq(sub_fn(a, b), (0.0, 1)));
        assert!(c_3.approx_eq(sub_fn(a, 3.14), (0.0, 1)));
        assert!(c_4.approx_eq(sub_fn(3.14, a), (0.0, 1)));
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
    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Fractional<64>>) -> Cipher<Fractional<64>> {
        a / 3.14
    }

    let app = Compiler::new()
        .fhe_program(mul)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(100000))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let test_div = |a: f64| {
        let a_c = runtime
            .encrypt(Fractional::<64>::try_from(a).unwrap(), &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.into()];

        let result = runtime
            .run(app.get_program(mul).unwrap(), args, &public_key)
            .unwrap();

        let c: Fractional<64> = runtime.decrypt(&result[0], &private_key).unwrap();

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
    #[fhe_program(scheme = "bfv")]
    fn neg(a: Cipher<Fractional<64>>) -> Cipher<Fractional<64>> {
        -a
    }

    let app = Compiler::new()
        .fhe_program(neg)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(100000))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let test_div = |a: f64| {
        let a_c = runtime
            .encrypt(Fractional::<64>::try_from(a).unwrap(), &public_key)
            .unwrap();

        let args: Vec<FheProgramInput> = vec![a_c.into()];

        let result = runtime
            .run(app.get_program(neg).unwrap(), args, &public_key)
            .unwrap();

        let c: Fractional<64> = runtime.decrypt(&result[0], &private_key).unwrap();

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

#[test]
fn can_create_default() {
    assert_eq!(Into::<f64>::into(Fractional::<64>::default()), 0.0f64);
}
