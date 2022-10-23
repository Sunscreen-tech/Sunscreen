use super::case::Scheme;
use proc_macro2::Span;
use syn::{
    parse::{Parse, ParseStream},
    punctuated::Punctuated,
    spanned::Spanned,
    Error, Expr, Lit, LitInt, LitStr, Result, Token,
};

use crate::internals::symbols::VALUE_KEYS;

use std::collections::HashMap;

enum AttrValue {
    /**
     * The attribute value is a string.
     */
    String(Span, String),

    /**
     * The attribute value is an integer.
     */
    USize(Span, usize),

    /**
     * The key is present but has no value associated with it.
     */
    Present(Span),
}

impl From<&LitStr> for AttrValue {
    fn from(lit: &LitStr) -> Self {
        Self::String(lit.span(), lit.value())
    }
}

impl TryFrom<&LitInt> for AttrValue {
    type Error = Error;

    fn try_from(lit: &LitInt) -> Result<Self> {
        let val = lit.base10_parse::<usize>().map_err(|_| {
            Error::new_spanned(
                lit,
                format!("{} is not a valid integer literal.", lit.base10_digits()),
            )
        })?;

        Ok(Self::USize(lit.span(), val))
    }
}

impl AttrValue {
    pub fn get_type(&self) -> &str {
        match self {
            Self::String(_s, _x) => "String",
            Self::USize(_s, _x) => "usize",
            Self::Present(_s) => "None",
        }
    }

    pub fn span(&self) -> Span {
        match self {
            Self::String(s, _) => *s,
            Self::USize(s, _) => *s,
            Self::Present(s) => *s,
        }
    }

    pub fn as_str(&self) -> Result<&str> {
        match self {
            Self::String(_, val) => Ok(val),
            _ => Err(Error::new(
                self.span(),
                format!("Expected String, got {}", self.get_type()),
            )),
        }
    }

    pub fn as_usize(&self) -> Result<usize> {
        match self {
            Self::USize(_, val) => Ok(*val),
            _ => Err(Error::new(
                self.span(),
                format!("Expected String, got {}", self.get_type()),
            )),
        }
    }
}

pub struct Attrs {
    pub scheme: Scheme,
    pub chain_count: usize,
}

impl Parse for Attrs {
    fn parse(input: ParseStream) -> Result<Self> {
        // parses a,b,c, or a,b,c where a,b and c are Indent
        let vars = Punctuated::<Expr, Token![,]>::parse_terminated(input)?;

        let mut attrs: HashMap<String, AttrValue> = HashMap::new();

        for var in &vars {
            match var {
                Expr::Assign(a) => {
                    let key = match &*a.left {
                        Expr::Path(p) =>
                            p.path.get_ident().ok_or(Error::new_spanned(p, "Key should contain only a single path element (e.g, foo, not foo::bar)".to_owned()))?.to_string(),
                        _ => { return Err(Error::new_spanned(&a.left, "Key should be a plain identifier")) }
                    };

                    let value: AttrValue = match &*a.right {
                        Expr::Lit(l) => match &l.lit {
                            Lit::Str(s) => s.into(),
                            Lit::Int(x) => x.try_into()?,
                            _ => {
                                return Err(Error::new_spanned(
                                    l,
                                    "Literal should be a string or integer",
                                ))
                            }
                        },
                        _ => {
                            return Err(Error::new_spanned(
                                &a.right,
                                "Value should be a string literal",
                            ))
                        }
                    };

                    if !VALUE_KEYS.iter().any(|x| *x == key) {
                        return Err(Error::new_spanned(a, "Unknown key".to_owned()));
                    }

                    attrs.insert(key, value);
                }
                Expr::Path(p) => {
                    let key = p
                        .path
                        .get_ident()
                        .ok_or(Error::new_spanned(p, "Unknown identifier"))?
                        .to_string();

                    if !VALUE_KEYS.iter().any(|x| *x == key) {
                        return Err(Error::new_spanned(p, "Unknown key"));
                    }

                    attrs.insert(key, AttrValue::Present(p.span()));
                }
                _ => {
                    return Err(Error::new_spanned(
                        var,
                        "Expected `key = \"value\"` or `key`",
                    ))
                }
            }
        }

        let scheme_type = attrs
            .get("scheme")
            .ok_or(Error::new_spanned(
                &vars,
                "required `scheme` is missing".to_owned(),
            ))?
            .as_str()?;

        let chain_count = attrs
            .get("chain_count")
            .map(|x| x.as_usize())
            .unwrap_or(Ok(1))?;

        Ok(Self {
            scheme: Scheme::parse(scheme_type).map_err(|_e| {
                Error::new_spanned(vars, format!("Unknown scheme '{}'", &scheme_type))
            })?,
            chain_count,
        })
    }
}
