#![allow(unused_imports, unused_variables, unreachable_code, clippy::all)]

#[cfg(feature = "linkedproofs")]
mod linked_tests {
    use lazy_static::lazy_static;
    use logproof::rings::ZqSeal128_1024;
    use logproof::test::seal_bfv_encryption_linear_relation;
    use sunscreen::types::bfv::{Signed, Unsigned, Unsigned64};
    use sunscreen::types::zkp::{BulletproofsField, Mod};
    use sunscreen::{
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

    /// Convert a twos complement represented signed integer into a field element.
    fn from_twos_complement_field_element<F: FieldSpec>(
        x: &[ProgramNode<Field<F>>],
    ) -> ProgramNode<Field<F>> {
        let mut x_recon = zkp_var!(0);
        let n = x.len();

        for (i, x_i) in x.iter().enumerate().take(n - 1) {
            x_recon = x_recon + (zkp_var!(sunscreen_zkp_backend::BigInt::ONE << i) * (*x_i));
        }

        x_recon = x_recon - zkp_var!(sunscreen_zkp_backend::BigInt::ONE << (n - 1)) * x[n - 1];

        x_recon
    }

    // Convert a coeff into native big int
    // TODO package this up for shared types
    fn from_signed_encoding<F: FieldSpec>(x: &[ProgramNode<Field<F>>]) -> ProgramNode<Field<F>> {
        let mut x_recon = zkp_var!(0);
        let n = x.len();
        let plain_modulus = zkp_var!(4096);

        for (i, x_i) in x.iter().enumerate() {
            // TODO this is not correct. 4095 (equiv to -1 in plaintext context) just reduces to
            // native field element 4095. We need the _reverse_ of the signed_reduce function.
            // Hence, this is currently broken for negative numbers.
            let c = Field::signed_reduce(*x_i, plain_modulus, 15);
            x_recon = x_recon + (zkp_var!(sunscreen_zkp_backend::BigInt::ONE << i) * c);
        }

        x_recon
    }

    #[zkp_program]
    fn valid_transaction<F: FieldSpec>(
        #[private] x: [Field<F>; 832],
        // #[private] x: [Field<F>; 1664],
        #[public] balance: Field<F>,
    ) {
        let lower_bound = zkp_var!(0);

        // Reconstruct x from the bag of bits
        let plain_modulus_log_2 = 4096u64.ilog2() as usize + 1;
        let coeffs = x
            .chunks(plain_modulus_log_2)
            .map(|c| from_twos_complement_field_element(c))
            .collect::<Vec<_>>();
        let x_recon = from_signed_encoding(&coeffs);

        // Constraint that x is less than or equal to balance
        balance.constrain_ge_bounded(x_recon, 64);

        // Constraint that x is greater than or equal to zero
        lower_bound.constrain_le_bounded(x_recon, 64);
    }

    #[test]
    fn test_valid_transaction_example() {
        let rt = FheZkpRuntime::new(&SMALL_PARAMS, &BulletproofsBackend::new()).unwrap();

        let (public_key, _secret_key) = rt.generate_keys().unwrap();

        let valid_transaction_zkp = valid_transaction.compile::<BulletproofsBackend>().unwrap();

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
        let rt = FheZkpRuntime::new(&SMALL_PARAMS, &BulletproofsBackend::new()).unwrap();
        let (public_key, _secret_key) = rt.generate_keys().unwrap();
        let valid_transaction_zkp = valid_transaction.compile::<BulletproofsBackend>().unwrap();

        let balance = 10i64;

        for tx in [-1, balance + 1] {
            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct, tx_msg) = proof_builder
                .encrypt_and_share(&Signed::from(tx), &public_key)
                .unwrap();
            proof_builder
                .zkp_program(&valid_transaction_zkp)
                .shared_input(&tx_msg)
                .public_input(BulletproofsField::from(balance));

            let lp = proof_builder.build_linkedproof();
            assert!(lp.is_err());
        }
    }

    #[zkp_program]
    fn is_eq<F: FieldSpec>(#[private] x: [Field<F>; 832], #[public] y: Field<F>) {
        // Reconstruct x from the bag of bits
        let plain_modulus_log_2 = 4096u64.ilog2() as usize + 1;
        let coeffs = x
            .chunks(plain_modulus_log_2)
            .map(|c| from_twos_complement_field_element(c))
            .collect::<Vec<_>>();
        let x_recon = from_signed_encoding(&coeffs);

        // Constraint that x is less than or equal to balance
        x_recon.constrain_eq(y);
    }

    #[test]
    fn test_is_eq() {
        let rt = FheZkpRuntime::new(&SMALL_PARAMS, &BulletproofsBackend::new()).unwrap();
        let (public_key, _secret_key) = rt.generate_keys().unwrap();
        let is_eq_zkp = valid_transaction.compile::<BulletproofsBackend>().unwrap();

        for val in [3, -3] {
            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct, val_msg) = proof_builder
                .encrypt_and_share(&Signed::from(val), &public_key)
                .unwrap();
            proof_builder
                .zkp_program(&is_eq_zkp)
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
