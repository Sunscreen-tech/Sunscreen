use crate::types::{
    intern::{CircuitNode, FheType},
    Cipher,
};

/**
 * Called when the user performs unary negation (-) on a ciphertext.
 */
pub trait GraphCipherNeg {
    /**
     * The unary type.
     */
    type Val: FheType;

    fn graph_cipher_neg(a: CircuitNode<Cipher<Self::Val>>) -> CircuitNode<Cipher<Self::Val>>;
}
