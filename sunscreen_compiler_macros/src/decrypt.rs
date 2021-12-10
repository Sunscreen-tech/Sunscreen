use proc_macro2::TokenStream;
use quote::quote;
use syn::{
    parse::{Parse, ParseStream},
    parse_macro_input,
    punctuated::Punctuated,
    Error, Expr, ExprPath, Ident, Index, Result, Token,
};

pub struct DecryptArgs {
    pub return_types: Vec<ExprPath>,
    pub runtime_ident: Ident,
    pub return_bundle_ident: Ident,
}

impl Parse for DecryptArgs {
    fn parse(input: ParseStream) -> Result<Self> {
        let vars = Punctuated::<Expr, Token![,]>::parse_terminated(input)?;

        let mut runtime_ident: Option<Ident> = None;
        let mut return_bundle_ident: Option<Ident> = None;
        let mut return_types = vec![];

        if vars.len() < 2 {
            return Err(Error::new_spanned(
                vars,
                "Usage: decrypt_impl!(runtime, return_val, T1, T2, ...)",
            ));
        };

        for (i, var) in vars.iter().enumerate() {
            match var {
                Expr::Path(p) => {
                    if i == 0 {
                        runtime_ident = Some(
                            p.path
                                .get_ident()
                                .ok_or(Error::new_spanned(p, "Not a variable"))?
                                .clone(),
                        );
                    } else if i == 1 {
                        return_bundle_ident = Some(
                            p.path
                                .get_ident()
                                .ok_or(Error::new_spanned(p, "Not a variable"))?
                                .clone(),
                        );
                    } else {
                        return_types.push(p.clone())
                    }
                }
                _ => {
                    return Err(Error::new_spanned(
                        var,
                        "Usage: decrypt_impl!(runtime, return_val, T1, T2, ...)",
                    ));
                }
            };
        }

        Ok(Self {
            return_bundle_ident: return_bundle_ident.unwrap(),
            runtime_ident: runtime_ident.unwrap(),
            return_types: return_types,
        })
    }
}

pub fn decrypt_impl(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let parsed = parse_macro_input!(input as DecryptArgs);

    let tok = decrypt_internal(&parsed).into();

    //panic!("{}", tok);

    tok
}

fn decrypt_internal(input: &DecryptArgs) -> TokenStream {
    let validate = validate_types(input);
    let return_types = &input.return_types;

    TokenStream::from(quote! {
        (|| -> sunscreen_compiler::Result<(#(#return_types,)*)> {
            #validate

            Ok(())
        })()
    })
}

fn validate_types(args: &DecryptArgs) -> TokenStream {
    let runtime = &args.runtime_ident;
    let return_types = &args.return_types;

    let validate = args.return_types.iter().enumerate().map(|(i, t)| {
        let id = Index::from(i);

        quote! {
            if #t::type_name() != #runtime.get_metadata().signature.returns[#id] {
                return Err(Error::ReturnMismatch(
                    RuntimeError::ReturnMismatch {
                        expected: #runtime.get_metadata().signature.returns.clone(),
                        actual: vec![#(#return_types ::type_name(),)*],
                    }
                ));
            }
        }
    });

    let len = Index::from(args.return_types.len());

    quote! {
        (|| -> sunscreen_compiler::Result<()> {
            use sunscreen_compiler::*;

            if #runtime.get_metadata().signature.returns.len() != #len {
                return Err(Error::RuntimeError(
                    RuntimeError::ReturnMismatch {
                        expected: #runtime.get_metadata().signature.returns.clone(),
                        actual: vec![#(#return_types ::type_name(),)*],
                    }
                ));
            }

            #(#validate)*

            Ok(())
        })()?;
    }
}
