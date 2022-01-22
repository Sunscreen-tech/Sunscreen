use crate::types::{intern::{CircuitNode, FheLiteral}, Cipher, FheType};

/**
 * Called when a circuit encounters a * operation on two encrypted types.
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
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>>;
}

/**
 * Called when a circuit encounters a * operation on an encrypted
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
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Self::Right>,
    ) -> CircuitNode<Cipher<Self::Left>>;
}

/**
 * Called when a circuit encounters a + operation on one encrypted
 * and a literal.
 */
pub trait GraphCipherConstMul {
    /**
     * The type of the left operand
     */
    type Left: FheType + From<Self::Right>;

    /**
     * The type of the right operand
     */
    type Right: FheLiteral;

    /**
     * Process the + operation
     */
    fn graph_cipher_const_mul(
        a: CircuitNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> CircuitNode<Cipher<Self::Left>>;
}
