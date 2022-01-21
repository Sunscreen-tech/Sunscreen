pub use crate::{types::{FheType, Cipher, intern::CircuitNode}, with_ctx};

/**
 * Create an input node from a circuit input argument.
 */
pub trait Input {
    /**
     * Creates a new CircuitNode denoted as an input to a circuit graph.
     *
     * You should not call this, but rather allow the [`crate::circuit`] macro to do this on your behalf.
     *
     * # Undefined behavior
     * This type references memory in a backing [`crate::Context`] and without carefully ensuring CircuitNodes
     * never outlive the backing context, use-after-free can occur.
     *
     */
    fn input() -> Self;
}

impl<T> Input for CircuitNode<Cipher<T>>
where
    T: FheType,
{
    fn input() -> Self {
        let mut ids = Vec::with_capacity(T::NUM_CIPHERTEXTS);

        for _ in 0..T::NUM_CIPHERTEXTS {
            ids.push(with_ctx(|ctx| ctx.add_ciphertext_input()));
        }

        CircuitNode::new(&ids)
    }
}

impl<T> Input for CircuitNode<T>
where
    T: FheType,
{
    fn input() -> Self {
        let mut ids = Vec::with_capacity(T::NUM_CIPHERTEXTS);

        for _ in 0..T::NUM_CIPHERTEXTS {
            ids.push(with_ctx(|ctx| ctx.add_plaintext_input()));
        }

        CircuitNode::new(&ids)
    }
}