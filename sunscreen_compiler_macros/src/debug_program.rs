use crate::{
    fhe_program_transforms::*,
    internals::attr::{FheProgramAttrs, Scheme},
};
use proc_macro2::{Span, TokenStream};
use quote::{quote, quote_spanned};
use sunscreen_compiler_common::macros::{extract_fn_arguments, ExtractFnArgumentsError};
use syn::{parse_macro_input, spanned::Spanned, Ident, ItemFn, Type};

pub fn debug_program_impl(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream
) -> TokenStream {

}
