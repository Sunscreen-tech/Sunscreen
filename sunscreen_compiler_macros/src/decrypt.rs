use proc_macro2::{Span, TokenStream};
use quote::quote;
use syn::{
    parse::{Parse, ParseStream},
    parse_macro_input,
    punctuated::Punctuated,
    Expr, Ident, Index, Result, Token, Type,
};

pub struct DecryptArgs {
    pub return_types: Vec<Type>,
    pub runtime: Expr,
    pub secret_key: Expr,
    pub return_bundle: Expr,
}

impl Parse for DecryptArgs {
    fn parse(input: ParseStream) -> Result<Self> {
        let runtime: Expr = input.parse()?;
        input.parse::<Token![,]>()?;
        let secret_key: Expr = input.parse()?;
        input.parse::<Token![,]>()?;
        let return_bundle: Expr = input.parse()?;
        input.parse::<Token![,]>()?;

        let rets = Punctuated::<Type, Token![,]>::parse_terminated(input)?.iter().map(|t| t.clone()).collect();

        Ok(Self {
            runtime,
            secret_key,
            return_bundle,
            return_types: rets,
        })
    }
}

pub fn decrypt_impl(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let parsed = parse_macro_input!(input as DecryptArgs);

    decrypt_internal(&parsed).into()
}

fn decrypt_internal(input: &DecryptArgs) -> TokenStream {
    let validate = validate_types(input);
    let return_types = &input.return_types;
    let runtime = &input.runtime;
    let bundle = &input.return_bundle;
    let secret = &input.secret_key;

    let return_type = if return_types.len() == 0 {
        quote! { () }
    } else if return_types.len() == 1 {
        let r = &return_types[0];

        quote! { #r }
    } else {
        quote! { (#(#return_types)*) }
    };

    let decrypt_vals = input.return_types.iter().enumerate().map(|(i, r)| {
        let var = Ident::new(&format!("v_{}", i), Span::call_site());

        quote! {
            let #var: #r = #runtime.decrypt(&mut drain, #secret)?;
        }
    });

    let return_val = input.return_types.iter().enumerate().map(|(i, _)| {
        let var = Ident::new(&format!("v_{}", i), Span::call_site());

        quote! {
            #var,
        }
    });

    let return_val = if input.return_types.len() == 1 {
         quote! { #(#return_val)* }
    } else {
        quote! { (#(#return_val)*) }
    };

    TokenStream::from(quote! {
        (|| -> sunscreen_compiler::Result<#return_type> {
            #validate

            let mut drain = #bundle.0.drain(0..);

            #(#decrypt_vals)*

            Ok(#return_val)
        })()
    })
}

fn validate_types(args: &DecryptArgs) -> TokenStream {
    let runtime = &args.runtime;
    let return_types = &args.return_types;

    let validate = args.return_types.iter().enumerate().map(|(i, t)| {
        let id = Index::from(i);

        quote! {
            if #t::type_name() != #runtime.get_metadata().signature.returns[#id] {
                Err(Error::RuntimeError(
                    RuntimeError::ReturnMismatch {
                        expected: #runtime.get_metadata().signature.returns.clone(),
                        actual: vec![#(#return_types ::type_name(),)*],
                    }
                ))?;
            }
        }
    });

    let len = Index::from(args.return_types.len());

    quote! {
        (|| -> sunscreen_compiler::Result<()> {
            use sunscreen_compiler::*;
            use sunscreen_compiler::types::TypeName;

            if #runtime.get_metadata().signature.returns.len() != #len {
                Err(Error::RuntimeError(
                    RuntimeError::ReturnMismatch {
                        expected: #runtime.get_metadata().signature.returns.clone(),
                        actual: vec![#(#return_types ::type_name(),)*],
                    }
                ))?;
            }

            #(#validate)*

            Ok(())
        })()?;
    }
}
