use sunscreen::{
    types::zkp::{ConstrainCmp, NativeField},
    zkp_program, BackendField, BulletproofsBackend, Compiler, ZkpBackend, ZkpRuntime,
};

type BPField = NativeField<<BulletproofsBackend as ZkpBackend>::Field>;

fn main() {
    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(greater_than)
        .compile()
        .unwrap();

    let greater_than_zkp = app.get_zkp_program(greater_than).unwrap();

    let runtime = ZkpRuntime::new(&BulletproofsBackend::new()).unwrap();

    let amount = BPField::from(64);
    let threshold = BPField::from(232);

    // Prove that amount > threshold

    let proof = runtime
        .prove(greater_than_zkp, vec![threshold], vec![], vec![amount])
        .unwrap();

    let verify = runtime.verify(greater_than_zkp, &proof, vec![threshold], vec![]);

    assert!(verify.is_ok());
}

#[zkp_program(backend = "bulletproofs")]
fn greater_than<F: BackendField>(a: NativeField<F>, #[constant] b: NativeField<F>) {
    a.constrain_gt_bounded(b, 32)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run_test(amount: BPField, threshold: BPField, should_succeed: bool) {
        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(greater_than)
            .compile()
            .unwrap();
        let gt_zkp = app.get_zkp_program(greater_than).unwrap();
        let runtime = ZkpRuntime::new(&BulletproofsBackend::new()).unwrap();
        let proof = runtime.prove(gt_zkp, vec![threshold], vec![], vec![amount]);
        if !should_succeed {
            assert!(proof.is_err());
        } else {
            assert!(runtime
                .verify(gt_zkp, &proof.unwrap(), vec![threshold], vec![])
                .is_ok())
        }
    }

    #[test]
    fn test_gt() {
        run_test(1.into(), 0.into(), true);
        run_test(100.into(), 0.into(), true);
        run_test(100.into(), 99.into(), true);
        run_test(u32::MAX.into(), 0.into(), true);
    }

    #[test]
    fn test_le() {
        run_test(0.into(), 1.into(), false);
    }

    #[test]
    fn test_eq() {
        run_test(1.into(), 1.into(), false);
    }

    #[test]
    fn test_bounded_failure() {
        run_test(u64::MAX.into(), 0.into(), false);
    }
}
