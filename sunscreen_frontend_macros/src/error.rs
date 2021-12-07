#[derive(Debug)]
pub enum Error {
    SynError(syn::Error),
    UnknownScheme(String),
}

impl From<syn::Error> for Error {
    fn from(err: syn::Error) -> Self {
        Self::SynError(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;
