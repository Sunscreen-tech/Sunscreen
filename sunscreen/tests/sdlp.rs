#[cfg(feature = "linkedproofs")]
mod sdlp_tests {
    use lazy_static::lazy_static;
    use logproof::rings::SealQ128_1024;
    use sunscreen::types::bfv::{Fractional, Signed, Unsigned64};
    use sunscreen_fhe_program::SchemeType;

    use sunscreen_runtime::{FheRuntime, LogProofBuilder, Params};

    lazy_static! {
        static ref TEST_PARAMS: Params = Params {
            lattice_dimension: 128,
            coeff_modulus: SealQ128_1024::Q.to_vec(),
            plain_modulus: 32,
            scheme_type: SchemeType::Bfv,
            security_level: sunscreen::SecurityLevel::TC128,
        };
    }

    #[test]
    fn prove_one_asymmetric_statement() {
        let rt = FheRuntime::new(&TEST_PARAMS).unwrap();
        let (public_key, _secret_key) = rt.generate_keys().unwrap();
        let mut logproof_builder = LogProofBuilder::new(&rt);

        let _ct = logproof_builder
            .encrypt(&Signed::from(3), &public_key)
            .unwrap();

        let sdlp = logproof_builder.build_logproof().unwrap();
        sdlp.verify().unwrap();
    }

    #[test]
    fn prove_one_symmetric_statement() {
        let rt = FheRuntime::new(&TEST_PARAMS).unwrap();
        let (_public_key, private_key) = rt.generate_keys().unwrap();
        let mut logproof_builder = LogProofBuilder::new(&rt);

        let _ct = logproof_builder
            .encrypt_symmetric(&Unsigned64::from(3), &private_key)
            .unwrap();

        let sdlp = logproof_builder.build_logproof().unwrap();
        sdlp.verify().unwrap();
    }

    #[test]
    fn prove_linked_statements() {
        let rt = FheRuntime::new(&TEST_PARAMS).unwrap();
        let (public_key, private_key) = rt.generate_keys().unwrap();
        let mut logproof_builder = LogProofBuilder::new(&rt);

        let (_a1, linked_a) = logproof_builder
            .encrypt_and_share(&Fractional::<64>::from(3.23), &public_key)
            .unwrap();
        let _a2 = logproof_builder
            .encrypt_symmetric_again(&linked_a, &private_key)
            .unwrap();
        let _other = logproof_builder
            .encrypt(&Signed::from(2), &public_key)
            .unwrap();
        let sdlp = logproof_builder.build_logproof().unwrap();
        sdlp.verify().unwrap();
    }
}
