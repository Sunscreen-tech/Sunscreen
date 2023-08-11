use sunscreen::{
    types::zkp::{BulletproofsField, Field},
    zkp_program, Compiler, ZkpProgramFnExt, ZkpProgramInput,
};
use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, FieldSpec};

fn main() {
    #[zkp_program]
    fn prove_sum_eq<F: FieldSpec>(a: Field<F>, b: Field<F>, c: Field<F>) {
        (a + b).constrain_eq(c); // not satisfied
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(prove_sum_eq)
        .compile()
        .unwrap();

    let prog = app.get_zkp_program(prove_sum_eq).unwrap();

    let runtime = prove_sum_eq.runtime::<BulletproofsBackend>().unwrap();

    let inputs: Vec<ZkpProgramInput> = vec![
        BulletproofsField::from(1).into(),
        BulletproofsField::from(2).into(),
        BulletproofsField::from(4).into(), // Problematic: 1 + 2 != 4.
    ];

    let _proof = runtime.prove(prog, vec![], vec![], inputs);

    // proof.unwrap();

    runtime.wait_for_debugger();
}
