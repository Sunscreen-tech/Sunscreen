#[derive(Debug, thiserror::Error)]
/// Errors that can occur in this crate.
pub enum Error {
    #[error("The given value is out of range.")]
    /// The given value is out of range.
    OutOfRange,
}
