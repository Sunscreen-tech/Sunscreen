use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Error, Compiler, Runtime,
};

/**
 * The #[fhe_program] macro indicates this function represents an [FHE program].
 * This basic example multiplies the two operands together and returns
 * the result.
 *
 * `Signed` is Sunscreen's integer type compatible with FHE programs.
 *
 * The `Cipher<T>` type indicates that type `T` is encrypted, thus `Cipher<Signed>`
 * is an encrypted [`Signed`] value.
 *
 * We'll pass our [`fhe_program`] the compiler, which will transform it into a form
 * suitable for execution.
 */
#[fhe_program(scheme = "bfv")]
fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    a * b
}

fn main() -> Result<(), Error> {
    /*
     * Here we compile the FHE program we previously declared. In the first step,
     * we create our compiler, specify that we want to compile
     * `simple_multiple`, and build it with the default settings.
     *
     * The `?` operator is Rust's standard
     * error handling mechanism; it returns from the current function (`main`)
     * when an error occurs (shouldn't happen).
     *
     * On success, compilation returns an [`Application`], which
     * stores a group of FHE programs compiled under the same scheme parameters.
     * These parameters are an implementation detail of FHE.
     * While Sunscreen allows experts to explicitly set the scheme parameters,
     * we're using the default behavior: automatically choose parameters
     * yielding good performance while maintaining correctness.
     */
    let app = Compiler::new()
        .fhe_program(simple_multiply)
        .compile()?;

    /*
     * Next, we construct a runtime, which provides the APIs for encryption,
     * decryption, and running an FHE program. We need to pass
     * the scheme parameters our compiler chose.
     */
    let runtime = Runtime::new_fhe(app.params())?;

    /*
     * Here, we generate a public and private key pair. Normally, Alice does this,
     * sending the public key to bob, who then runs a computation.
     */
    let (public_key, private_key) = runtime.generate_keys()?;

    let a = runtime.encrypt(Signed::from(15), &public_key)?;
    let b = runtime.encrypt(Signed::from(5), &public_key)?;

    /*
     * Now, we run the FHE program with our arguments. This produces a results
     * `Vec` containing the encrypted outputs of the FHE program.
     */
    let results = runtime.run(
        app.get_fhe_program(simple_multiply).unwrap(),
        vec![a, b],
        &public_key,
    )?;

    /*
     * Finally, we decrypt our program's output so we can check it. Our FHE
     * program outputs a `Signed` single value as the result, so we just take
     * the first element.
     */
    let c: Signed = runtime.decrypt(&results[0], &private_key)?;

    /*
     * Yay, 5 * 15 indeed equals 75.
     */
    assert_eq!(c, 75.into());

    Ok(())
}
