use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    FheProgramFnExt, Result,
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

fn main() -> Result<()> {
    let runtime = simple_multiply.runtime()?;

    /*
     * Here, we generate a public and private key pair. Normally, Alice does this,
     * sending the public key to bob, who then runs a computation.
     */
    let (public_key, private_key) = runtime.generate_keys()?;

    let a = runtime.encrypt(Signed::from(15), &public_key)?;
    let b = runtime.encrypt(Signed::from(5), &public_key)?;

    let spf = simple_multiply.as_spf(&public_key);
    let result = spf(a, b)?;
    let c: Signed = runtime.decrypt(&result, &private_key)?;

    /*
     * Yay, 5 * 15 indeed equals 75.
     */
    assert_eq!(c, 75.into());

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn main_works() -> Result<()> {
        main()
    }
}
