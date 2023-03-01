use criterion::{criterion_group, criterion_main, Criterion};
use sunscreen::{types::zkp::{NativeField, ProgramNode, IntoProgramNode}, *};
use sunscreen_compiler_common::Render;
use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;

type BPField = <BulletproofsBackend as ZkpBackend>::Field;

fn fractional_range_proof(_c: &mut Criterion) {
    fn to_field_element<F: BackendField, const N: usize>(bits: &[ProgramNode<NativeField<F>>; N]) -> ProgramNode<NativeField<F>> {
        let powers = (0..N).map(|x| {
            if x == N - 1 {
                NativeField::from(-1 * 1i64 << x)
            } else {
                NativeField::from(1i64 << x)
            }
        }).collect::<Vec<_>>();
        let mut val = NativeField::from(0u8).into_program_node();

        for (i, bit) in bits.iter().enumerate() {
            val = val + *bit * powers[i].into_program_node();
        }

        val
    }

    #[zkp_program(backend = "bulletproofs")]
    fn in_range<F: BackendField>(a: [NativeField<F>; 8]) {
        // 1010 == 0d10
        let bits = [0u8, 1, 0, 1].map(|x| NativeField::<F>::from(x).into_program_node());

        let val = to_field_element(&bits);

        val.constrain_eq(NativeField::from(-6));
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(in_range)
        .compile()
        .unwrap();

    let prog = app.get_zkp_program(in_range).unwrap();

    std::fs::write("tmp", prog.render()).unwrap();

    let inputs = (0u8..8).map(|x| NativeField::<BPField>::from(x)).collect::<Vec<_>>();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new())
        .unwrap();

    let proof = runtime.prove(&prog, vec![], vec![], inputs).unwrap();

    runtime.verify(&prog, &proof, Vec::<ZkpProgramInput>::new(), vec![]).unwrap();
}

criterion_group!(benches, fractional_range_proof);
criterion_main!(benches);
