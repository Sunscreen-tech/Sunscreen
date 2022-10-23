use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen;
use crate::error::*;

use serde::{Deserialize, Serialize};

/**
 * Represent an integer modulus of up to 61 bits. An instance of the Modulus
 * struct represents a non-negative integer modulus up to 61 bits. In particular,
 * the encryption parameter PlainModulus, and the primes in CoeffModulus, are
 * represented by instances of Modulus. The purpose of this class is to
 * perform and store the pre-computation required by Barrett reduction.
 *
 * A Modulus is immuatable from Rust once created.
*/
pub struct Modulus {
    handle: *mut c_void,
}

unsafe impl Sync for Modulus {}
unsafe impl Send for Modulus {}

impl std::fmt::Debug for Modulus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::result::Result<(), std::fmt::Error> {
        write!(f, "{}", self.value())
    }
}

impl PartialEq for Modulus {
    fn eq(&self, other: &Self) -> bool {
        self.value() == other.value()
    }
}

/**
 * Represents a standard security level according to the HomomorphicEncryption.org
 * security standard. The value SecLevelType.None signals that no standard
 * security level should be imposed. The value SecLevelType.TC128 provides
 * a very high level of security and is the default security level enforced by
 * Microsoft SEAL when constructing a SEALContext object. Normal users should not
 * have to specify the security level explicitly anywhere.
 */
#[derive(Debug, Copy, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[repr(i32)]
pub enum SecurityLevel {
    /// 128-bit security level according to HomomorphicEncryption.org standard.
    TC128 = 128,

    /// 192-bit security level according to HomomorphicEncryption.org standard.
    TC192 = 192,

    /// 256-bit security level according to HomomorphicEncryption.org standard.
    TC256 = 256,
}

impl TryFrom<i32> for SecurityLevel {
    type Error = Error;

    fn try_from(val: i32) -> Result<SecurityLevel> {
        Ok(match val {
            128 => SecurityLevel::TC128,
            192 => SecurityLevel::TC192,
            256 => SecurityLevel::TC256,
            _ => Err(Error::SerializationError(format!(
                "Invalid security level: {}",
                val
            )))?,
        })
    }
}

impl Into<i32> for SecurityLevel {
    fn into(self) -> i32 {
        match self {
            SecurityLevel::TC128 => 128,
            SecurityLevel::TC192 => 192,
            SecurityLevel::TC256 => 256,
        }
    }
}

impl Default for SecurityLevel {
    fn default() -> Self {
        Self::TC128
    }
}

/**
 * Assume the given handle is a modulus and construct a modulus out of it.
 *
 * If it isn't, using the returned modulus results in undefined
 * behavior.
 */
pub unsafe fn unchecked_from_handle(handle: *mut c_void) -> Modulus {
    Modulus { handle }
}

impl Modulus {
    /**
     * Creates a modulus from the given value.
     */
    pub fn new(value: u64) -> Result<Self> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe { bindgen::Modulus_Create1(value, &mut handle) })?;

        Ok(Modulus { handle })
    }

    /**
     * The value of the modulus
     */
    pub fn value(&self) -> u64 {
        let mut val: u64 = 0;

        convert_seal_error(unsafe { bindgen::Modulus_Value(self.handle, &mut val) })
            .expect("Internal error. Could not get modulus value.");

        val
    }

    /**
     * The handle to the internal SEAL Modulus object.
     */
    pub fn get_handle(&self) -> *mut c_void {
        self.handle
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

/**
 * This struct contains static methods for creating a coefficient modulus easily.
 * Note that while these functions take a SecLevelType argument, all security
 * guarantees are lost if the output is used with encryption parameters with
 * a mismatching value for the PolyModulusDegree.
 *
 * The default value SecLevelType.TC128 provides a very high level of security
 * and is the default security level enforced by Microsoft SEAL when constructing
 * a SEALContext object. Normal users should not have to specify the security
 * level explicitly anywhere.
 */
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

        let mut coefficients: Vec<*mut c_void> = Vec::with_capacity(bit_sizes.len());
        let coefficients_ptr = coefficients.as_mut_ptr() as *mut *mut c_void;

        convert_seal_error(unsafe {
            bindgen::CoeffModulus_Create1(degree, length, bit_sizes.as_mut_ptr(), coefficients_ptr)
        })?;

        unsafe { coefficients.set_len(length as usize) };

        Ok(coefficients
            .iter()
            .map(|h| Modulus { handle: *h })
            .collect())
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

        let mut coefficients: Vec<*mut c_void> = Vec::with_capacity(len as usize);
        let coefficients_ptr = coefficients.as_mut_ptr() as *mut *mut c_void;

        convert_seal_error(unsafe {
            bindgen::CoeffModulus_BFVDefault(
                degree,
                security_level as i32,
                &mut len,
                coefficients_ptr,
            )
        })?;

        unsafe { coefficients.set_len(len as usize) };

        Ok(coefficients
            .iter()
            .map(|handle| Modulus { handle: *handle })
            .collect())
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

/**
 * Methods for easily constructing plaintext modulus
 */
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

    /**
     * Creates a plain modulus with the given exact value. Batching will likely be
     * disabled.
     */
    pub fn raw(val: u64) -> Result<Modulus> {
        Modulus::new(val)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_create_plain_modulus() {
        let modulus = PlainModulus::batching(1024, 20).unwrap();

        assert_eq!(modulus.value(), 1038337);
    }

    #[test]
    fn can_create_default_coefficient_modulus() {
        let modulus = CoefficientModulus::bfv_default(1024, SecurityLevel::TC128).unwrap();

        assert_eq!(modulus.len(), 1);
        assert_eq!(modulus[0].value(), 132120577);

        let modulus = CoefficientModulus::bfv_default(1024, SecurityLevel::TC192).unwrap();

        assert_eq!(modulus.len(), 1);
        assert_eq!(modulus[0].value(), 520193);

        let modulus = CoefficientModulus::bfv_default(1024, SecurityLevel::TC256).unwrap();

        assert_eq!(modulus.len(), 1);
        assert_eq!(modulus[0].value(), 12289);
    }

    #[test]
    fn can_create_custom_coefficient_modulus() {
        let modulus = CoefficientModulus::create(8192, &[50, 30, 30, 50, 50]).unwrap();

        assert_eq!(modulus.len(), 5);
        assert_eq!(modulus[0].value(), 1125899905744897);
        assert_eq!(modulus[1].value(), 1073643521);
        assert_eq!(modulus[2].value(), 1073692673);
        assert_eq!(modulus[3].value(), 1125899906629633);
        assert_eq!(modulus[4].value(), 1125899906826241);
    }

    #[test]
    fn can_roundtrip_security_level() {
        for sec in [
            SecurityLevel::TC128,
            SecurityLevel::TC192,
            SecurityLevel::TC256,
        ] {
            let sec_2: i32 = sec.into();
            let sec_2 = SecurityLevel::try_from(sec_2).unwrap();

            assert_eq!(sec, sec_2);
        }
    }
}
