use core::hash::Hash;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Hash, Serialize, Deserialize, PartialEq, Eq)]
/**
 * Represents a literal value in an expression.
 */
pub enum Literal {
    /**
     * An unsigned 64-bit integer.
     */
    U64(u64),

    /**
     * A plaintext stored as a sequence of bytes.
     */
    Plaintext(Vec<u8>),
}

impl From<u64> for Literal {
    fn from(val: u64) -> Self {
        Self::U64(val)
    }
}
