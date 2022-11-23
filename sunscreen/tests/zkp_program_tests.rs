use sunscreen::{types::zkp::NativeField, zkp_program, Compiler, Runtime, ZkpProgramFn};
use sunscreen_zkp_backend::BigInt;

#[test]
fn can_add_and_mul_native_fields() {
    #[zkp_program(backend = "bulletproofs")]
    fn add_mul(a: NativeField, b: NativeField, c: NativeField) {
        let x = a * b + c;

        x.constrain_eq(NativeField::from(42u32))
    }

    let app = Compiler::new().zkp_program(add_mul).compile().unwrap();

    let runtime = Runtime::new_zkp().unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let proof = runtime
        .prove(
            program,
            &[BigInt::from(10u8), BigInt::from(4u8), BigInt::from(2u8)],
        )
        .unwrap();

    runtime.verify(program, &proof).unwrap();
}

#[test]
fn get_input_mismatch_on_incorrect_args() {
    use sunscreen_runtime::Error;
    use sunscreen_zkp_backend::Error as ZkpError;

    #[zkp_program(backend = "bulletproofs")]
    fn add_mul(a: NativeField, b: NativeField) {
        let _ = a + b * a;
    }

    let app = Compiler::new().zkp_program(add_mul).compile().unwrap();

    let runtime = Runtime::new_zkp().unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let result = runtime.prove(program, &[]);

    assert!(matches!(
        result,
        Err(Error::ZkpError(ZkpError::InputsMismatch))
    ));
}
