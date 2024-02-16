use criterion::{
    criterion_group, criterion_main, measurement::WallTime, BenchmarkGroup, Criterion,
};

use sunscreen_tfhe::{
    entities::{
        GgswCiphertext, GgswCiphertextFft, GlweCiphertext, Polynomial, UnivariateLookupTable,
    },
    high_level::*,
    ops::bootstrapping::circuit_bootstrap,
    rand::Stddev,
    GlweDef, GlweDimension, GlweSize, LweDef, LweDimension, PlaintextBits, PolynomialDegree,
    RadixCount, RadixDecomposition, RadixLog, GLWE_1_1024_80, GLWE_5_256_80, LWE_512_80,
};

fn cmux(c: &mut Criterion) {
    struct CmuxParams {
        gsw_radix: RadixDecomposition,
        glwe: GlweDef,
    }

    fn cmux_params(params: &CmuxParams, c: &mut Criterion) {
        let sk = keygen::generate_binary_glwe_sk(&params.glwe);
        let bits = PlaintextBits(1);

        let msg = (0..params.glwe.dim.polynomial_degree.0 as u64)
            .map(|x| x % 2)
            .collect::<Vec<_>>();
        let msg = Polynomial::new(&msg);

        let a = encryption::encrypt_glwe(&msg, &sk, &params.glwe, bits);
        let b = a.clone();
        let sel = encryption::encrypt_ggsw(1, &sk, &params.glwe, &params.gsw_radix, bits);
        let mut sel_fft = GgswCiphertextFft::new(&params.glwe, &params.gsw_radix);

        sel.fft(&mut sel_fft, &params.glwe, &params.gsw_radix);

        let name = format!(
            "cmux N={} k={} l={}",
            params.glwe.dim.polynomial_degree.0, params.glwe.dim.size.0, params.gsw_radix.count.0
        );

        let mut result = GlweCiphertext::new(&params.glwe);

        c.bench_function(&name, |bench| {
            bench.iter(|| {
                sunscreen_tfhe::ops::fft_ops::cmux(
                    &mut result,
                    &a,
                    &b,
                    &sel_fft,
                    &params.glwe,
                    &params.gsw_radix,
                );
            });
        });
    }

    let params = CmuxParams {
        gsw_radix: RadixDecomposition {
            count: RadixCount(2),
            radix_log: RadixLog(10),
        },
        glwe: GLWE_5_256_80,
    };

    cmux_params(&params, c);

    let params = CmuxParams {
        gsw_radix: RadixDecomposition {
            count: RadixCount(1),
            radix_log: RadixLog(11),
        },
        glwe: GLWE_1_1024_80,
    };

    cmux_params(&params, c);
}

fn programmable_bootstrapping(c: &mut Criterion) {
    fn run_bench(
        name: &str,
        g: &mut BenchmarkGroup<WallTime>,
        lwe: &LweDef,
        glwe: &GlweDef,
        bs_radix: &RadixDecomposition,
    ) {
        let lwe_sk = keygen::generate_binary_lwe_sk(lwe);
        let glwe_sk = keygen::generate_binary_glwe_sk(glwe);
        let bsk = keygen::generate_bootstrapping_key(&lwe_sk, &glwe_sk, lwe, glwe, bs_radix);
        let bsk = fft::fft_bootstrap_key(&bsk, lwe, glwe, bs_radix);

        let ct = lwe_sk.encrypt(1, &glwe.as_lwe_def(), PlaintextBits(1)).0;
        let lut = UnivariateLookupTable::trivial_from_fn(|x| x, glwe, PlaintextBits(1));

        g.bench_function(name, |b| {
            b.iter(|| {
                evaluation::univariate_programmable_bootstrap(&ct, &lut, &bsk, lwe, glwe, bs_radix);
            });
        });
    }

    let mut g = c.benchmark_group("Bootstrapping");

    // CBS parameters
    let radix = RadixDecomposition {
        count: RadixCount(2),
        radix_log: RadixLog(16),
    };

    run_bench(
        "CBS parameters",
        &mut g,
        &LWE_512_80,
        &GLWE_5_256_80,
        &radix,
    );

    // Binary PBS parameters
    let bs_radix = RadixDecomposition {
        count: RadixCount(3),
        radix_log: RadixLog(6),
    };

    run_bench(
        "boolean PBS parameters",
        &mut g,
        &LweDef {
            dim: LweDimension(722),
            std: Stddev(0.000013071021089943935),
        },
        &GlweDef {
            dim: GlweDimension {
                size: GlweSize(2),
                polynomial_degree: PolynomialDegree(512),
            },
            std: Stddev(0.00000004990272175010415),
        },
        &bs_radix,
    );

    // 3-bit message 1-bit carry PBS parameters
    let bs_radix = RadixDecomposition {
        count: RadixCount(1),
        radix_log: RadixLog(23),
    };

    run_bench(
        "3+1 message PBS parameters",
        &mut g,
        &LweDef {
            dim: LweDimension(742),
            std: Stddev(0.000007069849454709433),
        },
        &GlweDef {
            dim: GlweDimension {
                size: GlweSize(1),
                polynomial_degree: PolynomialDegree(2048),
            },
            std: Stddev(0.00000000000000029403601535432533),
        },
        &bs_radix,
    );
}

fn circuit_bootstrapping(c: &mut Criterion) {
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

    let level_2_params = GLWE_5_256_80;
    let level_1_params = GLWE_1_1024_80;
    let level_0_params = LWE_512_80;

    let sk_0 = keygen::generate_binary_lwe_sk(&level_0_params);
    let sk_1 = keygen::generate_binary_glwe_sk(&level_1_params);
    let sk_2 = keygen::generate_binary_glwe_sk(&level_2_params);

    let bsk = keygen::generate_bootstrapping_key(
        &sk_0,
        &sk_2,
        &level_0_params,
        &level_2_params,
        &pbs_radix,
    );
    let bsk = fft::fft_bootstrap_key(&bsk, &level_0_params, &level_2_params, &pbs_radix);

    let cbsksk = keygen::generate_cbs_ksk(
        sk_2.to_lwe_secret_key(),
        &sk_1,
        &level_2_params.as_lwe_def(),
        &level_1_params,
        &pfks_radix,
    );

    let val = 0;

    let ct = encryption::encrypt_lwe_secret(val, &sk_0, &level_0_params, PlaintextBits(1));

    let mut actual = GgswCiphertext::new(&level_1_params, &cbs_radix);

    c.bench_function("Circuit bootstrap", |b| {
        b.iter(|| {
            circuit_bootstrap(
                &mut actual,
                &ct,
                &bsk,
                &cbsksk,
                &level_0_params,
                &level_1_params,
                &level_2_params,
                &pbs_radix,
                &cbs_radix,
                &pfks_radix,
            );
        });
    });
}

criterion_group!(
    benches,
    cmux,
    programmable_bootstrapping,
    circuit_bootstrapping
);
criterion_main!(benches);
