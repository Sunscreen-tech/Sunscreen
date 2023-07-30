use std::{thread, time::Duration};

use sunscreen::{zkp_program, types::zkp::{NativeField, ConstrainCmp}, Compiler, Runtime, ZkpProgramInput};
use sunscreen_zkp_backend::{BackendField, bulletproofs::BulletproofsBackend, ZkpBackend};

fn main() {
    type BPField = NativeField<<BulletproofsBackend as ZkpBackend>::Field>;

    #[zkp_program(backend = "bulletproofs")]
    fn prove_sum_eq<F: BackendField>(
        a: NativeField<F>,
        b: NativeField<F>,
        c: NativeField<F>
    ) {
        (a + b).constrain_eq(c);
        (b - a).constrain_eq(NativeField::<F>::from(1));
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(prove_sum_eq)
        .compile()
        .unwrap();

    let prog = app.get_zkp_program(prove_sum_eq).unwrap();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let inputs: Vec<ZkpProgramInput> = vec![BPField::from(1).into(), BPField::from(2).into(), BPField::from(4).into()];

    let proof = runtime.prove(prog, vec![], vec![], inputs);

    // proof.unwrap();

    loop {
        thread::sleep(Duration::from_secs(1));
    }
}