use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen;
use crate::error::*;

pub struct Plaintext {
    handle: *mut c_void,
}

impl Plaintext {
    /**
     * Returns the handle to the underlying SEAL object.
     */
    pub fn get_handle(&self) -> *mut c_void {
        self.handle
    }

    pub fn new() -> Result<Self> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe {
            bindgen::Plaintext_Create1(null_mut(), &mut handle)
        })?;

        Ok(Self { handle })
    }
}

impl Drop for Plaintext {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::Plaintext_Destroy(self.handle) })
            .expect("Internal error in Plaintext::drop.");
    }
}

pub struct Ciphertext {
    handle: *mut c_void,
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