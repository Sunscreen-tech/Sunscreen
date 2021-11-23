#[derive(Debug, Clone, PartialEq)]
pub enum Error {
    NoParams,
    IRError(sunscreen_circuit::Error),
}

impl From<sunscreen_circuit::Error> for Error {
    fn from(err: sunscreen_circuit::Error) -> Self {
        Self::IRError(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;
