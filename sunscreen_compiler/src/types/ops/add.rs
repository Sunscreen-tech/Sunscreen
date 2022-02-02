use crate::types::{
    intern::{FheProgramNode, FheLiteral},
    Cipher, FheType,
};

/**
 * Called when an Fhe Program encounters a + operation on two encrypted
 * types.
 */
pub trait GraphCipherAdd {
    /**
     * The type of the left operand
     */
    type Left: FheType;

    /**
     * The type of the right operand
     */
    type Right: FheType;

    /**
     * Process the + operation
     */
    fn graph_cipher_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a + operation on one encrypted
 * and one unencrypted type.
 */
pub trait GraphCipherPlainAdd {
    /**
     * The type of the left operand
     */
    type Left: FheType;

    /**
     * The type of the right operand
     */
    type Right: FheType;

    /**
     * Process the + operation
     */
    fn graph_cipher_plain_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a + operation on one encrypted
 * and a literal.
 */
pub trait GraphCipherConstAdd {
    /**
     * The type of the left operand
     */
    type Left: FheType + TryFrom<Self::Right>;

    /**
     * The type of the right operand
     */
    type Right: FheLiteral;

    /**
     * Process the + operation
     */
    fn graph_cipher_const_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}
