mod test_common; 

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