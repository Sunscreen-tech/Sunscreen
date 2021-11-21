use serde::{Deserialize, Serialize};

use crate::OuterLiteral;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
/**
 * An operation in the execution graph.
 */
pub enum Operation {
    /**
     * Rotate each row in an encrypted SIMD type to the left.
     */
    ShiftLeft,

    /**
     * Rotate each row in an encrypted SIMD type to the right.
     */
    ShiftRight,

    /**
     * In some schemes (i.e. BFV), SIMD types cannonically form a 2xN matrix.
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
     * Multiply two values. Either operand may be a literal or a ciphertext.
     */
    Multiply,

    /**
     * Add two values. Either operand may be a literal or a ciphertext.
     */
    Add,

    /**
     * Computes the additive inverse of a plaintext or ciphertext.
     */
    Negate,

    /**
     * Subtracts the right operand from the left. Either operand may be a
     * literal or a ciphertext.
     */
    Sub,

    /**
     * Represents an input ciphertext for the circuit.
     */
    InputCiphertext(usize),

    /**
     * Represents a literal value.
     */
    Literal(OuterLiteral),

    /**
     * Represents a ciphertext output for the circuit.
     */
    OutputCiphertext,
}
