use sunscreen::{
    types::{bfv::Signed, Cipher},
    *,
};

#[test]
fn chain_count_defaults_to_1() {
    #[fhe_program(scheme = "bfv")]
    fn my_program() {}

    assert_eq!(my_program.chain_count, 1);
}

#[test]
fn chain_count_is_overridable() {
    #[fhe_program(scheme = "bfv", chain_count = 42)]
    fn my_program() {}

    assert_eq!(my_program.chain_count, 42);
}

#[test]
fn cant_chain_multiple_program() {
    #[fhe_program(scheme = "bfv", chain_count = 42)]
    fn program_1() {}

    #[fhe_program(scheme = "bfv")]
    fn program_2() {}

    let result = Compiler::new()
        .fhe_program(program_1)
        .fhe_program(program_2)
        .compile();

    match result {
        Err(Error::Unsupported(_)) => {}
        _ => panic!("Expected compilation to fail with UnsupportedOperation."),
    };
}

#[test]
fn chaining_increases_parameters() {
    #[fhe_program(scheme = "bfv")]
    fn mul_1(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a * b
    }

    let app = Compiler::new()
        .fhe_program(mul_1)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(256))
        .compile()
        .unwrap();

    assert_eq!(app.params().lattice_dimension, 4096);

    #[fhe_program(scheme = "bfv", chain_count = 3)]
    fn mul_2(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a * b
    }

    let app = Compiler::new()
        .fhe_program(mul_2)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(256))
        .compile()
        .unwrap();

    assert_eq!(app.params().lattice_dimension, 8192);
}
