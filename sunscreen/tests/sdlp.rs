#[cfg(feature = "sdlp")]
mod sdlp_tests {
    use lazy_static::lazy_static;
    use logproof::{
        crypto::CryptoHash, math::ModSwitch, rings::ZqRistretto, InnerProductVerifierKnowledge,
        LogProof, LogProofGenerators, LogProofProverKnowledge, Transcript,
    };
    use sunscreen::types::bfv::Signed;
    use sunscreen_fhe_program::SchemeType;
    use sunscreen_math::ring::{Ring, RingModulus};
    use sunscreen_runtime::{
        sdlp::{LogProofBuilder, SealSdlpEnum},
        FheRuntime, Params,
    };

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

        let sdlp = logproof_builder.build().unwrap();
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
        let sdlp = logproof_builder.build().unwrap();

        prove_and_verify_seal(sdlp)
    }

    fn prove_and_verify_seal(seal_sdlp: SealSdlpEnum) {
        match seal_sdlp {
            SealSdlpEnum::LP1024(x) => prove_and_verify(&x),
            SealSdlpEnum::LP2048(x) => prove_and_verify(&x),
            SealSdlpEnum::LP4096(x) => prove_and_verify(&x),
            SealSdlpEnum::LP8192(x) => prove_and_verify(&x),
        }
    }

    fn prove_and_verify<Q>(pk: &LogProofProverKnowledge<Q>)
    where
        Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord,
    {
        let gen: LogProofGenerators = LogProofGenerators::new(pk.vk.l() as usize);
        let u = InnerProductVerifierKnowledge::get_u();
        let mut p_t = Transcript::new(b"test");
        let proof = LogProof::create(&mut p_t, pk, &gen.g, &gen.h, &u);
        let mut v_t = Transcript::new(b"test");

        proof.verify(&mut v_t, &pk.vk, &gen.g, &gen.h, &u).unwrap()
    }
}
