use sunscreen_compiler::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, PlainModulusConstraint, Runtime,
};

/**
 * The #[fhe_program] macro indicates this function represents a homomorphic encryption
 * [`fhe_program`]. This particular example simply multiplies the two operands together and returns
 * the result. FhePrograms may take any number of parameters and return either a single result
 * or a tuple of results.
 *
 * The [`Signed`] type refers to an unsigned integer modulo the plaintext
 * modulus (p). p is passed to the compiler via plain_modulus_constraint.
 *
 * A `Cipher` type indicates the type is encrypted. Thus, a `Cipher<Signed>`
 * refers to an encrypted [`Signed`] value.
 *
 * One takes an [`fhe_program`] and passes them to the compiler, which transforms it into a form
 * suitable for execution.
 */
#[fhe_program(scheme = "bfv")]
fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    a * b
}

fn main() {
    /*
    * Compile the FHE program we previously declared. We specify the 
    * plain-text modulus as 64. For help choosing a plaintext modulus, please see the section "Choosing the right plaintext modulus" in the Sunscreen book.
    *
    * Homomorphic operations introduce noise into ciphertexts. Too much noise results in
    * garbled messages upon decryption. Homomorphic encryption schemes have a number of parameters
    * that impact how quickly the noise grows. While some parameters result in less noise, such parameters
    * tend to result in slower computation. Hence, there's a tradeoff to make; ideally you pick
    * the smallest parameters that work in your application.
    *
    * Sunscreen allows experts to explicitly set the scheme parameters, but the default behavior
    * is to let the compiler run your FHE program a number of times with different parameters and measure
    * the resulting noise.

    * Afterwards, we simply compile and assert the compilation succeeds by calling unwrap. Compilation
    * returns the compiled FHE program and parameters.
    */
    let fhe_program = Compiler::with_fhe_program(simple_multiply)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(64))
        .compile()
        .unwrap();

    /*
     * Next, we construct a runtime. The runtime provides the APIs for encryption, decryption, and
     * running an FHE program.
     */
    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();

    /*
     * Generate a public and private key pair. Normally, Alice would do this, sending the public
     * key to bob, who then runs a computation.
     */
    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
    let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    /*
     * Run the FHE program with our arguments. This produces a results
     * bundle containing the encrypted outputs of the FHE program.
     */
    let results = runtime.run(&fhe_program, vec![a, b], &public_key).unwrap();

    /*
     * Our FHE program outputs a Signed single value as the result. Decrypt it.
     */
    let c: Signed = runtime.decrypt(&results[0], &private_key).unwrap();

    /*
     * Yay, 5 * 15 indeed equals 75.
     */
    assert_eq!(c, 75.into());
}
