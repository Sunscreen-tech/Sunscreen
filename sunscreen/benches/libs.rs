//! A benchmark comparing fhe.rs and SEAL

use criterion::{criterion_group, criterion_main, BatchSize, BenchmarkId, Criterion};
use fhe_traits::FheDecoder;
use lazy_static::lazy_static;
use rand::thread_rng;

use sunscreen::{types::bfv::Signed, Params, SchemeType};

lazy_static! {
    static ref DIM_4096: Params = Params {
        lattice_dimension: 4096,
        coeff_modulus: vec![0xffffee001, 0xffffc4001, 0x1ffffe0001],
        plain_modulus: 4_096,
        scheme_type: SchemeType::Bfv,
        security_level: sunscreen::SecurityLevel::TC128,
    };
    static ref DIM_8192: Params = Params {
        lattice_dimension: 8192,
        coeff_modulus: vec![
            0x7fffffd8001,
            0x7fffffc8001,
            0xfffffffc001,
            0xffffff6c001,
            0xfffffebc001,
        ],
        plain_modulus: 4_096,
        scheme_type: SchemeType::Bfv,
        security_level: sunscreen::SecurityLevel::TC128,
    };
    static ref DIM_16384: Params = Params {
        lattice_dimension: 16384,
        coeff_modulus: vec![
            0xfffffffd8001,
            0xfffffffa0001,
            0xfffffff00001,
            0x1fffffff68001,
            0x1fffffff50001,
            0x1ffffffee8001,
            0x1ffffffea0001,
            0x1ffffffe88001,
            0x1ffffffe48001,
        ],
        plain_modulus: 4_096,
        scheme_type: SchemeType::Bfv,
        security_level: sunscreen::SecurityLevel::TC128,
    };
}

fn bench_bfv_libs(c: &mut Criterion) {
    let mut rng = thread_rng();
    let mut group = c.benchmark_group("bfv_libs");
    let signed_a = Signed::from(100);
    let signed_b = Signed::from(300);

    for par in [DIM_4096.clone(), DIM_8192.clone(), DIM_16384.clone()] {
        // SEAL
        let seal_ctx = seal::make_context(&par);
        let seal_keys = seal::generate_keys(&seal_ctx);

        // fhe.rs
        let fhe_par = fhe_rs::make_params(&par);
        let fhe_keys = fhe_rs::generate_keys(&fhe_par, &mut rng);

        let n = fhe_par.degree();
        let logq = fhe_par.moduli_sizes().iter().sum::<usize>();

        /******************* Key Gen *******************/

        group.bench_function(
            BenchmarkId::new("keygen", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let _keys = fhe_rs::generate_keys(&fhe_par, &mut rng);
                });
            },
        );
        group.bench_function(
            BenchmarkId::new("keygen", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    let _keys = seal::generate_keys(&seal_ctx);
                });
            },
        );

        /******************* Encrypt *******************/

        // Encode into plaintext values
        let seal_pt_a = seal::pt_from_signed(signed_a, &par);
        let seal_pt_b = seal::pt_from_signed(signed_b, &par);

        let fhe_pt_a = fhe_rs::from_seal_pt(&seal_pt_a, &fhe_par);
        let fhe_pt_b = fhe_rs::from_seal_pt(&seal_pt_b, &fhe_par);

        group.bench_function(
            BenchmarkId::new("encrypt", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let _fhe_ct = fhe_rs::encrypt(&fhe_keys.public_key, &fhe_pt_a, &mut rng);
                });
            },
        );
        group.bench_function(
            BenchmarkId::new("encrypt", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    let _seal_ct = seal::encrypt(&seal_ctx, &seal_keys.public_key, &seal_pt_a);
                });
            },
        );

        // Perform encryption
        let seal_ct_a = seal::encrypt(&seal_ctx, &seal_keys.public_key, &seal_pt_a);
        let seal_ct_b = seal::encrypt(&seal_ctx, &seal_keys.public_key, &seal_pt_b);
        println!(
            "n={}/log(q)={}/lib=SEAL: ciphertext size: {}",
            n,
            logq,
            human_readable_bytes(seal::num_bytes_ct(&seal_ct_a))
        );
        let fhe_ct_a = fhe_rs::encrypt(&fhe_keys.public_key, &fhe_pt_a, &mut rng);
        let fhe_ct_b = fhe_rs::encrypt(&fhe_keys.public_key, &fhe_pt_b, &mut rng);
        println!(
            "n={}/log(q)={}/lib=fhe.rs: ciphertext size: {}",
            n,
            logq,
            human_readable_bytes(fhe_rs::num_bytes_ct(&fhe_ct_a))
        );

        /******************* Mul *******************/

        group.bench_function(
            BenchmarkId::new("mul", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let _c = fhe_rs::multiply(&fhe_ct_a, &fhe_ct_b);
                });
            },
        );

        group.bench_function(
            BenchmarkId::new("mul", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    let _c = seal::multiply(&seal_ctx, &seal_ct_a, &seal_ct_b);
                });
            },
        );

        let seal_ct_c = seal::multiply(&seal_ctx, &seal_ct_a, &seal_ct_b);
        let fhe_ct_c = fhe_rs::multiply(&fhe_ct_a, &fhe_ct_b);

        /******************* Relinearize *******************/

        group.bench_function(
            BenchmarkId::new("relin", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter_batched_ref(
                    || fhe_ct_c.clone(),
                    |ct| {
                        fhe_keys.relin_key.relinearizes(ct).unwrap();
                    },
                    BatchSize::SmallInput,
                );
            },
        );

        group.bench_function(
            BenchmarkId::new("relin", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                // Don't really need batched ref on this, but want to be as consistent as possible with the fhe.rs version
                b.iter_batched_ref(
                    || seal_ct_c.clone(),
                    |ct| {
                        let _c = seal::relinearize(&seal_ctx, &seal_keys.relin_keys, ct);
                    },
                    BatchSize::SmallInput,
                );
            },
        );

        // Assert correctness of multiply & relin
        let seal_ct_c = seal::multiply(&seal_ctx, &seal_ct_a, &seal_ct_b);
        let seal_ct_c = seal::relinearize(&seal_ctx, &seal_keys.relin_keys, &seal_ct_c);
        let seal_pt_c = seal::decrypt(&seal_ctx, &seal_keys.secret_key, &seal_ct_c);
        let mut fhe_ct_c = fhe_rs::multiply(&fhe_ct_a, &fhe_ct_b);
        fhe_keys.relin_key.relinearizes(&mut fhe_ct_c).unwrap();
        let fhe_pt_c = fhe_rs::decrypt(&fhe_keys.secret_key, &fhe_ct_c);
        assert_eq_poly(&seal_pt_c, &fhe_pt_c);

        /******************* Add *******************/

        group.bench_function(
            BenchmarkId::new("add", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let _c = fhe_rs::add(&fhe_ct_a, &fhe_ct_b);
                });
            },
        );
        group.bench_function(
            BenchmarkId::new("add", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    let _c = seal::add(&seal_ctx, &seal_ct_a, &seal_ct_b);
                });
            },
        );

        // Assert correctness of addition
        let seal_ct_c = seal::add(&seal_ctx, &seal_ct_a, &seal_ct_b);
        let fhe_ct_c = &fhe_ct_a + &fhe_ct_b;
        let seal_pt_c = seal::decrypt(&seal_ctx, &seal_keys.secret_key, &seal_ct_c);
        let fhe_pt_c = fhe_rs::decrypt(&fhe_keys.secret_key, &fhe_ct_c);
        assert_eq_poly(&seal_pt_c, &fhe_pt_c);

        /******************* Decrypt *******************/

        group.bench_function(
            BenchmarkId::new("decrypt", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let _fhe_pt = fhe_rs::decrypt(&fhe_keys.secret_key, &fhe_ct_c);
                });
            },
        );
        group.bench_function(
            BenchmarkId::new("decrypt", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    let _seal_pt = seal::decrypt(&seal_ctx, &seal_keys.secret_key, &seal_ct_c);
                });
            },
        );
    }

    group.finish();
}

mod seal {
    pub use seal_fhe::*;
    use sunscreen::types::bfv::Signed;
    use sunscreen_runtime::{Params, TryIntoPlaintext};

    pub struct Keys {
        pub public_key: PublicKey,
        pub secret_key: SecretKey,
        pub relin_keys: RelinearizationKeys,
        pub galois_keys: GaloisKeys,
    }

    pub fn make_context(sun_par: &Params) -> Context {
        let plain_modulus = PlainModulus::raw(sun_par.plain_modulus).unwrap();
        let modulus_chain = sun_par
            .coeff_modulus
            .iter()
            .map(|x| Modulus::new(*x).unwrap())
            .collect::<Vec<Modulus>>();

        let enc_params = BfvEncryptionParametersBuilder::new()
            .set_plain_modulus(plain_modulus)
            .set_coefficient_modulus(modulus_chain)
            .set_poly_modulus_degree(sun_par.lattice_dimension)
            .build()
            .unwrap();

        Context::new(&enc_params, true, sun_par.security_level).unwrap()
    }

    pub fn generate_keys(ctx: &Context) -> Keys {
        let keygen = KeyGenerator::new(ctx).unwrap();

        let public_key = keygen.create_public_key();
        let secret_key = keygen.secret_key();
        let relin_keys = keygen.create_relinearization_keys().unwrap();
        let galois_keys = keygen.create_galois_keys().unwrap();

        Keys {
            public_key,
            secret_key,
            relin_keys,
            galois_keys,
        }
    }

    pub fn pt_from_signed(signed: Signed, sun_par: &Params) -> Plaintext {
        let pt = signed.try_into_plaintext(sun_par).unwrap();
        let seal_pts = pt.inner.as_seal_plaintext().unwrap();
        seal_pts[0].clone().data
    }

    // To make an encryption from a public key requires instatiating the
    // encryptor, so it is a more accurate comparison to include the encryptor
    // construction in this benchmark
    pub fn encrypt(ctx: &Context, public_key: &PublicKey, pt: &Plaintext) -> Ciphertext {
        let encryptor = Encryptor::with_public_key(ctx, public_key).unwrap();
        encryptor.encrypt(pt).unwrap()
    }

    // To decrypt requires instatiating the decryptor, so it is a more accurate comparison to
    // include the decryptor construction in this benchmark
    pub fn decrypt(ctx: &Context, secret_key: &SecretKey, c: &Ciphertext) -> Plaintext {
        let decryptor = Decryptor::new(ctx, secret_key).unwrap();
        decryptor.decrypt(c).unwrap()
    }

    // Including evaluator construction in cost of single operation, however this would
    // normally be amortized across a sunscreen FHE program
    pub fn multiply(ctx: &Context, a: &Ciphertext, b: &Ciphertext) -> Ciphertext {
        let evaluator = BFVEvaluator::new(ctx).unwrap();
        evaluator.multiply(a, b).unwrap()
    }

    // Including evaluator construction in cost of single operation, however this would
    // normally be amortized across a sunscreen FHE program
    pub fn add(ctx: &Context, a: &Ciphertext, b: &Ciphertext) -> Ciphertext {
        let evaluator = BFVEvaluator::new(ctx).unwrap();
        evaluator.add(a, b).unwrap()
    }

    // Including evaluator construction in cost of single operation, however this would
    // normally be amortized across a sunscreen FHE program
    pub fn relinearize(
        ctx: &Context,
        relin_keys: &RelinearizationKeys,
        c: &Ciphertext,
    ) -> Ciphertext {
        let evaluator = BFVEvaluator::new(ctx).unwrap();
        evaluator.relinearize(c, relin_keys).unwrap()
    }

    pub fn num_bytes_ct(ct: &Ciphertext) -> usize {
        ct.as_bytes().unwrap().len()
    }
}

pub mod fhe_rs {
    use std::sync::Arc;

    pub use fhe::bfv::*;
    use fhe_traits::{FheDecrypter, FheEncoder, FheEncrypter, Serialize};
    use rand::rngs::ThreadRng;
    use sunscreen_runtime::Params;

    pub struct Keys {
        pub public_key: PublicKey,
        pub secret_key: SecretKey,
        pub relin_key: RelinearizationKey,
        pub eval_key: EvaluationKey,
    }

    pub fn make_params(sun_par: &Params) -> Arc<BfvParameters> {
        BfvParametersBuilder::new()
            .set_degree(sun_par.lattice_dimension as usize)
            .set_plaintext_modulus(sun_par.plain_modulus)
            .set_moduli(&sun_par.coeff_modulus)
            .build()
            .map(Arc::new)
            .unwrap()
    }

    pub fn generate_keys(par: &Arc<BfvParameters>, mut rng: &mut ThreadRng) -> Keys {
        let secret_key = SecretKey::random(par, &mut rng);
        let public_key = PublicKey::new(&secret_key, &mut rng);
        let relin_key = RelinearizationKey::new(&secret_key, &mut rng).unwrap();
        let eval_key = EvaluationKeyBuilder::new(&secret_key)
            .unwrap()
            .enable_inner_sum()
            .unwrap()
            .enable_column_rotation(1)
            .unwrap()
            .enable_expansion(par.degree().ilog2() as usize)
            .unwrap()
            .build(&mut rng)
            .unwrap();
        Keys {
            secret_key,
            public_key,
            relin_key,
            eval_key,
        }
    }

    pub fn from_seal_pt(
        seal_pt: &seal_fhe::Plaintext,
        fhe_params: &Arc<BfvParameters>,
    ) -> Plaintext {
        let is_ntt = seal_pt.is_ntt_form();
        let pt_len = seal_pt.len();

        let mut coeffs = Vec::with_capacity(pt_len);
        for i in 0..pt_len {
            coeffs.push(seal_pt.get_coefficient(i));
        }

        if is_ntt {
            panic!("this should not be in NTT");
        }

        Plaintext::try_encode(&coeffs, Encoding::poly(), fhe_params).unwrap()
    }

    pub fn encrypt(public_key: &PublicKey, pt: &Plaintext, mut rng: &mut ThreadRng) -> Ciphertext {
        public_key.try_encrypt(pt, &mut rng).unwrap()
    }

    pub fn decrypt(secret_key: &SecretKey, ct: &Ciphertext) -> Plaintext {
        secret_key.try_decrypt(ct).unwrap()
    }

    pub fn multiply(ct_a: &Ciphertext, ct_b: &Ciphertext) -> Ciphertext {
        ct_a * ct_b
    }

    pub fn add(ct_a: &Ciphertext, ct_b: &Ciphertext) -> Ciphertext {
        ct_a + ct_b
    }

    pub fn num_bytes_ct(ct: &Ciphertext) -> usize {
        ct.to_bytes().len()
    }
}

fn assert_eq_poly(seal_pt_a: &seal::Plaintext, fhe_pt_b: &fhe_rs::Plaintext) {
    let pt_a_len = seal_pt_a.len();

    let mut coeffs_a = Vec::with_capacity(pt_a_len);
    for i in 0..pt_a_len {
        coeffs_a.push(seal_pt_a.get_coefficient(i));
    }

    // fhe.rs includes leading zeroes in this decoding
    let coeffs_b_full = <Vec<u64>>::try_decode(fhe_pt_b, fhe_rs::Encoding::poly()).unwrap();
    let (coeffs_b, leading_zeros) = coeffs_b_full.split_at(pt_a_len);

    assert_eq!(coeffs_a, coeffs_b);
    assert_eq!(leading_zeros, vec![0; leading_zeros.len()]);
    assert!(pt_a_len <= coeffs_b_full.len())
}

fn human_readable_bytes(size: usize) -> String {
    let size = size as f64;
    if size < 1e3 {
        format!("{size} B")
    } else if size < 1e6 {
        format!("{} KB", size / 1e3)
    } else {
        format!("{} MB", size / 1e6)
    }
}

criterion_group! {
    name = benches;
    // Bump each bench measurement time
    config = Criterion::default()
        .noise_threshold(0.05);
        // .sample_size(30)
        // .measurement_time(Duration::from_secs(60))
        // .warm_up_time(Duration::from_secs(5));
    targets = bench_bfv_libs
}
criterion_main!(benches);
