use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen;
use crate::error::*;

pub struct Modulus {
    handle: *mut c_void,
}

/**
 * Represents a standard security level according to the HomomorphicEncryption.org
 * security standard. The value SecLevelType.None signals that no standard
 * security level should be imposed. The value SecLevelType.TC128 provides
 * a very high level of security and is the default security level enforced by
 * Microsoft SEAL when constructing a SEALContext object. Normal users should not
 * have to specify the security level explicitly anywhere.
 */
#[derive(Debug, Copy, Clone)]
#[repr(i32)]
pub enum SecurityLevel {
    /// 128-bit security level according to HomomorphicEncryption.org standard.
    TC128 = 128,

    /// 192-bit security level according to HomomorphicEncryption.org standard.
    TC192 = 192,

    /// 256-bit security level according to HomomorphicEncryption.org standard.
    TC256 = 256,
}

impl Default for SecurityLevel {
    fn default() -> Self {
        Self::TC128
    }
}

impl Modulus {
    fn new(value: u64) -> Result<Self> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe { bindgen::Modulus_Create1(value, &mut handle) })?;

        Ok(Modulus { handle })
    }
}

impl Drop for Modulus {
    fn drop(&mut self) {
        unsafe {
            bindgen::Modulus_Destroy(self.handle);
        }
    }
}

impl Clone for Modulus {
    fn clone(&self) -> Self {
        let mut copy = null_mut();

        unsafe {
            convert_seal_error(bindgen::Modulus_Create2(self.handle, &mut copy))
                .expect("Failed to clone modulus")
        };

        Self { handle: copy }
    }
}

pub struct CoefficientModulus;

impl CoefficientModulus {
    /**
     * Returns a custom coefficient modulus suitable for use with the specified
     * PolyModulusDegree.The return value will be a vector consisting of
     * Modulus elements representing distinct prime numbers of bit-lengths
     * as given in the bitSizes parameter. The bit sizes of the prime numbers
     * can be at most 60 bits.     
     */
    pub fn create(degree: u64, bit_sizes: &[i32]) -> Result<Vec<Modulus>> {
        let mut bit_sizes = bit_sizes.to_owned();
        let length = bit_sizes.len() as u64;
        let mut coefficients_arr_ptr: *mut c_void = null_mut();

        convert_seal_error(unsafe {
            bindgen::CoeffModulus_Create(
                degree,
                length,
                bit_sizes.as_mut_ptr(),
                &mut coefficients_arr_ptr,
            )
        })?;

        Ok(unsafe {
            std::slice::from_raw_parts(coefficients_arr_ptr as *const u64, length as usize)
        }
        .into_iter()
        .map(|m| Modulus::new(*m))
        .collect::<Result<Vec<Modulus>>>()?)
    }

    /**
     * Returns a default coefficient modulus for the BFV scheme that guarantees
     * a given security level when using a given PolyModulusDegree, according
     * to the HomomorphicEncryption.org security standard. Note that all security
     * guarantees are lost if the output is used with encryption parameters with
     * a mismatching value for the PolyModulusDegree.
     *
     * The coefficient modulus returned by this function will not perform well
     * if used with the CKKS scheme.
     */
    pub fn bfv_default(degree: u64, security_level: SecurityLevel) -> Result<Vec<Modulus>> {
        let mut len: u64 = 0;

        convert_seal_error(unsafe {
            bindgen::CoeffModulus_BFVDefault(degree, security_level as i32, &mut len, null_mut())
        })?;

        let mut coefficients = vec![0; len as usize];
        let mut coefficients_ptr = coefficients.as_mut_ptr() as *mut c_void;

        convert_seal_error(unsafe {
            bindgen::CoeffModulus_BFVDefault(
                degree,
                security_level as i32,
                &mut len,
                &mut coefficients_ptr,
            )
        })?;

        Ok(coefficients
            .iter()
            .map(|m| Modulus::new(*m))
            .collect::<Result<Vec<Modulus>>>()?)
    }

    /**
     * Returns the largest bit-length of the coefficient modulus, i.e., bit-length
     * of the product of the primes in the coefficient modulus, that guarantees
     * a given security level when using a given PolyModulusDegree, according
     * to the HomomorphicEncryption.org security standard.
     */
    pub fn max_bit_count(degree: u64, security_level: SecurityLevel) -> u32 {
        let mut bits: i32 = 0;

        unsafe { bindgen::CoeffModulus_MaxBitCount(degree, security_level as i32, &mut bits) };

        assert_eq!(bits > 0, true);

        bits as u32
    }
}

pub struct PlainModulus;

impl PlainModulus {
    /**
     * Creates a prime number Modulus for use as PlainModulus encryption
     * parameter that supports batching with a given PolyModulusDegree.
     */
    pub fn batching(degree: u64, bit_size: u32) -> Result<Modulus> {
        let bit_sizes = vec![bit_size as i32];

        let modulus_chain = CoefficientModulus::create(degree, bit_sizes.as_slice())?;

        Ok(modulus_chain.first().ok_or(Error::Unexpected)?.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_create_plain_modulus() {
        assert_eq!(PlainModulus::batching(1024, 20).is_ok(), true);
    }
}
