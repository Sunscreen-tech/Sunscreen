use sunscreen::{types::bfv::Signed, types::Cipher, *};

#[test]
fn can_encrypt_decrypt() {
    #[fhe_program(scheme = "bfv")]
    fn foo(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a + b
    }

    let app = GenericCompiler::new()
        .fhe_program(foo)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new_fhe(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    let result = runtime
        .run(app.get_fhe_program(foo).unwrap(), vec![a, b], &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, 20.into());
}
