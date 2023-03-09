use std::time::Instant;

use sunscreen::{Params, fhe_program, types::{bfv::Fractional, Cipher}, Compiler, Runtime, SchemeType};

/// This program benchmarks all the FHE pieces of private transactions with 
/// SMART FHE.

fn benchmark(params: &Params) {
    println!("Benchmarking for {:#?}", params);

    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Fractional<32>>, b: Cipher<Fractional<32>>) -> Cipher<Fractional<32>> {
        a + b
    }

    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Fractional<32>>, b: Cipher<Fractional<32>>) -> Cipher<Fractional<32>> {
        a - b
    }

    let now = Instant::now();
    let app = Compiler::new()
        .fhe_program(add)
        .fhe_program(sub)
        .with_params(&params)
        .compile()
        .unwrap();

    println!("Compilation time {}s", now.elapsed().as_secs_f64());

    let runtime = Runtime::new_fhe(params).unwrap();

    let now = Instant::now();
    let (public, private) = runtime.generate_keys().unwrap();

    println!("Keygen time: {}s", now.elapsed().as_secs_f64());

    let now = Instant::now();
    
    // Encrypt under Alice's key
    let send_a = runtime.encrypt(Fractional::<32>::from(42.0), &public).unwrap();
    // Encrypt under Bob's key, but we'll pretend Alice's key is Bob's.
    // We just want the timings.
    let send_b = runtime.encrypt(Fractional::<32>::from(42.0), &public).unwrap();

    println!("Encrypt time: {}s", now.elapsed().as_secs_f64());

    let now = Instant::now();
    
    let add_res = runtime.run(app.get_fhe_program(add).unwrap(), vec![send_a.clone(), send_b.clone()], &public).unwrap();
    let sub_res = runtime.run(app.get_fhe_program(sub).unwrap(), vec![send_a, send_b], &public).unwrap();

    println!("Run FHE circuit time {}s", now.elapsed().as_secs_f64());

    let add_res: Fractional<32> = runtime.decrypt(&add_res[0], &private).unwrap();
    let add_res: f64 = add_res.into();

    assert_eq!(add_res, 84.0);

    let sub_res: Fractional<32> = runtime.decrypt(&sub_res[0], &private).unwrap();
    let sub_res: f64 = sub_res.into();

    assert_eq!(sub_res, 0.0);

}

//262,152
pub fn main() {
    benchmark(&Params {
        lattice_dimension: 1024,
        coeff_modulus: vec![0x7e00001],
        plain_modulus: 4_096,
        scheme_type: SchemeType::Bfv,
        security_level: sunscreen::SecurityLevel::TC128
    });

    benchmark(&Params {
        lattice_dimension: 2048,
        coeff_modulus: vec![0x3fffffff000001],
        plain_modulus: 4_096,
        scheme_type: SchemeType::Bfv,
        security_level: sunscreen::SecurityLevel::TC128
    });

    benchmark(&Params {
        lattice_dimension: 4096,
        coeff_modulus: vec![0xffffee001, 0xffffc4001, 0x1ffffe0001],
        plain_modulus: 4_096,
        scheme_type: SchemeType::Bfv,
        security_level: sunscreen::SecurityLevel::TC128
    });
}