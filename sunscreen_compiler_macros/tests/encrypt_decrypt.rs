use sunscreen_compiler::{types::bfv::Signed, types::Cipher, *};

#[test]
fn can_encrypt_decrypt() {
    #[fhe_program(scheme = "bfv")]
    fn foo(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a + b
    }

    let circuit = Compiler::with_fhe_program(foo)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public).unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Signed = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 20.into());
}
