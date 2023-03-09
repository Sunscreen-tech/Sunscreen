use std::time::Instant;

use sunscreen::{
    fhe_program,
    types::{bfv::Fractional, Cipher},
    Compiler, Params, Runtime, SchemeType, FheProgramInput,
};
use bincode;

/// This program benchmarks all the FHE pieces of private transactions with
/// SMART FHE.

fn benchmark(params: &Params) {
    println!("Benchmarking for {:#?}", params);

    let mut compile_time = 0.0;
    let mut encrypt_time = 0.0;
    let mut run_time = 0.0;
    let mut keygen_time = 0.0;
    let mut shield = 0.0;
    let mut unshield = 0.0;

    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Fractional<32>>, b: Cipher<Fractional<32>>) -> Cipher<Fractional<32>> {
        a + b
    }

    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Fractional<32>>, b: Cipher<Fractional<32>>) -> Cipher<Fractional<32>> {
        a - b
    }

    #[fhe_program(scheme = "bfv")]
    fn add_pt(a: Cipher<Fractional<32>>, b: Fractional<32>) -> Cipher<Fractional<32>> {
        a + b
    }

    #[fhe_program(scheme = "bfv")]
    fn sub_pt(a: Cipher<Fractional<32>>, b: Fractional<32>) -> Cipher<Fractional<32>> {
        a - b
    }

    const RUNS: u32 = 100;
    let mut ct_size = 0usize;

    for _ in 0..RUNS {
        let now = Instant::now();
        let app = Compiler::new()
            .fhe_program(add)
            .fhe_program(sub)
            .fhe_program(add_pt)
            .fhe_program(sub_pt)
            .with_params(params)
            .compile()
            .unwrap();

        compile_time += now.elapsed().as_secs_f64();

        let runtime = Runtime::new_fhe(params).unwrap();

        let now = Instant::now();
        let (public, private) = runtime.generate_keys().unwrap();

        keygen_time += now.elapsed().as_secs_f64();

        let now = Instant::now();

        // Encrypt under Alice's key
        let send_a = runtime
            .encrypt(Fractional::<32>::from(42.0), &public)
            .unwrap();
        // Encrypt under Bob's key, but we'll pretend Alice's key is Bob's.
        // We just want the timings.
        let send_b = runtime
            .encrypt(Fractional::<32>::from(42.0), &public)
            .unwrap();

        encrypt_time += now.elapsed().as_secs_f64();

        let now = Instant::now();

        let add_res = runtime
            .run(
                app.get_fhe_program(add).unwrap(),
                vec![send_a.clone(), send_b.clone()],
                &public,
            )
            .unwrap();
        let sub_res = runtime
            .run(
                app.get_fhe_program(sub).unwrap(),
                vec![send_a.clone(), send_b],
                &public,
            )
            .unwrap();

        run_time += now.elapsed().as_secs_f64();

        let add_res: Fractional<32> = runtime.decrypt(&add_res[0], &private).unwrap();
        let add_res: f64 = add_res.into();

        assert_eq!(add_res, 84.0);

        let sub_res: Fractional<32> = runtime.decrypt(&sub_res[0], &private).unwrap();
        let sub_res: f64 = sub_res.into();

        assert_eq!(sub_res, 0.0);

        // Benchmark shielded TX
        let args: Vec<FheProgramInput> = vec![send_a.clone().into(), Fractional::<32>::from(42.0).into()];

        let now = Instant::now();

        let add_res = runtime.run(app.get_fhe_program(add_pt).unwrap(), args, &public).unwrap();

        shield += now.elapsed().as_secs_f64();

        let add_res: Fractional<32> = runtime.decrypt(&add_res[0], &private).unwrap();
        let add_res: f64 = add_res.into();

        assert_eq!(add_res, 84.0);

        // Benchmark unshield
        let args: Vec<FheProgramInput> = vec![send_a.clone().into(), Fractional::<32>::from(42.0).into()];

        let now = Instant::now();

        let sub_res = runtime.run(app.get_fhe_program(sub_pt).unwrap(), args, &public).unwrap();

        unshield += now.elapsed().as_secs_f64();

        let sub_res: Fractional<32> = runtime.decrypt(&sub_res[0], &private).unwrap();
        let sub_res: f64 = sub_res.into();

        assert_eq!(sub_res, 0.0);

        let foo = bincode::serialize(&send_a).unwrap();
        ct_size = foo.len();
    }

    println!("Compilation time {}s", compile_time / RUNS as f64);
    println!("Keygen time: {}s", keygen_time / RUNS as f64);
    println!("Encrypt time: {}s", encrypt_time / RUNS as f64);
    println!("Run FHE circuit time {}s", run_time / RUNS as f64);
    println!("Shield FHE circuit time {}s", shield / RUNS as f64);
    println!("Unshield FHE circuit time {}s", unshield / RUNS as f64);
    println!("CT size {}", ct_size);
}

//262,152
pub fn main() {
    benchmark(&Params {
        lattice_dimension: 1024,
        coeff_modulus: vec![0x7e00001],
        plain_modulus: 4_096,
        scheme_type: SchemeType::Bfv,
        security_level: sunscreen::SecurityLevel::TC128,
    });

    benchmark(&Params {
        lattice_dimension: 2048,
        coeff_modulus: vec![0x3fffffff000001],
        plain_modulus: 4_096,
        scheme_type: SchemeType::Bfv,
        security_level: sunscreen::SecurityLevel::TC128,
    });

    benchmark(&Params {
        lattice_dimension: 4096,
        coeff_modulus: vec![0xffffee001, 0xffffc4001, 0x1ffffe0001],
        plain_modulus: 4_096,
        scheme_type: SchemeType::Bfv,
        security_level: sunscreen::SecurityLevel::TC128,
    });
}
