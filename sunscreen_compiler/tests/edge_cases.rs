use sunscreen_compiler::{
    *,
    types::{bfv::{Signed}, Cipher}
};

#[test]
fn unused_cipher_parameter_1() {
    #[fhe_program(scheme = "bfv")]
    fn add(_a: Cipher<Signed>, b: Cipher<Signed>, c: Cipher<Signed>) -> Cipher<Signed> {
        b + c
    }

    let program = Compiler::with_fhe_program(add)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(64))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    let result = runtime.run(&program, vec![a.clone(), a, b], &public_key).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, 20.into());
}

#[test]
fn unused_cipher_parameter_2() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>, _b: Cipher<Signed>, c: Cipher<Signed>) -> Cipher<Signed> {
        a + c
    }

    let program = Compiler::with_fhe_program(add)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(64))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    let result = runtime.run(&program, vec![a.clone(), a, b], &public_key).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, 20.into());
}

#[test]
fn unused_cipher_parameter_3() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>, b: Cipher<Signed>, _c: Cipher<Signed>) -> Cipher<Signed> {
        a + b
    }

    let program = Compiler::with_fhe_program(add)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(64))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    let result = runtime.run(&program, vec![a, b.clone(), b], &public_key).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, 20.into());
}

#[test]
fn unused_plain_parameter_1() {
    #[fhe_program(scheme = "bfv")]
    fn add(_a: Signed, b: Cipher<Signed>, c: Cipher<Signed>) -> Cipher<Signed> {
        b + c
    }

    let program = Compiler::with_fhe_program(add)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(64))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![Signed::from(0).into(), a.into(), b.into()];

    let result = runtime.run(&program, args, &public_key).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, 20.into());
}

#[test]
fn unused_plain_parameter_2() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>, _b: Signed, c: Cipher<Signed>) -> Cipher<Signed> {
        a + c
    }

    let program = Compiler::with_fhe_program(add)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(64))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a.into(), Signed::from(0).into(), b.into()];

    let result = runtime.run(&program, args, &public_key).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, 20.into());
}

#[test]
fn unused_plain_parameter_3() {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Signed>, b: Cipher<Signed>, _c: Signed) -> Cipher<Signed> {
        a + b
    }

    let program = Compiler::with_fhe_program(add)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(64))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a.into(), b.into(), Signed::from(0).into()];

    let result = runtime.run(&program, args, &public_key).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, 20.into());
}