//! A benchmark comparing fhe.rs and SEAL

use std::{fmt::Display, sync::Arc};

use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion};
use fhe::bfv as fhe_rs;
use fhe_traits::{FheDecoder, FheDecrypter, FheEncoder, FheEncrypter, Serialize as FhersSerialize};
use lazy_static::lazy_static;
use rand::{rngs::OsRng, thread_rng};
use seal_fhe::ToBytes;
use serde::Serialize;
use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, FheRuntime, Params, SchemeType,
};
use sunscreen_compiler_common::TypeName;
use sunscreen_runtime::{
    InnerPlaintext, Plaintext, TryFromPlaintext, TryIntoPlaintext, WithContext,
};

#[derive(Clone, Serialize)]
struct NamedParams {
    name: &'static str,
    params: Params,
}

lazy_static! {
    static ref DIM_4096: NamedParams = NamedParams {
        name: "n = 4086",
        params: Params {
            lattice_dimension: 4096,
            coeff_modulus: vec![0xffffee001, 0xffffc4001, 0x1ffffe0001],
            plain_modulus: 4_096,
            scheme_type: SchemeType::Bfv,
            security_level: sunscreen::SecurityLevel::TC128,
        }
    };
    static ref DIM_8192: NamedParams = NamedParams {
        name: "n = 8192",
        params: Params {
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
        }
    };
    static ref DIM_16384: NamedParams = NamedParams {
        name: "n = 16384",
        params: Params {
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
        }
    };
}

#[fhe_program(scheme = "bfv")]
fn add(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    a + b
}

#[fhe_program(scheme = "bfv")]
fn mul(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    a * b
}

fn bench_bfv_libs(c: &mut Criterion) {
    let mut rng = thread_rng();
    let mut group = c.benchmark_group("bfv_libs");

    for seal_par in [DIM_4096.clone(), DIM_8192.clone(), DIM_16384.clone()] {
        // SEAL
        let runtime = FheRuntime::new(&seal_par.params).unwrap();
        let app = Compiler::new()
            .fhe_program(add)
            .fhe_program(mul)
            .with_params(&seal_par.params)
            .compile()
            .unwrap();
        let add_prog = app.get_fhe_program(add).unwrap();
        let mul_prog = app.get_fhe_program(mul).unwrap();
        let (seal_pubkey, seal_seck) = runtime.generate_keys().unwrap();
        let signed_a = Signed::from(100);
        let signed_b = Signed::from(300);
        let seal_enc_a = runtime.encrypt(signed_a, &seal_pubkey).unwrap();
        let seal_enc_b = runtime.encrypt(signed_b, &seal_pubkey).unwrap();
        let seal_pt_a = signed_a.try_into_plaintext(&seal_par.params).unwrap();
        let seal_pt_b = signed_b.try_into_plaintext(&seal_par.params).unwrap();
        println!(
            "{}: seal ct size: {}",
            seal_par.name,
            seal_num_bytes(&seal_enc_a)
        );

        // fhe.rs
        let fhe_par = fhe_rs::BfvParametersBuilder::new()
            .set_degree(seal_par.params.lattice_dimension as usize)
            .set_plaintext_modulus(seal_par.params.plain_modulus)
            .set_moduli(&seal_par.params.coeff_modulus)
            .build()
            .map(Arc::new)
            .unwrap();
        let fhe_seck = fhe_rs::SecretKey::random(&fhe_par, &mut OsRng);
        let fhe_pubk = fhe_rs::PublicKey::new(&fhe_seck, &mut rng);
        let fhe_rk = fhe_rs::RelinearizationKey::new(&fhe_seck, &mut rng).unwrap();
        let fhe_pt_a = to_fhers_pt(seal_pt_a, &fhe_par);
        let fhe_pt_b = to_fhers_pt(seal_pt_b, &fhe_par);
        let fhe_ct_a = fhe_pubk.try_encrypt(&fhe_pt_a, &mut rng).unwrap();
        let fhe_ct_b = fhe_pubk.try_encrypt(&fhe_pt_b, &mut rng).unwrap();
        println!(
            "{}: fhe.rs ct size: {}",
            seal_par.name,
            fhers_num_bytes(&fhe_ct_a)
        );

        let n = fhe_par.degree();
        let logq = fhe_par.moduli_sizes().iter().sum::<usize>();

        /******************* Key Gen *******************/

        group.bench_function(
            BenchmarkId::new("keygen", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let sk = fhe_rs::SecretKey::random(&fhe_par, &mut OsRng);
                    let _pk = fhe_rs::PublicKey::new(&sk, &mut rng);
                    let _rk = fhe_rs::RelinearizationKey::new(&sk, &mut rng).unwrap();
                    // This generates all the relevant Galois keys. I believe it is the same
                    // thing we do in sunscreen/SEAL.
                    let _ek = fhe_rs::EvaluationKeyBuilder::new(&sk)
                        .unwrap()
                        .enable_inner_sum()
                        .unwrap()
                        .enable_column_rotation(1)
                        .unwrap()
                        .enable_expansion(fhe_par.degree().ilog2() as usize)
                        .unwrap()
                        .build(&mut rng)
                        .unwrap();
                });
            },
        );
        group.bench_function(
            BenchmarkId::new("keygen", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    let _k = &runtime.generate_keys().unwrap();
                });
            },
        );

        /******************* Encrypt *******************/

        group.bench_function(
            BenchmarkId::new("encrypt", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let _fhe_ct = fhe_pubk.try_encrypt(&fhe_pt_a, &mut rng).unwrap();
                });
            },
        );
        group.bench_function(
            BenchmarkId::new("encrypt", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    // Plaintext doesnt have a TypeName instance, so we need to incur the
                    // Signed encoding cost here :/
                    let _seal_ct = runtime.encrypt(signed_a, &seal_pubkey).unwrap();
                });
            },
        );

        /******************* Mul *******************/

        group.bench_function(
            BenchmarkId::new("mul", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let mut c = &fhe_ct_a * &fhe_ct_b;
                    fhe_rk.relinearizes(&mut c).unwrap();
                });
            },
        );

        // TODO the ciphertext clone is mixed up in here. Use a variant with a setup fn
        group.bench_function(
            BenchmarkId::new("mul", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    runtime
                        .run(
                            mul_prog,
                            vec![seal_enc_a.clone(), seal_enc_b.clone()],
                            &seal_pubkey,
                        )
                        .unwrap()
                });
            },
        );

        // Assert correctness

        // Run seal multiplication and decrypt
        let seal_res_enc = &runtime
            .run(
                mul_prog,
                vec![seal_enc_a.clone(), seal_enc_b.clone()],
                &seal_pubkey,
            )
            .unwrap()[0];
        let seal_res_dec = runtime.decrypt(&seal_res_enc, &seal_seck).unwrap();
        // Run fhe.rs multiplication and decrypt
        let fhe_res_enc = &fhe_ct_a * &fhe_ct_b;
        let fhe_res_dec_pt = fhe_seck.try_decrypt(&fhe_res_enc).unwrap();
        // Assert decryptions are equal
        assert_eq_poly(seal_res_dec, &fhe_res_dec_pt, &seal_par.params);

        /******************* Add *******************/

        group.bench_function(
            BenchmarkId::new("add", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let _c = &fhe_ct_a + &fhe_ct_b;
                });
            },
        );
        // TODO the ciphertext clone is mixed up in here. Use a variant with a setup fn
        group.bench_function(
            BenchmarkId::new("add", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    runtime
                        .run(
                            add_prog,
                            vec![seal_enc_a.clone(), seal_enc_b.clone()],
                            &seal_pubkey,
                        )
                        .unwrap()
                });
            },
        );

        // Assert correctness

        // Run seal addition and decrypt
        let seal_res_enc = &runtime
            .run(
                add_prog,
                vec![seal_enc_a.clone(), seal_enc_b.clone()],
                &seal_pubkey,
            )
            .unwrap()[0];
        let seal_res_dec = runtime.decrypt(&seal_res_enc, &seal_seck).unwrap();
        // Run fhe.rs addition and decrypt
        let fhe_res_enc = &fhe_ct_a + &fhe_ct_b;
        let fhe_res_dec_pt = fhe_seck.try_decrypt(&fhe_res_enc).unwrap();
        // Assert decryptions are equal
        assert_eq_poly(seal_res_dec, &fhe_res_dec_pt, &seal_par.params);

        /******************* Decrypt *******************/

        group.bench_function(
            BenchmarkId::new("decrypt", format!("n={}/log(q)={}/lib=fhe.rs", n, logq)),
            |b| {
                b.iter(|| {
                    let _fhe_pt = fhe_seck.try_decrypt(&fhe_res_enc).unwrap();
                });
            },
        );
        group.bench_function(
            BenchmarkId::new("decrypt", format!("n={}/log(q)={}/lib=SEAL", n, logq)),
            |b| {
                b.iter(|| {
                    // Plaintext doesnt have a TypeName instance, so we need to incur the
                    // Signed decoding cost here :/
                    let _seal_pt: Signed = runtime.decrypt(&seal_res_enc, &seal_seck).unwrap();
                });
            },
        );
    }

    group.finish();
}

impl Display for NamedParams {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}: n={}, t={}, log(q)={}",
            self.name,
            self.params.lattice_dimension,
            self.params.plain_modulus,
            log2(&self.params.coeff_modulus),
        )
    }
}

fn log2(moduli: &Vec<u64>) -> u32 {
    moduli.iter().map(|m| m.ilog2()).sum()
}

fn seal_num_bytes(ct: &sunscreen::Ciphertext) -> usize {
    match &ct.inner {
        sunscreen_runtime::InnerCiphertext::Seal(inner_ct) => {
            inner_ct[0].data.as_bytes().unwrap().len()
        }
    }
}

fn fhers_num_bytes(ct: &fhe_rs::Ciphertext) -> usize {
    ct.to_bytes().len()
}

fn to_fhers_pt(sun_pt: Plaintext, fhe_params: &Arc<fhe_rs::BfvParameters>) -> fhe_rs::Plaintext {
    let seal_pt = &sun_pt.inner.as_seal_plaintext().unwrap()[0].data;
    let is_ntt = seal_pt.is_ntt_form();
    let pt_len = seal_pt.len();

    let mut coeffs = Vec::with_capacity(pt_len);
    for i in 0..pt_len {
        coeffs.push(seal_pt.get_coefficient(i));
    }

    if is_ntt {
        panic!("this should not be in NTT");
    }

    let fhers_pt =
        fhe_rs::Plaintext::try_encode(&coeffs, fhe_rs::Encoding::poly(), fhe_params).unwrap();
    fhers_pt
}

fn assert_eq_poly(a: Signed, fhe_pt: &fhe_rs::Plaintext, seal_params: &Params) {
    let mut seal_pt = seal_fhe::Plaintext::new().unwrap();
    let coeffs = <Vec<u64>>::try_decode(fhe_pt, fhe_rs::Encoding::poly()).unwrap();
    seal_pt.resize(coeffs.len());
    for (i, c) in coeffs.into_iter().enumerate() {
        seal_pt.set_coefficient(i, c);
    }
    let sun_pt = Plaintext {
        data_type: Signed::type_name(),
        inner: InnerPlaintext::Seal(vec![WithContext {
            params: seal_params.clone(),
            data: seal_pt,
        }]),
    };
    let b = Signed::try_from_plaintext(&sun_pt, &seal_params).unwrap();

    assert_eq!(a, b);
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
