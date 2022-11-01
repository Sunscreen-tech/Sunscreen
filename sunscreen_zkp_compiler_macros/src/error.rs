use std::fmt::Display;

#[derive(Debug)]
pub enum Error {
    UnknownBackend(String),
}

impl Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnknownBackend(b) => {
                write!(f, "Unknown ZKP backend '{}'", b)
            }
        }
    }
}

pub type Result<T> = std::result::Result<T, Error>;
