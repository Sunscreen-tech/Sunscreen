use std::ops::{Add, Mul};
use sunscreen::{
    types::{bfv::Signed, Cipher},
    SchemeType::Bfv,
    SecurityLevel::TC128,
    *,
};

fn main() {
    #[debug]
    fn do_mad<T, U, V>(a: T, b: U, c: V) -> T
    where
        T: Mul<U, Output = T> + Add<V, Output = T>,
    {
        // test comment
        a * b + c
    }

    #[debug]
    fn cube<T>(a: T) -> T
    where
        T: Mul<T, Output = T> + Copy,
    {
        a * a * a
    }

    #[debug]
    fn square<T>(a: T) -> T
    where
        T: Mul<T, Output = T> + Copy,
    {
        simple_multiply(a, a)
    }

    #[debug]
    fn simple_multiply<T>(a: T, b: T) -> T
    where
        T: Mul<T, Output = T> + Copy,
    {
        a * b
    }

    #[fhe_program(scheme = "bfv")]
    fn mad(a: Cipher<Signed>, b: Signed, c: Cipher<Signed>) -> Cipher<Signed> {
        do_mad(a, b, c)
    }

    #[fhe_program(scheme = "bfv")]
    fn add_squares(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        square(a) + square(b)
    }

    #[fhe_program(scheme = "bfv")]
    fn mul_cubes(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        cube(a) * cube(b)
    }

    /*
    #[fhe_program(scheme = "bfv", chain_count = 5)]
    fn mul_cubes_chained(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a * a * a * b * b * b
    }
    */

    let app = Compiler::new()
        .fhe_program(mad)
        .fhe_program(add_squares)
        .fhe_program(mul_cubes)
        .with_params(&Params {
            lattice_dimension: 4096,
            coeff_modulus: [68719403009, 68719230977, 137438822401].to_vec(),
            plain_modulus: 256,
            scheme_type: Bfv,
            security_level: TC128,
        })
        //.fhe_program(mul_cubes_chained)
        .compile()
        .unwrap();

    let runtime = Runtime::new_fhe(app.params()).unwrap();

    let (public, private) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(20), &public).unwrap();
    let b = Signed::from(13);
    let c = a.clone();

    let args1: Vec<FheProgramInput> = vec![a.clone().into(), b.into(), c.clone().into()];

    runtime
        .debug_fhe_program(
            app.get_fhe_program("mad").unwrap(),
            args1,
            &public,
            &private,
        )
        .unwrap();

    let args2: Vec<FheProgramInput> = vec![a.clone().into(), c.clone().into()];

    runtime
        .debug_fhe_program(
            app.get_fhe_program("add_squares").unwrap(),
            args2,
            &public,
            &private,
        )
        .unwrap();

    let args3: Vec<FheProgramInput> = vec![a.clone().into(), b.into(), c.clone().into()];

    runtime
        .debug_fhe_program(
            app.get_fhe_program("mad").unwrap(),
            args3,
            &public,
            &private,
        )
        .unwrap();

    let args4: Vec<FheProgramInput> = vec![a.clone().into(), c.clone().into()];

    runtime
        .debug_fhe_program(
            app.get_fhe_program("mul_cubes").unwrap(),
            args4,
            &public,
            &private,
        )
        .unwrap();

    /*
        let args5: Vec<FheProgramInput> = vec![a.clone().into(), c.clone().into()];

        runtime
            .debug_fhe_program(
                app.get_fhe_program("mul_cubes_chained").unwrap(),
                args5,
                &public,
                &private,
                mul_cubes_chained.source(),
            )
            .unwrap();
    */
    runtime.wait_for_debugger();
}
