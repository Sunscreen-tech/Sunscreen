/**
 * This module contains build-in types you can use as inputs and outputs
 * from circuits using the BFV scheme.
 *
 * # BFV Scheme types
 * The BFV scheme is a good choice for exactly and quickly computing a small
 * number of simple operations.
 *
 * Plaintexts under the BFV scheme are polynomials with `N` terms, where
 * `N` is the `poly_degree` scheme paramter. This parameter is (by default)
 * automatically configured on circuit compilation based on its noise budget
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
 *
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
 * [`#[fhe_program]`](sunscreen_compiler_macros::circuit) macro.
 */
pub mod intern;

/**
 * Contains the set of ops traits that dictate legal operations
 * for FHE data types.
 */
mod ops;

use crate::types::ops::*;

pub use sunscreen_runtime::{
    BfvType, FheType, NumCiphertexts, TryFromPlaintext, TryIntoPlaintext, Type, TypeName,
    TypeNameInstance, Version,
};

/**
 * A trait that allows data types to swap_rows. E.g. [`Simd`](crate::types::bfv::Simd)
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
 * On SIMD types, returns the number of SIMD lanes.
 */
pub trait LaneCount {
    /**
     * The number of lanes.
     */
    fn lane_count() -> usize;
}

#[derive(Copy, Clone)]
/**
 * Declares a type T as being encrypted in a circuit.
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

trait Foo {}

impl<T> Foo for T where T: FheType {}
