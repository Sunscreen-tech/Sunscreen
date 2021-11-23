use crate::error::*;
use crate::{Ciphertext, GaloisKeys, Plaintext, RelinearizationKeys};

/**
 * An interface for an evaluator.
 */
pub trait Evaluator {
    /**
     * Negates a ciphertext inplace.
     *  * `a` - the value to negate
     */
    fn negate_inplace(&self, a: &mut Ciphertext) -> Result<()>;

    /**
     * Negates a ciphertext into a new ciphertext.
     *  * `a` - the value to negate
     */
    fn negate(&self, a: &Ciphertext) -> Result<Ciphertext>;

    /**
     * Add `a` and `b` and store the result in `a`.
     * * `a` - the accumulator
     * * `b` - the added value
     */
    fn add_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()>;

    /**
     * Adds `a` and `b`.
     * * `a` - first operand
     * * `b` - second operand
     */
    fn add(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext>;

    /**
     * Performs an addition reduction of multiple ciphertexts packed into a slice.
     * * `a` - a slice of ciphertexts to sum.
     */
    fn add_many(&self, a: &[Ciphertext]) -> Result<Ciphertext>;

    /**
     * Performs an multiplication reduction of multiple ciphertexts packed into a slice. This
     * method creates a tree of multiplications with relinearization after each operation.
     * * `a` - a slice of ciphertexts to sum.
     * * `relin_keys` - the relinearization keys.
     */
    fn multiply_many(
        &self,
        a: &[Ciphertext],
        relin_keys: &RelinearizationKeys,
    ) -> Result<Ciphertext>;

    /**
     * Subtracts `b` from `a` and stores the result in `a`.
     * * `a` - the left operand and destination
     * * `b` - the right operand
     */
    fn sub_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()>;

    /**
     * Subtracts `b` from `a`.
     * * `a` - the left operand
     * * `b` - the right operand
     */
    fn sub(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext>;

    /**
     * Multiplies `a` and `b` and stores the result in `a`.
     * * `a` - the left operand and destination.
     * * `b` - the right operand.
     */
    fn multiply_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()>;

    /**
     * Multiplies `a` and `b`.
     * * `a` - the left operand.
     * * `b` - the right operand.
     */
    fn multiply(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext>;

    /**
     * Squares `a` and stores the result in `a`.
     * * `a` - the value to square.
     */
    fn square_inplace(&self, a: &mut Ciphertext) -> Result<()>;

    /**
     * Squares `a`.
     * * `a` - the value to square.
     */
    fn square(&self, a: &Ciphertext) -> Result<Ciphertext>;

    /**
     * Given a ciphertext encrypted modulo q_1...q_k, this function switches the modulus down to q_1...q_{k-1} and
     * stores the result in the destination parameter.
     *
     * # Remarks
     * In the BFV scheme if you've set up a coefficient modulus chain, this reduces the
     * number of bits needed to represent the ciphertext. This in turn speeds up operations.
     *
     * If you haven't set up a modulus chain, don't use this.
     *
     * TODO: what does this mean for CKKS?
     */
    fn mod_switch_to_next(&self, a: &Ciphertext) -> Result<Ciphertext>;

    /**
     * Given a ciphertext encrypted modulo q_1...q_k, this function switches the modulus down to q_1...q_{k-1} and
     * stores the result in the destination parameter. This does function does so in-place.
     *
     * # Remarks
     * In the BFV scheme if you've set up a coefficient modulus chain, this reduces the
     * number of bits needed to represent the ciphertext. This in turn speeds up operations.
     *
     * If you haven't set up a modulus chain, don't use this.
     *
     * TODO: what does this mean for CKKS?
     */
    fn mod_switch_to_next_inplace(&self, a: &Ciphertext) -> Result<()>;

    /**
     * Modulus switches an NTT transformed plaintext from modulo q_1...q_k down to modulo q_1...q_{k-1}.
     */
    fn mod_switch_to_next_plaintext(&self, a: &Plaintext) -> Result<Plaintext>;

    /**
     * Modulus switches an NTT transformed plaintext from modulo q_1...q_k down to modulo q_1...q_{k-1}.
     * This variant does so in-place.
     */
    fn mod_switch_to_next_inplace_plaintext(&self, a: &Plaintext) -> Result<()>;

    /**
     * This functions raises encrypted to a power and stores the result in the destination parameter. Dynamic
     * memory allocations in the process are allocated from the memory pool pointed to by the given
     * MemoryPoolHandle. The exponentiation is done in a depth-optimal order, and relinearization is performed
     * automatically after every multiplication in the process. In relinearization the given relinearization keys
     * are used.
     */
    fn exponentiate(
        &self,
        a: &Ciphertext,
        exponent: u64,
        relin_keys: &RelinearizationKeys,
    ) -> Result<Ciphertext>;

    /**
     * This functions raises encrypted to a power and stores the result in the destination parameter. Dynamic
     * memory allocations in the process are allocated from the memory pool pointed to by the given
     * MemoryPoolHandle. The exponentiation is done in a depth-optimal order, and relinearization is performed
     * automatically after every multiplication in the process. In relinearization the given relinearization keys
     * are used.
     */
    fn exponentiate_inplace(
        &self,
        a: &Ciphertext,
        exponent: u64,
        relin_keys: &RelinearizationKeys,
    ) -> Result<()>;

    /**
     * Adds a ciphertext and a plaintext.
     * * `a` - the ciphertext
     * * `b` - the plaintext
     */
    fn add_plain(&self, a: &Ciphertext, b: &Plaintext) -> Result<Ciphertext>;

    /**
     * Adds a ciphertext and a plaintext.
     * * `a` - the ciphertext
     * * `b` - the plaintext
     */
    fn add_plain_inplace(&self, a: &mut Ciphertext, b: &Plaintext) -> Result<()>;

    /**
     * Subtract a plaintext from a ciphertext.
     * * `a` - the ciphertext
     * * `b` - the plaintext
     */
    fn sub_plain(&self, a: &Ciphertext, b: &Plaintext) -> Result<Ciphertext>;

    /**
     * Subtract a plaintext from a ciphertext and store the result in the ciphertext.
     * * `a` - the ciphertext
     * * `b` - the plaintext
     */
    fn sub_plain_inplace(&self, a: &mut Ciphertext, b: &Plaintext) -> Result<()>;

    /**
     * Multiply a ciphertext by a plaintext.
     * * `a` - the ciphertext
     * * `b` - the plaintext
     */
    fn multiply_plain(&self, a: &Ciphertext, b: &Plaintext) -> Result<Ciphertext>;

    /**
     * Multiply a ciphertext by a plaintext and store in the ciphertext.
     * * `a` - the ciphertext
     * * `b` - the plaintext
     */
    fn multiply_plain_inplace(&self, a: &mut Ciphertext, b: &Plaintext) -> Result<()>;

    /**
     * This functions relinearizes a ciphertext in-place, reducing it to 2 polynomials. This
     * reduces future noise growth under multiplication operations.
     */
    fn relinearize_inplace(
        &self,
        a: &mut Ciphertext,
        relin_keys: &RelinearizationKeys,
    ) -> Result<()>;

    /**
     * This functions relinearizes a ciphertext, reducing it to 2 polynomials. This
     * reduces future noise growth under multiplication operations.
     */
    fn relinearize(&self, a: &Ciphertext, relin_keys: &RelinearizationKeys) -> Result<Ciphertext>;

    /**
     * Rotates plaintext matrix rows cyclically.
     *
     * When batching is used with the BFV scheme, this function rotates the encrypted plaintext matrix rows
     * cyclically to the left (steps > 0) or to the right (steps < 0). Since the size of the batched matrix
     * is 2-by-(N/2), where N is the degree of the polynomial modulus, the number of steps to rotate must have
     * absolute value at most N/2-1.
     *
     * * `a` - The ciphertext to rotate
     * * `steps` - The number of steps to rotate (positive left, negative right)
     * * `galois_keys` - The Galois keys
     */
    fn rotate_rows(
        &self,
        a: &Ciphertext,
        steps: i32,
        galois_keys: &GaloisKeys,
    ) -> Result<Ciphertext>;

    /**
     * Rotates plaintext matrix rows cyclically. This variant does so in-place
     *
     * When batching is used with the BFV scheme, this function rotates the encrypted plaintext matrix rows
     * cyclically to the left (steps &gt; 0) or to the right (steps &lt; 0). Since the size of the batched matrix
     * is 2-by-(N/2), where N is the degree of the polynomial modulus, the number of steps to rotate must have
     * absolute value at most N/2-1.
     *
     * * `a` - The ciphertext to rotate
     * * `steps` - The number of steps to rotate (positive left, negative right)
     * * `galois_keys` - The Galois keys
     */
    fn rotate_rows_inplace(
        &self,
        a: &Ciphertext,
        steps: i32,
        galois_keys: &GaloisKeys,
    ) -> Result<()>;

    /**
     * Rotates plaintext matrix columns cyclically.
     *
     * When batching is used with the BFV scheme, this function rotates the encrypted plaintext matrix columns
     * cyclically. Since the size of the batched matrix is 2-by-(N/2), where N is the degree of the polynomial
     * modulus, this means simply swapping the two rows. Dynamic memory allocations in the process are allocated
     * from the memory pool pointed to by the given MemoryPoolHandle.
     *
     * * `encrypted` - The ciphertext to rotate
     * * `galoisKeys` - The Galois keys
     */
    fn rotate_columns(&self, a: &Ciphertext, galois_keys: &GaloisKeys) -> Result<Ciphertext>;

    /**
     * Rotates plaintext matrix columns cyclically. This variant does so in-place.
     *
     * When batching is used with the BFV scheme, this function rotates the encrypted plaintext matrix columns
     * cyclically. Since the size of the batched matrix is 2-by-(N/2), where N is the degree of the polynomial
     * modulus, this means simply swapping the two rows. Dynamic memory allocations in the process are allocated
     * from the memory pool pointed to by the given MemoryPoolHandle.
     *
     * * `encrypted` - The ciphertext to rotate
     * * `galoisKeys` - The Galois keys
     */
    fn rotate_columns_inplace(&self, a: &Ciphertext, galois_keys: &GaloisKeys) -> Result<()>;
}
