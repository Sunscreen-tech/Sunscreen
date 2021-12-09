use proc_macro2::{TokenStream};
use quote::{quote};
use syn::{DeriveInput, LitStr, parse_macro_input};

pub fn derive_typename(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    let out = derive_typename_inner(input).into();

    out
}

fn derive_typename_inner(parse_stream: DeriveInput) -> TokenStream {
    let name = &parse_stream.ident;
    let name_contents = LitStr::new(&format!("{{}}::{}", name.to_string()), name.span());

    TokenStream::from(quote! {
        impl sunscreen_compiler::types::TypeName for #name {
            fn type_name() -> sunscreen_compiler::types::Type {
                use sunscreen_compiler::types::{Type, Version};

                Type {
                    name: format!(#name_contents, module_path!()),
                    version: Version::parse(sunscreen_compiler::crate_version!()).expect("Crate version is not a valid semver"),
                }
            }
        }
    })
}
