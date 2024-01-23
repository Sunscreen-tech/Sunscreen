#![allow(unused_imports, unused_variables, unreachable_code, clippy::all)]

#[cfg(feature = "linkedproofs")]
mod linked_tests {
    use lazy_static::lazy_static;
    use logproof::rings::ZqSeal128_1024;
    use logproof::test::seal_bfv_encryption_linear_relation;
    use sunscreen::types::bfv::{Signed, Unsigned, Unsigned64};
    use sunscreen::types::zkp::BulletproofsField;
    use sunscreen::{
        types::zkp::{ConstrainCmp, Field, FieldSpec, ProgramNode},
        zkp_program, zkp_var, Compiler,
    };
    use sunscreen::{Error, ZkpProgramFnExt};
    use sunscreen_fhe_program::SchemeType;
    use sunscreen_runtime::sdlp::LogProofBuilder;
    use sunscreen_runtime::{FheZkpRuntime, LinkedProof, Params};
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
    fn from_twos_complement_field_element<F: FieldSpec, const N: usize>(
        x: [ProgramNode<Field<F>>; N],
    ) -> ProgramNode<Field<F>> {
        let mut x_recon = zkp_var!(0);

        for (i, x_i) in x.iter().enumerate().take(N - 1) {
            x_recon = x_recon + (zkp_var!(2i64.pow(i as u32)) * (*x_i));
        }

        x_recon = x_recon + zkp_var!(-(2i64.pow((N - 1) as u32))) * x[N - 1];

        x_recon
    }

    #[zkp_program]
    fn valid_transaction<F: FieldSpec>(
        #[private] x: [Field<F>; 1024],
        // #[private] x: [Field<F>; 13312],
        #[public] balance: Field<F>,
    ) {
        let lower_bound = zkp_var!(0);

        // Reconstruct x from the bag of bits
        let x_recon = from_twos_complement_field_element(x);

        // Constraint that x is less than or equal to balance
        balance.constrain_ge_bounded(x_recon, 64);

        // Constraint that x is greater than or equal to zero
        lower_bound.constrain_le_bounded(x_recon, 64);
    }

    #[test]
    // TODO issue is probably because we need tighter bounds.
    fn test_valid_transaction_example() -> Result<(), Error> {
        let rt = FheZkpRuntime::new(&SMALL_PARAMS, &BulletproofsBackend::new())?;
        let (public_key, _secret_key) = rt.generate_keys().unwrap();
        let valid_transaction_zkp = valid_transaction.compile::<BulletproofsBackend>()?;

        let balance = 10u64;

        // Try valid cases
        for tx in [5, 10] {
            let mut proof_builder = LogProofBuilder::new(&rt);
            let (_ct, tx_msg) =
                proof_builder.encrypt_and_share(&Unsigned64::from(tx), &public_key)?;
            println!("Performing linked proof");
            let lp = proof_builder
                .zkp_program(&valid_transaction_zkp)
                .shared_input(&tx_msg)
                .public_input(BulletproofsField::from(balance))
                .build_linkedproof()?;
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

        Ok(())
    }

    #[test]
    fn test_invalid_transaction_example() -> Result<(), Error> {
        let rt = FheZkpRuntime::new(&SMALL_PARAMS, &BulletproofsBackend::new())?;
        let (public_key, _secret_key) = rt.generate_keys().unwrap();
        let valid_transaction_zkp = valid_transaction.compile::<BulletproofsBackend>()?;

        let balance = 10u64;

        let tx = balance + 1;

        let mut proof_builder = LogProofBuilder::new(&rt);
        let (_ct, tx_msg) = proof_builder.encrypt_and_share(&Unsigned64::from(tx), &public_key)?;
        proof_builder
            .zkp_program(&valid_transaction_zkp)
            .shared_input(&tx_msg)
            .public_input(BulletproofsField::from(balance));

        println!("Proof should fail");
        let lp = proof_builder.build_linkedproof();
        assert!(lp.is_err());

        Ok(())
    }
}
