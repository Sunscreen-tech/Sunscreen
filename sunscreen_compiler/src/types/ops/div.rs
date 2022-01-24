use crate::types::{intern::{CircuitNode, FheLiteral}, Cipher, FheType};

/**
 * Called when a circuit encounters a / operation on two encrypted types.
 */
pub trait GraphCipherDiv {
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
    fn graph_cipher_div(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>>;
}

/**
 * Called when a circuit encounters a / operation on an encrypted numerator and plaintext denominator.
 */
pub trait GraphCipherConstDiv {
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
    fn graph_cipher_const_div(
        a: CircuitNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> CircuitNode<Cipher<Self::Left>>;
}