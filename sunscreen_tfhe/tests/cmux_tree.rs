use sunscreen_tfhe::entities::Polynomial;
use sunscreen_tfhe::{
    high_level, PlaintextBits, RadixCount, RadixDecomposition, RadixLog, GLWE_1_1024_80,
    GLWE_5_256_80, LWE_512_80,
};

fn cmux_tree_once() {
    // Parameters for the cmux tree
    let depth = 64;

    // cmux tree select bits
    let select_bits = (0..depth)
        .map(|_| rand::random::<bool>() as u64)
        .collect::<Vec<_>>();

    let random_bits = (0..depth)
        .map(|_| rand::random::<bool>() as u64)
        .collect::<Vec<_>>();

    // Parameters
    let plaintext_bits = PlaintextBits(1);

    let pbs_radix = RadixDecomposition {
        count: RadixCount(2),
        radix_log: RadixLog(16),
    };

    let cbs_radix = RadixDecomposition {
        count: RadixCount(1),
        radix_log: RadixLog(11),
    };

    let pfks_radix = RadixDecomposition {
        count: RadixCount(3),
        radix_log: RadixLog(11),
    };

    let level_0_params = LWE_512_80;
    let level_1_params = GLWE_1_1024_80;
    let level_2_params = GLWE_5_256_80;

    // Keys
    let sk_0 = high_level::keygen::generate_binary_lwe_sk(&level_0_params);
    let sk_1 = high_level::keygen::generate_binary_glwe_sk(&level_1_params);
    let sk_2 = high_level::keygen::generate_binary_glwe_sk(&level_2_params);

    let bsk = high_level::keygen::generate_bootstrapping_key(
        &sk_0,
        &sk_2,
        &level_0_params,
        &level_2_params,
        &pbs_radix,
    );
    let bsk =
        high_level::fft::fft_bootstrap_key(&bsk, &level_0_params, &level_2_params, &pbs_radix);

    let cbsksk = high_level::keygen::generate_cbs_ksk(
        sk_2.to_lwe_secret_key(),
        &sk_1,
        &level_2_params.as_lwe_def(),
        &level_1_params,
        &pfks_radix,
    );

    // Expected calculation.
    // We are randomly choosing between the last result and the random bit at
    // each level.
    let mut expected_result = 0;

    for (select_bit, random_bit) in select_bits.iter().zip(random_bits.iter()) {
        expected_result = if *select_bit == 0 {
            expected_result
        } else {
            *random_bit
        };
    }

    // Actual calculation
    let zero_polynomial = Polynomial::zero(level_1_params.dim.polynomial_degree.0);

    let mut d0 =
        high_level::encryption::trivial_glwe(&zero_polynomial, &level_1_params, plaintext_bits);

    for (select_bit, random_bit) in select_bits.iter().zip(random_bits.iter()) {
        let sel = high_level::encryption::encrypt_lwe_secret(
            *select_bit,
            &sk_0,
            &level_0_params,
            plaintext_bits,
        );
        let sel_bootstrapped = high_level::evaluation::circuit_bootstrap(
            &sel,
            &bsk,
            &cbsksk,
            &level_0_params,
            &level_1_params,
            &level_2_params,
            &pbs_radix,
            &cbs_radix,
            &pfks_radix,
        );
        let sel_bootstrapped_fft =
            high_level::fft::fft_ggsw(&sel_bootstrapped, &level_1_params, &cbs_radix);

        // We use the select bit itself as the one line
        let d1_polynomial = Polynomial::new(
            &(0..level_1_params.dim.polynomial_degree.0)
                .map(|_| *random_bit)
                .collect::<Vec<_>>(),
        );
        let d1 =
            high_level::encryption::trivial_glwe(&d1_polynomial, &level_1_params, plaintext_bits);

        let result = high_level::evaluation::cmux(
            &sel_bootstrapped_fft,
            &d0,
            &d1,
            &level_1_params,
            &cbs_radix,
        );

        d0 = result;
    }

    // Check the result
    let result = high_level::encryption::decrypt_glwe(&d0, &sk_1, &level_1_params, plaintext_bits)
        .coeffs()[0];

    assert_eq!(result, expected_result);
}

#[test]
fn cmux_tree() {
    // 7 runs is a 0.78% chance of success if the test is broken, so we should
    // be good.
    for _ in 0..7 {
        cmux_tree_once();
    }
}
