use sunscreen_frontend::{Context, circuit, types::*};
use sunscreen_runtime::run_program_unchecked;
use seal::{Evaluator, Context as SealContext, BfvEncryptionParametersBuilder};

fn setup_seal(circuit: &Circuit) {
    BfvEncryptionParametersBuilder::new()
        .
}

#[test]
fn can_compile_and_run_simple_add() {
    #[circuit]
    fn add(a: Signed, b: Signed) -> Signed {
        a + b
    }

    let circuit = add().compile();

    unsafe {
        run_program_unchecked(&circuit, inputs: &[Ciphertext], evaluator: &E, relin_keys: Option<RelinearizationKeys>, galois_keys: Option<GaloisKeys>)
    }
    
}