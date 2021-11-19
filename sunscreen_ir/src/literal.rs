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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
/**
 * Represents the dimensionality of a literal (scalar vs vector etc.)
 */
pub enum OuterLiteral {
    /**
     * A scalar literal
     */
    Scalar(Literal),

    /**
     * A vector literal
     */
    Vector(Vec<Literal>),
}

impl From<i64> for OuterLiteral {
    fn from(val: i64) -> Self {
        Self::Scalar(Literal::I64(val))
    }
}

impl From<u64> for OuterLiteral {
    fn from(val: u64) -> Self {
        Self::Scalar(Literal::U64(val))
    }
}

impl From<f64> for OuterLiteral {
    fn from(val: f64) -> Self {
        Self::Scalar(Literal::F64(val))
    }
}
