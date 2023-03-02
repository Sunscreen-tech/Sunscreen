use criterion::{criterion_group, criterion_main, Criterion};
use sunscreen::{
    types::zkp::{ConstrainCmp, IntoProgramNode, NativeField, ProgramNode},
    *,
};
use sunscreen_compiler_common::Render;
use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, BigInt};

type BPField = <BulletproofsBackend as ZkpBackend>::Field;

fn fractional_range_proof(_c: &mut Criterion) {
    fn to_field_element<F: BackendField>(
        bits: &[ProgramNode<NativeField<F>>],
        twos_complement: bool,
    ) -> ProgramNode<NativeField<F>> {
        let powers = (0..bits.len())
            .map(|x| {
                let power = NativeField::<F>::from(BigInt::from(BigInt::ONE.shl_vartime(x)));
                if twos_complement && x == bits.len() - 1 {
                    -(power.into_program_node())
                } else {
                    power.into_program_node()
                }
            })
            .collect::<Vec<_>>();
        let mut val = NativeField::from(0u8).into_program_node();

        for (i, bit) in bits.iter().enumerate() {
            val = val + *bit * powers[i];
        }

        val
    }

    #[zkp_program(backend = "bulletproofs")]
    fn in_range<F: BackendField>(a: [[NativeField<F>; 8]; 64], b: [[NativeField<F>; 8]; 64]) {
        let a_coeffs = a
            .iter()
            .map(|x| to_field_element(x, true))
            .collect::<Vec<_>>();
        let b_coeffs = b
            .iter()
            .map(|x| to_field_element(x, true))
            .collect::<Vec<_>>();

        let a_val = to_field_element(&a_coeffs, false);
        let b_val = to_field_element(&b_coeffs, false);

        a_val.constrain_gt_bounded(NativeField::<F>::from(0).into_program_node(), 8);
        a_val.constrain_le_bounded(b_val, 8);
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(in_range)
        .compile()
        .unwrap();

    let prog = app.get_zkp_program(in_range).unwrap();

    std::fs::write("tmp", prog.render()).unwrap();

    fn encode(val: i8) -> [NativeField<BPField>; 8] {
        let as_u8 = val.to_le_bytes()[0];

        (0..8)
            .map(|x| NativeField::from((as_u8 >> x) & 0x1))
            .collect::<Vec<_>>()
            .try_into()
            .unwrap()
    }

    // 3 * 1 + -7 * 2 = -11
    let mut a = vec![0i8; 64];
    a[0] = 3;
    a[1] = 2;

    let a: [[NativeField<BPField>; 8]; 64] = a
        .iter()
        .map(|x| encode(*x))
        .collect::<Vec<_>>()
        .try_into()
        .unwrap();

    // 4 * 1 + 16 * 2 = 36
    let mut b = vec![0i8; 64];
    b[0] = 4;
    b[1] = 16;

    let b: [[NativeField<BPField>; 8]; 64] = b
        .iter()
        .map(|x| encode(*x))
        .collect::<Vec<_>>()
        .try_into()
        .unwrap();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let proof = runtime.prove(&prog, vec![], vec![], vec![a, b]).unwrap();

    runtime
        .verify(&prog, &proof, Vec::<ZkpProgramInput>::new(), vec![])
        .unwrap();
}

criterion_group!(benches, fractional_range_proof);
criterion_main!(benches);
