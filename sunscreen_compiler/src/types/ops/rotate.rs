use crate::types::{intern::CircuitNode, Cipher, FheType};

/**
 * Swaps the rows of the given ciphertext.
 */
pub trait GraphCipherSwapRows
where
    Self: FheType,
{
    /**
     * Swap the rows in the given ciphertext.
     */
    fn graph_cipher_swap_rows(x: CircuitNode<Cipher<Self>>) -> CircuitNode<Cipher<Self>>;
}

pub trait GraphCipherRotateLeft
where
    Self: FheType,
{
    fn graph_cipher_rotate_left(
        x: CircuitNode<Cipher<Self>>,
        amount: u64,
    ) -> CircuitNode<Cipher<Self>>;
}

pub trait GraphCipherRotateRight
where
    Self: FheType,
{
    fn graph_cipher_rotate_right(
        x: CircuitNode<Cipher<Self>>,
        amount: u64,
    ) -> CircuitNode<Cipher<Self>>;
}
