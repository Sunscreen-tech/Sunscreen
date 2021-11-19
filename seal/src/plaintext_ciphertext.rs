use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen;
use crate::error::*;

/**
 * Class to store a plaintext element. The data for the plaintext is
 * a polynomial with coefficients modulo the plaintext modulus. The degree
 * of the plaintext polynomial must be one less than the degree of the
 * polynomial modulus. The backing array always allocates one 64-bit word
 * per each coefficient of the polynomial.
 *
 * # Memory Management
 * The coefficient count of a plaintext refers to the number of word-size
 * coefficients in the plaintext, whereas its capacity refers to the number
 * of word-size coefficients that fit in the current memory allocation. In
 * high-performance applications unnecessary re-allocations should be avoided
 * by reserving enough memory for the plaintext to begin with either by
 * providing the desired capacity to the constructor as an extra argument, or
 * by calling the reserve function at any time.
 *
 * When the scheme is SchemeType.BFV each coefficient of a plaintext is
 * a 64-bit word, but when the scheme is SchemeType.CKKS the plaintext is
 * by default stored in an NTT transformed form with respect to each of the
 * primes in the coefficient modulus. Thus, the size of the allocation that
 * is needed is the size of the coefficient modulus (number of primes) times
 * the degree of the polynomial modulus. In addition, a valid CKKS plaintext
 * will also store the ParmsId for the corresponding encryption parameters.
 */
pub struct Plaintext {
    handle: *mut c_void,
}

unsafe impl Sync for Plaintext {}
unsafe impl Send for Plaintext {}

impl Plaintext {
    /**
     * Returns the handle to the underlying SEAL object.
     */
    pub fn get_handle(&self) -> *mut c_void {
        self.handle
    }

    /**
     * Constructs an empty ciphertext allocating no memory.
     */
    pub fn new() -> Result<Self> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe { bindgen::Plaintext_Create1(null_mut(), &mut handle) })?;

        Ok(Self { handle })
    }
}

impl Drop for Plaintext {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::Plaintext_Destroy(self.handle) })
            .expect("Internal error in Plaintext::drop.");
    }
}

/**
 * Class to store a ciphertext element. The data for a ciphertext consists
 * of two or more polynomials, which are in Microsoft SEAL stored in a CRT
 * form with respect to the factors of the coefficient modulus. This data
 * itself is not meant to be modified directly by the user, but is instead
 * operated on by functions in the Evaluator class. The size of the backing
 * array of a ciphertext depends on the encryption parameters and the size
 * of the ciphertext (at least 2). If the PolyModulusDegree encryption
 * parameter is N, and the number of primes in the CoeffModulus encryption
 * parameter is K, then the ciphertext backing array requires precisely
 * 8*N*K*size bytes of memory. A ciphertext also carries with it the
 * parmsId of its associated encryption parameters, which is used to check
 * the validity of the ciphertext for homomorphic operations and decryption.
 *
 * # Memory Management
 * The size of a ciphertext refers to the number of polynomials it contains,
 * whereas its capacity refers to the number of polynomials that fit in the
 * current memory allocation. In high-performance applications unnecessary
 * re-allocations should be avoided by reserving enough memory for the
 * ciphertext to begin with either by providing the desired capacity to the
 * constructor as an extra argument, or by calling the reserve function at
 * any time.
 */
pub struct Ciphertext {
    handle: *mut c_void,
}

unsafe impl Sync for Ciphertext {}
unsafe impl Send for Ciphertext {}

impl Clone for Ciphertext {
    fn clone(&self) -> Self {
        let mut handle = null_mut();

        convert_seal_error(unsafe { bindgen::Ciphertext_Create2(self.handle, &mut handle) })
            .expect("Fatal error: Failed to clone ciphertext");

        Self { handle }
    }
}

impl Ciphertext {
    /**
     * Returns the handle to the underlying SEAL object.
     */
    pub fn get_handle(&self) -> *mut c_void {
        self.handle
    }

    /**
     * Creates a new empty plaintext. Use an encoder to populate with a value.
     */
    pub fn new() -> Result<Self> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe { bindgen::Ciphertext_Create1(null_mut(), &mut handle) })?;

        Ok(Self { handle })
    }
}

impl Drop for Ciphertext {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::Ciphertext_Destroy(self.handle) })
            .expect("Internal error in Ciphertext::drop");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_create_and_destroy_ciphertext() {
        let ciphertext = Ciphertext::new().unwrap();

        std::mem::drop(ciphertext);
    }

    #[test]
    fn can_create_and_destroy_plaintext() {
        let plaintext = Plaintext::new().unwrap();

        std::mem::drop(plaintext);
    }
}
