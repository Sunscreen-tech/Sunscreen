use crate::types::{
    intern::{CircuitNode, FheLiteral},
    Cipher, FheType,
};

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
 * Called when a circuit encounters a / operation with a
 * ciphertext numerator and plaintext denominator.
 */
pub trait GraphCipherPlainDiv {
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
    fn graph_cipher_plain_div(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Self::Right>,
    ) -> CircuitNode<Cipher<Self::Left>>;
}

/**
 * Called when a circuit encounters a / operation with a
 * plaintext numerator and ciphertext denominator.
 */
pub trait GraphPlainCipherDiv {
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
    fn graph_plain_cipher_div(
        a: CircuitNode<Self::Left>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>>;
}

/**
 * Called when a circuit encounters a / operation on an encrypted numerator and literal denominator.
 */
pub trait GraphCipherConstDiv {
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
    fn graph_cipher_const_div(
        a: CircuitNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> CircuitNode<Cipher<Self::Left>>;
}

/**
 * Called when a circuit encounters a / operation on a
 * literal numerator and encrypted denominator.
 */
pub trait GraphConstCipherDiv {
    /**
     * The type of the right operand
     */
    type Left: FheLiteral;

    /**
     * The type of the left operand
     */
    type Right: FheType + TryFrom<Self::Right>;

    /**
     * Process the + operation
     */
    fn graph_const_cipher_div(
        a: Self::Left,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Right>>;
}
