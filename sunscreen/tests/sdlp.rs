#[cfg(feature = "linkedproofs")]
mod sdlp_tests {
    use lazy_static::lazy_static;
    use logproof::{InnerProductVerifierKnowledge, LogProofGenerators, Transcript};
    use sunscreen::types::bfv::Signed;
    use sunscreen_fhe_program::SchemeType;

    use sunscreen_runtime::{FheRuntime, LogProofBuilder, Params, SealSdlpProverKnowledge};

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
        prove_and_verify_seal(sdlp)
    }

    #[test]
    fn prove_shared_asymmetric_statements() {
        let rt = FheRuntime::new(&SMALL_PARAMS).unwrap();
        let (public_key, _secret_key) = rt.generate_keys().unwrap();
        let mut logproof_builder = LogProofBuilder::new(&rt);

        let (_a1, shared_a) = logproof_builder
            .encrypt_and_share(&Signed::from(2), &public_key)
            .unwrap();
        let _a2 = logproof_builder
            .encrypt_shared(&shared_a, &public_key)
            .unwrap();
        let _b = logproof_builder
            .encrypt(&Signed::from(3), &public_key)
            .unwrap();
        let sdlp = logproof_builder.build_logproof().unwrap();

        prove_and_verify_seal(sdlp)
    }

    fn prove_and_verify_seal(pk: SealSdlpProverKnowledge) {
        let vk = pk.vk();
        let gen: LogProofGenerators = LogProofGenerators::new(vk.l() as usize);
        let u = InnerProductVerifierKnowledge::get_u();
        let mut p_t = Transcript::new(b"test");
        let proof = pk.create_logproof(&mut p_t, &gen.g, &gen.h, &u);
        let mut v_t = Transcript::new(b"test");

        vk.verify(&proof, &mut v_t, &gen.g, &gen.h, &u).unwrap()
    }
}
