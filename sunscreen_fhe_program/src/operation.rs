use serde::{Deserialize, Serialize};
use sunscreen_compiler_common::Operation as OperationTrait;

use crate::Literal;

#[derive(Debug, Clone, Serialize, Hash, Deserialize, PartialEq, Eq)]
#[serde(tag = "type")]
/**
 * An operation in the execution graph.
 */
pub enum Operation {
    /**
     * Rotate each row in an encrypted Batched type to the left.
     */
    ShiftLeft,

    /**
     * Rotate each row in an encrypted Batched type to the right.
     */
    ShiftRight,

    /**
     * In some schemes (i.e. BFV), Batched types cannonically form a 2xN matrix.
     * This operator swaps the rows.
     *
     * While ciphertexts may contain more rows after multiplication and before
     * relinearization, Sunscreen relinearizes at the appropriate time to ensure
     * this operation only ever sees cannonical ciphertexts.
     */
    SwapRows,

    /**
     * In some schemes (i.e. BFV), this operation prevents future noise growth after
     * a multiplication operation by reducing the resultant 3xN ciphertext down to
     * the cannonical 2xN.
     */
    Relinearize,

    /**
     * Multiply two ciphertext values.
     */
    Multiply,

    /**
     * Multiply a ciphertext and a plaintext
     */
    MultiplyPlaintext,

    /**
     * Add two ciphertext values.
     */
    Add,

    /**
     * Add a plaintext to a ciphertext.
     */
    AddPlaintext,

    /**
     * Computes the additive inverse of a ciphertext.
     */
    Negate,

    /**
     * Subtracts the right ciphertext from the left ciphertext.
     */
    Sub,

    /**
     * Subtracts a plaintext from a ciphertext.
     */
    SubPlaintext,

    /**
     * Represents an input ciphertext for the FHE program.
     */
    InputCiphertext {
        /**
         * The ID of the ciphertext.
         */
        id: usize,
    },

    /**
     * Represents an input plaintext for the current FHE program.
     */
    InputPlaintext {
        /**
         * The ID of the plaintext.
         */
        id: usize,
    },

    /**
     * Represents a literal value.
     */
    Literal {
        /**
         * The value of the literal.
         */
        val: Literal,
    },

    /**
     * Represents a ciphertext output for the FHE program.
     */
    OutputCiphertext,
}

impl ToString for Operation {
    fn to_string(&self) -> String {
        format!("{self:#?}")
    }
}

impl OperationTrait for Operation {
    fn is_binary(&self) -> bool {
        matches!(
            self,
            Self::Multiply
                | Self::MultiplyPlaintext
                | Self::Add
                | Self::AddPlaintext
                | Self::Sub
                | Self::SubPlaintext
                | Self::ShiftLeft
                | Self::ShiftRight
        )
    }

    fn is_commutative(&self) -> bool {
        matches!(
            self,
            Self::Multiply | Self::MultiplyPlaintext | Self::Add | Self::AddPlaintext
        )
    }

    fn is_unary(&self) -> bool {
        matches!(
            self,
            Self::Negate | Self::Relinearize | Self::SwapRows | Self::OutputCiphertext
        )
    }

    fn is_unordered(&self) -> bool {
        false
    }

    fn is_ordered(&self) -> bool {
        false
    }
}
