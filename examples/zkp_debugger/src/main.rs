use std::{thread, time::Duration};

use sunscreen::{
    types::zkp::{ConstrainCmp, NativeField},
    zkp_program, Compiler, Runtime, ZkpProgramInput,
};
use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, BackendField, ZkpBackend};

fn main() {
    type BPField = NativeField<<BulletproofsBackend as ZkpBackend>::Field>;

    #[zkp_program(backend = "bulletproofs")]
    fn prove_sum_eq<F: BackendField>(a: NativeField<F>, b: NativeField<F>, c: NativeField<F>) {
        (a + b).constrain_eq(c);
        a.constrain_lt_bounded(b, 8)
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(prove_sum_eq)
        .compile()
        .unwrap();

    let prog = app.get_zkp_program(prove_sum_eq).unwrap();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let inputs: Vec<ZkpProgramInput> = vec![
        BPField::from(1).into(),
        BPField::from(2).into(),
        BPField::from(3).into(),
    ];

    let proof = runtime.prove(prog, vec![], vec![], inputs);

    proof.unwrap();

    loop {
        thread::sleep(Duration::from_secs(1));
    }
}
