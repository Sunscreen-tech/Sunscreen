use proc_macro2::Span;
use syn::{
    parse::{Parse, ParseStream},
    punctuated::Punctuated,
    spanned::Spanned,
    Error as SynError, Expr, Lit, LitInt, LitStr, Result as SynResult, Token,
};

use crate::{
    attr_parsing::try_parse_dict,
    error::{Error, Result},
};
use std::collections::HashMap;

const VALUE_KEYS: &[&str] = &["backend"];

pub enum BackendType {
    Bulletproofs,
}

impl TryFrom<&str> for BackendType {
    type Error = Error;

    fn try_from(value: &str) -> Result<Self> {
        match value {
            "bulletproofs" => Ok(BackendType::Bulletproofs),
            _ => Err(Error::UnknownBackend(value.to_owned())),
        }
    }
}

pub struct Attrs {
    backend_type: BackendType,
}

impl Parse for Attrs {
    fn parse(input: ParseStream) -> SynResult<Self> {
        let attrs = try_parse_dict(input)?;

        for i in attrs.keys() {
            if !VALUE_KEYS.iter().any(|x| x == i) {
                return Err(SynError::new(input.span(), &format!("Unknown key '{}'", i)));
            }
        }

        let backend_type = attrs.get("backend").ok_or_else(|| {
            SynError::new(input.span(), "required 'backend' is missing".to_owned())
        })?;
        let backend_type = BackendType::try_from(backend_type.as_str()?)
            .map_err(|e| SynError::new(backend_type.span(), format!("{}", e)))?;

        Ok(Self { backend_type })
    }
}
