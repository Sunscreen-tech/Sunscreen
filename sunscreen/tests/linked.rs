#[cfg(feature = "linkedproofs")]
mod linked_tests {
    use lazy_static::lazy_static;
    use num::Rational64;
    use sunscreen::types::bfv::{Rational, Signed, Unsigned64};
    use sunscreen::types::zkp::{AsFieldElement, BfvRational, BfvSigned, BulletproofsField};
    use sunscreen::PlainModulusConstraint;
    use sunscreen::{
        fhe_program,
        types::zkp::{ConstrainCmp, Field, FieldSpec},
        zkp_program, zkp_var, Compiler,
    };
    use sunscreen_fhe_program::SchemeType;
    use sunscreen_runtime::{FheZkpRuntime, LogProofBuilder, Params, ZkpProgramInput};
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
    fn valid_transaction<F: FieldSpec>(#[linked] tx: BfvSigned<F>, #[public] balance: Field<F>) {
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
                .encrypt_and_link(&Signed::from(tx), &public_key)
                .unwrap();

            println!("Performing linked proof");
            let lp = proof_builder
                .zkp_program(valid_transaction_zkp)
                .unwrap()
                .linked_input(&tx_msg)
                .public_input(BulletproofsField::from(balance))
                .build_linkedproof()
                .unwrap();
            println!("Linked proof done");

            println!("Performing linked verify");
            lp.verify(
                valid_transaction_zkp,
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
                .encrypt_and_link(&Signed::from(tx), &public_key)
                .unwrap();
            proof_builder
                .zkp_program(valid_transaction_zkp)
                .unwrap()
                .linked_input(&tx_msg)
                .public_input(BulletproofsField::from(balance));

            let lp = proof_builder.build_linkedproof();
            assert!(lp.is_err());
        }
    }

    #[zkp_program]
    fn is_eq_signed<F: FieldSpec>(#[linked] x: BfvSigned<F>, #[public] y: Field<F>) {
        x.into_field_elem().constrain_eq(y);
    }

    #[test]
    fn test_signed_encoding() {
        let app = Compiler::new()
            .fhe_program(doggie)
            .with_params(&SMALL_PARAMS)
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(is_eq_signed)
            .compile()
            .unwrap();
        let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();
        let is_eq_zkp = app.get_zkp_program(is_eq_signed).unwrap();

        let (public_key, _secret_key) = rt.generate_keys().unwrap();

        for val in [3, 0, -3] {
            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct, val_msg) = proof_builder
                .encrypt_and_link(&Signed::from(val), &public_key)
                .unwrap();
            proof_builder
                .zkp_program(is_eq_zkp)
                .unwrap()
                .linked_input(&val_msg)
                .public_input(BulletproofsField::from(val));

            let lp = proof_builder.build_linkedproof().unwrap_or_else(|e| {
                panic!(
                    "Failed to encode {} value; {e}",
                    if val.is_positive() {
                        "positive"
                    } else {
                        "negative"
                    }
                )
            });
            lp.verify(is_eq_zkp, vec![BulletproofsField::from(val)], vec![])
                .expect("Failed to verify linked proof");
        }
    }

    #[zkp_program]
    fn is_eq_rational<F: FieldSpec>(
        #[linked] x: BfvRational<F>,
        #[private] num: Field<F>,
        #[private] den: Field<F>,
    ) {
        let (x_num, x_den) = x.into_field_elem();
        x_num.constrain_eq(num);
        x_den.constrain_eq(den);
    }

    #[test]
    fn test_rational_encoding() {
        let app = Compiler::new()
            .fhe_program(doggie)
            .with_params(&SMALL_PARAMS)
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(is_eq_rational)
            .compile()
            .unwrap();
        let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();
        let is_eq_zkp = app.get_zkp_program(is_eq_rational).unwrap();

        let (public_key, _secret_key) = rt.generate_keys().unwrap();

        for _ in 0..1 {
            // use i32 values to ensure multiplication doesn't overflow
            let x_n = rand::random::<i32>() as i64;
            // ensure denominator is positive
            let x_d = rand::random::<i32>().saturating_abs().saturating_add(1) as i64;
            let x = Rational::from(Rational64::new_raw(x_n, x_d));
            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct, x_msg) = proof_builder.encrypt_and_link(&x, &public_key).unwrap();
            proof_builder
                .zkp_program(is_eq_zkp)
                .unwrap()
                .linked_input(&x_msg)
                .private_input(BulletproofsField::from(x_n))
                .private_input(BulletproofsField::from(x_d));

            let lp = proof_builder
                .build_linkedproof()
                .unwrap_or_else(|e| panic!("Failed to prove encoding of {x:?}; {e}"));
            lp.verify::<ZkpProgramInput>(is_eq_zkp, vec![], vec![])
                .unwrap_or_else(|e| panic!("Failed to verify encoding of {x:?}; {e}"));
        }
    }

    #[zkp_program]
    fn compare_signed<F: FieldSpec>(#[linked] x: BfvSigned<F>, #[linked] y: BfvSigned<F>) {
        x.into_field_elem()
            .constrain_le_bounded(y.into_field_elem(), 64)
    }

    #[test]
    fn can_compare_signed() {
        let app = Compiler::new()
            .fhe_program(doggie)
            .with_params(&SMALL_PARAMS)
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(compare_signed)
            .compile()
            .unwrap();
        let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();
        let compare_signed_zkp = app.get_zkp_program(compare_signed).unwrap();

        let (public_key, _secret_key) = rt.generate_keys().unwrap();

        // To slow to run in a loop :/ if we eventually expose small params for testing, do more
        // cases
        for _ in 0..1 {
            let x = rand::random::<i32>() as i64;
            let y = rand::random::<i32>() as i64;
            let (x, y) = (Signed::from(x.min(y)), Signed::from(x.max(y)));

            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct, x_msg) = proof_builder.encrypt_and_link(&x, &public_key).unwrap();
            let (_ct, y_msg) = proof_builder.encrypt_and_link(&y, &public_key).unwrap();
            proof_builder
                .zkp_program(compare_signed_zkp)
                .unwrap()
                .linked_input(&x_msg)
                .linked_input(&y_msg);

            let lp = proof_builder
                .build_linkedproof()
                .unwrap_or_else(|e| panic!("Failed to prove {x:?} <= {y:?}, {e}"));
            lp.verify::<ZkpProgramInput>(compare_signed_zkp, vec![], vec![])
                .unwrap_or_else(|e| panic!("Failed to verify {x:?} <= {y:?}; {e}"));
        }
    }

    #[zkp_program]
    fn compare_rational<F: FieldSpec>(#[linked] x: BfvRational<F>, #[linked] y: BfvRational<F>) {
        let (x_n, x_d) = x.into_field_elem();
        let (y_n, y_d) = y.into_field_elem();
        let x = x_n * y_d;
        let y = y_n * x_d;
        x.constrain_le_bounded(y, 64)
    }

    #[test]
    fn can_compare_rationals() {
        let app = Compiler::new()
            .fhe_program(doggie)
            .with_params(&SMALL_PARAMS)
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(compare_rational)
            .compile()
            .unwrap();
        let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();
        let compare_rational_zkp = app.get_zkp_program(compare_rational).unwrap();

        let (public_key, _secret_key) = rt.generate_keys().unwrap();

        // To slow to run in a loop :/ if we eventually expose small params for testing, do more cases
        for _ in 0..1 {
            let x_n = rand::random::<i32>() as i64;
            let y_n = rand::random::<i32>() as i64;
            // ensure denominator is positive
            let x_d = rand::random::<i32>().saturating_abs().saturating_add(1) as i64;
            let y_d = rand::random::<i32>().saturating_abs().saturating_add(1) as i64;
            let x = Rational64::new_raw(x_n, x_d);
            let y = Rational64::new_raw(y_n, y_d);
            let (x, y) = (Rational::from(x.min(y)), Rational::from(x.max(y)));

            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct, x_msg) = proof_builder.encrypt_and_link(&x, &public_key).unwrap();
            let (_ct, y_msg) = proof_builder.encrypt_and_link(&y, &public_key).unwrap();
            proof_builder
                .zkp_program(compare_rational_zkp)
                .unwrap()
                .linked_input(&x_msg)
                .linked_input(&y_msg);

            let lp = proof_builder
                .build_linkedproof()
                .unwrap_or_else(|e| panic!("Failed to prove {x:?} <= {y:?}, {e}"));
            lp.verify::<ZkpProgramInput>(compare_rational_zkp, vec![], vec![])
                .unwrap_or_else(|e| panic!("Failed to verify {x:?} <= {y:?}; {e}"));
        }
    }

    #[zkp_program]
    fn is_eq_3<F: FieldSpec>(
        #[linked] x: BfvSigned<F>,
        #[linked] y: BfvSigned<F>,
        #[private] z: Field<F>,
    ) {
        let x = x.into_field_elem();
        let y = y.into_field_elem();
        x.constrain_eq(y);
        y.constrain_eq(z);
    }

    #[test]
    fn test_same_msg_proof() {
        // proves equivalence of pt x and pt x1 within SDLP
        // proves equivalence of pt x, pt y, and field elem z within ZKP
        let app = Compiler::new()
            .fhe_program(doggie)
            .with_params(&SMALL_PARAMS)
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(is_eq_3)
            .compile()
            .unwrap();
        let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();
        let is_eq_zkp = app.get_zkp_program(is_eq_3).unwrap();

        let (public_key, _secret_key) = rt.generate_keys().unwrap();

        for val in [3, 0, -3] {
            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct_x, x_msg) = proof_builder
                .encrypt_and_link(&Signed::from(val), &public_key)
                .unwrap();
            // proves same plaintext within SDLP
            let _ct_x1 = proof_builder.encrypt_linked(&x_msg, &public_key).unwrap();
            // proves same value within ZKP
            let (_ct_y, y_msg) = proof_builder
                .encrypt_and_link(&Signed::from(val), &public_key)
                .unwrap();
            proof_builder
                .zkp_program(is_eq_zkp)
                .unwrap()
                .linked_input(&x_msg)
                .linked_input(&y_msg)
                .private_input(BulletproofsField::from(val));

            let lp = proof_builder.build_linkedproof().unwrap();
            lp.verify::<ZkpProgramInput>(is_eq_zkp, vec![], vec![])
                .expect("Failed to verify linked proof");
        }
    }

    #[test]
    fn compiler_enforces_moduli_pow_2() {
        // try to compile zkp program with plain modulus 100
        let res = Compiler::new()
            .fhe_program(doggie)
            .plain_modulus_constraint(PlainModulusConstraint::Raw(100))
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(is_eq_signed)
            .compile();
        assert!(matches!(res, Err(sunscreen::Error::Unsupported { .. })));
    }

    #[test]
    fn builder_enforces_moduli_match() {
        // compile zkp program with plain modulus 512
        let app = Compiler::new()
            .fhe_program(doggie)
            .plain_modulus_constraint(PlainModulusConstraint::Raw(512))
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(is_eq_signed)
            .compile()
            .unwrap();
        let is_eq_zkp = app.get_zkp_program(is_eq_signed).unwrap();

        // but use runtime with modulus 4096
        let rt = FheZkpRuntime::new(&SMALL_PARAMS, &BulletproofsBackend::new()).unwrap();

        let mut proof_builder = LogProofBuilder::new(&rt);
        let res = proof_builder.zkp_program(is_eq_zkp);
        assert!(matches!(
            res,
            Err(sunscreen_runtime::Error::BuilderError { .. })
        ));
    }

    #[test]
    fn throws_private_linked_arg_mismatch() {
        fn test_case(num_linked_inputs: usize, num_private_inputs: usize) {
            let app = Compiler::new()
                .fhe_program(doggie)
                .with_params(&SMALL_PARAMS)
                .zkp_backend::<BulletproofsBackend>()
                .zkp_program(is_eq_3)
                .compile()
                .unwrap();
            let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();
            let is_eq_zkp = app.get_zkp_program(is_eq_3).unwrap();

            let (public_key, _secret_key) = rt.generate_keys().unwrap();
            let mut proof_builder = LogProofBuilder::new(&rt);
            proof_builder.zkp_program(is_eq_zkp).unwrap();
            for _ in 0..num_linked_inputs {
                let (_ct, msg) = proof_builder
                    .encrypt_and_link(&Signed::from(1), &public_key)
                    .unwrap();
                proof_builder.linked_input(&msg);
            }
            for _ in 0..num_private_inputs {
                proof_builder.private_input(BulletproofsField::from(1));
            }
            let res = proof_builder.build_linkedproof();
            assert!(matches!(
                res,
                Err(sunscreen::RuntimeError::ArgumentMismatch(_))
            ));
        }
        // Missing linked inputs
        test_case(0, 1);
        // Missing one linked inputs
        test_case(1, 1);
    }

    #[test]
    fn throws_linked_arg_type_mismatch() {
        let app = Compiler::new()
            .fhe_program(doggie)
            .with_params(&SMALL_PARAMS)
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(compare_signed)
            .compile()
            .unwrap();
        let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();
        let compare_signed_zkp = app.get_zkp_program(compare_signed).unwrap();

        let (public_key, _secret_key) = rt.generate_keys().unwrap();
        let mut proof_builder = LogProofBuilder::new(&rt);
        proof_builder.zkp_program(compare_signed_zkp).unwrap();
        let (_ct, signed_msg) = proof_builder
            .encrypt_and_link(&Signed::from(1), &public_key)
            .unwrap();
        let (_ct, unsigned_msg) = proof_builder
            .encrypt_and_link(&Unsigned64::from(1), &public_key)
            .unwrap();
        proof_builder
            .linked_input(&signed_msg)
            .linked_input(&unsigned_msg);
        let res = proof_builder.build_linkedproof();
        assert!(matches!(
            res,
            Err(sunscreen::RuntimeError::ArgumentMismatch(_))
        ));
    }
}
