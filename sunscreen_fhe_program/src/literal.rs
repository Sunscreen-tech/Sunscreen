use core::hash::Hash;
use std::ops::Deref;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
/**
 * A non-NaN floating point value that defines [`Hash`] and [`Eq`] traits.
 * 
 * Two values are [`Eq`] if their bit patterns are the same and
 * [`Hash`] hashes the value as if it were a u64.
 */
pub struct NonNaNF64(f64);

impl Deref for NonNaNF64 {
    type Target = f64;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl NonNaNF64 {
    /**
     * Creates a new NonNaNF64.
     * 
     * # Panics
     * If val is NaN.
     */
    pub fn new(val: f64) -> Self {
        if val.is_nan() {
            panic!("Value was NaN.");
        }

        Self(val)
    }
}

impl Hash for NonNaNF64 {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        state.write_u64(self.0.to_bits())
    }
}

impl PartialEq for NonNaNF64 {
    fn eq(&self, other: &Self) -> bool {
        self.0.to_bits() == other.0.to_bits()
    }
}

impl Eq for NonNaNF64 { }

#[derive(Debug, Clone, Hash, Serialize, Deserialize, PartialEq, Eq)]
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
     * A 64-bit non-NaN IEEE-754 double precision number.
     */
    F64(NonNaNF64),

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

impl From<NonNaNF64> for Literal {
    fn from(val: NonNaNF64) -> Self {
        Self::F64(val)
    }
}
