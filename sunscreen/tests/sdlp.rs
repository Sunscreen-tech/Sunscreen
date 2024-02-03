#[cfg(feature = "linkedproofs")]
mod sdlp_tests {
    use lazy_static::lazy_static;
    use sunscreen::types::bfv::Signed;
    use sunscreen_fhe_program::SchemeType;

    use sunscreen_runtime::{FheRuntime, LogProofBuilder, Params};

    lazy_static! {
        static ref SMALL_PARAMS: Params = Params {
            lattice_dimension: 1024,
            coeff_modulus: vec![0x7e00001],
            plain_modulus: 4_096,
            scheme_type: SchemeType::Bfv,
            security_level: sunscreen::SecurityLevel::TC128,
        };
    }

    #[test]
    fn prove_one_asymmetric_statement() {
        let rt = FheRuntime::new(&SMALL_PARAMS).unwrap();
        let (public_key, _secret_key) = rt.generate_keys().unwrap();
        let mut logproof_builder = LogProofBuilder::new(&rt);

        let _ct = logproof_builder
            .encrypt(&Signed::from(3), &public_key)
            .unwrap();

        let sdlp = logproof_builder.build_logproof().unwrap();
        sdlp.verify().unwrap();
    }

    #[test]
    fn prove_linked_asymmetric_statements() {
        let rt = FheRuntime::new(&SMALL_PARAMS).unwrap();
        let (public_key, _secret_key) = rt.generate_keys().unwrap();
        let mut logproof_builder = LogProofBuilder::new(&rt);

        let (_a1, linked_a) = logproof_builder
            .encrypt_and_link(&Signed::from(2), &public_key)
            .unwrap();
        let _a2 = logproof_builder
            .encrypt_linked(&linked_a, &public_key)
            .unwrap();
        let _b = logproof_builder
            .encrypt(&Signed::from(3), &public_key)
            .unwrap();
        let sdlp = logproof_builder.build_logproof().unwrap();
        sdlp.verify().unwrap();
    }
}
