use seal::BFVScalarEncoder;
use sunscreen_frontend::{circuit, types::Signed, Compiler, Params, PlainModulusConstraint};
use sunscreen_runtime::RuntimeBuilder;

/**
 * The #[circuit] macro indicates this function represents a homomorphic encryption
 * circuit. This particular example simply multiplies the two operands together and returns
 * the result. Circuits may take any number of parameters and return either a single result
 * or a tuple of results.
 *
 * Currently, the Signed type is the only legal type in circuit parameters and return values,
 * which serves as a placeholder that allows the compiler to build up the circuit. Don't attach
 * much meaning to it in its current form; this example in fact uses unsigned values!
 *
 * One takes a circuit and passes them to the compiler, which transforms it into a form
 * suitable for execution.
 */
#[circuit]
fn simple_multiply(a: Signed, b: Signed) -> Signed {
    a * b
}

fn main() {
    /*
     * Compile the circuit we previously declared. We specify the plain-text modulus is 600,
     * meaning that if our calculatations ever result in a value greater than 600, we'll
     * encounter overflow. Since 5 * 15 = 75 < 600, we have plenty of headroom and won't encounter
     * this issue.
     *
     * Homomorphic operations introduce noise into ciphertexts. Too much noise results in
     * garbled messages upon decryption. Homomorphic encryption schemes have a number of parameters
     * that impact how quickly the noise grows. While some parameters result in less noise, such parameters
     * tend to result in slower computation. Hence, there's a tradeoff to make; ideally you pick
     * the smallest parameters that work in your application.
     *
     * Sunscreen allows experts to explicitly set the scheme parameters, but the default behavior
     * is to let the compiler run your circuit a number of times with different parameters and measure
     * the resulting noise.
     *
     * We set the noise margin bits parameter to 5, which means Sunscreen must retain 5 bits or more
     * of noise margin in every output ciphertext in order to use a given set of parameters.
     *
     * Afterwards, we simply compile and assert the compilation succeeds by calling unwrap. Compilation
     * returns the compiled circuit and parameters.
     */
    let (circuit, params) = Compiler::with_circuit(simple_multiply)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(600))
        .noise_margin_bits(5)
        .compile()
        .unwrap();

    /*
     * Next, we construct a runtime. The runtime provides the APIs for encryption, decryption, and
     * running a circuit.
     */
    let runtime = RuntimeBuilder::new(&params).build().unwrap();

    /*
     * Generate a public and private key pair. Normally, Alice would do this, sending the public
     * key to bob, who then runs a computation.
     */
    let (public, secret) = runtime.generate_keys().unwrap();

    /*
     * Relinearization keys are specific to the BFV scheme we're using. These are needed for
     * relinearization operations, which reduce noise growth after multiplications. While Sunscreen
     * inserts relinearizations into the circuit on your behalf, you do need to provide keys when
     * running the circuit.
     */
    let relin = runtime.generate_relin_keys(&secret).unwrap();

    /*
     * BFV uses polynomials as the plaintext, which are cumbersome and weird to work with. Encoders
     * take more useful values like integers and map them onto the plaintext polynomial coefficients
     * for us. BFVScalarEncoder takes an unsigned value and maps it into the constant term in the plaintext
     * polynomial.
     */
    let encoder = BFVScalarEncoder::new();

    /*
     * Encode the values 15 and 5, then encrypt them with the public key.
     */
    let a = runtime
        .encrypt(&encoder.encode_unsigned(15).unwrap(), &public)
        .unwrap();
    let b = runtime
        .encrypt(&encoder.encode_unsigned(5).unwrap(), &public)
        .unwrap();

    /*
     * Run the circuit with our encrypted ciphertexts. The first argument is, well, the circuit.
     * The second argument is a slice of ciphertexts. The nth ciphertext corresponds to the nth
     * paramter in our circuit. We need to pass relin keys (3rd parameter), but can omit galois
     * keys as our circuit doesn't use rotations.
     */
    let results = runtime
        .validate_and_run_program(&circuit, &vec![a, b], Some(relin), None)
        .unwrap();

    /*
     * Our circuit produces a single output rather than a tuple, so the resulting Vec should contain
     * exactly one value.
     */
    assert_eq!(1, results.len());

    /*
     * Decrypt the result and decode the plaintext polynomial back into an unsigned integer.
     */
    let c = encoder
        .decode_unsigned(&runtime.decrypt(&results[0], &secret).unwrap())
        .unwrap();

    /*
     * Yay, 5 * 15 indeed equals 75.
     */
    assert_eq!(c, 75);
}
