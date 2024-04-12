use std::ffi::c_void;
use std::marker::PhantomData;
use std::ptr::null_mut;

use crate::bindgen;
use crate::data_structures::PolynomialArray;
use crate::error::*;
use crate::{Ciphertext, Context, Plaintext, PublicKey, SecretKey};

/// The components to an asymmetric encryption.
pub struct AsymmetricComponents {
    /// Uniform ternary polynomial.
    ///
    /// This polynomial array should always have size one, i.e. it is a single
    /// polynomial.
    pub u: PolynomialArray,
    /// Error polynomial.
    ///
    /// This will generally have length two, if relinearization is performed after every
    /// multiplication.
    pub e: PolynomialArray,
    /// Rounding component after scaling the message by delta.
    pub r: Plaintext,
}

/// The components to a symmetric encryption.
pub struct SymmetricComponents {
    /// Error polynomial.
    ///
    /// This polynomial array should always have size one, i.e. it is a single
    /// polynomial.
    pub e: PolynomialArray,
    /// Rounding component after scaling the message by delta.
    pub r: Plaintext,
}

impl core::fmt::Debug for AsymmetricComponents {
    fn fmt(&self, f: &mut core::fmt::Formatter) -> core::fmt::Result {
        f.debug_struct("AsymmetricComponents")
            .field("u", &"<ELIDED>")
            .field("e", &"<ELIDED>")
            .field("r", &"<ELIDED>")
            .finish()
    }
}

impl core::fmt::Debug for SymmetricComponents {
    fn fmt(&self, f: &mut core::fmt::Formatter) -> core::fmt::Result {
        f.debug_struct("SymmetricComponents")
            .field("e", &"<ELIDED>")
            .field("r", &"<ELIDED>")
            .finish()
    }
}

/**
 * Encrypts Plaintext objects into Ciphertext objects.
 *
 * Constructing an Encryptor requires a SEALContext with valid encryption parameters, the public
 * key and/or the secret key. If an Encryptor is given a secret key, it supports symmetric-key
 * encryption. If an Encryptor is given a public key, it supports asymmetric-key encryption.
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
pub struct Encryptor<T = ()> {
    handle: *mut c_void,
    _marker: PhantomData<T>,
}

/// An encryptor capable of symmetric encryptions.
pub type SymmetricEncryptor = Encryptor<Sym>;

/// An encryptor capable of asymmetric encryptions.
pub type AsymmetricEncryptor = Encryptor<Asym>;

/// An encryptor capable of both symmetric and asymmetric encryptions.
pub type SymAsymEncryptor = Encryptor<SymAsym>;

mod sealed {
    pub trait Sealed {}
    impl Sealed for super::Sym {}
    impl Sealed for super::Asym {}
    impl Sealed for super::SymAsym {}
}

/// Marker traits to signify what types of enryptions are supported
pub mod marker {
    /// Supports symmetric encryptions.
    pub trait Sym: super::sealed::Sealed {}
    /// Supports asymmetric encryptions.
    pub trait Asym: super::sealed::Sealed {}
}

/// Symmetric encryptions marker
#[derive(Debug, PartialEq, Eq, Clone)]
pub struct Sym;
impl marker::Sym for Sym {}

/// Asymmetric encryptions marker
#[derive(Debug, PartialEq, Eq, Clone)]
pub struct Asym;
impl marker::Asym for Asym {}

/// Both symmetric and asymmetric encryptions marker
#[derive(Debug, PartialEq, Eq, Clone)]
pub struct SymAsym;
impl marker::Sym for SymAsym {}
impl marker::Asym for SymAsym {}

unsafe impl Sync for Encryptor {}
unsafe impl Send for Encryptor {}

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
    ) -> Result<Encryptor<SymAsym>> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe {
            bindgen::Encryptor_Create(
                ctx.get_handle(),
                public_key.get_handle(),
                secret_key.get_handle(),
                &mut handle,
            )
        })?;

        Ok(Encryptor {
            handle,
            _marker: PhantomData,
        })
    }

    /**
     * Creates an Encryptor instance initialized with the specified SEALContext,
     * public key.
     */
    pub fn with_public_key(ctx: &Context, public_key: &PublicKey) -> Result<AsymmetricEncryptor> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe {
            bindgen::Encryptor_Create(
                ctx.get_handle(),
                public_key.get_handle(),
                null_mut(),
                &mut handle,
            )
        })?;

        Ok(Encryptor {
            handle,
            _marker: PhantomData,
        })
    }

    /// Creates an Encryptor instance initialized with the specified SEALContext and
    /// secret key.
    pub fn with_secret_key(ctx: &Context, secret_key: &SecretKey) -> Result<SymmetricEncryptor> {
        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe {
            bindgen::Encryptor_Create(
                ctx.get_handle(),
                null_mut(),
                secret_key.get_handle(),
                &mut handle,
            )
        })?;

        Ok(Encryptor {
            handle,
            _marker: PhantomData,
        })
    }
}

impl AsymmetricEncryptor {
    /// Create a new asymmetric encryptor.
    pub fn new(ctx: &Context, public_key: &PublicKey) -> Result<Self> {
        Encryptor::with_public_key(ctx, public_key)
    }
}

impl SymmetricEncryptor {
    /// Create a new symmetric encryptor.
    pub fn new(ctx: &Context, secret_key: &SecretKey) -> Result<Self> {
        Encryptor::with_secret_key(ctx, secret_key)
    }
}

impl SymAsymEncryptor {
    /// Create a new encryptor capable of both symmetric and asymmetric encryption.
    pub fn new(ctx: &Context, public_key: &PublicKey, secret_key: &SecretKey) -> Result<Self> {
        Encryptor::with_public_and_secret_key(ctx, public_key, secret_key)
    }
}

impl<T: marker::Asym> Encryptor<T> {
    /**
     * Encrypts a plaintext with the public key and returns the ciphertext as
     * a serializable object.
     *
     * The encryption parameters for the resulting ciphertext correspond to:
     * 1) in BFV, the highest (data) level in the modulus switching chain,
     * 2) in CKKS, the encryption parameters of the plaintext.
     * Dynamic memory allocations in the process are allocated from the memory
     * pool pointed to by the given MemoryPoolHandle.
     *
     * * `plainext` - The plaintext to encrypt.
     */
    pub fn encrypt(&self, plaintext: &Plaintext) -> Result<Ciphertext> {
        // We don't call the encrypt_return_components because the return
        // components are allocated on the SEAL global memory pool. By calling
        // the regular encrypt function, we skip that allocation.
        let ciphertext = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Encryptor_Encrypt(
                self.handle,
                plaintext.get_handle(),
                ciphertext.get_handle(),
                null_mut(),
            )
        })?;

        Ok(ciphertext)
    }

    /**
     * Encrypts a plaintext with the public key and returns the ciphertext as a
     * serializable object. Also returns the u and e values used in encrypting
     * the value.
     *
     * The encryption parameters for the resulting ciphertext correspond to:
     * 1) in BFV, the highest (data) level in the modulus switching chain,
     * 2) in CKKS, the encryption parameters of the plaintext.
     * Dynamic memory allocations in the process are allocated from the memory
     * pool pointed to by the given MemoryPoolHandle.
     *
     * * `plainext` - The plaintext to encrypt.
     */
    pub fn encrypt_return_components(
        &self,
        plaintext: &Plaintext,
    ) -> Result<(Ciphertext, AsymmetricComponents)> {
        let ciphertext = Ciphertext::new()?;
        let u_destination = PolynomialArray::new()?;
        let e_destination = PolynomialArray::new()?;
        let r_destination = Plaintext::new()?;

        convert_seal_error(unsafe {
            bindgen::Encryptor_EncryptReturnComponents(
                self.handle,
                plaintext.get_handle(),
                true,
                ciphertext.get_handle(),
                u_destination.get_handle(),
                e_destination.get_handle(),
                r_destination.get_handle(),
                null_mut(),
            )
        })?;

        Ok((
            ciphertext,
            AsymmetricComponents {
                u: u_destination,
                e: e_destination,
                r: r_destination,
            },
        ))
    }

    /**
     * DO NOT USE THIS FUNCTION IN PRODUCTION: IT PRODUCES DETERMINISTIC
     * ENCRYPTIONS. IT IS INHERENTLY INSECURE, AND ONLY MEANT FOR TESTING OR
     * DEMONSTRATION PURPOSES.
     *
     * Encrypts a plaintext with the public key and returns the ciphertext as a
     * serializable object.
     *
     * The encryption parameters for the resulting ciphertext correspond to:
     * 1) in BFV, the highest (data) level in the modulus switching chain,
     * 2) in CKKS, the encryption parameters of the plaintext.
     * Dynamic memory allocations in the process are allocated from the memory
     * pool pointed to by the given MemoryPoolHandle.
     *
     * * `plainext` - The plaintext to encrypt.
     * * `seed` - The seed to use for encryption.
     */
    #[cfg(feature = "deterministic")]
    pub fn encrypt_deterministic(
        &self,
        plaintext: &Plaintext,
        seed: &[u64; 8],
    ) -> Result<Ciphertext> {
        let ciphertext = Ciphertext::new()?;
        let u_destination = PolynomialArray::new()?;
        let e_destination = PolynomialArray::new()?;
        let r_destination = Plaintext::new()?;

        // We do not need the components so we do not export them.
        convert_seal_error(unsafe {
            bindgen::Encryptor_EncryptReturnComponentsSetSeed(
                self.handle,
                plaintext.get_handle(),
                false,
                ciphertext.get_handle(),
                u_destination.get_handle(),
                e_destination.get_handle(),
                r_destination.get_handle(),
                seed.as_ptr() as *mut c_void,
                null_mut(),
            )
        })?;

        Ok(ciphertext)
    }

    /**
     *
     * DO NOT USE THIS FUNCTION IN PRODUCTION: IT PRODUCES DETERMINISTIC
     * ENCRYPTIONS. IT IS INHERENTLY INSECURE, AND ONLY MEANT FOR TESTING OR
     * DEMONSTRATION PURPOSES.
     *
     * Encrypts a plaintext with the public key and returns the ciphertext as a
     * serializable object. Also returns the u and e values used in encrypting
     * the value.
     *
     * The encryption parameters for the resulting ciphertext correspond to:
     * 1) in BFV, the highest (data) level in the modulus switching chain,
     * 2) in CKKS, the encryption parameters of the plaintext.
     * Dynamic memory allocations in the process are allocated from the memory
     * pool pointed to by the given MemoryPoolHandle.
     *
     * * `plainext` - The plaintext to encrypt.
     * * `seed` - The seed to use for encryption.
     */
    #[cfg(feature = "deterministic")]
    pub fn encrypt_return_components_deterministic(
        &self,
        plaintext: &Plaintext,
        seed: &[u64; 8],
    ) -> Result<(Ciphertext, AsymmetricComponents)> {
        let ciphertext = Ciphertext::new()?;
        let u_destination = PolynomialArray::new()?;
        let e_destination = PolynomialArray::new()?;
        let r_destination = Plaintext::new()?;

        // We do not need the components so we do not export them.
        convert_seal_error(unsafe {
            bindgen::Encryptor_EncryptReturnComponentsSetSeed(
                self.handle,
                plaintext.get_handle(),
                true,
                ciphertext.get_handle(),
                u_destination.get_handle(),
                e_destination.get_handle(),
                r_destination.get_handle(),
                seed.as_ptr() as *mut c_void,
                null_mut(),
            )
        })?;

        Ok((
            ciphertext,
            AsymmetricComponents {
                u: u_destination,
                e: e_destination,
                r: r_destination,
            },
        ))
    }
}

impl<T: marker::Sym> Encryptor<T> {
    /**
     * Encrypts a plaintext with the secret key and returns the ciphertext as
     * a serializable object.
     *
     * The encryption parameters for the resulting ciphertext correspond to:
     * 1) in BFV, the highest (data) level in the modulus switching chain,
     * 2) in CKKS, the encryption parameters of the plaintext.
     * Dynamic memory allocations in the process are allocated from the memory
     * pool pointed to by the given MemoryPoolHandle.
     *
     * * `plainext` - The plaintext to encrypt.
     */
    pub fn encrypt_symmetric(&self, plaintext: &Plaintext) -> Result<Ciphertext> {
        // We don't call the encrypt_return_components because the return
        // components are allocated on the SEAL global memory pool. By calling
        // the regular encrypt function, we skip that allocation.
        let ciphertext = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Encryptor_EncryptSymmetric(
                self.handle,
                plaintext.get_handle(),
                false,
                ciphertext.get_handle(),
                null_mut(),
            )
        })?;

        Ok(ciphertext)
    }

    /**
     * DO NOT USE THIS FUNCTION IN PRODUCTION: IT PRODUCES DETERMINISTIC
     * ENCRYPTIONS. IT IS INHERENTLY INSECURE, AND ONLY MEANT FOR TESTING OR
     * DEMONSTRATION PURPOSES.
     *
     * Encrypts a plaintext with the secret key and returns the ciphertext as a
     * serializable object.
     *
     * The encryption parameters for the resulting ciphertext correspond to:
     * 1) in BFV, the highest (data) level in the modulus switching chain,
     * 2) in CKKS, the encryption parameters of the plaintext.
     * Dynamic memory allocations in the process are allocated from the memory
     * pool pointed to by the given MemoryPoolHandle.
     *
     * * `plainext` - The plaintext to encrypt.
     * * `seed` - The seed to use for encryption.
     */
    #[cfg(feature = "deterministic")]
    pub fn encrypt_symmetric_deterministic(
        &self,
        plaintext: &Plaintext,
        seed: &[u64; 8],
    ) -> Result<Ciphertext> {
        let ciphertext = Ciphertext::new()?;
        let e_destination = PolynomialArray::new()?;
        let r_destination = Plaintext::new()?;

        // We do not need the components so we do not export them.
        convert_seal_error(unsafe {
            bindgen::Encryptor_EncryptSymmetricReturnComponentsSetSeed(
                self.handle,
                plaintext.get_handle(),
                ciphertext.get_handle(),
                e_destination.get_handle(),
                r_destination.get_handle(),
                seed.as_ptr() as *mut c_void,
                null_mut(),
            )
        })?;

        Ok(ciphertext)
    }

    /// Encrypts a plaintext with the secret key and returns the ciphertext as a
    /// serializable object. Also returns the e (noise) and r (remainder) values used in
    /// encrypting the value.
    ///
    /// The encryption parameters for the resulting ciphertext correspond to:
    /// 1) in BFV, the highest (data) level in the modulus switching chain,
    /// 2) in CKKS, the encryption parameters of the plaintext.
    /// Dynamic memory allocations in the process are allocated from the memory
    /// pool pointed to by the given MemoryPoolHandle.
    ///
    /// * `plainext` - The plaintext to encrypt.
    pub fn encrypt_symmetric_return_components(
        &self,
        plaintext: &Plaintext,
    ) -> Result<(Ciphertext, SymmetricComponents)> {
        let ciphertext = Ciphertext::new()?;
        let e_destination = PolynomialArray::new()?;
        let r_destination = Plaintext::new()?;

        convert_seal_error(unsafe {
            bindgen::Encryptor_EncryptSymmetricReturnComponents(
                self.handle,
                plaintext.get_handle(),
                ciphertext.get_handle(),
                e_destination.get_handle(),
                r_destination.get_handle(),
                null_mut(),
            )
        })?;

        Ok((
            ciphertext,
            SymmetricComponents {
                e: e_destination,
                r: r_destination,
            },
        ))
    }

    /**
     * DO NOT USE THIS FUNCTION IN PRODUCTION: IT PRODUCES DETERMINISTIC
     * ENCRYPTIONS. IT IS INHERENTLY INSECURE, AND ONLY MEANT FOR TESTING OR
     * DEMONSTRATION PURPOSES.
     *
     * Encrypts a plaintext with the public key and returns the ciphertext as a
     * serializable object. Also returns the u and e values used in encrypting
     * the value.
     *
     * The encryption parameters for the resulting ciphertext correspond to:
     * 1) in BFV, the highest (data) level in the modulus switching chain,
     * 2) in CKKS, the encryption parameters of the plaintext.
     * Dynamic memory allocations in the process are allocated from the memory
     * pool pointed to by the given MemoryPoolHandle.
     *
     * * `plainext` - The plaintext to encrypt.
     * * `seed` - The seed to use for encryption.
     */
    #[cfg(feature = "deterministic")]
    pub fn encrypt_symmetric_return_components_deterministic(
        &self,
        plaintext: &Plaintext,
        seed: &[u64; 8],
    ) -> Result<(Ciphertext, SymmetricComponents)> {
        let ciphertext = Ciphertext::new()?;
        let e_destination = PolynomialArray::new()?;
        let r_destination = Plaintext::new()?;

        // We do not need the components so we do not export them.
        convert_seal_error(unsafe {
            bindgen::Encryptor_EncryptSymmetricReturnComponentsSetSeed(
                self.handle,
                plaintext.get_handle(),
                ciphertext.get_handle(),
                e_destination.get_handle(),
                r_destination.get_handle(),
                seed.as_ptr() as *mut c_void,
                null_mut(),
            )
        })?;

        Ok((
            ciphertext,
            SymmetricComponents {
                e: e_destination,
                r: r_destination,
            },
        ))
    }
}

impl<T> Drop for Encryptor<T> {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::Encryptor_Destroy(self.handle) })
            .expect("Internal error in Enryptor::drop");
    }
}

/**
 * Decrypts Ciphertext objects into Plaintext objects. Constructing a Decryptor requires
 * a SEALContext with valid encryption parameters, and the secret key. The Decryptor is
 * also used to compute the invariant noise budget in a given ciphertext.
 *
 * # NTT form (TODO)
 * When using the BFV scheme (SchemeType.BFV), all plaintext and ciphertexts should
 * remain by default in the usual coefficient representation, i.e. not in NTT form.
 * When using the CKKS scheme (SchemeType.CKKS), all plaintexts and ciphertexts
 * should remain by default in NTT form. We call these scheme-specific NTT states the
 * "default NTT form". Decryption requires the input ciphertexts to be in the default
 * NTT form, and will throw an exception if this is not the case.
*/
pub struct Decryptor {
    handle: *mut c_void,
}

unsafe impl Sync for Decryptor {}
unsafe impl Send for Decryptor {}

impl Decryptor {
    /**
     * Creates a Decryptor instance initialized with the specified SEALContext
     * and secret key.
     *
     * The SEALContext
     * The secret key
     */
    pub fn new(ctx: &Context, secret_key: &SecretKey) -> Result<Self> {
        let mut handle = null_mut();

        convert_seal_error(unsafe {
            bindgen::Decryptor_Create(ctx.get_handle(), secret_key.get_handle(), &mut handle)
        })?;

        Ok(Self { handle })
    }

    /**
     * Decrypts a Ciphertext and stores the result in the destination parameter.
     *
     * `encrypted` - The ciphertext to decrypt.
     */
    pub fn decrypt(&self, ciphertext: &Ciphertext) -> Result<Plaintext> {
        let plaintext = Plaintext::new()?;

        convert_seal_error(unsafe {
            bindgen::Decryptor_Decrypt(self.handle, ciphertext.get_handle(), plaintext.get_handle())
        })?;

        Ok(plaintext)
    }

    /**
     * Computes the invariant noise budget (in bits) of a ciphertext. The invariant noise
     * budget measures the amount of room there is for the noise to grow while ensuring
     * correct decryptions. Dynamic memory allocations in the process are allocated from
     * the memory pool pointed to by the given MemoryPoolHandle. This function works only
     * with the BFV scheme.
     *
     * # Invariant Noise Budget
     * The invariant noise polynomial of a ciphertext is a rational coefficient polynomial,
     * such that a ciphertext decrypts correctly as long as the coefficients of the invariant
     * noise polynomial are of absolute value less than 1/2. Thus, we call the infinity-norm
     * of the invariant noise polynomial the invariant noise, and for correct decryption require
     * it to be less than 1/2. If v denotes the invariant noise, we define the invariant noise
     * budget as -log2(2v). Thus, the invariant noise budget starts from some initial value,
     * which depends on the encryption parameters, and decreases when computations are performed.
     * When the budget reaches zero, the ciphertext becomes too noisy to decrypt correctly.
     *
     * * `ciphertext` - The ciphertext for which to measure noise.
     */
    pub fn invariant_noise_budget(&self, ciphertext: &Ciphertext) -> Result<u32> {
        let mut noise: i32 = 0;

        convert_seal_error(unsafe {
            bindgen::Decryptor_InvariantNoiseBudget(
                self.handle,
                ciphertext.get_handle(),
                &mut noise,
            )
        })?;

        Ok(noise as u32)
    }

    /**
     * Computes the invariant noise of a ciphertext. The invariant noise is
     * a value that increases with FHE operations. This function only works
     * with the BFV scheme.
     *
     * # Invariant Noise
     * The invariant noise polynomial of a ciphertext is a rational * coefficient
     * polynomial, such that a ciphertext decrypts correctly as long as the
     * coefficients of the invariant noise polynomial are of absolute value less
     * than 1/2. Thus, we call the infinity-norm of the invariant noise polynomial
     * the invariant noise, and for correct decryption require it to be less than
     * 1/2.
     */
    pub fn invariant_noise(&self, ciphertext: &Ciphertext) -> Result<f64> {
        let mut noise: f64 = 0f64;

        convert_seal_error(unsafe {
            bindgen::Decryptor_InvariantNoise(self.handle, ciphertext.get_handle(), &mut noise)
        })?;

        Ok(noise)
    }
}

impl Drop for Decryptor {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::Decryptor_Destroy(self.handle) })
            .expect("Internal error Decryptor::drop().");
    }
}

#[cfg(test)]
mod tests {
    use crate::*;

    fn mk_ctx<F>(enc_modifier: F) -> Context
    where
        F: FnOnce(BfvEncryptionParametersBuilder) -> BfvEncryptionParametersBuilder,
    {
        let builder = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &[50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus_u64(1234);
        let params = enc_modifier(builder).build().unwrap();

        Context::new(&params, false, SecurityLevel::TC128).unwrap()
    }

    #[test]
    fn can_create_encryptor_from_public_key() {
        let ctx = mk_ctx(|b| b);
        let gen = KeyGenerator::new(&ctx).unwrap();

        let public_key = gen.create_public_key();

        let encryptor = Encryptor::with_public_key(&ctx, &public_key).unwrap();

        std::mem::drop(encryptor);
    }

    #[test]
    fn can_create_encryptor_from_secret_key() {
        let ctx = mk_ctx(|b| b);

        let gen = KeyGenerator::new(&ctx).unwrap();

        let secret_key = gen.secret_key();

        let encryptor = Encryptor::with_secret_key(&ctx, &secret_key).unwrap();

        std::mem::drop(encryptor);
    }

    #[test]
    fn can_create_encryptor_from_public_and_secret_key() {
        let ctx = mk_ctx(|b| b);

        let gen = KeyGenerator::new(&ctx).unwrap();

        let public_key = gen.create_public_key();
        let secret_key = gen.secret_key();

        let encryptor =
            Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();

        std::mem::drop(encryptor);
    }

    #[test]
    fn can_create_and_destroy_decryptor() {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &[50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus_u64(1234)
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
        let gen = KeyGenerator::new(&ctx).unwrap();

        let secret_key = gen.secret_key();
        let decryptor = Decryptor::new(&ctx, &secret_key);

        std::mem::drop(decryptor);
    }

    #[test]
    fn can_encrypt_and_decrypt_unsigned() {
        let ctx = mk_ctx(|b| b.set_plain_modulus(PlainModulus::batching(8192, 20).unwrap()));
        let gen = KeyGenerator::new(&ctx).unwrap();

        let encoder = BFVEncoder::new(&ctx).unwrap();

        let mut data = vec![];

        for i in 0..encoder.get_slot_count() {
            data.push(i as u64)
        }

        let plaintext = encoder.encode_unsigned(&data).unwrap();

        let public_key = gen.create_public_key();
        let secret_key = gen.secret_key();

        let encryptor =
            Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();
        let decryptor = Decryptor::new(&ctx, &secret_key).unwrap();

        // asymmetric test
        let ciphertext = encryptor.encrypt(&plaintext).unwrap();
        let decrypted = decryptor.decrypt(&ciphertext).unwrap();
        let data_2 = encoder.decode_unsigned(&decrypted).unwrap();
        assert_eq!(data, data_2);

        // symmetric test
        let ciphertext = encryptor.encrypt_symmetric(&plaintext).unwrap();
        let decrypted = decryptor.decrypt(&ciphertext).unwrap();
        let data_2 = encoder.decode_unsigned(&decrypted).unwrap();
        assert_eq!(data, data_2);
    }

    #[test]
    fn can_encrypt_and_decrypt_signed() {
        let ctx = mk_ctx(|b| b.set_plain_modulus(PlainModulus::batching(8192, 20).unwrap()));
        let gen = KeyGenerator::new(&ctx).unwrap();

        let encoder = BFVEncoder::new(&ctx).unwrap();

        let mut data = vec![];

        for i in 0..encoder.get_slot_count() {
            data.push(encoder.get_slot_count() as i64 / 2i64 - i as i64)
        }

        let plaintext = encoder.encode_signed(&data).unwrap();

        let public_key = gen.create_public_key();
        let secret_key = gen.secret_key();

        let encryptor =
            Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();
        let decryptor = Decryptor::new(&ctx, &secret_key).unwrap();

        // asymmetric test
        let ciphertext = encryptor.encrypt(&plaintext).unwrap();
        let decrypted = decryptor.decrypt(&ciphertext).unwrap();
        let data_2 = encoder.decode_signed(&decrypted).unwrap();
        assert_eq!(data, data_2);

        // asymmetric test
        let ciphertext = encryptor.encrypt_symmetric(&plaintext).unwrap();
        let decrypted = decryptor.decrypt(&ciphertext).unwrap();
        let data_2 = encoder.decode_signed(&decrypted).unwrap();
        assert_eq!(data, data_2);
    }

    #[test]
    fn can_encrypt_and_decrypt_from_return_components() {
        let ctx = mk_ctx(|b| b.set_plain_modulus(PlainModulus::batching(8192, 20).unwrap()));
        let gen = KeyGenerator::new(&ctx).unwrap();

        let encoder = BFVEncoder::new(&ctx).unwrap();

        let mut data = vec![];

        for i in 0..encoder.get_slot_count() {
            data.push(i as u64);
        }

        let plaintext = encoder.encode_unsigned(&data).unwrap();

        let public_key = gen.create_public_key();
        let secret_key = gen.secret_key();

        let encryptor =
            Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();
        let decryptor = Decryptor::new(&ctx, &secret_key).unwrap();

        // asymmetric test
        let ciphertext = encryptor.encrypt_return_components(&plaintext).unwrap().0;
        let decrypted = decryptor.decrypt(&ciphertext).unwrap();
        let data_2 = encoder.decode_unsigned(&decrypted).unwrap();
        assert_eq!(data, data_2);

        // asymmetric test
        let ciphertext = encryptor
            .encrypt_symmetric_return_components(&plaintext)
            .unwrap()
            .0;
        let decrypted = decryptor.decrypt(&ciphertext).unwrap();
        let data_2 = encoder.decode_unsigned(&decrypted).unwrap();
        assert_eq!(data, data_2);
    }

    #[cfg(feature = "deterministic")]
    mod deterministic {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        use super::*;

        #[test]
        fn encrypt_deterministic() {
            let ctx = mk_ctx(|b| b.set_plain_modulus(PlainModulus::batching(8192, 20).unwrap()));

            let encoder = BFVEncoder::new(&ctx).unwrap();

            let mut data = vec![];

            for i in 0..encoder.get_slot_count() {
                data.push(i as u64);
            }

            let plaintext = encoder.encode_unsigned(&data).unwrap();

            let public_key_bytes = include_bytes!("../tests/data/public_key.bin");
            let secret_key_bytes = include_bytes!("../tests/data/secret_key.bin");

            let public_key = PublicKey::from_bytes(&ctx, public_key_bytes).unwrap();
            let secret_key = SecretKey::from_bytes(&ctx, secret_key_bytes).unwrap();

            let encryptor =
                Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();
            let decryptor = Decryptor::new(&ctx, &secret_key).unwrap();

            let ciphertext = encryptor
                .encrypt_deterministic(&plaintext, &[0, 0, 0, 0, 0, 0, 0, 0])
                .unwrap();
            let decrypted = decryptor.decrypt(&ciphertext).unwrap();

            let data_2 = encoder.decode_unsigned(&decrypted).unwrap();

            assert_eq!(data, data_2);

            let cipher_bytes = ciphertext.as_bytes().unwrap();

            let mut s = DefaultHasher::new();
            cipher_bytes.hash(&mut s);
            let hash = s.finish();

            assert_eq!(
                hash,
                if cfg!(target_os = "macos") {
                    14319785560025809101
                } else {
                    9942548233613012008
                }
            );
        }
    }
}
