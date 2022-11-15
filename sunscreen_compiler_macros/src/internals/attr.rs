use proc_macro2::Span;
use syn::{
    parse::{Parse, ParseStream},
    punctuated::Punctuated,
    spanned::Spanned,
    Error as SynError, Expr, Lit, LitInt, LitStr, Result as SynResult, Token,
};

use std::collections::HashMap;

#[derive(Debug)]
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
    type Error = SynError;

    fn try_from(lit: &LitInt) -> SynResult<Self> {
        let val = lit.base10_parse::<usize>().map_err(|_| {
            SynError::new_spanned(
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

    pub fn as_str(&self) -> SynResult<&str> {
        match self {
            Self::String(_, val) => Ok(val),
            _ => Err(SynError::new(
                self.span(),
                format!("Expected String, got {}", self.get_type()),
            )),
        }
    }

    pub fn as_usize(&self) -> SynResult<usize> {
        match self {
            Self::USize(_, val) => Ok(*val),
            _ => Err(SynError::new(
                self.span(),
                format!("Expected String, got {}", self.get_type()),
            )),
        }
    }
}

/**
 * Attempts to parse  a list of attributes contained in an attribute and
 * returns them as a `HashMap<String, AttrValue>`. The list of items
 * is a comma-delimited list of either `key = value` pairs where value is
 * a string or numeric literal *or* merely a key.
 *
 * Parsing will fail and return an error on any syntax violation.
 *
 * # Example
 * In the below example, this function parses the contents between the
 * parentheses.
 *
 * ```no_test
 * // key1 takes a string value, key2 takes a usize, key3's presence
 * // indicates is a true boolean.
 * #[my_attribute(key1 = "string", key2 = 42, key3)]
 * fn my_function() {
 * }
 * ```
 */
fn try_parse_dict(input: ParseStream) -> SynResult<HashMap<String, AttrValue>> {
    // parses a,b,c, or a,b,c where a,b and c are Indent
    let vars = Punctuated::<Expr, Token![,]>::parse_terminated(input)?;

    let mut attrs: HashMap<String, AttrValue> = HashMap::new();

    for var in &vars {
        match var {
            Expr::Assign(a) => {
                let key = match &*a.left {
                        Expr::Path(p) =>
                            p.path.get_ident().ok_or_else(||SynError::new_spanned(p, "Key should contain only a single path element (e.g, foo, not foo::bar)".to_owned()))?.to_string(),
                        _ => { return Err(SynError::new_spanned(&a.left, "Key should be a plain identifier")) }
                    };

                let value: AttrValue = match &*a.right {
                    Expr::Lit(l) => match &l.lit {
                        Lit::Str(s) => s.into(),
                        Lit::Int(x) => x.try_into()?,
                        _ => {
                            return Err(SynError::new_spanned(
                                l,
                                "Literal should be a string or integer",
                            ))
                        }
                    },
                    _ => {
                        return Err(SynError::new_spanned(
                            &a.right,
                            "Value should be a string literal",
                        ))
                    }
                };

                attrs.insert(key, value);
            }
            Expr::Path(p) => {
                let key = p
                    .path
                    .get_ident()
                    .ok_or_else(|| SynError::new_spanned(p, "Unknown identifier"))?
                    .to_string();

                attrs.insert(key, AttrValue::Present(p.span()));
            }
            _ => {
                return Err(SynError::new_spanned(
                    var,
                    "Expected `key = \"value\"` or `key`",
                ))
            }
        }
    }

    Ok(attrs)
}

#[derive(Copy, Clone, PartialEq, Eq)]
pub enum Scheme {
    Bfv,
}

impl TryFrom<&AttrValue> for Scheme {
    type Error = SynError;

    fn try_from(value: &AttrValue) -> SynResult<Self> {
        let as_str = value.as_str()?;

        let scheme = match as_str {
            "bfv" => Self::Bfv,
            _ => {
                return Err(SynError::new(
                    value.span(),
                    format!("Unknown scheme {}", as_str),
                ));
            }
        };

        Ok(scheme)
    }
}

pub struct FheProgramAttrs {
    pub scheme: Scheme,
    pub chain_count: usize,
}

impl Parse for FheProgramAttrs {
    fn parse(input: ParseStream) -> SynResult<Self> {
        let attrs = try_parse_dict(input)?;

        const VALUE_KEYS: &[&str] = &["scheme", "chain_count"];

        for i in attrs.keys() {
            if !VALUE_KEYS.iter().any(|x| x == i) {
                return Err(SynError::new(input.span(), &format!("Unknown key '{}'", i)));
            }
        }

        let scheme: Scheme = attrs
            .get("scheme")
            .ok_or_else(|| SynError::new(input.span(), "required `scheme` is missing".to_owned()))?
            .try_into()?;

        let chain_count = attrs
            .get("chain_count")
            .map(|x| x.as_usize())
            .unwrap_or(Ok(1))?;

        Ok(Self {
            scheme,
            chain_count,
        })
    }
}

pub enum BackendType {
    Bulletproofs,
}

impl TryFrom<&AttrValue> for BackendType {
    type Error = SynError;

    fn try_from(value: &AttrValue) -> SynResult<Self> {
        let as_str = value.as_str()?;

        match as_str {
            "bulletproofs" => Ok(BackendType::Bulletproofs),
            _ => Err(SynError::new(
                value.span(),
                format!("Unknown backend `{}`", as_str.to_owned()),
            )),
        }
    }
}

#[allow(unused)]
pub struct ZkpProgramAttrs {
    backend_type: BackendType,
}

impl Parse for ZkpProgramAttrs {
    fn parse(input: ParseStream) -> SynResult<Self> {
        let attrs = try_parse_dict(input)?;

        const VALUE_KEYS: &[&str] = &["backend"];

        for i in attrs.keys() {
            if !VALUE_KEYS.iter().any(|x| x == i) {
                return Err(SynError::new(input.span(), &format!("Unknown key '{}'", i)));
            }
        }

        let backend_type = attrs.get("backend").ok_or_else(|| {
            SynError::new(input.span(), "required 'backend' is missing".to_owned())
        })?;
        let backend_type = BackendType::try_from(backend_type)?;

        Ok(Self { backend_type })
    }
}
