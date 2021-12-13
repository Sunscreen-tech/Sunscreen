use proc_macro2::TokenStream;
use quote::quote;
use syn::{
    parse::{Parse, ParseStream},
    parse_macro_input,
    punctuated::Punctuated,
    Expr, Result, Token,
};

pub struct EncryptArgs {
    pub runtime: Expr,
    pub public_key: Expr,
    pub args: Vec<Expr>,
}

impl Parse for EncryptArgs {
    fn parse(input: ParseStream) -> Result<Self> {
        let runtime: Expr = input.parse()?;
        input.parse::<Token![,]>()?;
        let public_key: Expr = input.parse()?;
        input.parse::<Token![,]>()?;

        let args = Punctuated::<Expr, Token![,]>::parse_terminated(input)?
            .iter()
            .map(|t| t.clone())
            .collect();

        Ok(Self {
            runtime,
            public_key,
            args,
        })
    }
}

pub fn encrypt_impl(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let parsed = parse_macro_input!(input as EncryptArgs);

    encrypt_internal(&parsed).into()
}

pub fn encrypt_internal(parsed: &EncryptArgs) -> TokenStream {
    let args = &parsed.args;
    let runtime = &parsed.runtime;
    let public_key = &parsed.public_key;

    let gen_arguments = quote! {
        let arguments = Arguments::new()
    };

    let add_args = args.iter().map(|a| {
        quote! {
            .arg(#a)
        }
    });

    TokenStream::from(quote! {
        (|| -> sunscreen_compiler::Result<sunscreen_compiler::InputBundle> {
            use sunscreen_compiler::*;

            #gen_arguments
            #(#add_args)*;

            Ok(#runtime.encrypt_args(&arguments, #public_key)?)
        })()
    })
}
