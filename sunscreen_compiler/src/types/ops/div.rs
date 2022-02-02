use crate::types::{
    intern::{FheLiteral, FheProgramNode},
    Cipher, FheType,
};

/**
 * Called when an Fhe Program encounters a / operation on two encrypted types.
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
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a / operation with a
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
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a / operation with a
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
        a: FheProgramNode<Self::Left>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a / operation on an encrypted numerator and literal denominator.
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
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a / operation on a
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
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Right>>;
}
