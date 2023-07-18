use sunscreen::{
    bulletproofs::BulletproofsBackend,
    types::zkp::{BulletproofsField, ConstrainCmp, Field},
    zkp_program, Compiler, Error, FieldSpec, ZkpRuntime,
};

#[zkp_program]
fn greater_than<F: FieldSpec>(a: Field<F>, #[public] b: Field<F>) {
    a.constrain_gt_bounded(b, 32)
}

fn main() -> Result<(), Error> {
    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(greater_than)
        .compile()?;

    let greater_than_zkp = app.get_zkp_program(greater_than).unwrap();

    let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;

    let amount = BulletproofsField::from(232);
    let threshold = BulletproofsField::from(64);

    // Prove that amount > threshold

    let proof = runtime.prove(greater_than_zkp, vec![amount], vec![threshold], vec![])?;

    runtime.verify(greater_than_zkp, &proof, vec![threshold], vec![])?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn main_works() -> Result<(), Error> {
        main()
    }

    fn run_test(amount: BulletproofsField, threshold: BulletproofsField, should_succeed: bool) {
        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(greater_than)
            .compile()
            .unwrap();
        let gt_zkp = app.get_zkp_program(greater_than).unwrap();
        let runtime = ZkpRuntime::new(BulletproofsBackend::new()).unwrap();
        let proof = runtime.prove(gt_zkp, vec![amount], vec![threshold], vec![]);
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
