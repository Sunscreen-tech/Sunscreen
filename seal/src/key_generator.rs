use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen;
use crate::error::*;
use crate::serialization::CompressionType;
use crate::Context;

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde::ser::Error;

pub struct KeyGenerator {
    handle: *mut c_void,
}

impl KeyGenerator {
    pub fn new(ctx: &Context) -> Result<Self> {
        let mut handle = null_mut();

        convert_seal_error(unsafe {
            bindgen::KeyGenerator_Create1(ctx.get_handle(), &mut handle)
        })?;

        Ok(KeyGenerator { handle })
    }

    pub fn new_from_secret_key(ctx: &Context, secret_key: &SecretKey) -> Result<Self> {
        let mut handle = null_mut();

        convert_seal_error(unsafe {
            bindgen::KeyGenerator_Create2(ctx.get_handle(), secret_key.handle, &mut handle)
        })?;

        Ok(KeyGenerator { handle })
    }

    pub fn secret_key(&self) -> SecretKey {
        let mut handle = null_mut();

        convert_seal_error(unsafe { bindgen::KeyGenerator_SecretKey(self.handle, &mut handle) })
            .expect("Fatal error in KeyGenerator::secret_key");

        SecretKey { handle }
    }

    pub fn create_public_key(&self, save_seed: bool) -> PublicKey {
        let mut handle = null_mut();

        convert_seal_error(unsafe {
            bindgen::KeyGenerator_CreatePublicKey(self.handle, save_seed, &mut handle)
        })
        .expect("Fatal error in KeyGenerator::secret_key");

        PublicKey { handle }
    }

    pub fn create_reliniearization_keys(&self, save_seed: bool) -> ReliniearizationKeys {
        let mut handle = null_mut();

        convert_seal_error(unsafe {
            bindgen::KeyGenerator_CreateRelinKeys(self.handle, save_seed, &mut handle)
        })
        .expect("Fatal error in KeyGenerator::secret_key");

        ReliniearizationKeys { handle }
    }

    // TODO: Galois keys
}

impl Drop for KeyGenerator {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::KeyGenerator_Destroy(self.handle) })
            .expect("Fatal error in KeyGenerator::drop");
    }
}

pub struct PublicKey {
    handle: *mut c_void,
}

impl Drop for PublicKey {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::PublicKey_Destroy(self.handle) })
            .expect("Fatal error in PublicKey::drop")
    }
}

pub struct SecretKey {
    handle: *mut c_void,
}

impl Drop for SecretKey {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::SecretKey_Destroy(self.handle) })
            .expect("Fatal error in PublicKey::drop")
    }
}

impl serde::Serialize for SecretKey {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut num_bytes: i64 = 0;

        convert_seal_error(unsafe {
            bindgen::SecretKey_SaveSize(self.handle, CompressionType::ZStd as u8, &mut num_bytes)
        }).map_err(|e| { S::Error::custom("Failed to get secret key serialized size") })?;

        let mut data: Vec<u8> = Vec::with_capacity(num_bytes as usize);
        let mut bytes_written: i64 = 0;

        convert_seal_error(unsafe {
            let data_ptr = data.as_mut_ptr();

            bindgen::SecretKey_Save(self.handle, data_ptr, num_bytes as u64, CompressionType::ZStd as u8, &mut bytes_written)
        }).map_err(|e| { S::Error::custom("Failed to get secret key bytes") })?;

        unsafe { data.set_len(bytes_written as usize) };

        serializer.serialize_bytes(&data)
    }
}

pub struct ReliniearizationKeys {
    handle: *mut c_void,
}

impl Drop for ReliniearizationKeys {
    fn drop(&mut self) {
        convert_seal_error(unsafe {
            // RelinKeys doesn't have a destructor, but inherits
            // from KSwitchKeys, which does. Just call the base class's
            // destructor.
            bindgen::KSwitchKeys_Destroy(self.handle)
        })
        .expect("Fatal error in PublicKey::drop")
    }
}

#[cfg(test)]
mod tests {
    use crate::*;

    #[test]
    fn can_create_secret_key() {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &vec![50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus_u64(1234)
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
        let gen = KeyGenerator::new(&ctx).unwrap();

        let secret_key = gen.secret_key();

        let gen = KeyGenerator::new(&ctx).unwrap();

        let secret_key_2 = gen.secret_key();

        // Different generators should give different keys.
        assert_ne!(
            serde_json::to_string(&secret_key_2).unwrap(),
            serde_json::to_string(&secret_key).unwrap()
        );
    }

    #[test]
    fn can_create_public_key() {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &vec![50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus_u64(1234)
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
        let gen = KeyGenerator::new(&ctx).unwrap();

        gen.create_public_key(false);
    }

    #[test]
    fn can_create_relin_key() {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &vec![50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus_u64(1234)
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
        let gen = KeyGenerator::new(&ctx).unwrap();

        gen.create_reliniearization_keys(false);
    }

    #[test]
    fn can_init_from_existing_secret_key() {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &vec![50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus_u64(1234)
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
        let gen = KeyGenerator::new(&ctx).unwrap();

        let secret_key = gen.secret_key();

        let gen = KeyGenerator::new_from_secret_key(&ctx, &secret_key).unwrap();

        let secret_key_2 = gen.secret_key();

        // Since we used the secret key from the first generator for the second,
        // we should get the same key.
        assert_eq!(
            serde_json::to_string(&secret_key_2).unwrap(),
            serde_json::to_string(&secret_key).unwrap()
        );
    }
}
