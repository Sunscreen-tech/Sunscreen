use sunscreen_compiler::{types::*, *};
use sunscreen_compiler_macros::{decrypt, encrypt};

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

    let runtime = PrivateRuntime::new(&metadata).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let args = encrypt!(runtime, &public, Unsigned::from(5), Unsigned::from(15)).unwrap();

    let mut result = runtime.run(&circuit, args).unwrap();

    let c = decrypt!(runtime, &secret, result, Unsigned).unwrap();

    assert_eq!(c, 20.into());
}
