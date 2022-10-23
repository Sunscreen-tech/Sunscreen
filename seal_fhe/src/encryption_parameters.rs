use std::ffi::c_void;
use std::mem::forget;
use std::ptr::null_mut;

use crate::bindgen::{self};
use crate::error::{convert_seal_error, Error};
use crate::modulus::unchecked_from_handle;
use crate::Modulus;

use serde::{Deserialize, Serialize};

/**
 * The FHE scheme supported by SEAL.
 */
#[repr(u8)]
#[derive(Debug, Copy, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

unsafe impl Sync for EncryptionParameters {}
unsafe impl Send for EncryptionParameters {}

impl EncryptionParameters {
    fn new(scheme: SchemeType) -> Result<Self, Error> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe { bindgen::EncParams_Create1(scheme as u8, &mut handle) })?;

        Ok(Self { handle })
    }

    /**
     * Returns the handle to the underlying SEAL object.
     */
    pub fn get_handle(&self) -> *mut c_void {
        self.handle
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
            convert_seal_error(bindgen::EncParams_GetScheme(self.handle, &mut scheme))
                .expect("Internal error");
        };

        SchemeType::from_u8(scheme)
    }

    /**
     * Returns the plain text modulus for the encryption scheme.
     */
    pub fn get_plain_modulus(&self) -> Modulus {
        let mut borrowed_modulus = null_mut();

        unsafe {
            convert_seal_error(bindgen::EncParams_GetPlainModulus(
                self.handle,
                &mut borrowed_modulus,
            ))
            .expect("Internal error")
        };

        let borrowed_modulus = unsafe { unchecked_from_handle(borrowed_modulus) };

        // We don't own the modulus we were given, so copy one we do own
        // and don't drop the old one.
        let ret = borrowed_modulus.clone();
        forget(borrowed_modulus);

        ret
    }

    /**
     * Returns the coefficient modulus for the encryption scheme.
     */
    pub fn get_coefficient_modulus(&self) -> Vec<Modulus> {
        let mut len: u64 = 0;

        unsafe {
            convert_seal_error(bindgen::EncParams_GetCoeffModulus(
                self.handle,
                &mut len,
                null_mut(),
            ))
            .expect("Internal error")
        };

        let mut borrowed_modulus = Vec::with_capacity(len as usize);
        let borrowed_modulus_ptr = borrowed_modulus.as_mut_ptr() as *mut *mut c_void;

        unsafe {
            convert_seal_error(bindgen::EncParams_GetCoeffModulus(
                self.handle,
                &mut len,
                borrowed_modulus_ptr,
            ))
            .expect("Internal error");

            borrowed_modulus.set_len(len as usize);
        };

        borrowed_modulus
            .iter()
            .map(|h| {
                let modulus = unsafe { unchecked_from_handle(*h) };
                let ret = modulus.clone();

                forget(modulus);

                ret
            })
            .collect()
    }
}

enum CoefficientModulusType {
    NotSet,
    Modulus(Vec<Modulus>),
}

enum PlainModulusType {
    NotSet,
    Constant(u64),
    Modulus(Modulus),
}

/**
 * Represents a builder that sets up and creates encryption scheme parameters.
 * The parameters (most importantly PolyModulus, CoeffModulus, PlainModulus)
 * significantly affect the performance, capabilities, and security of the
 * encryption scheme.
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
     * Set the plaintext modulus. This method enables batching, use
     * `PlainModulus::batching()` to create a suitable modulus chain.
     */
    pub fn set_plain_modulus(mut self, modulus: Modulus) -> Self {
        self.plain_modulus = PlainModulusType::Modulus(modulus);
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
            CoefficientModulusType::Modulus(m) => {
                convert_seal_error(unsafe {
                    let modulus_ref = m
                        .iter()
                        .map(|m| m.get_handle())
                        .collect::<Vec<*mut c_void>>();
                    let modulus_ptr = modulus_ref.as_ptr() as *mut *mut c_void;

                    bindgen::EncParams_SetCoeffModulus(params.handle, m.len() as u64, modulus_ptr)
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
            PlainModulusType::Modulus(m) => {
                convert_seal_error(unsafe {
                    bindgen::EncParams_SetPlainModulus1(params.handle, m.get_handle())
                })?;
            }
        };

        Ok(params)
    }
}

impl Default for BfvEncryptionParametersBuilder {
    fn default() -> Self {
        Self::new()
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
        assert_eq!(params.get_plain_modulus().value(), 1234);
        assert_eq!(params.get_coefficient_modulus().len(), 1);
        assert_eq!(params.get_coefficient_modulus()[0].value(), 132120577);

        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(1024)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &[50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus_u64(1234)
            .build()
            .unwrap();

        let modulus = params.get_coefficient_modulus();

        assert_eq!(params.get_poly_modulus_degree(), 1024);
        assert_eq!(params.get_scheme(), SchemeType::Bfv);
        assert_eq!(params.get_plain_modulus().value(), 1234);
        assert_eq!(modulus.len(), 5);
        assert_eq!(modulus[0].value(), 1125899905744897);
        assert_eq!(modulus[1].value(), 1073643521);
        assert_eq!(modulus[2].value(), 1073692673);
        assert_eq!(modulus[3].value(), 1125899906629633);
        assert_eq!(modulus[4].value(), 1125899906826241);
    }
}
