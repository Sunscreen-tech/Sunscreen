use crypto_bigint::U256;
use sunscreen::{
    fhe_program,
    types::{bfv::Unsigned256, Cipher},
    Compiler, Error, Runtime,
};

/**
 * The #[fhe_program] macro indicates this function represents an [FHE program].
 * This basic example multiplies the two operands together and returns the result.
 *
 * `Unsigned256` is Sunscreen's unsigned 256-bit integer type compatible with FHE programs.
 *
 * The `Cipher<T>` type indicates that type `T` is encrypted, thus `Cipher<Unsigned256>`
 * is an encrypted [`Unsigned256`] value.
 *
 * We'll pass our [`fhe_program`] the compiler, which will transform it into a form
 * suitable for execution.
 */
#[fhe_program(scheme = "bfv")]
fn mul(a: Cipher<Unsigned256>, b: Cipher<Unsigned256>) -> Cipher<Unsigned256> {
    a * b
}

fn main() -> Result<(), Error> {
    /*
     * Here we compile the FHE program we previously declared. In the first step,
     * we create our compiler, specify that we want to compile
     * `mul`, and build it with the default settings.
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
    let app = Compiler::new().fhe_program(mul).compile()?;

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

    /*
     * We can create `Unsigned256` values from `u64` literals.
     */
    let a = runtime.encrypt(Unsigned256::from(20), &public_key)?;

    /*
     * Or from the underlying `crypto_bigint::U256` representation. Below is a
     * representation of 10^18.
     */
    let bigint: U256 = U256::from_u64(0x0de0b6b3a7640000);
    let b = runtime.encrypt(Unsigned256::from(bigint), &public_key)?;

    /*
     * Now, we run the FHE program with our arguments. This produces a results
     * `Vec` containing the encrypted outputs of the FHE program.
     */
    let results = runtime.run(app.get_fhe_program(mul).unwrap(), vec![a, b], &public_key)?;

    /*
     * Finally, we decrypt our program's output so we can check it. Our FHE
     * program outputs a `Unsigned256` single value as the result, so we just take
     * the first element.
     */
    let c: Unsigned256 = runtime.decrypt(&results[0], &private_key)?;

    /*
     * Assert the multiplication was performed properly.
     */
    assert_eq!(c, 20 * Unsigned256::from(bigint));

    // Just assurance that we indeed made use of a big integer.
    assert!(U256::from(c).bits_vartime() > 64);

    Ok(())
}
