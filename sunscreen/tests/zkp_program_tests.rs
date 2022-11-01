use sunscreen::{types::zkp::NativeField, zkp_program, ZkpProgramFn};

#[test]
fn can_add_and_mul_native_fields() {
    #[zkp_program(backend = "bulletproofs")]
    fn add_mul(a: NativeField, b: NativeField) {
        a + b * a
    }

    let result = add_mul.build().unwrap();
}
