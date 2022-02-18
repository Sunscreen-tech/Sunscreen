use crate::types::{
    intern::{FheProgramNode, FheType},
    Cipher,
};

/**
 * Called when the user performs unary negation (-) on a ciphertext.
 *
 * This trait is an implementation detail of FHE program compilation;
 * you should not directly call methods on this trait.
 */
pub trait GraphCipherNeg {
    /**
     * The unary type.
     */
    type Val: FheType;

    /**
     * Negates the given ciphertext (e.g. -x).
     */
    fn graph_cipher_neg(a: FheProgramNode<Cipher<Self::Val>>) -> FheProgramNode<Cipher<Self::Val>>;
}
