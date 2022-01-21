use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
/**
 * Represents a literal value in an expression.
 */
pub enum Literal {
    /**
     * A 64-bit signed integer
     */
    I64(i64),

    /**
     * An unsigned 64-bit integer.
     */
    U64(u64),

    /**
     * A 64-bit IEEE-754 double precision number.
     */
    F64(f64),

    /**
     * A plaintext stored as a sequence of bytes.
     */
    Plaintext(Vec<u8>),
}

impl From<i64> for Literal {
    fn from(val: i64) -> Self {
        Self::I64(val)
    }
}

impl From<u64> for Literal {
    fn from(val: u64) -> Self {
        Self::U64(val)
    }
}

impl From<f64> for Literal {
    fn from(val: f64) -> Self {
        Self::F64(val)
    }
}
