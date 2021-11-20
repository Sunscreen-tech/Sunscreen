/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
