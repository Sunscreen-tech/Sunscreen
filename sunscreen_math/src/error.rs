#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("The given value is out of range.")]
    OutOfRange,
}
