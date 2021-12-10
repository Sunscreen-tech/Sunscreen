use sunscreen_compiler_macros::{decrypt};
use sunscreen_compiler::{*, types::*};

#[test]
fn error_on_no_args() {
    #[circuit(scheme = "bfv")]
    fn foo(a: Unsigned, b: Unsigned) -> Unsigned {
        a + b
    }

    let (circuit, metadata) = Compiler::with_circuit(foo)
        .noise_margin_bits(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = RuntimeBuilder::new(&metadata).build().unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let args = runtime.encrypt_args(
            &Arguments::new()
                .arg(Unsigned::from(5))
                .arg(Unsigned::from(15)),
            &public
        ).unwrap();

    let result = runtime.run(&circuit, args).unwrap();

    decrypt!(runtime, result).unwrap();
}