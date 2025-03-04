/// Errors that can occur using this crate.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// The size of the given entity is invalid under the given scheme parameters.
    #[error("The given entity is the incorrect size for the requested parameters.")]
    InvalidSize,
}

/// A result that can occur in this crate.
pub type Result<T> = std::result::Result<T, Error>;
