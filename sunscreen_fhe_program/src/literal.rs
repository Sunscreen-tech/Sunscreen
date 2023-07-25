use core::hash::Hash;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Hash, Serialize, Deserialize, PartialEq, Eq)]
//#[serde(tag = "type")]
/**
 * Represents a literal value in an expression.
 */
pub enum Literal {
    /**
     * An unsigned 64-bit integer.
     */
    U64 {
        /**
         * The value of the integer.
         */
        value: u64,
    },

    /**
     * A plaintext stored as a sequence of bytes.
     */
    Plaintext {
        /**
         * The value of the plaintext.
         */
        value: Vec<u8>,
    },
}

impl From<u64> for Literal {
    fn from(val: u64) -> Self {
        Self::U64 { value: val }
    }
}
