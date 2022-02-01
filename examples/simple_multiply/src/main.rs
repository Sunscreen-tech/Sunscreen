use sunscreen_compiler::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, PlainModulusConstraint,
};
use sunscreen_runtime::Runtime;

/**
 * The #[fhe_program] macro indicates this function represents a homomorphic encryption
 * circuit. This particular example simply multiplies the two operands together and returns
 * the result. Circuits may take any number of parameters and return either a single result
 * or a tuple of results.
 *
 * The [`Signed`] type refers to an unsigned integer modulo the plaintext
 * modulus (p). p is passed to the compiler via plain_modulus_constraint.
 *
 * A `Cipher` type indicates the type is encrypted. Thus, a `Cipher<Signed>`
 * refers to an encrypted [`Signed`] value.
 *
 * One takes a circuit and passes them to the compiler, which transforms it into a form
 * suitable for execution.
 */
#[fhe_program(scheme = "bfv")]
fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
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
    let circuit = Compiler::with_circuit(simple_multiply)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(600))
        .noise_margin_bits(5)
        .compile()
        .unwrap();

    /*
     * Next, we construct a runtime. The runtime provides the APIs for encryption, decryption, and
     * running a circuit.
     */
    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    /*
     * Generate a public and private key pair. Normally, Alice would do this, sending the public
     * key to bob, who then runs a computation.
     */
    let (public, secret) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public).unwrap();

    /*
     * Run the circuit with our arguments. This produces a results
     * bundle containing the encrypted outputs of the circuit.
     */
    let results = runtime.run(&circuit, vec![a, b], &public).unwrap();

    /*
     * Our circuit outputs a Signed single value as the result. Decrypt it.
     */
    let c: Signed = runtime.decrypt(&results[0], &secret).unwrap();

    /*
     * Yay, 5 * 15 indeed equals 75.
     */
    assert_eq!(c, 75.into());
}
