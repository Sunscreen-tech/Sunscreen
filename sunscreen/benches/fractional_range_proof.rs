use std::time::Instant;

use criterion::{criterion_group, criterion_main, Criterion};
use sunscreen::{
    types::zkp::{ConstrainCmp, IntoProgramNode, NativeField, ProgramNode},
    *,
};
use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, BigInt};

type BPField = <BulletproofsBackend as ZkpBackend>::Field;

fn to_field_element<F: BackendField>(
    bits: &[ProgramNode<NativeField<F>>],
    twos_complement: bool,
) -> ProgramNode<NativeField<F>> {
    let powers = (0..bits.len())
        .map(|x| {
            let power = NativeField::<F>::from(BigInt::from(BigInt::ONE.shl_vartime(x)));

            let msb = bits.len() - 1;

            if twos_complement && x == msb {
                -(power.into_program_node())
            } else {
                power.into_program_node()
            }
        })
        .collect::<Vec<_>>();
    let mut val = NativeField::from(0u8).into_program_node();

    for (i, bit) in bits.iter().enumerate() {
        val = val + *bit * powers[i];
    }

    val
}

/// In this scenario, we have parts of 3 messages from encrypted ciphertexts. These
/// are the upper and lower 32 coefficients of 3 
/// [`Fractional`](sunscreen::types::bfv::Fractional) encoded values. We assume we've
/// revealed all the other digits (i.e the low order fractional parts) to be zero
/// in the short discrete log proof, so they don't contribute to the value.
/// 
/// The short discrete log proof gives us the message coefficients in 2's complement
/// binary, from which we reconstruct the coefficients. We then multiply the 
/// coefficients by powers of 2 (treating the entire fractional value as an integer)
/// and prove that 0 < a <= b and a == c, where
/// * a is the tx amount in the message encrypted under Alice's key
/// * b is Alice's balance message encrypted under her key.
/// * c is the tx amount in the message encrypted under Bob's key.
/// 
/// # Remarks
/// Since we require c be binary (to prevent overflowing another user's balance), we
/// *could* reveal all but the least significant bit of each coefficient to be zero
/// in the SDLP, which reduces the number of circuit inputs. However, this proof is
/// orders of magnitude faster than the SDLP so 🤷‍♀️.
fn private_tx_fractional_range_proof(_c: &mut Criterion) {
    #[zkp_program(backend = "bulletproofs")]
    /**
     * Proves the 0 < a <= b and a == c
     */
    fn in_range<F: BackendField>(
        a: [[NativeField<F>; 8]; 64],
        b: [[NativeField<F>; 8]; 64],
        c: [[NativeField<F>; 8]; 64],
    ) {
        println!("Running private_tx_fractional_range_proof...");
        let get_coeffs = |x: &[[ProgramNode<NativeField<F>>; 8]]| -> Vec<_> {
            x.iter().map(|x| to_field_element(x, true)).collect()
        };

        let a_coeffs = get_coeffs(&a);
        let b_coeffs = get_coeffs(&b);
        let c_coeffs = get_coeffs(&c);

        let a_val = to_field_element(&a_coeffs, false);
        let b_val = to_field_element(&b_coeffs, false);
        let c_val = to_field_element(&c_coeffs, false);

        a_val.constrain_gt_bounded(NativeField::<F>::from(0).into_program_node(), 8);
        a_val.constrain_le_bounded(b_val, 8);
        a_val.constrain_eq(c_val);
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(in_range)
        .compile()
        .unwrap();

    let prog = app.get_zkp_program(in_range).unwrap();

    fn encode(val: i8) -> [NativeField<BPField>; 8] {
        let as_u8 = val.to_le_bytes()[0];

        (0..8)
            .map(|x| NativeField::from((as_u8 >> x) & 0x1))
            .collect::<Vec<_>>()
            .try_into()
            .unwrap()
    }

    // Create a carryless binary value.
    // a is 3 in the 1s place, 2 in the 2s place.
    // 3 * 1 + 2 * 2 = 7
    let mut a = vec![0i8; 64];
    a[0] = 3;
    a[1] = 2;

    let a: [[NativeField<BPField>; 8]; 64] = a
        .iter()
        .map(|x| encode(*x))
        .collect::<Vec<_>>()
        .try_into()
        .unwrap();

    // 4 * 1 + 16 * 2 = 36
    let mut b = vec![0i8; 64];
    b[0] = 4;
    b[1] = 16;

    let b: [[NativeField<BPField>; 8]; 64] = b
        .iter()
        .map(|x| encode(*x))
        .collect::<Vec<_>>()
        .try_into()
        .unwrap();

    // This value should equal a. But we're going to test equality with a
    // different representation of 7.
    // 1 * 1 + 1 * 2 + 1 * 4  = 7
    let mut c = vec![0i8; 64];
    c[0] = 1;
    c[1] = 1;
    c[2] = 1;

    let c: [[NativeField<BPField>; 8]; 64] = c
        .iter()
        .map(|x| encode(*x))
        .collect::<Vec<_>>()
        .try_into()
        .unwrap();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let prover_time = Instant::now();

    let proof = runtime.prove(prog, vec![], vec![], vec![a, b, c]).unwrap();

    println!("Prover time {}s", prover_time.elapsed().as_secs_f64());

    let verifier_time = Instant::now();

    runtime
        .verify(prog, &proof, Vec::<ZkpProgramInput>::new(), vec![])
        .unwrap();

    println!("Verifier time {}s", verifier_time.elapsed().as_secs_f64());
}

/// Imagine a multi-party computation where each user submits a value between
/// zero and a maximum encrypted under their key. The MPC computes the mean and
/// variance of their inputs.
/// 
/// This proof is similar to [`private_tx_fractional_range_proof`] except we're only
/// proving 0 < a <= b where
/// 
/// * a is the submitted value under a given user's key.
/// * b is the maximum value encrypted under the same user's key.
fn mean_variance_fractional_range_proof(_c: &mut Criterion) {
    #[zkp_program(backend = "bulletproofs")]
    /**
     * Proves the 0 < a <= b and a == c
     */
    fn in_range<F: BackendField>(
        a: [[NativeField<F>; 8]; 64],
        b: [[NativeField<F>; 8]; 64],
    ) {
        println!("Running mean_variance_fractional_range_proof...");

        let get_coeffs = |x: &[[ProgramNode<NativeField<F>>; 8]]| -> Vec<_> {
            x.iter().map(|x| to_field_element(x, true)).collect()
        };

        let a_coeffs = get_coeffs(&a);
        let b_coeffs = get_coeffs(&b);

        let a_val = to_field_element(&a_coeffs, false);
        let b_val = to_field_element(&b_coeffs, false);

        a_val.constrain_ge_bounded(NativeField::<F>::from(0).into_program_node(), 8);
        a_val.constrain_le_bounded(b_val, 8);
    }

    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(in_range)
        .compile()
        .unwrap();

    let prog = app.get_zkp_program(in_range).unwrap();

    fn encode(val: i8) -> [NativeField<BPField>; 8] {
        let as_u8 = val.to_le_bytes()[0];

        (0..8)
            .map(|x| NativeField::from((as_u8 >> x) & 0x1))
            .collect::<Vec<_>>()
            .try_into()
            .unwrap()
    }

    // Create a carryless binary value.
    // a is 3 in the 1s place, 2 in the 2s place.
    // 3 * 1 + 2 * 2 = 7
    let mut a = vec![0i8; 64];
    a[0] = 3;
    a[1] = 2;

    let a: [[NativeField<BPField>; 8]; 64] = a
        .iter()
        .map(|x| encode(*x))
        .collect::<Vec<_>>()
        .try_into()
        .unwrap();

    // 4 * 1 + 16 * 2 = 36
    let mut b = vec![0i8; 64];
    b[0] = 4;
    b[1] = 16;

    let b: [[NativeField<BPField>; 8]; 64] = b
        .iter()
        .map(|x| encode(*x))
        .collect::<Vec<_>>()
        .try_into()
        .unwrap();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let prover_time = Instant::now();

    let proof = runtime.prove(prog, vec![], vec![], vec![a, b]).unwrap();

    println!("Prover time {}s", prover_time.elapsed().as_secs_f64());

    let verifier_time = Instant::now();

    runtime
        .verify(prog, &proof, Vec::<ZkpProgramInput>::new(), vec![])
        .unwrap();

    println!("Verifier time {}s", verifier_time.elapsed().as_secs_f64());
}

criterion_group!(benches, private_tx_fractional_range_proof, mean_variance_fractional_range_proof);
criterion_main!(benches);
