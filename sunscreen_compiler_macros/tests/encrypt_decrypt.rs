use sunscreen_compiler::{types::*, *};

#[test]
fn can_encrypt_decrypt() {
    #[circuit(scheme = "bfv")]
    fn foo(a: Unsigned, b: Unsigned) -> Unsigned {
        a + b
    }

    let circuit = Compiler::with_circuit(foo)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&circuit.metadata).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Unsigned::from(15), &public).unwrap();
    let b = runtime.encrypt(Unsigned::from(5), &public).unwrap();

    let result = runtime.run(&circuit, vec![a, b], &public).unwrap();

    let c: Unsigned = runtime.decrypt(&result[0], &secret).unwrap();

    assert_eq!(c, 20.into());
}
