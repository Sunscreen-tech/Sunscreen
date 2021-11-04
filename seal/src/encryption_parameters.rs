use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen::{self, E_OK};

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

    fn set_poly_modulus_degree(&mut self, degree: u64) -> Result<(), Error> {
        Ok(())
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
    Constant(u64),
    Modulus,
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

    /// Forgo modulus switching and just set a single coefficient modulus level
    pub fn set_coefficient_modulus(mut self, modulus: u64) -> Self {
        self.coefficient_modulus = CoefficientModulusType::Constant(modulus);
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
        let mut params = EncryptionParameters::new(SchemeType::Bfv)?;

        convert_seal_error(unsafe {
            bindgen::EncParams_SetPolyModulusDegree(
                params.handle,
                self.poly_modulus_degree.ok_or(Error::DegreeNotSet)?,
            )
        })?;

        match self.coefficient_modulus {
            NotSet => return Err(Error::CoefficientModulusNotSet),
            CoefficientModulusType::Constant(q) => {
                convert_seal_error(unsafe {
                    bindgen::EncParams_SetCoeffModulus(params.handle, 0, &mut null_mut())
                })?;
            }
            Modulus => {
                unimplemented!()
            }
        };

        match self.plain_modulus {
            NotSet => return Err(Error::PlainModulusNotSet),
            PlainModulusType::Constant(p) => {
                convert_seal_error(unsafe {
                    bindgen::EncParams_SetPlainModulus2(params.handle, p)
                })?;
            }
            Modulus => {
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
