use proc_macro2::{Span, TokenStream};
use quote::quote;
use syn::{
    parse_macro_input, punctuated::Punctuated, token::Comma, DeriveInput, GenericParam, Ident,
    LitStr,
};

pub fn derive_typename(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    derive_typename_inner(input).into()
}

fn derive_typename_inner(parse_stream: DeriveInput) -> TokenStream {
    let name = &parse_stream.ident;
    let generics = &parse_stream.generics;
    let generic_idents = generics
        .params
        .iter()
        .map(|x| match x {
            GenericParam::Type(x) => {
                let ident = &x.ident;

                quote! {
                    #ident
                }
            }
            GenericParam::Lifetime(x) => {
                let lifetime = &x.lifetime;

                quote! { #lifetime }
            }
            GenericParam::Const(x) => {
                let ident = &x.ident;

                quote! {
                    #ident
                }
            }
        })
        .collect::<Punctuated<TokenStream, Comma>>();

    let name_contents = LitStr::new(&format!("{{}}::{name}"), name.span());

    // If the sunscreen crate itself tries to derive types, then it needs to refer
    // to itself in the first-person as "crate", not in the third-person as "sunscreen"
    Ident::new("sunscreen", Span::call_site());

    quote! {
        impl #generics sunscreen::types::TypeName for #name<#generic_idents> {
            fn type_name() -> sunscreen::types::Type {
                let version = env!("CARGO_PKG_VERSION");

                sunscreen::types::Type {
                    name: format!(#name_contents, module_path!()),
                    version: sunscreen::types::Version ::parse(version).expect("Crate version is not a valid semver"),
                    is_encrypted: false
                }
            }
        }

        impl #generics sunscreen::types::TypeNameInstance for #name<#generic_idents> {
            fn type_name_instance(&self) -> sunscreen::types::Type {
                let version = env!("CARGO_PKG_VERSION");

                sunscreen::types::Type {
                    name: format!(#name_contents, module_path!()),
                    version: sunscreen::types::Version ::parse(version).expect("Crate version is not a valid semver"),
                    is_encrypted: false,
                }
            }
        }
    }
}
