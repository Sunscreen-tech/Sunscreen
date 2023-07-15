use sunscreen::{types::zkp::NativeField, zkp_program, Compiler, Runtime};
use sunscreen_runtime::ZkpProgramInput;
use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, BackendField, ZkpBackend};

type BPField = NativeField<<BulletproofsBackend as ZkpBackend>::Field>;

#[test]
fn can_add_and_mul_native_fields() {
    #[zkp_program]
    fn add_mul<F: BackendField>(a: NativeField<F>, b: NativeField<F>, c: NativeField<F>) {
        let x = a * b + c;

        x.constrain_eq(NativeField::from(42u32))
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(add_mul)
        .compile()
        .unwrap();

    let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let proof = runtime
        .prove(
            program,
            vec![],
            vec![],
            vec![BPField::from(10u8), BPField::from(4u8), BPField::from(2u8)],
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

    #[zkp_program]
    fn add_mul<F: BackendField>(a: NativeField<F>, b: NativeField<F>) {
        let _ = a + b * a;
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(add_mul)
        .compile()
        .unwrap();

    let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let result = runtime.prove(program, vec![], vec![], vec![BPField::from(0u8)]);

    assert!(matches!(
        result,
        Err(Error::ZkpError(ZkpError::InputsMismatch(_)))
    ));
}

#[test]
fn can_use_public_inputs() {
    #[zkp_program]
    fn add_mul<F: BackendField>(#[public] a: NativeField<F>, b: NativeField<F>, c: NativeField<F>) {
        let x = a * b + c;

        x.constrain_eq(NativeField::from(42u32))
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(add_mul)
        .compile()
        .unwrap();

    let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let proof = runtime
        .prove(
            program,
            vec![],
            vec![BPField::from(10u8)],
            vec![BPField::from(4u8), BPField::from(2u8)],
        )
        .unwrap();

    runtime
        .verify(program, &proof, vec![], vec![BPField::from(10u8)])
        .unwrap();
}

#[test]
fn can_use_constant_inputs() {
    #[zkp_program]
    fn add_mul<F: BackendField>(
        #[constant] a: NativeField<F>,
        b: NativeField<F>,
        c: NativeField<F>,
    ) {
        let x = a * b + c;

        x.constrain_eq(NativeField::from(42u32))
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(add_mul)
        .compile()
        .unwrap();

    let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(add_mul).unwrap();

    let proof = runtime
        .prove(
            program,
            vec![BPField::from(10u8)],
            vec![],
            vec![BPField::from(4u8), BPField::from(2u8)],
        )
        .unwrap();

    runtime
        .verify(program, &proof, vec![BPField::from(10u8)], vec![])
        .unwrap();
}

#[test]
fn can_declare_array_inputs() {
    #[zkp_program]
    fn in_range<F: BackendField>(a: [[NativeField<F>; 9]; 64]) {
        for (i, a_i) in a.iter().enumerate() {
            for (j, a_i_j) in a_i.iter().enumerate() {
                a_i_j.constrain_eq(NativeField::from((i + j) as u64));
            }
        }
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(in_range)
        .compile()
        .unwrap();

    let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(in_range).unwrap();

    let inputs = (0..64u64)
        .flat_map(|i| (0..9u64).map(|j| BPField::from(i + j)).collect::<Vec<_>>())
        .collect::<Vec<_>>();

    let proof = runtime.prove(program, vec![], vec![], inputs).unwrap();

    runtime
        .verify(program, &proof, Vec::<ZkpProgramInput>::new(), vec![])
        .unwrap();
}

#[test]
fn builder_methods_work() {
    #[zkp_program]
    fn arbitrary<F: BackendField>(
        x: NativeField<F>,
        ys: [NativeField<F>; 9],
        #[constant] zss: [[NativeField<F>; 9]; 64],
    ) {
        for y in ys {
            x.constrain_eq(y);
        }
        for zs in zss {
            for (y, z) in ys.iter().zip(zs) {
                y.constrain_eq(z);
            }
        }
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(arbitrary)
        .compile()
        .unwrap();

    let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

    let program = app.get_zkp_program(arbitrary).unwrap();

    let x = BPField::from(0);
    let ys = [BPField::from(0); 9];
    let zss = [[BPField::from(0); 9]; 64];

    let proof = runtime
        .proof_builder(program)
        .constant_input(zss)
        .private_input(x)
        .private_input(ys)
        .prove()
        .unwrap();

    runtime
        .verification_builder(program)
        .proof(&proof)
        .constant_input(zss)
        .verify()
        .unwrap();
}
