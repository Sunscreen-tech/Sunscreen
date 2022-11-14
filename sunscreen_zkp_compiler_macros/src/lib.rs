#![recursion_limit = "128"]

use sunscreen_compiler_common::macros::derive_typename_impl;
use syn::{parse_macro_input, DeriveInput};
use zkp_program::zkp_program_impl;

extern crate proc_macro;

mod attr_parsing;
mod error;
mod internals;
mod zkp_program;

#[proc_macro_attribute]
pub fn zkp_program(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    zkp_program_impl(metadata, input)
}
