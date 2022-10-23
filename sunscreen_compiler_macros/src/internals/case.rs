use self::Scheme::*;
use crate::error::*;

#[derive(Copy, Clone, PartialEq, Eq)]
pub enum Scheme {
    Bfv,
}

impl Scheme {
    pub fn parse(s: &str) -> Result<Self> {
        Ok(match s {
            "bfv" => Bfv,
            _ => Err(Error::UnknownScheme(s.to_owned()))?,
        })
    }
}
