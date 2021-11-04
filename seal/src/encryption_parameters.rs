use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen::{self};
use crate::Modulus;

use crate::error::{convert_seal_error, Error};

/**
 * The FHE scheme supported by SEAL.
 */
#[repr(u8)]
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub enum SchemeType {
    /// None. Don't use this.
    None = 0x0,

    /// Brakerski/Fan-Vercauteren scheme
    Bfv = 0x1,

    /// Cheon-Kim-Kim-Song scheme
    Ckks = 0x2,
}

impl SchemeType {
    fn from_u8(val: u8) -> Self {
        match val {
            0x0 => SchemeType::None,
            0x1 => SchemeType::Bfv,
            0x2 => SchemeType::Ckks,
            _ => panic!("Illegal scheme type"),
        }
    }
}

/**
 * An immutable collection of parameters that defines an encryption scheme.
 * Use either the CKKSBuilder or BFVBuilder to create one of these. Once created,
 * these objects are effectively immutable.
 * 
 * Picking appropriate encryption parameters is essential to enable a particular
 * application while balancing performance and security. Some encryption settings
 * will not allow some inputs (e.g. attempting to encrypt a polynomial with more
 * coefficients than PolyModulus or larger coefficients than PlainModulus) or
 * support the desired computations (with noise growing too fast due to too large
 * PlainModulus and too small CoeffModulus).
 * 
 * The EncryptionParameters class maintains at all times a 256-bit hash of the
 * currently set encryption parameters called the ParmsId. This hash acts as
 * a unique identifier of the encryption parameters and is used by all further
 * objects created for these encryption parameters. The ParmsId is not intended
 * to be directly modified by the user but is used internally for pre-computation
 * data lookup and input validity checks. In modulus switching the user can use
 * the ParmsId to keep track of the chain of encryption parameters. The ParmsId is
 * not exposed in the public API of EncryptionParameters, but can be accessed
 * through the <see cref="SEALContext.ContextData" /> class once the SEALContext
 * has been created.
 * 
 * Choosing inappropriate encryption parameters may lead to an encryption scheme
 * that is not secure, does not perform well, and/or does not support the input
 * and computation of the desired application. We highly recommend consulting an
 * expert in RLWE-based encryption when selecting parameters, as this is where
 * inexperienced users seem to most often make critical mistakes.
 */
pub struct EncryptionParameters {
    handle: *mut c_void,
}

impl EncryptionParameters {
    fn new(scheme: SchemeType) -> Result<Self, Error> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe { bindgen::EncParams_Create1(scheme as u8, &mut handle) })?;

        Ok(Self { handle })
    }

    /**
     * Returns the polynomial degree of the underlying CKKS or BFV scheme.
     */
    pub fn get_poly_modulus_degree(&self) -> u64 {
        let mut degree: u64 = 0;

        unsafe {
            convert_seal_error(bindgen::EncParams_GetPolyModulusDegree(
                self.handle,
                &mut degree,
            ))
            .expect("Internal error");
        };

        degree
    }
    
    /**
     * Get the underlying scheme.
     */
    pub fn get_scheme(&self) -> SchemeType {
        let mut scheme: u8 = 0;

        unsafe {
            convert_seal_error(bindgen::EncParams_GetScheme(
                self.handle,
                &mut scheme,
            ))
            .expect("Internal error");
        };

        SchemeType::from_u8(scheme)
    }
}

enum CoefficientModulusType {
    NotSet,
    Modulus(Vec<Modulus>),
}

enum PlainModulusType {
    NotSet,
    Constant(u64),
    ModulusArray(Vec<Modulus>),
}

/**
 * Represents a builder that sets up and creates encryption scheme parameters. 
 * The parameters (most importantly PolyModulus, CoeffModulus, PlainModulus) 
 * significantly affect the performance, capabilities, and security of the 
 * encryption scheme.
 * 
 */
pub struct BfvEncryptionParametersBuilder {
    poly_modulus_degree: Option<u64>,
    coefficient_modulus: CoefficientModulusType,
    plain_modulus: PlainModulusType,
}

impl BfvEncryptionParametersBuilder {
    /**
     * Creates a new builder.
     */
    pub fn new() -> Self {
        Self {
            poly_modulus_degree: None,
            coefficient_modulus: CoefficientModulusType::NotSet,
            plain_modulus: PlainModulusType::NotSet,
        }
    }

    /**
     * Set the degree of the polynomial used in the BFV scheme. Genrally,
     * larger values provide more security and noise margin at the expense
     * of performance. 
     */ 
    pub fn set_poly_modulus_degree(mut self, degree: u64) -> Self {
        self.poly_modulus_degree = Some(degree);
        self
    }

    /**
     * Sets the coefficient modulus parameter. The coefficient modulus consists
     * of a list of distinct prime numbers, and is represented by a vector of
     * Modulus objects. The coefficient modulus directly affects the size
     * of ciphertext elements, the amount of computation that the scheme can
     * perform (bigger is better), and the security level (bigger is worse). In
     * Microsoft SEAL each of the prime numbers in the coefficient modulus must
     * be at most 60 bits, and must be congruent to 1 modulo 2*poly_modulus_degree.
     */
    pub fn set_coefficient_modulus(mut self, modulus: Vec<Modulus>) -> Self {
        self.coefficient_modulus = CoefficientModulusType::Modulus(modulus);
        self
    }

    /**
     * Set the plaintext modulus to a fixed size. Not recommended.
     * Ideally, create a PlainModulus to set up batching and call
     * set_plain_modulus.
     */
    pub fn set_plain_modulus_u64(mut self, modulus: u64) -> Self {
        self.plain_modulus = PlainModulusType::Constant(modulus);
        self
    }

    /**
     * Validate the parameter choices and return the encryption parameters.
     */
    pub fn build(self) -> Result<EncryptionParameters, Error> {
        let params = EncryptionParameters::new(SchemeType::Bfv)?;

        convert_seal_error(unsafe {
            bindgen::EncParams_SetPolyModulusDegree(
                params.handle,
                self.poly_modulus_degree.ok_or(Error::DegreeNotSet)?,
            )
        })?;

        match self.coefficient_modulus {
            CoefficientModulusType::NotSet => return Err(Error::CoefficientModulusNotSet),
            CoefficientModulusType::Modulus(mut m) => {
                convert_seal_error(unsafe {
                    let mut modulus_ptr = m.as_mut_ptr() as *mut c_void;
                    bindgen::EncParams_SetCoeffModulus(
                        params.handle,
                        m.len() as u64,
                        &mut modulus_ptr,
                    )
                })?;
            }
        };

        match self.plain_modulus {
            PlainModulusType::NotSet => return Err(Error::PlainModulusNotSet),
            PlainModulusType::Constant(p) => {
                convert_seal_error(unsafe {
                    bindgen::EncParams_SetPlainModulus2(params.handle, p)
                })?;
            }
            PlainModulusType::ModulusArray(mut a) => {
                convert_seal_error(unsafe {
                    bindgen::EncParams_SetPlainModulus1(params.handle, a.as_mut_ptr() as *mut c_void)
                })?;
            }
        };

        Ok(params)
    }
}

impl Drop for EncryptionParameters {
    fn drop(&mut self) {
        unsafe { bindgen::EncParams_Destroy(self.handle) };
    }
}

#[cfg(test)]
mod tests {
    use crate::CoefficientModulus;
    use crate::*;

    #[test]
    fn can_build_params() {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(1024)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(1024, SecurityLevel::default()).unwrap(),
            )
            .set_plain_modulus_u64(1234)
            .build()
            .unwrap();

        assert_eq!(params.get_poly_modulus_degree(), 1024);
        assert_eq!(params.get_scheme(), SchemeType::Bfv);
    }
}
