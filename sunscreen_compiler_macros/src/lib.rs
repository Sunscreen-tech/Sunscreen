#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]
#![recursion_limit = "128"]

//! This crate contains macros to support the sunscreen compiler.

extern crate proc_macro;

mod debug_program;
mod error;
mod fhe_program;
mod fhe_program_transforms;
mod internals;
mod type_name;
mod zkp_program;

#[proc_macro_derive(TypeName)]
/**
 * Allows you to `#[derive(Typename)]`.
 */
pub fn derive_typename(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    type_name::derive_typename(input)
}

#[proc_macro_attribute]
/**
 * Specifies a function to be an [`fhe_program`](macro@fhe_program). An [`fhe_program`](macro@fhe_program) has any number of inputs that impl the
 * `FheType` trait and returns either a single type implementing `FheType` or a tuple of
 * types implementing `FheType`.
 *
 * This function gets run by the compiler to build up the [`fhe_program`](macro@fhe_program) you specify and does not
 * directly or eagerly perform homomorphic operations.
 *
 * # Parameters
 * * `scheme` (required): Designates the scheme this [`fhe_program`](macro@fhe_program) uses. Today, this must be `"bfv"`.
 *
 * # Examples
 * ```rust,ignore
 * # use sunscreen::{fhe_program, types::{bfv::Signed, Cipher}, Params, Context};
 *
 * #[fhe_program(scheme = "bfv")]
 * fn multiply_add(
 *   a: Cipher<Signed>,
 *   b: Cipher<Signed>,
 *   c: Cipher<Signed>
 * ) -> Cipher<Signed> {
 *   a * b + c
 * }
 * ```
 *
 * ```rust,ignore
 * # use sunscreen::{fhe_program, types::{bfv::Signed, Cipher}, Params, Context};
 *
 * #[fhe_program(scheme = "bfv")]
 * fn multi_out(
 *   a: Cipher<Signed>,
 *   b: Cipher<Signed>,
 *   c: Cipher<Signed>
 * ) -> (Cipher<Signed>, Cipher<Signed>) {
 *   (a + b, b + c)
 * }
 * ```
 */
pub fn fhe_program(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    fhe_program::fhe_program_impl(metadata, input)
}

#[proc_macro_attribute]
/**
 * Specifies a function to be a ZKP program. TODO: docs.
 */
pub fn zkp_program(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    zkp_program::zkp_program_impl(metadata, input)
}

#[proc_macro_attribute]
/**
 * Allows for debugging information.
 */
pub fn debug_program(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    debug_program::debug_program_impl(metadata, input)
}
