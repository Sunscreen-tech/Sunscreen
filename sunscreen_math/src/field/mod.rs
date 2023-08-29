use crate::ring::Ring;

/// A trait for fields.
pub trait Field: Ring {
    /// Compute the inverse of `self`
    fn inverse(&self) -> Self;
}

/// A marker trait denoting this configuration is for a field
pub trait FieldConfig {}
