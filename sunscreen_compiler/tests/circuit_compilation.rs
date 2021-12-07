use sunscreen_compiler::{circuit, types::*, Compiler, Params, PlainModulusConstraint};
use sunscreen_runtime::RuntimeBuilder;

use seal::BFVScalarEncoder;

#[test]
fn can_compile_and_run_simple_add() {
    let _ = env_logger::try_init();

    #[circuit(scheme = "bfv")]
    fn c(a: Unsigned, b: Unsigned) -> Unsigned {
        a + b
    }

    let (circuit, params) = Compiler::with_circuit(c)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(600))
        .noise_margin_bits(5)
        .compile()
        .unwrap();

    let runtime = RuntimeBuilder::new(&params).build().unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let encoder = BFVScalarEncoder::new();
    let a = runtime
        .encrypt(&encoder.encode_unsigned(14).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(&encoder.encode_unsigned(3).unwrap(), &public)
        .unwrap();

    let results = runtime
        .validate_and_run_program(&circuit, &vec![a, b], None, None)
        .unwrap();

    assert_eq!(results.len(), 1);

    let c = encoder
        .decode_unsigned(&runtime.decrypt(&results[0], &secret).unwrap())
        .unwrap();

    assert_eq!(c, 14 + 3);
}

#[test]
fn can_compile_and_run_simple_mul() {
    let _ = env_logger::try_init();

    #[circuit(scheme = "bfv")]
    fn c(a: Unsigned, b: Unsigned) -> Unsigned {
        a * b
    }

    let (circuit, params) = Compiler::with_circuit(c)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(600))
        .noise_margin_bits(5)
        .compile()
        .unwrap();

    let runtime = RuntimeBuilder::new(&params).build().unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let encoder = BFVScalarEncoder::new();
    let a = runtime
        .encrypt(&encoder.encode_unsigned(14).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(&encoder.encode_unsigned(3).unwrap(), &public)
        .unwrap();

    let relin_keys = Some(runtime.generate_relin_keys(&secret).unwrap());

    let results = runtime
        .validate_and_run_program(&circuit, &vec![a, b], relin_keys, None)
        .unwrap();

    assert_eq!(results.len(), 1);

    let c = encoder
        .decode_unsigned(&runtime.decrypt(&results[0], &secret).unwrap())
        .unwrap();

    assert_eq!(c, 14 * 3);
}

#[test]
fn can_compile_and_run_mul_reduction() {
    let _ = env_logger::try_init();

    #[circuit(scheme = "bfv")]
    fn c(a: Unsigned, b: Unsigned, c: Unsigned, d: Unsigned) -> Unsigned {
        a * b * c * d
    }

    let (circuit, params) = Compiler::with_circuit(c)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(600))
        .noise_margin_bits(5)
        .compile()
        .unwrap();

    let runtime = RuntimeBuilder::new(&params).build().unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let encoder = BFVScalarEncoder::new();
    let a = runtime
        .encrypt(&encoder.encode_unsigned(2).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(&encoder.encode_unsigned(3).unwrap(), &public)
        .unwrap();
    let c = runtime
        .encrypt(&encoder.encode_unsigned(4).unwrap(), &public)
        .unwrap();
    let d = runtime
        .encrypt(&encoder.encode_unsigned(5).unwrap(), &public)
        .unwrap();

    let relin_keys = Some(runtime.generate_relin_keys(&secret).unwrap());

    let results = runtime
        .validate_and_run_program(&circuit, &vec![a, b, c, d], relin_keys, None)
        .unwrap();

    assert_eq!(results.len(), 1);

    let c = encoder
        .decode_unsigned(&runtime.decrypt(&results[0], &secret).unwrap())
        .unwrap();

    assert_eq!(c, 2 * 3 * 4 * 5);
}

#[test]
fn can_compile_and_run_add_reduction() {
    let _ = env_logger::try_init();

    #[circuit(scheme = "bfv")]
    fn c(a: Unsigned, b: Unsigned, c: Unsigned, d: Unsigned) -> Unsigned {
        a + b + c + d
    }

    let (circuit, params) = Compiler::with_circuit(c)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(600))
        .noise_margin_bits(5)
        .compile()
        .unwrap();

    let runtime = RuntimeBuilder::new(&params).build().unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();

    let encoder = BFVScalarEncoder::new();
    let a = runtime
        .encrypt(&encoder.encode_unsigned(2).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(&encoder.encode_unsigned(3).unwrap(), &public)
        .unwrap();
    let c = runtime
        .encrypt(&encoder.encode_unsigned(4).unwrap(), &public)
        .unwrap();
    let d = runtime
        .encrypt(&encoder.encode_unsigned(5).unwrap(), &public)
        .unwrap();

    let results = runtime
        .validate_and_run_program(&circuit, &vec![a, b, c, d], None, None)
        .unwrap();

    assert_eq!(results.len(), 1);

    let c = encoder
        .decode_unsigned(&runtime.decrypt(&results[0], &secret).unwrap())
        .unwrap();

    assert_eq!(c, 2 + 3 + 4 + 5);
}
