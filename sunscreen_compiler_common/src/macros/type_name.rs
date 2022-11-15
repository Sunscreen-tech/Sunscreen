use proc_macro2::{Span, TokenStream};
use quote::quote;
use syn::{DeriveInput, Ident, LitStr};

/**
 * The implementation for #[derive(TypeName)]
 */
pub fn derive_typename_impl(parse_stream: DeriveInput) -> TokenStream {
    let name = &parse_stream.ident;
    let name_contents = LitStr::new(&format!("{{}}::{}", name), name.span());
    let crate_name = std::env::var("CARGO_CRATE_NAME").unwrap();

    // If the sunscreen crate itself tries to derive types, then it needs to refer
    // to itself in the first-person as "crate", not in the third-person as "sunscreen"
    let sunscreen_path = if crate_name == "sunscreen" {
        Ident::new("crate", Span::call_site())
    } else {
        Ident::new("sunscreen", Span::call_site())
    };

    quote! {
        impl #sunscreen_path ::types::TypeName for #name {
            fn type_name() -> #sunscreen_path ::types::Type {
                let version = env!("CARGO_PKG_VERSION");

                #sunscreen_path ::types::Type {
                    name: format!(#name_contents, module_path!()),
                    version: #sunscreen_path ::types::Version ::parse(version).expect("Crate version is not a valid semver"),
                    is_encrypted: false
                }
            }
        }

        impl #sunscreen_path ::types::TypeNameInstance for #name {
            fn type_name_instance(&self) -> #sunscreen_path ::types::Type {
                let version = env!("CARGO_PKG_VERSION");

                #sunscreen_path ::types::Type {
                    name: format!(#name_contents, module_path!()),
                    version: #sunscreen_path ::types::Version ::parse(version).expect("Crate version is not a valid semver"),
                    is_encrypted: false,
                }
            }
        }
    }
}
