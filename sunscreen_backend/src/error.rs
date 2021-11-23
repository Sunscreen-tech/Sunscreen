#[derive(Debug, Clone, PartialEq)]
pub enum Error {
    NoParams,
    IRError(sunscreen_ir::Error),
}

impl From<sunscreen_ir::Error> for Error {
    fn from(err: sunscreen_ir::Error) -> Self {
        Self::IRError(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;
