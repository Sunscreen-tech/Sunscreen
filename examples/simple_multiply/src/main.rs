use sunscreen_compiler::{
    circuit, decrypt, encrypt, types::Unsigned, Compiler, Params, PlainModulusConstraint,
};
use sunscreen_runtime::PrivateRuntime;

/**
 * The #[circuit] macro indicates this function represents a homomorphic encryption
 * circuit. This particular example simply multiplies the two operands together and returns
 * the result. Circuits may take any number of parameters and return either a single result
 * or a tuple of results.
 *
 * The unsigned type refers to an unsigned integer modulo the plaintext
 * modulus (p). p is passed to the compiler via plain_modulus_constraint.
 *
 * One takes a circuit and passes them to the compiler, which transforms it into a form
 * suitable for execution.
 */
#[circuit(scheme = "bfv")]
fn simple_multiply(a: Unsigned, b: Unsigned) -> Unsigned {
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
    let runtime = PrivateRuntime::new(&params).unwrap();

    /*
     * Generate a public and private key pair. Normally, Alice would do this, sending the public
     * key to bob, who then runs a computation.
     */
    let (public, secret) = runtime.generate_keys().unwrap();

    /*
     * Our circuit accepts 2 `Unsigned` types and adds them together.
     * The encrypt macro takes a runtime and public key as its first 2
     * arguments to faciliation encryption, and the remaining arguments
     * are the actual arguments to the circuit. This macro is variadic;
     * circuits that take more arguments require more parameters.
     */
    let args = encrypt!(runtime, &public, Unsigned::from(15), Unsigned::from(5)).unwrap();

    /*
     * Run the circuit with our arguments. This produces a results
     * bundle containing the encrypted outputs of the circuit.
     */
    let mut results = runtime
        .run(&circuit, args)
        .unwrap();

    /*
     * Our circuit produces a single `Unsigned` output. The decrypt
     * macro takes a runtime, secret key, and results bundle as the
     * first three arguments. The macro is variadic and the remaining
     * arguments are the types of the circuit's outputs.
     * 
     * The decrypt macro validates the types we pass match the
     * circuit's return types. We need to pass these so types so
     * the compiler can ensure the return type is known at compile time. 
     */
    let c = decrypt!(runtime, &secret, results, Unsigned).unwrap();

    /*
     * Yay, 5 * 15 indeed equals 75.
     */
    assert_eq!(c, 75.into());
}
