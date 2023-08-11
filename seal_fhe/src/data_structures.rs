use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen;
use crate::error::*;
use crate::Ciphertext;
use crate::Context;
use crate::PublicKey;

/**
 * A SEAL array storing a number of polynomials. In particular, type implements
 * methods that can convert from other types (like public keys) and converts
 * them into the same non-NTT RNS format. Enables conversion of RNS format to
 * multiprecision and back losslessly.
 */
#[derive(Debug, Eq)]
pub struct PolynomialArray {
    handle: *mut c_void,
}

unsafe impl Sync for PolynomialArray {}
unsafe impl Send for PolynomialArray {}

impl Clone for PolynomialArray {
    fn clone(&self) -> Self {
        let mut handle = null_mut();

        convert_seal_error(unsafe { bindgen::PolynomialArray_Copy(self.handle, &mut handle) })
            .expect("Fatal error: Failed to clone polynomial array");

        Self { handle }
    }
}

impl PartialEq for PolynomialArray {
    fn eq(&self, other: &Self) -> bool {
        self.as_rns_u64s() == other.as_rns_u64s()
    }
}

impl PolynomialArray {
    /**
     * Returns the handle to the underlying SEAL object.
     */
    pub fn get_handle(&self) -> *mut c_void {
        self.handle
    }

    /**
     * Creates a new empty polynomial array. Use an encoder to populate with a value.
     */
    pub fn new() -> Result<Self> {
        let mut handle: *mut c_void = null_mut();

        // By giving an empty pool handle we acquire the global one (first argument to create).
        convert_seal_error(unsafe { bindgen::PolynomialArray_Create(null_mut(), &mut handle) })?;

        Ok(Self { handle })
    }

    /**
     * Creates a polynomial array from a reference to a ciphertext.
     */
    pub fn new_from_ciphertext(context: &Context, ciphertext: &Ciphertext) -> Result<Self> {
        let mut handle: *mut c_void = null_mut();

        // By giving an empty pool handle we acquire the global one (first argument to create).
        convert_seal_error(unsafe {
            bindgen::PolynomialArray_CreateFromCiphertext(
                null_mut(),
                context.get_handle(),
                ciphertext.get_handle(),
                &mut handle,
            )
        })?;

        Ok(Self { handle })
    }

    /**
     * Creates a polynomial array from a reference to a public key.
     */
    pub fn new_from_public_key(context: &Context, public_key: &PublicKey) -> Result<Self> {
        let mut handle: *mut c_void = null_mut();

        // By giving an empty pool handle we acquire the global one (first argument to create).
        convert_seal_error(unsafe {
            bindgen::PolynomialArray_CreateFromPublicKey(
                null_mut(),
                context.get_handle(),
                public_key.get_handle(),
                &mut handle,
            )
        })?;

        Ok(Self { handle })
    }

    /**
     * Has the array data been loaded? When an array is created, it initially
     * has no data. Once data is loaded this is true. Additionally data can only
     * be loaded once.
     */
    pub fn is_reserved(&self) -> bool {
        let mut is_reserved: bool = false;

        convert_seal_error(unsafe {
            bindgen::PolynomialArray_IsReserved(self.get_handle(), &mut is_reserved)
        })
        .expect("Fatal error in PolynomialArray::is_reserved()");

        is_reserved
    }

    /**
     * Is the array in RNS form (true).
     */
    pub fn is_rns(&self) -> bool {
        let mut is_rns: bool = false;

        convert_seal_error(unsafe {
            bindgen::PolynomialArray_IsRns(self.get_handle(), &mut is_rns)
        })
        .expect("Fatal error in PolynomialArray::is_rns()");

        is_rns
    }

    /**
     * Is the array in RNS form (true).
     */
    pub fn is_multiprecision(&self) -> bool {
        !self.is_rns()
    }

    /**
     * Converts the polynomial array into the RNS format regardless of its
     * current format.
     */
    pub fn to_rns(&self) {
        convert_seal_error(unsafe { bindgen::PolynomialArray_ToRns(self.handle) })
            .expect("Fatal error in PolynomialArray::to_rns()");
    }

    /**
     * Converts the polynomial array into the multiprecision format regardless
     * of its current format.
     */
    pub fn to_multiprecision(&self) {
        convert_seal_error(unsafe { bindgen::PolynomialArray_ToMultiprecision(self.handle) })
            .expect("Fatal error in PolynomialArray::to_multiprecision()");
    }

    /**
     * Read out the raw data inside the vector. This function is not meant to be
     * called by users; instead users should call `as_multiprecision_u64s` or
     * `as_rns_u64s`
     */
    fn as_u64s(&self) -> Result<Vec<u64>> {
        let mut num_u64: u64 = 0;

        convert_seal_error(unsafe {
            bindgen::PolynomialArray_ExportSize(self.handle, &mut num_u64)
        })?;

        let mut data: Vec<u64> = Vec::with_capacity(num_u64 as usize);

        convert_seal_error(unsafe {
            let data_ptr = data.as_mut_ptr();

            bindgen::PolynomialArray_PerformExport(self.handle, data_ptr)
        })?;

        unsafe { data.set_len(num_u64 as usize) };

        Ok(data)
    }

    /**
     * This will be in coefficient order; all the limbs with a given coefficient
     * are stored together in least significant order.
     *
     * The number of limbs equals the number of moduli in the coefficient
     * modulus.
     */
    pub fn as_multiprecision_u64s(&self) -> Result<Vec<u64>> {
        // We want to leave the array in the format it was before, so we check
        // if we need to perform a conversion and temporarily do so if required.
        let perform_conversion = self.is_rns();

        if perform_conversion {
            self.to_multiprecision();
        }

        let result = self.as_u64s();

        if perform_conversion {
            self.to_rns();
        }

        result
    }

    /**
     * This will be in modulus order; all the values associated with a given
     * moduli are stored together.
     *
     * The number of limbs equals the number of moduli in the coefficient
     * modulus.
     */
    pub fn as_rns_u64s(&self) -> Result<Vec<u64>> {
        // We want to leave the array in the format it was before, so we check
        // if we need to perform a conversion and temporarily do so if required.
        let perform_conversion = self.is_multiprecision();

        if perform_conversion {
            self.to_rns();
        }

        let result = self.as_u64s();

        if perform_conversion {
            self.to_multiprecision();
        }

        result
    }

    /**
     * Returns the number of polynomials stored in the `PolynomialArray`.
     */
    pub fn num_polynomials(&self) -> u64 {
        let mut size: u64 = 0;

        convert_seal_error(unsafe { bindgen::PolynomialArray_PolySize(self.handle, &mut size) })
            .expect("Fatal error in PolynomialArray::num_polynomials");

        size
    }

    /**
     * Returns the number of coefficients in each polynomial in the `PolynomialArray`.
     */
    pub fn poly_modulus_degree(&self) -> u64 {
        let mut size: u64 = 0;

        convert_seal_error(unsafe {
            bindgen::PolynomialArray_PolyModulusDegree(self.handle, &mut size)
        })
        .expect("Fatal error in PolynomialArray::poly_modulus_degree");

        size
    }

    /**
     * Returns how many moduli are in the coefficient modulus set.
     */
    pub fn coeff_modulus_size(&self) -> u64 {
        let mut size: u64 = 0;

        convert_seal_error(unsafe {
            bindgen::PolynomialArray_CoeffModulusSize(self.handle, &mut size)
        })
        .expect("Fatal error in PolynomialArray::coeff_modulus_size");

        size
    }

    /**
     * Reduces the polynomial array by dropping the last modulus in the modulus
     * set.
     */
    pub fn drop_modulus(&self) -> Result<Self> {
        if self.coeff_modulus_size() == 1 {
            return Err(Error::ModulusChainTooSmall);
        }

        let mut handle: *mut c_void = null_mut();

        convert_seal_error(unsafe { bindgen::PolynomialArray_Drop(self.handle, &mut handle) })
            .expect("Fatal error in PolynomialArray::coeff_modulus_size");

        Ok(Self { handle })
    }
}

impl Drop for PolynomialArray {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::PolynomialArray_Destroy(self.handle) })
            .expect("Internal error in PolynomialArray::drop()");
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        BFVEncoder, BfvEncryptionParametersBuilder, CoefficientModulus, Encryptor, KeyGenerator,
        Modulus, PlainModulus, Plaintext, SecurityLevel,
    };

    use super::*;

    #[test]
    fn can_create_and_destroy_static_polynomial_array() {
        let poly_array = PolynomialArray::new().unwrap();

        std::mem::drop(poly_array);
    }

    #[test]
    fn can_create_polynomial_from_ciphertext() {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(1024)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &[50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus_u64(1234)
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();

        let ciphertext = Ciphertext::new().unwrap();
        let poly_array = PolynomialArray::new_from_ciphertext(&ctx, &ciphertext).unwrap();

        assert!(poly_array.is_reserved())
    }

    #[test]
    fn polynomial_array_initially_not_reserved() {
        let poly_array = PolynomialArray::new().unwrap();
        assert!(!poly_array.is_reserved());
    }

    fn generate_ciphertext_example() -> (
        Context,
        Vec<Modulus>,
        PublicKey,
        Ciphertext,
        PolynomialArray,
        PolynomialArray,
        Plaintext,
    ) {
        let coeff_modulus = CoefficientModulus::create(8192, &[50, 30, 30, 50, 50]).unwrap();
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(coeff_modulus.clone())
            .set_plain_modulus(PlainModulus::batching(8192, 20).unwrap())
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
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

        let (ciphertext, u, e, r) = encryptor.encrypt_return_components(&plaintext).unwrap();

        (ctx, coeff_modulus, public_key, ciphertext, u, e, r)
    }

    #[test]
    fn correct_poly_array_sizes_from_ciphertext() {
        let (ctx, _, public_key, ciphertext, u, e, r) = generate_ciphertext_example();
        let poly_array_public_key =
            PolynomialArray::new_from_public_key(&ctx, &public_key).unwrap();
        let poly_array_ciphertext =
            PolynomialArray::new_from_ciphertext(&ctx, &ciphertext).unwrap();

        let poly_array_ciphertext_encoded = poly_array_ciphertext.as_u64s().unwrap();
        let poly_array_public_key_encoded = poly_array_public_key.as_u64s().unwrap();
        let u_encoded = u.as_u64s().unwrap();
        let e_encoded = e.as_u64s().unwrap();

        assert!(poly_array_public_key.is_reserved());
        assert!(poly_array_ciphertext.is_reserved());
        assert!(u.is_reserved());
        assert!(e.is_reserved());

        // Ciphertext size checks
        assert_eq!(
            poly_array_ciphertext.num_polynomials(),
            ciphertext.num_polynomials()
        );
        assert_eq!(poly_array_ciphertext.poly_modulus_degree(), 8192);
        assert_eq!(
            poly_array_ciphertext.coeff_modulus_size(),
            ciphertext.coeff_modulus_size()
        );

        assert_eq!(
            poly_array_ciphertext_encoded.len() as u64,
            poly_array_ciphertext.num_polynomials()
                * poly_array_ciphertext.poly_modulus_degree()
                * poly_array_ciphertext.coeff_modulus_size()
        );

        // Public key
        assert_eq!(poly_array_public_key.num_polynomials(), 2);
        assert_eq!(poly_array_public_key.poly_modulus_degree(), 8192);
        assert_eq!(poly_array_public_key.coeff_modulus_size(), 4);

        assert_eq!(
            poly_array_public_key_encoded.len() as u64,
            poly_array_public_key.num_polynomials()
                * poly_array_public_key.poly_modulus_degree()
                * poly_array_public_key.coeff_modulus_size()
        );

        // u
        assert_eq!(u.num_polynomials(), 1);
        assert_eq!(u.poly_modulus_degree(), 8192);
        assert_eq!(u.coeff_modulus_size(), 4);
        assert_eq!(
            u_encoded.len() as u64,
            poly_array_public_key.poly_modulus_degree()
                * poly_array_ciphertext.coeff_modulus_size()
        );

        // e
        assert_eq!(e.num_polynomials(), 2);
        assert_eq!(e.poly_modulus_degree(), 8192);
        assert_eq!(e.coeff_modulus_size(), 4);
        assert_eq!(
            e_encoded.len() as u64,
            ciphertext.num_polynomials()
                * poly_array_public_key.poly_modulus_degree()
                * ciphertext.coeff_modulus_size()
        );

        // r
        assert_eq!(r.len(), 8192);
    }

    #[test]
    fn multiprecision_and_back_is_identity() {
        let (ctx, _, _, ciphertext, _, _, _) = generate_ciphertext_example();
        let poly_array = PolynomialArray::new_from_ciphertext(&ctx, &ciphertext).unwrap();

        let poly_array_encoded_original = poly_array.as_u64s().unwrap();

        poly_array.to_multiprecision();
        poly_array.to_rns();

        let poly_array_encoded_round_trip = poly_array.as_u64s().unwrap();

        assert_eq!(poly_array_encoded_original, poly_array_encoded_round_trip);
    }

    #[test]
    fn poly_array_u64_and_bytes_match() {
        let (ctx, _, _, ciphertext, _, _, _) = generate_ciphertext_example();
        let poly_array = PolynomialArray::new_from_ciphertext(&ctx, &ciphertext).unwrap();

        let poly_array_encoded = poly_array.as_u64s().unwrap();

        let cipher_data = (0..poly_array_encoded.len())
            .map(|i| ciphertext.get_data(i).unwrap())
            .collect::<Vec<u64>>();

        assert_eq!(&poly_array_encoded, &cipher_data);
    }

    #[test]
    fn poly_array_clone() {
        let (_, _, _, _, u, e, _) = generate_ciphertext_example();

        let u_clone = u.clone();
        assert_eq!(u, u_clone);
        assert_eq!(u.as_rns_u64s(), u_clone.as_rns_u64s());
        assert_ne!(u.get_handle(), u_clone.get_handle());

        let e_clone = e.clone();
        assert_eq!(e, e_clone);
        assert_eq!(e.as_rns_u64s(), e_clone.as_rns_u64s());
        assert_ne!(e.get_handle(), e_clone.get_handle());
    }

    #[test]
    fn poly_array_drop() {
        let (ctx, _, public_key, _, _, _, _) = generate_ciphertext_example();
        let poly_array = PolynomialArray::new_from_public_key(&ctx, &public_key).unwrap();
        let poly_array_lower = poly_array.drop_modulus().unwrap();

        assert_eq!(poly_array_lower.num_polynomials(), 2);
        assert_eq!(poly_array_lower.poly_modulus_degree(), 8192);
        assert_eq!(poly_array_lower.coeff_modulus_size(), 3);

        let poly_array_lower_rns = poly_array_lower.as_rns_u64s().unwrap();
        let poly_array_rns = poly_array
            .as_rns_u64s()
            .unwrap()
            .into_iter()
            .take(poly_array_lower_rns.len())
            .collect::<Vec<u64>>();

        assert_eq!(poly_array_rns, poly_array_lower_rns);
    }
}
