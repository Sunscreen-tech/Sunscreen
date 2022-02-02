use crate::types::{intern::FheProgramNode, Cipher, FheType};

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
    fn graph_cipher_swap_rows(x: FheProgramNode<Cipher<Self>>) -> FheProgramNode<Cipher<Self>>;
}

pub trait GraphCipherRotateLeft
where
    Self: FheType,
{
    fn graph_cipher_rotate_left(
        x: FheProgramNode<Cipher<Self>>,
        amount: u64,
    ) -> FheProgramNode<Cipher<Self>>;
}

pub trait GraphCipherRotateRight
where
    Self: FheType,
{
    fn graph_cipher_rotate_right(
        x: FheProgramNode<Cipher<Self>>,
        amount: u64,
    ) -> FheProgramNode<Cipher<Self>>;
}
