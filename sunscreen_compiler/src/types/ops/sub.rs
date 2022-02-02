use crate::types::{
    intern::{FheProgramNode, FheLiteral},
    Cipher, FheType,
};

/**
 * Called when an Fhe Program encounters a - operation on two encrypted types.
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
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a - operation on a ciphertext and a plaintext.
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
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a - operation on a plaintext and a ciphertext.
 */
pub trait GraphPlainCipherSub {
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
    fn graph_plain_cipher_sub(
        a: FheProgramNode<Self::Left>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a - operation on two encrypted types.
 */
pub trait GraphCipherConstSub {
    /**
     * The type of the left operand
     */
    type Left: FheType;

    /**
     * The type of the right operand
     */
    type Right: FheLiteral + TryFrom<Self::Left>;

    /**
     * Process the + operation
     */
    fn graph_cipher_const_sub(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>>;
}

/**
 * Called when an Fhe Program encounters a - operation on two encrypted types.
 */
pub trait GraphConstCipherSub {
    /**
     * The type of the left operand
     */
    type Left: FheLiteral + TryFrom<Self::Right>;

    /**
     * The type of the right operand
     */
    type Right: FheType;

    /**
     * Process the + operation
     */
    fn graph_const_cipher_sub(
        a: Self::Left,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Right>>;
}
