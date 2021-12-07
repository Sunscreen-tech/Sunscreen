use super::case::Scheme;
use syn::{parse::{Parse, ParseStream}, Error, Expr, Lit, punctuated::Punctuated, Result, Token};

use crate::internals::symbols::{VALUE_KEYS};

use std::collections::HashMap;

pub struct Attrs {
    pub scheme: Scheme,
}

impl Parse for Attrs {
    fn parse(input: ParseStream) -> Result<Self> {
        // parses a,b,c, or a,b,c where a,b and c are Indent
        let vars = Punctuated::<Expr, Token![,]>::parse_terminated(input)?;

        let mut attrs: HashMap<String, Option<String>> = HashMap::new();

        for var in &vars {
            match var {
                Expr::Assign(a) => {
                    let key = match &*a.left {
                        Expr::Path(p) =>
                            p.path.get_ident().ok_or(Error::new_spanned(p, "Key should contain only a single path element (e.g, foo, not foo::bar)".to_owned()))?.to_string(),
                        _ => { return Err(Error::new_spanned(&a.left, "Key should be a plain identifier")) }
                    };

                    let value = match &*a.right {
                        Expr::Lit(l) => {
                            match &l.lit {
                                Lit::Str(s) => {
                                    s.value()
                                },
                                _ => { return Err(Error::new_spanned(l, "Literal should be a string"))}
                            }
                        },
                        _ => { return Err(Error::new_spanned(&a.right, "Value should be a string literal")) }
                    };

                    if !VALUE_KEYS.iter().any(|x| *x == key) {
                        return Err(Error::new_spanned(a, "Unknown key".to_owned()));
                    }

                    attrs.insert(key, Some(value));
                },
                Expr::Path(p) => {
                    let key = p.path.get_ident().ok_or(Error::new_spanned(p, "Unknown identifier"))?.to_string();

                    if !VALUE_KEYS.iter().any(|x| *x == key) {
                        return Err(Error::new_spanned(p, "Unknown key"));
                    }

                    attrs.insert(key, None);
                },
                _ => return Err(Error::new_spanned(var, "Expected `key = \"value\"` or `key`"))
            }
        }

        let scheme_type = attrs
            .get("scheme")
            .ok_or(Error::new_spanned(&vars, "required `scheme` is missing".to_owned()))?
            .as_ref()
            .ok_or(Error::new_spanned(&vars, "`scheme` requires a value".to_owned()))?;

        Ok(Self {
            scheme: Scheme::parse(&scheme_type).map_err(|_e| Error::new_spanned(vars, format!("Unknown variant {}", &scheme_type)))?,
        })
    }
}