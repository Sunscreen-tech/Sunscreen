#![allow(unused_imports, unused_variables, unreachable_code, clippy::all)]

#[cfg(feature = "linkedproofs")]
mod linked_tests {
    use lazy_static::lazy_static;
    use logproof::rings::ZqSeal128_1024;
    use logproof::test::seal_bfv_encryption_linear_relation;
    use sunscreen::types::bfv::{Signed, Unsigned, Unsigned64};
    use sunscreen::types::zkp::{AsFieldElement, BfvSigned, BulletproofsField, Mod};
    use sunscreen::{
        fhe_program,
        types::zkp::{ConstrainCmp, Field, FieldSpec, ProgramNode},
        zkp_program, zkp_var, Compiler,
    };
    use sunscreen::{Error, ZkpProgramFnExt};
    use sunscreen_fhe_program::SchemeType;
    use sunscreen_runtime::{FheZkpRuntime, LinkedProof, LogProofBuilder, Params};
    use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;

    lazy_static! {
        static ref SMALL_PARAMS: Params = Params {
            lattice_dimension: 1024,
            coeff_modulus: vec![0x7e00001],
            plain_modulus: 4_096,
            scheme_type: SchemeType::Bfv,
            security_level: sunscreen::SecurityLevel::TC128,
        };
    }

    #[fhe_program(scheme = "bfv")]
    fn doggie() {}

    #[zkp_program]
    fn valid_transaction<F: FieldSpec>(#[shared] tx: BfvSigned<F>, #[public] balance: Field<F>) {
        let lower_bound = zkp_var!(0);

        // Reconstruct tx
        let tx_recon = tx.into_field_elem();

        // Constraint that x is less than or equal to balance
        balance.constrain_ge_bounded(tx_recon, 64);

        // Constraint that x is greater than or equal to zero
        lower_bound.constrain_le_bounded(tx_recon, 64);
    }

    #[test]
    fn test_valid_transaction_example() {
        let app = Compiler::new()
            .fhe_program(doggie)
            .with_params(&SMALL_PARAMS)
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(valid_transaction)
            .compile()
            .unwrap();
        let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();

        let valid_transaction_zkp = app.get_zkp_program(valid_transaction).unwrap();
        let (public_key, _secret_key) = rt.generate_keys().unwrap();

        let balance = 10i64;

        // Try valid cases
        for tx in [5, 10] {
            let mut proof_builder = LogProofBuilder::new(&rt);

            let (_ct, tx_msg) = proof_builder
                .encrypt_and_share(&Signed::from(tx), &public_key)
                .unwrap();

            println!("Performing linked proof");
            let lp = proof_builder
                .zkp_program(&valid_transaction_zkp)
                .unwrap()
                .shared_input(&tx_msg)
                .public_input(BulletproofsField::from(balance))
                .build_linkedproof()
                .unwrap();
            println!("Linked proof done");

            println!("Performing linked verify");
            lp.verify(
                &valid_transaction_zkp,
                vec![BulletproofsField::from(balance)],
                vec![],
            )
            .expect("Failed to verify linked proof");
            println!("Linked verify done");
        }
    }

    #[test]
    fn test_invalid_transaction_example() {
        let app = Compiler::new()
            .fhe_program(doggie)
            .with_params(&SMALL_PARAMS)
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(valid_transaction)
            .compile()
            .unwrap();
        let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();

        let valid_transaction_zkp = app.get_zkp_program(valid_transaction).unwrap();
        let (public_key, _secret_key) = rt.generate_keys().unwrap();

        let balance = 10i64;

        for tx in [-1, balance + 1] {
            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct, tx_msg) = proof_builder
                .encrypt_and_share(&Signed::from(tx), &public_key)
                .unwrap();
            proof_builder
                .zkp_program(&valid_transaction_zkp)
                .unwrap()
                .shared_input(&tx_msg)
                .public_input(BulletproofsField::from(balance));

            let lp = proof_builder.build_linkedproof();
            assert!(lp.is_err());
        }
    }

    #[zkp_program]
    fn is_eq<F: FieldSpec>(#[shared] x: BfvSigned<F>, #[public] y: Field<F>) {
        x.into_field_elem().constrain_eq(y);
    }

    #[test]
    fn test_is_eq() {
        let app = Compiler::new()
            .fhe_program(doggie)
            .with_params(&SMALL_PARAMS)
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(is_eq)
            .compile()
            .unwrap();
        let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();

        let is_eq_zkp = app.get_zkp_program(is_eq).unwrap();
        let (public_key, _secret_key) = rt.generate_keys().unwrap();

        for val in [3, -3] {
            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct, val_msg) = proof_builder
                .encrypt_and_share(&Signed::from(val), &public_key)
                .unwrap();
            proof_builder
                .zkp_program(&is_eq_zkp)
                .unwrap()
                .shared_input(&val_msg)
                .public_input(BulletproofsField::from(val));

            let lp = proof_builder.build_linkedproof().expect(&format!(
                "Failed to encode {} value",
                if val.is_positive() {
                    "positive"
                } else {
                    "negative"
                }
            ));
            lp.verify(&is_eq_zkp, vec![BulletproofsField::from(val)], vec![])
                .expect("Failed to verify linked proof");
        }
    }
}
