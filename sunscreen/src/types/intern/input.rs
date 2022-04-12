pub use crate::{
    types::{intern::FheProgramNode, Cipher, FheType, NumCiphertexts, TypeName},
    with_ctx,
};

/**
 * Create an input node from an Fhe Program input argument.
 */
pub trait Input {
    /**
     * Creates a new FheProgramNode denoted as an input to an Fhe Program graph.
     *
     * You should not call this, but rather allow the [`fhe_program`](crate::fhe_program) macro to do this on your behalf.
     *
     * # Undefined behavior
     * This type references memory in a backing [`crate::Context`] and without carefully ensuring FheProgramNodes
     * never outlive the backing context, use-after-free can occur.
     *
     */
    fn input() -> Self;
}

impl<T> Input for FheProgramNode<T>
where
    T: NumCiphertexts + TypeName,
{
    fn input() -> Self {
        let mut ids = Vec::with_capacity(T::NUM_CIPHERTEXTS);

        for _ in 0..T::NUM_CIPHERTEXTS {
            if T::type_name().is_encrypted {
                ids.push(with_ctx(|ctx| ctx.add_ciphertext_input()));
            } else {
                ids.push(with_ctx(|ctx| ctx.add_plaintext_input()));
            }
        }

        FheProgramNode::new(&ids)
    }
}
