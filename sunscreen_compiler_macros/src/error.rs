use proc_macro2::Span;

#[derive(Debug, Clone, thiserror::Error)]
pub enum Error {
    #[error("{1}")]
    CompileError(Span, String),
}

impl Error {
    pub fn compile_error(span: Span, msg: &str) -> Self {
        Self::CompileError(span, msg.to_owned())
    }
}

pub type Result<T> = std::result::Result<T, Error>;