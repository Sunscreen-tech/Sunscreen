use sunscreen_compiler::{types::*, *};
use sunscreen_compiler_macros::decrypt;

#[test]
fn can_decrypt() {
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

    let args = runtime
        .encrypt_args(
            &Arguments::new()
                .arg(Unsigned::from(5))
                .arg(Unsigned::from(15)),
            &public,
        )
        .unwrap();

    let mut result = runtime.run(&circuit, args).unwrap();

    let c = decrypt!(runtime, &secret, result, Unsigned).unwrap();

    assert_eq!(c, 20.into());
}
