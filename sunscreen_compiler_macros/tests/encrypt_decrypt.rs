use sunscreen_compiler::{types::*, *};

#[test]
fn can_encrypt_decrypt() {
    #[circuit(scheme = "bfv")]
    fn foo(a: Unsigned, b: Unsigned) -> Unsigned {
        a + b
    }

    let (circuit, metadata) = Compiler::with_circuit(foo)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(&metadata).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let args = runtime
        .encrypt_args(
            &FooInterface::args(Unsigned::from(5), Unsigned::from(15)),
            &public,
        )
        .unwrap();

    let result = runtime.run(&circuit, args).unwrap();

    let c =
        FooInterface::return_value(runtime.decrypt_return_value(result, &secret).unwrap()).unwrap();

    assert_eq!(c, 20.into());
}
