#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]
#![recursion_limit = "128"]

//! This crate contains macros to support the sunscreen compiler.

extern crate proc_macro;

mod circuit;
mod decrypt;
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
 * # use sunscreen_compiler::{circuit, types::Unsigned, Params, Context};
 *
 * #[circuit(scheme = "bfv")]
 * fn multiply_add(a: Unsigned, b: Unsigned, c: Unsigned) -> Unsigned {
 *   a * b + c
 * }
 * ```
 *
 * ```rust
 * # use sunscreen_compiler::{circuit, types::Unsigned, Params, Context};
 *
 * #[circuit(scheme = "bfv")]
 * fn multi_out(a: Unsigned, b: Unsigned, c: Unsigned) -> (Unsigned, Unsigned) {
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

#[proc_macro]
/**
 * Decrypts an output parameter set using the given runtime. The first argument
 * to this macro is an identifier to a runtime. The second argument is the identifier
 * of the return bundle to decrypt. 3rd-Nth arguments are the expected return types
 * from the circuit, in order. The macro returns a `Result<sunscreen_compiler::Error>`.
 * 
 * # Remarks
 * This macro validates the given types against the circuit's return interface
 * for correctness, then decrypts each item. If successful, this macro returns
 * an Ok(T) where T is:
 * * The unit type `()` if the circuit returned nothing.
 * * The single argument matching the lone type parameter
 * if the circuit returns one argument.
 * * A tuple of composed of the types passed to the macro if the circuit returns
 * more than one argument.
 * 
 * The types passed in arguments 3-N must exactly match those in the return interface
 * of the circuit. Circuits that return nothing, while useless, are legal. In this case,
 * you should only pass the first two arguments. In the event of failure, this function
 * returns the underlying issue.
 */
pub fn decrypt(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    decrypt::decrypt_impl(input)
}