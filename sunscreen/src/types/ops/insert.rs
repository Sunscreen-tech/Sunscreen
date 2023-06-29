use crate::types::{
    intern::{FheLiteral, FheProgramNode},
    FheType,
};

/**
 * Called when an Fhe Program encounters a literal type and inserts it as plaintext node.
 *
 * This trait is an implementation detail of FHE program compilation;
 * you should not directly call methods on this trait.
 */
pub trait GraphCipherInsert {
    /**
     * The type of the literal
     */
    type Lit: FheLiteral;

    /**
     * The type of the plaintext encoding
     */
    // TODO if this is always Self, then remove it
    type Val: FheType;

    /**
     * Process the insertion
     */
    fn graph_cipher_insert(lit: Self::Lit) -> FheProgramNode<Self::Val>;
}
