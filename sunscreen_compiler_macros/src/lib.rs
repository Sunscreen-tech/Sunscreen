#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]
#![recursion_limit = "128"]

//! This crate contains macros to support the sunscreen compiler.

extern crate proc_macro;

mod circuit;
mod error;
mod internals;
mod type_name;

#[proc_macro_derive(TypeName)]
/**
 * Allows you to `#[derive(Typename)]`.
 */
pub fn derive_typename(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    type_name::derive_typename(input)
}

#[proc_macro_attribute]
/**
 * Specifies a function to be a circuit. A circuit has any number of inputs that impl the
 * `FheType` trait and returns either a single type implementing `FheType` or a tuple of
 * types implementing `FheType`.
 *
 * This function gets run by the compiler to build up the circuit you specify and does not
 * directly or eagerly perform homomorphic operations.
 *
 * # Parameters
 * * `scheme` (required): Designates the scheme this circuit uses. Today, this must be `"bfv"`.
 *
 * # Examples
 * ```rust
 * # use sunscreen_compiler::{circuit, types::{Cipher, Unsigned}, Params, Context};
 *
 * #[circuit(scheme = "bfv")]
 * fn multiply_add(
 *   a: Cipher<Unsigned>,
 *   b: Cipher<Unsigned>,
 *   c: Cipher<Unsigned>
 * ) -> Cipher<Unsigned> {
 *   a * b + c
 * }
 * ```
 *
 * ```rust
 * # use sunscreen_compiler::{circuit, types::{Cipher, Unsigned}, Params, Context};
 *
 * #[circuit(scheme = "bfv")]
 * fn multi_out(
 *   a: Cipher<Unsigned>,
 *   b: Cipher<Unsigned>,
 *   c: Cipher<Unsigned>
 * ) -> (Cipher<Unsigned>, Cipher<Unsigned>) {
 *   (a + b, b + c)
 * }
 * ```
 */
pub fn circuit(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    circuit::circuit_impl(metadata, input)
}
