use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen::{self};
use crate::Modulus;

use crate::error::{convert_seal_error, Error};

#[repr(u8)]
#[derive(Debug, Copy, Clone)]
pub enum SchemeType {
    None = 0x0,

    /// Brakerski/Fan-Vercauteren scheme
    Bfv = 0x1,

    /// Cheon-Kim-Kim-Song scheme
    Ckks = 0x2,
}

pub struct EncryptionParameters {
    handle: *mut c_void,
}

impl EncryptionParameters {
    pub fn new(scheme: SchemeType) -> Result<Self, Error> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe { bindgen::EncParams_Create1(scheme as u8, &mut handle) })?;

        Ok(Self { handle })
    }

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
}

enum CoefficientModulusType {
    NotSet,
    Modulus(Vec<Modulus>),
}

enum PlainModulusType {
    NotSet,
    Constant(u64),
    Modulus,
}

pub struct BfvEncryptionParametersBuilder {
    poly_modulus_degree: Option<u64>,
    coefficient_modulus: CoefficientModulusType,
    plain_modulus: PlainModulusType,
}

impl BfvEncryptionParametersBuilder {
    pub fn new() -> Self {
        Self {
            poly_modulus_degree: None,
            coefficient_modulus: CoefficientModulusType::NotSet,
            plain_modulus: PlainModulusType::NotSet,
        }
    }

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

    /// Set the plaintext modulus to a fixed size. Not recommended.
    /// Ideally, create a PlainModulus to set up batching and call
    /// set_plain_modulus.
    pub fn set_plain_modulus_no_batching(mut self, modulus: u64) -> Self {
        self.plain_modulus = PlainModulusType::Constant(modulus);
        self
    }

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
                    bindgen::EncParams_SetCoeffModulus(params.handle, m.len() as u64, &mut modulus_ptr)
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
            PlainModulusType::Modulus => {
                unimplemented!()
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
    use crate::*;
    use crate::CoefficientModulus;

    #[test]
    fn can_build_params() {
        let result = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(1024)
            .set_coefficient_modulus(CoefficientModulus::bfv_default(1024, SecurityLevel::default()).unwrap())
            .set_plain_modulus_no_batching(1234)
            .build();

        assert_eq!(result.is_ok(), true);
    }
}
