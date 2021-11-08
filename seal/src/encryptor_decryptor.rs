use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen;
use crate::error::*;
use crate::{Ciphertext, Context, Plaintext, PublicKey, SecretKey};

/**
 *
 * Encrypts Plaintext objects into Ciphertext objects.
 *
 * Encrypts Plaintext objects into Ciphertext objects. Constructing an Encryptor
 * requires a SEALContext with valid encryption parameters, the public key and/or
 * the secret key. If an Encrytor is given a secret key, it supports symmetric-key
 * encryption. If an Encryptor is given a public key, it supports asymmetric-key
 * encryption.
 *
 * Overloads
 * For the encrypt function we provide two overloads concerning the memory pool used in
 * allocations needed during the operation. In one overload the global memory pool is used
 * for this purpose, and in another overload the user can supply a MemoryPoolHandle
 * to to be used instead. This is to allow one single Encryptor to be used concurrently by
 * several threads without running into thread contention in allocations taking place during
 * operations. For example, one can share one single Encryptor across any number of threads,
 * but in each thread call the encrypt function by giving it a thread-local MemoryPoolHandle
 * to use. It is important for a developer to understand how this works to avoid unnecessary
 * performance bottlenecks.
 *
 * NTT form
 * When using the BFV scheme (SchemeType.BFV), all plaintext and ciphertexts should
 * remain by default in the usual coefficient representation, i.e. not in NTT form.
 * When using the CKKS scheme (SchemeType.CKKS), all plaintexts and ciphertexts
 * should remain by default in NTT form. We call these scheme-specific NTT states the
 * "default NTT form". Decryption requires the input ciphertexts to be in the default
 * NTT form, and will throw an exception if this is not the case.
 */
pub struct Encryptor {
    handle: *mut c_void,
}

impl Encryptor {
    /**
    * Creates an Encryptor instance initialized with the specified SEALContext,
    * public key, and secret key.

    * * `ctx` - The SEALContext
    * * `publicKey` - The public key
    * * `secretKey` - The secret key
    */
    pub fn with_public_and_secret_key(
        ctx: &Context,
        public_key: &PublicKey,
        secret_key: &SecretKey,
    ) -> Result<Encryptor> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe {
            bindgen::Encryptor_Create(
                ctx.get_handle(),
                public_key.get_handle(),
                secret_key.get_handle(),
                &mut handle,
            )
        })?;

        Ok(Encryptor { handle })
    }

    /**
     * Creates an Encryptor instance initialized with the specified SEALContext,
     * public key.
     */
    pub fn with_public_key(ctx: &Context, public_key: &PublicKey) -> Result<Encryptor> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe {
            bindgen::Encryptor_Create(
                ctx.get_handle(),
                public_key.get_handle(),
                null_mut(),
                &mut handle,
            )
        })?;

        Ok(Encryptor { handle })
    }

    pub fn encrypt(&self, plaintext: Plaintext) -> Result<Ciphertext> {
        let ciphertext = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Encryptor_Encrypt(self.handle, plaintext.get_handle(), ciphertext.get_handle(), null_mut())
        })?;

        Ok(ciphertext)
    }
}

impl Drop for Encryptor {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::Encryptor_Destroy(self.handle) })
            .expect("Internal error in Enryptor::drop");
    }
}
