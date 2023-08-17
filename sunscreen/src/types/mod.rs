/**
 * This module contains build-in types you can use as inputs and outputs
 * from FHE programs using the BFV scheme.
 *
 * # BFV Scheme types
 * The BFV scheme is a good choice for exactly and quickly computing a small
 * number of simple operations.
 *
 * Plaintexts under the BFV scheme are polynomials with `N` terms, where
 * `N` is the `poly_degree` scheme paramter. This parameter is (by default)
 * automatically configured during FHE program compilation based on its noise budget
 * requirements. Addition and multiplication imply adding and multiplying
 * polynomials.
 *
 * However, working with polynomials directly is difficult, so Sunscreen
 * provides types that transparently encode data you might actually want
 * to use into and out of polynomials. These include:
 * * The [`Signed`](crate::types::bfv::Signed) type represents a signed integer that
 * encodes a binary value decomposed into a number of digits. This encoding
 * allows for somewhat efficiently representing integers, but has unusual
 * overflow semantics developers need to understand. This type supports
 * addition, subtraction, multiplication, and negation.
 * * The [`Fractional`](crate::types::bfv::Fractional) type is a quasi fixed-point
 * value. It allows you to homomorphically compute decimal values as
 * efficiently as the [`Signed`](crate::types::bfv::Signed) type. This type has complex overflow
 * conditions. This type intrinsically supports homomorphic addition
 * multiplication, and negation. Dividing by an [`f64`] constant is supported.
 * Dividing by ciphertext is not possible.
 * * The [`Rational`](crate::types::bfv::Rational) type allows quasi fixed-point
 * representation. This type interally uses 2 ciphertexts, and is thus requires
 * twice as much space as other types. Its overflow semantics are effectively
 * those of two [`Signed`](crate::types::bfv::Signed) values. However, this type is
 * less efficient than [`Fractional`](crate::types::bfv::Fractional), as it
 * requires 2 multiplications for addition and subtraction. Unlike other types,
 * [`Rational`](crate::types::bfv::Rational) supports ciphertext-ciphertext
 * division.
 * * The [`Batched`](crate::types::bfv::Batched) type packs thousands of signed integers
 * into lanes by exploiting the Chinese remainder theorem for cyclotomic polynomials.
 * Arithmetic operations semantically execute per-lane, enabling high-throughput;
 * e.g. a single addition operation `a + b` will element-wise add the many lanes of a to the
 * many lanes in b.
 * Type comparison:
 *
 * | Type       | # ciphertexts | overflow conditions | values            | ops/add        | ops/mul | ops/sub        | ops/neg | ops/div |
 * |------------|---------------|---------------------|-------------------|----------------|---------|----------------|---------|---------|
 * | Signed     | 1             | moderate            | signed integral   | 1 add          | 1 mul   | 1 sub          | 1 neg   | -       |
 * | Fractional | 1             | complex             | signed decimal    | 1 add          | 1 mul   | 1 sub          | 1 neg   | 1 mul*  |
 * | Rational   | 2             | moderate            | signed decimal    | 2 muls + 1 sub | 2 muls  | 2 muls + 1 sub | 1 neg   | 2 muls  |
 *
 * `* Division by constant only.`
 *
 * The set of feasible computations under FHE with BFV is fairly limited. For
 * example, comparisons, modulus, transcendentals, are generally very difficult
 * and are often infeasible depending on scheme parameters and noise budget.
 * One can sometimes *approximate* operations using Lagrange interpolation.
 */
pub mod bfv;

/**
 * This module contains implementation details used to support
 * Sunscreen's domain specific language under the
 * [`#[fhe_program]`](crate::fhe_program) macro.
 */
pub mod intern;

/**
 * Contains the set of ops traits that dictate legal operations
 * for FHE data types.
 */
mod ops;

/**
 * Contains types used in creating zero-knowledge proof R1CS circuits.
 */
pub mod zkp;

use crate::types::ops::*;

pub use sunscreen_runtime::{
    BfvType, FheType, NumCiphertexts, TryFromPlaintext, TryIntoPlaintext, Type, TypeName,
    TypeNameInstance, Version,
};

/**
 * A trait that allows data types to swap_rows. E.g. [`Batched`](crate::types::bfv::Batched)
 */
pub trait SwapRows {
    /**
     * The result type. Typically, this should just be `Self`.
     */
    type Output;

    /**
     * Performs a row swap.
     */
    fn swap_rows(self) -> Self::Output;
}

/**
 * On Batched types, returns the number of Batched lanes.
 */
pub trait LaneCount {
    /**
     * The number of lanes.
     */
    fn lane_count() -> usize;
}

#[derive(Copy, Clone, Debug)]
/**
 * Declares a type T as being encrypted in an [`fhe_program`](crate::fhe_program).
 */
pub struct Cipher<T>
where
    T: FheType,
{
    _val: T,
}

impl<T> NumCiphertexts for Cipher<T>
where
    T: FheType,
{
    const NUM_CIPHERTEXTS: usize = T::NUM_CIPHERTEXTS;
}

impl<T> TypeName for Cipher<T>
where
    T: FheType + TypeName,
{
    fn type_name() -> Type {
        Type {
            is_encrypted: true,
            ..T::type_name()
        }
    }
}

/// Creates new FHE variables from literals.
///
/// Note that literals can be used directly in arithmetic operations with ciphertexts:
///
/// ```
/// # use sunscreen::{fhe_program, types::{Cipher, bfv::Signed}};
/// #[fhe_program(scheme = "bfv")]
/// fn add_ten(a: Cipher<Signed>) -> Cipher<Signed> {
///     a + 10
/// }
/// ````
///
/// But if you want to define a variable that starts as a literal and later takes on a ciphertext
/// value, this won't work:
///
/// ```compile_fail
/// # use sunscreen::{fhe_program, types::{Cipher, bfv::Signed}};
/// #[fhe_program(scheme = "bfv")]
/// fn add_ten(a: Cipher<Signed>) -> Cipher<Signed> {
///     let sum = 10;
///     sum = sum + a;
///     sum
/// }
/// ```
///
/// This is because the literal `0` won't have the correct [`Cipher`] type. Instead, you can use
/// this macro:
///
/// ```
/// # use sunscreen::{fhe_var, fhe_program, types::{Cipher, bfv::Signed}};
/// #[fhe_program(scheme = "bfv")]
/// fn add_ten(a: Cipher<Signed>) -> Cipher<Signed> {
///     let mut sum = fhe_var!(10);
///     sum = sum + a;
///     sum
/// }
/// ```
///
/// You can also create arrays of variables:
///
/// ```
/// # use sunscreen::{fhe_var, fhe_program, types::{Cipher, bfv::Signed}};
/// #[fhe_program(scheme = "bfv")]
/// fn add_ten(arrs: [[Cipher<Signed>; 10]; 10]) {
///     let mut sum = fhe_var![0; 10];
///     for i in 0..10 {
///         for x in arrs[i] {
///             sum[i] = sum[i] + x;
///         }
///     }
/// }
/// ```
#[macro_export]
macro_rules! fhe_var {
    ($elem:expr) => (
        $crate::types::intern::fhe_node($elem)
    );
    ($elem:expr; $n:expr) => (
        [$crate::types::intern::fhe_node($elem); $n]
    );
    ($($elem:expr),+ $(,)?) => (
        [$($crate::types::intern::fhe_node($elem)),+]
    );
}

/// Creates new ZKP variables from literals.
///
/// ```
/// # use sunscreen::{zkp_var, zkp_program, types::zkp::{Field, FieldSpec}};
/// #[zkp_program]
/// fn equals_ten<F: FieldSpec>(a: Field<F>) {
///     let ten = zkp_var!(10);
///     a.constrain_eq(ten);
/// }
/// ```
///
/// You can also create arrays of variables:
///
/// ```
/// # use sunscreen::{zkp_var, zkp_program, types::zkp::{Field, FieldSpec}};
/// #[zkp_program]
/// fn equals_ten<F: FieldSpec>(a: Field<F>) {
///     let tens = zkp_var![10, 10, 10];
///     for ten in tens {
///         a.constrain_eq(ten);
///     }
/// }
/// ```
#[macro_export]
macro_rules! zkp_var {
    ($elem:expr) => (
        $crate::types::zkp::zkp_node($elem)
    );
    ($elem:expr; $n:expr) => (
        [$crate::types::zkp::zkp_node($elem); $n]
    );
    ($($elem:expr),+ $(,)?) => (
        [$($crate::types::zkp::zkp_node($elem)),+]
    );
}
