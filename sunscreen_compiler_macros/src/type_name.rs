use proc_macro2::{Span, TokenStream};
use quote::{quote};
use syn::{DeriveInput, LitStr, Ident, parse_macro_input};

pub fn derive_typename(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    let out = derive_typename_inner(input).into();

    out
}

fn derive_typename_inner(parse_stream: DeriveInput) -> TokenStream {
    let name = &parse_stream.ident;
    let name_contents = LitStr::new(&format!("{{}}::{}", name.to_string()), name.span());
    let crate_name = std::env::var("CARGO_PKG_NAME").unwrap();

    // If the sunscreen_compiler crate itself tries to derive types, then it needs to refer
    // to itself in the first-person as "crate", not in the third-person as "sunscreen_compiler"
    let sunscreen_path = if crate_name == "sunscreen_compiler" {
        Ident::new("crate", Span::call_site())
    } else {
        Ident::new("sunscreen_compiler", Span::call_site())
    };

    TokenStream::from(quote! {
        impl #sunscreen_path ::types::TypeName for #name {
            fn type_name() -> #sunscreen_path ::types::Type {
                #sunscreen_path ::types::Type {
                    name: format!(#name_contents, module_path!()),
                    version: #sunscreen_path ::types::Version ::parse(#sunscreen_path ::crate_version!()).expect("Crate version is not a valid semver"),
                }
            }
        }
    })
}
