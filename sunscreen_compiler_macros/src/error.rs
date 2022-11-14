use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("{0:?}")]
    SynError(syn::Error),
    #[error("Unknown scheme {0}")]
    UnknownScheme(String),
    #[error("Unknown ZKP backend {0}")]
    UnknownBackend(String),
}

impl From<syn::Error> for Error {
    fn from(err: syn::Error) -> Self {
        Self::SynError(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;
