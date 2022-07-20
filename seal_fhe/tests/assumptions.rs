mod test_common;
use seal_fhe::Evaluator;

#[test]
fn overflow_does_not_bleed_into_other_lanes() {
    test_common::run_bfv_test(17, 8192, |decryptor, encoder, encryptor, eval, _| {
        let mut data = Vec::with_capacity(8192);

        for i in 0..8192 {
            if i == 1 {
                data.push(10_000);
            } else {
                data.push(100);
            }
        }

        let p = encoder.encode_unsigned(&data).unwrap();
        let c = encryptor.encrypt(&p).unwrap();

        let c_2 = eval.multiply(&c, &c).unwrap();

        let p_2 = decryptor.decrypt(&c_2).unwrap();
        let out = encoder.decode_unsigned(&p_2).unwrap();

        for i in 0..out.len() {
            if i == 1 {
                // This lane overflowed...
                assert_eq!(out[i], 105_881);
            } else {
                assert_eq!(out[i], 10_000);
            }
        }
    })
}

#[test]
fn multiply_ciphertext_increases_terms() {
    test_common::run_bfv_test(17, 8192, |_, encoder, encryptor, eval, _| {
        let mut data = Vec::with_capacity(8192);

        for i in 0..8192 {
            if i == 1 {
                data.push(10_000);
            } else {
                data.push(100);
            }
        }

        let p = encoder.encode_unsigned(&data).unwrap();
        let c = encryptor.encrypt(&p).unwrap();

        assert_eq!(c.num_polynomials(), 2);

        let c_2 = eval.multiply(&c, &c).unwrap();

        assert_eq!(c_2.num_polynomials(), 3);
    })
}

#[test]
fn multiply_plaintext_does_not_increase_polynomials() {
    test_common::run_bfv_test(17, 8192, |_, encoder, encryptor, eval, _| {
        let mut data = Vec::with_capacity(8192);

        for i in 0..8192 {
            if i == 1 {
                data.push(10_000);
            } else {
                data.push(100);
            }
        }

        let p = encoder.encode_unsigned(&data).unwrap();
        let c = encryptor.encrypt(&p).unwrap();

        assert_eq!(c.num_polynomials(), 2);

        let c_2 = eval.multiply_plain(&c, &p).unwrap();

        assert_eq!(c_2.num_polynomials(), 2);
    })
}

#[test]
fn lanes_have_same_modulus() {
    test_common::run_bfv_test(17, 8192, |decryptor, encoder, encryptor, eval, _| {
        let mut data = Vec::with_capacity(8192);

        for _i in 0..8192 {
            data.push(10_000);
        }

        let p = encoder.encode_unsigned(&data).unwrap();
        let c = encryptor.encrypt(&p).unwrap();

        // 10_000 ^ 2 should produce the same value in every lane if the modulus
        // is the same in every lane.
        let c_2 = eval.multiply(&c, &c).unwrap();

        let p_2 = decryptor.decrypt(&c_2).unwrap();
        let out = encoder.decode_unsigned(&p_2).unwrap();

        for i in 0..out.len() {
            assert_eq!(out[i], 105_881);
        }
    })
}

#[test]
fn lane_modulus_is_not_power_of_2() {
    test_common::run_bfv_test(17, 8192, |decryptor, encoder, encryptor, eval, _| {
        // Modulus should be 114_689
        let mut data = Vec::with_capacity(8192);
        let mut data_2 = Vec::with_capacity(8192);

        for _i in 0..8192 {
            data.push(114_688);
            data_2.push(1);
        }

        let p = encoder.encode_unsigned(&data).unwrap();
        let p_2 = encoder.encode_unsigned(&data_2).unwrap();
        let c = encryptor.encrypt(&p).unwrap();

        // 10_000 ^ 2 should produce the same value in every lane if the modulus
        // is the same in every lane.
        let c_2 = eval.add_plain(&c, &p_2).unwrap();

        let p_2 = decryptor.decrypt(&c_2).unwrap();
        let out = encoder.decode_unsigned(&p_2).unwrap();

        for i in 0..out.len() {
            assert_eq!(out[i], 0);
        }
    })
}

#[test]
fn relinearization_consumes_no_noise_budget() {
    use seal_fhe::*;

    let degree = 8192;
    let lane_bits = 18;

    let params = BfvEncryptionParametersBuilder::new()
        .set_poly_modulus_degree(degree)
        .set_coefficient_modulus(
            CoefficientModulus::bfv_default(degree, SecurityLevel::TC128).unwrap(),
        )
        .set_plain_modulus(PlainModulus::batching(degree, lane_bits).unwrap())
        .build()
        .unwrap();

    let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
    let gen = KeyGenerator::new(&ctx).unwrap();

    let encoder = BFVEncoder::new(&ctx).unwrap();

    let public_key = gen.create_public_key();
    let private_key = gen.secret_key();
    let relin_key = gen.create_relinearization_keys().unwrap();

    let encryptor = Encryptor::with_public_and_secret_key(&ctx, &public_key, &private_key).unwrap();
    let decryptor = Decryptor::new(&ctx, &private_key).unwrap();
    let eval = BFVEvaluator::new(&ctx).unwrap();

    // Modulus should be 114_689
    let mut data = Vec::with_capacity(8192);
    let mut data_2 = Vec::with_capacity(8192);

    for _i in 0..8192 {
        data.push(114_688);
        data_2.push(1);
    }

    let p = encoder.encode_unsigned(&data).unwrap();
    let c_1 = encryptor.encrypt(&p).unwrap();
    let c_2 = encryptor.encrypt(&p).unwrap();

    // 10_000 ^ 2 should produce the same value in every lane if the modulus
    // is the same in every lane.
    let c_2 = eval.multiply(&c_1, &c_2).unwrap();

    let noise_pre = decryptor.invariant_noise_budget(&c_2).unwrap();

    let c_3 = eval.relinearize(&c_2, &relin_key).unwrap();

    let noise_post = decryptor.invariant_noise_budget(&c_3).unwrap();

    assert_eq!(noise_post, noise_pre);
}
