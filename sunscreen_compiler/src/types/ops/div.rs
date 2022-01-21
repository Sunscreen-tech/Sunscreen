use crate::types::{Cipher, FheType, intern::{CircuitNode}};

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
