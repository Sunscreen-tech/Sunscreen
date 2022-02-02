use crate::types::{
    intern::{FheLiteral, FheProgramNode},
    Cipher, FheType,
};

/**
 * Called when an Fhe Program encounters a * operation on two encrypted types.
 */
pub trait GraphCipherMul {
    /**
     * The type of the left operand
     */
    type Left: FheType;

    /**
     * The type of the right operand
     */
    type Right: FheType;

    /**
     * Process the * operation
     */
    fn graph_cipher_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a * operation on an encrypted
 * and plaintext data type.
 */
pub trait GraphCipherPlainMul {
    /**
     * The type of the left operand
     */
    type Left: FheType;

    /**
     * The type of the right operand
     */
    type Right: FheType;

    /**
     * Process the * operation
     */
    fn graph_cipher_plain_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a + operation on one encrypted
 * and a literal.
 */
pub trait GraphCipherConstMul {
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
    fn graph_cipher_const_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}
