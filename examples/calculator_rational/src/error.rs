#[derive(Debug)]
/// Represents any error that can happen in our app. This is the built-in
/// canonical way to do error handling in Rust, but there are better solutions
/// with less boilerplate. E.g. the [quick_error](https://docs.rs/quick-error/2.0.1/quick_error/)
/// and [anyhow](https://docs.rs/anyhow/latest/anyhow/index.html) crates.
pub enum Error {
    SunscreenError(sunscreen::Error),

    SendError,
    
    RecvError,

    IoError(std::io::Error),

    ParseError,
}

/// Converts a sunscreen::Error into an Error. Needed to use `?` operator.
impl From<sunscreen::Error> for Error {
    fn from(err: sunscreen::Error) -> Self {
        Self::SunscreenError(err)
    }
}

impl From<sunscreen::RuntimeError> for Error {
    fn from(err: sunscreen::RuntimeError) -> Self {
        Self::SunscreenError(err.into())
    }
}

impl <T> From<std::sync::mpsc::SendError<T>> for Error {
    fn from(_: std::sync::mpsc::SendError<T>) -> Error {
        Self::SendError
    }
}

impl From<std::sync::mpsc::RecvError> for Error {
    fn from(_: std::sync::mpsc::RecvError) -> Error {
        Self::RecvError
    }
}

impl From<std::io::Error> for Error {
    fn from(err: std::io::Error) -> Error {
        Self::IoError(err)
    }
}