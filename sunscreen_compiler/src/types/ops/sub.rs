use crate::types::{
    intern::{CircuitNode, FheLiteral},
    Cipher, FheType,
};

/**
 * Called when a circuit encounters a - operation on two encrypted types.
 */
pub trait GraphCipherSub {
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
    fn graph_cipher_sub(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>>;
}

/**
 * Called when a circuit encounters a - operation on two encrypted types.
 */
pub trait GraphCipherPlainSub {
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
    fn graph_cipher_plain_sub(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Self::Right>,
    ) -> CircuitNode<Cipher<Self::Left>>;
}

/**
 * Called when a circuit encounters a - operation on two encrypted types.
 */
pub trait GraphCipherConstSub {
    /**
     * The type of the left operand
     */
    type Left: FheType;

    /**
     * The type of the right operand
     */
    type Right: FheLiteral;

    /**
     * Process the + operation
     */
    fn graph_cipher_const_sub(
        a: CircuitNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> CircuitNode<Cipher<Self::Left>>;
}
