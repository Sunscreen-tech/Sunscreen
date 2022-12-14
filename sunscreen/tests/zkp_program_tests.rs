use sunscreen::{types::zkp::NativeField, zkp_program, Compiler, Runtime};
use sunscreen_runtime::ZkpProgramInput;
use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;

#[test]
fn can_add_and_mul_native_fields() {
    #[zkp_program(backend = "bulletproofs")]
    fn add_mul(a: NativeField, b: NativeField, c: NativeField) {
        let x = a * b + c;

        x.constrain_eq(NativeField::from(42u32))
    }

    let app = Compiler::new().zkp_program(add_mul).compile().unwrap();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let proof = runtime
        .prove(
            program,
            vec![],
            vec![],
            vec![
                NativeField::from(10u8),
                NativeField::from(4u8),
                NativeField::from(2u8),
            ],
        )
        .unwrap();

    runtime
        .verify(program, &proof, Vec::<ZkpProgramInput>::new(), vec![])
        .unwrap();
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

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let result = runtime.prove(program, vec![], vec![], vec![NativeField::from(0u8)]);

    assert!(matches!(
        result,
        Err(Error::ZkpError(ZkpError::InputsMismatch(_)))
    ));
}

#[test]
fn can_use_public_inputs() {
    #[zkp_program(backend = "bulletproofs")]
    fn add_mul(#[public] a: NativeField, b: NativeField, c: NativeField) {
        let x = a * b + c;

        x.constrain_eq(NativeField::from(42u32))
    }

    let app = Compiler::new().zkp_program(add_mul).compile().unwrap();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let proof = runtime
        .prove(
            program,
            vec![],
            vec![NativeField::from(10u8)],
            vec![NativeField::from(4u8), NativeField::from(2u8)],
        )
        .unwrap();

    runtime
        .verify(program, &proof, vec![], vec![NativeField::from(10u8)])
        .unwrap();
}

#[test]
fn can_use_constant_inputs() {
    #[zkp_program(backend = "bulletproofs")]
    fn add_mul(#[constant] a: NativeField, b: NativeField, c: NativeField) {
        let x = a * b + c;

        x.constrain_eq(NativeField::from(42u32))
    }

    let app = Compiler::new().zkp_program(add_mul).compile().unwrap();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let proof = runtime
        .prove(
            program,
            vec![NativeField::from(10u8)],
            vec![],
            vec![NativeField::from(4u8), NativeField::from(2u8)],
        )
        .unwrap();

    runtime
        .verify(program, &proof, vec![NativeField::from(10u8)], vec![])
        .unwrap();
}
