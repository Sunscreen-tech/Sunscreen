#[cfg(feature = "linkedproofs")]
mod sdlp_tests {
    use lazy_static::lazy_static;
    use logproof::rings::SealQ128_1024;
    use sunscreen::{
        types::bfv::{Fractional, Signed, Unsigned64},
        FheProgramFnExt,
    };
    use sunscreen_compiler_macros::fhe_program;
    use sunscreen_fhe_program::SchemeType;

    use sunscreen_runtime::{FheRuntime, Params, SdlpBuilder, SdlpVerificationBuilder};

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
        let mut logproof_builder = SdlpBuilder::new(&rt);

        let ct = logproof_builder
            .encrypt(&Signed::from(3), &public_key)
            .unwrap();

        let sdlp = logproof_builder.build().unwrap();

        let mut logproof_vk_builder = SdlpVerificationBuilder::new(&rt);
        logproof_vk_builder.encrypt(&ct, &public_key).unwrap();
        logproof_vk_builder.proof(sdlp).verify().unwrap();
    }

    #[test]
    fn prove_one_symmetric_statement() {
        let rt = FheRuntime::new(&TEST_PARAMS).unwrap();
        let (_public_key, private_key) = rt.generate_keys().unwrap();
        let mut logproof_builder = SdlpBuilder::new(&rt);

        let ct = logproof_builder
            .encrypt_symmetric(&Unsigned64::from(3), &private_key)
            .unwrap();

        let sdlp = logproof_builder.build().unwrap();

        let mut logproof_vk_builder = SdlpVerificationBuilder::new(&rt);
        logproof_vk_builder.encrypt_symmetric(&ct).unwrap();
        logproof_vk_builder.proof(sdlp).verify().unwrap();
    }

    #[test]
    fn prove_linked_statements() {
        let rt = FheRuntime::new(&TEST_PARAMS).unwrap();
        let (public_key, private_key) = rt.generate_keys().unwrap();
        let mut logproof_builder = SdlpBuilder::new(&rt);

        let (a1, linked_a) = logproof_builder
            .encrypt_returning_msg(&Fractional::<64>::from(3.23), &public_key)
            .unwrap();
        let a2 = logproof_builder
            .reencrypt_symmetric(&linked_a, &private_key)
            .unwrap();
        let other = logproof_builder
            .encrypt(&Signed::from(2), &public_key)
            .unwrap();

        let sdlp = logproof_builder.build().unwrap();

        let mut logproof_vk_builder = SdlpVerificationBuilder::new(&rt);
        let linked_a = logproof_vk_builder
            .encrypt_returning_msg(&a1, &public_key)
            .unwrap();
        logproof_vk_builder
            .reencrypt_symmetric(&linked_a, &a2)
            .unwrap();
        logproof_vk_builder.encrypt(&other, &public_key).unwrap();
        logproof_vk_builder.proof(sdlp).verify().unwrap();
    }

    #[test]
    fn prove_refreshing_existing_ciphertext() {
        let rt = FheRuntime::new(&TEST_PARAMS).unwrap();
        let (public_key, private_key) = rt.generate_keys().unwrap();

        let initial_ct = rt.encrypt(Signed::from(100), &public_key).unwrap();
        #[fhe_program(scheme = "bfv")]
        fn double(x: sunscreen::types::Cipher<Signed>) -> sunscreen::types::Cipher<Signed> {
            x + x
        }
        let computed_ct = double.run(&rt, &public_key, initial_ct).unwrap();

        let mut logproof_builder = SdlpBuilder::new(&rt);
        let (_, msg) = logproof_builder
            .decrypt_returning_msg::<Signed>(&computed_ct, &private_key)
            .unwrap();
        let refreshed_ct = logproof_builder.reencrypt(&msg, &public_key).unwrap();

        let sdlp = logproof_builder.build().unwrap();

        let mut logproof_vk_builder = SdlpVerificationBuilder::new(&rt);
        let msg = logproof_vk_builder
            .decrypt_returning_msg(&computed_ct)
            .unwrap();
        logproof_vk_builder
            .reencrypt(&msg, &refreshed_ct, &public_key)
            .unwrap();
        logproof_vk_builder.proof(sdlp).verify().unwrap();
    }
}
