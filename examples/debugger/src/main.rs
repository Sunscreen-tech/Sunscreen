use std::thread;
use std::time::Duration;
use sunscreen::{
    types::{bfv::Signed, Cipher},
    *,
};

fn main() {
    #[fhe_program(scheme = "bfv")]
    fn mad(a: Cipher<Signed>, b: Signed, c: Cipher<Signed>) -> Cipher<Signed> {
        a * b + c
    }

    #[fhe_program(scheme = "bfv")]
    fn add_squares(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a * a + b * b
    }

    #[fhe_program(scheme = "bfv")]
    fn mul_cubes(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a * a * a * b * b * b
    }

    #[fhe_program(scheme = "bfv", chain_count = 5)]
    fn mul_cubes_chained(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a * a * a * b * b * b
    }

    let app = Compiler::new()
        .fhe_program(mad)
        .fhe_program(add_squares)
        .fhe_program(mul_cubes)
        .fhe_program(mul_cubes_chained)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(1024))
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
            mad.source(),
        )
        .unwrap();

    let args2: Vec<FheProgramInput> = vec![a.clone().into(), c.clone().into()];

    runtime
        .debug_fhe_program(
            app.get_fhe_program("add_squares").unwrap(),
            args2,
            &public,
            &private,
            add_squares.source(),
        )
        .unwrap();

    let args3: Vec<FheProgramInput> = vec![a.clone().into(), b.into(), c.clone().into()];

    runtime
        .debug_fhe_program(
            app.get_fhe_program("mad").unwrap(),
            args3,
            &public,
            &private,
            mad.source(),
        )
        .unwrap();

    let args4: Vec<FheProgramInput> = vec![a.clone().into(), c.clone().into()];

    runtime
        .debug_fhe_program(
            app.get_fhe_program("mul_cubes").unwrap(),
            args4,
            &public,
            &private,
            mul_cubes.source(),
        )
        .unwrap();

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
    loop {
        thread::sleep(Duration::from_secs(1));
    }
}
