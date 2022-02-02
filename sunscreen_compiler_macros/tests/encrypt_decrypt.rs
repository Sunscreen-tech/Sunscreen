use sunscreen_compiler::{types::bfv::Signed, types::Cipher, *};

#[test]
fn can_encrypt_decrypt() {
    #[fhe_program(scheme = "bfv")]
    fn foo(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a + b
    }

    let fhe_program = Compiler::with_fhe_program(foo)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    let result = runtime.run(&fhe_program, vec![a, b], &public_key).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, 20.into());
}
