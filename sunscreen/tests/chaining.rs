use sunscreen::{
    types::{bfv::Signed, Cipher},
    *,
};

#[test]
fn chain_count_defaults_to_1() {
    #[fhe_program(scheme = "bfv")]
    fn my_program() {

    }

    assert_eq!(my_program.chain_count, 1);
}

#[test]
fn chain_count_is_overridable() {
    #[fhe_program(scheme = "bfv", chain_count = 42)]
    fn my_program() {

    }

    assert_eq!(my_program.chain_count, 42);
}