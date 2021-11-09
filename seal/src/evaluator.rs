use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen;
use crate::error::*;
use crate::{Ciphertext, Context, Plaintext};

/**
 * Provides operations on ciphertexts. Due to the properties of the encryption scheme, the arithmetic operations
 * pass through the encryption layer to the underlying plaintext, changing it according to the type of the
 * operation. Since the plaintext elements are fundamentally polynomials in the polynomial quotient ring
 * Z_T[x]/(X^N+1), where T is the plaintext modulus and X^N+1 is the polynomial modulus, this is the ring where
 * the arithmetic operations will take place. BatchEncoder (batching) provider an alternative possibly more
 * convenient view of the plaintext elements as 2-by-(N2/2) matrices of integers modulo the plaintext modulus. In
 * the batching view the arithmetic operations act on the matrices element-wise. Some of the operations only apply
 * in the batching view, such as matrix row and column rotations. Other operations such as relinearization have no
 * semantic meaning but are necessary for performance reasons.
 *
 * # Arithmetic Operations
 * The core operations are arithmetic operations, in particular multiplication and addition of ciphertexts. In
 * addition to these, we also provide negation, subtraction, squaring, exponentiation, and multiplication and
 * addition of several ciphertexts for convenience. in many cases some of the inputs to a computation are plaintext
 * elements rather than ciphertexts. For this we provide fast "plain" operations: plain addition, plain
 * subtraction, and plain multiplication.
 *
 * # Relinearization
 * One of the most important non-arithmetic operations is relinearization, which takes as input a ciphertext of
 * size K+1 and relinearization keys (at least K-1 keys are needed), and changes the size of the ciphertext down
 * to 2 (minimum size). For most use-cases only one relinearization key suffices, in which case relinearization
 * should be performed after every multiplication. Homomorphic multiplication of ciphertexts of size K+1 and L+1
 * outputs a ciphertext of size K+L+1, and the computational cost of multiplication is proportional to K*L. Plain
 * multiplication and addition operations of any type do not change the size. Relinearization requires
 * relinearization keys to have been generated.
 *
 * # Rotations
 * When batching is enabled, we provide operations for rotating the plaintext matrix rows cyclically left or right,
 * and for rotating the columns (swapping the rows). Rotations require Galois keys to have been generated.
 *
 * # Other Operations
 * We also provide operations for transforming ciphertexts to NTT form and back, and for transforming plaintext
 * polynomials to NTT form. These can be used in a very fast plain multiplication variant, that assumes the inputs
 * to be in NTT form. Since the NTT has to be done in any case in plain multiplication, this function can be used
 * when e.g. one plaintext input is used in several plain multiplication, and transforming it several times would
 * not make sense.
 *
 * # NTT form
 * When using the BFV scheme (SchemeType.BFV), all plaintexts and ciphertexts should remain by default in the usual
 * coefficient representation, i.e., not in NTT form. When using the CKKS scheme (SchemeType.CKKS), all plaintexts
 * and ciphertexts should remain by default in NTT form. We call these scheme-specific NTT states the "default NTT
 * form". Some functions, such as add, work even if the inputs are not in the default state, but others, such as
 * multiply, will throw an exception. The output of all evaluation functions will be in the same state as the
 * input(s), with the exception of the TransformToNTT and TransformFromNTT functions, which change the state.
 * Ideally, unless these two functions are called, all other functions should "just work".
*/
pub struct Evaluator {
    handle: *mut c_void,
}

impl Drop for Evaluator {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::Evaluator_Destroy(self.handle) })
            .expect("Internal error in Evaluator::drop()");
    }
}

impl Evaluator {
    /**
     * Creates an Evaluator instance initialized with the specified Context.
     * * `ctx` - The context.
     */
    pub fn new(ctx: &Context) -> Result<Self> {
        let mut handle = null_mut();

        convert_seal_error(unsafe { bindgen::Evaluator_Create(ctx.get_handle(), &mut handle) })?;

        Ok(Self { handle })
    }

    /**
     * Negates a ciphertext inplace.
     *  * `a` - the value to negate
     */
    pub fn negate_inplace(&self, a: &mut Ciphertext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Negate(self.handle, a.get_handle(), a.get_handle())
        })?;

        Ok(())
    }

    /**
     * Negates a ciphertext into a new ciphertext.
     *  * `a` - the value to negate
     */
    pub fn negate(&self, a: &Ciphertext) -> Result<Ciphertext> {
        let out = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Negate(self.handle, a.get_handle(), out.get_handle())
        })?;

        Ok(out)
    }

    pub fn add_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Add(self.handle, a.get_handle(), b.get_handle(), a.get_handle())
        })?;

        Ok(())
    }

    pub fn add(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Add(self.handle, a.get_handle(), b.get_handle(), c.get_handle())
        })?;

        Ok(c)
    }

    pub fn add_many(&self, a: &[Ciphertext]) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        let mut a = a.iter().map(|x| x.get_handle()).collect::<Vec<*mut c_void>>();

        convert_seal_error(unsafe {
            bindgen::Evaluator_AddMany(self.handle, a.len() as u64, a.as_mut_ptr(), c.get_handle())
        })?;

        Ok(c)
    }

    pub fn sub_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Sub(self.handle, a.get_handle(), b.get_handle(), a.get_handle())
        })?;

        Ok(())
    }

    pub fn sub(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Sub(self.handle, a.get_handle(), b.get_handle(), c.get_handle())
        })?;

        Ok(c)
    }
}

#[cfg(test)]
mod tests {
    use crate::*;

    fn run_test<F>(test: F) 
        where F: FnOnce(Decryptor, BFVEncoder, Encryptor, Evaluator)
    {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &vec![50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus(PlainModulus::batching(8192, 20).unwrap())
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
        let gen = KeyGenerator::new(&ctx).unwrap();

        let encoder = BFVEncoder::new(&ctx).unwrap();

        let public_key = gen.create_public_key();
        let secret_key = gen.secret_key();

        let encryptor =
            Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();
        let decryptor = Decryptor::new(&ctx, &secret_key).unwrap();
        let evaluator = Evaluator::new(&ctx).unwrap();

        test(decryptor, encoder, encryptor, evaluator);
    }

    fn make_vec(encoder: &BFVEncoder) -> Vec<i64> {
        let mut data = vec![];

        for i in 0..encoder.get_slot_count() {
            data.push(encoder.get_slot_count() as i64 / 2i64 - i as i64)
        }

        data
    }

    #[test]
    fn can_create_and_destroy_evaluator() {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &vec![50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus(PlainModulus::batching(8192, 20).unwrap())
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();

        let evaluator = Evaluator::new(&ctx);

        std::mem::drop(evaluator);
    }

    #[test]
    fn can_negate() {
        run_test(|decryptor, encoder, encryptor, evaluator| {
            let a = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            let b_c = evaluator.negate(&a_c).unwrap();

            let b_p = decryptor.decrypt(&b_c).unwrap();
            let b = encoder.decode_signed(&b_p).unwrap();
            
            assert_eq!(a.len(), b.len());

            for i in 0..a.len() {
                assert_eq!(a[i], -b[i]);
            }
        });
    }

    #[test]
    fn can_negate_inplace() {
        run_test(|decryptor, encoder, encryptor, evaluator| {
            let a = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();

            evaluator.negate_inplace(&mut a_c).unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let b = encoder.decode_signed(&a_p).unwrap();
            
            assert_eq!(a.len(), b.len());

            for i in 0..a.len() {
                assert_eq!(a[i], -b[i]);
            }
        });
    }

    #[test]
    fn can_add() {
        run_test(|decryptor, encoder, encryptor, evaluator| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();
            let b_c = encryptor.encrypt(&b_p).unwrap();

            let c_c = evaluator.add(&a_c, &b_c).unwrap();

            let c_p = decryptor.decrypt(&c_c).unwrap();
            let c = encoder.decode_signed(&c_p).unwrap();
            
            assert_eq!(a.len(), c.len());
            assert_eq!(b.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] + b[i]);
            }
        });
    }

    #[test]
    fn can_add_inplace() {
        run_test(|decryptor, encoder, encryptor, evaluator| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();
            let b_c = encryptor.encrypt(&b_p).unwrap();

            evaluator.add_inplace(&mut a_c, &b_c).unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let c = encoder.decode_signed(&a_p).unwrap();
            
            assert_eq!(a.len(), c.len());
            assert_eq!(b.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] + b[i]);
            }
        });
    }

    #[test]
    fn can_add_many() {
        run_test(|decryptor, encoder, encryptor, evaluator| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let c = make_vec(&encoder);
            let d = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let c_p = encoder.encode_signed(&c).unwrap();
            let d_p = encoder.encode_signed(&d).unwrap();

            let data_c = vec![
                encryptor.encrypt(&a_p).unwrap(),
                encryptor.encrypt(&b_p).unwrap(),
                encryptor.encrypt(&c_p).unwrap(),
                encryptor.encrypt(&d_p).unwrap(),
            ];
            
            let out_c = evaluator.add_many(&data_c).unwrap();

            let out_p = decryptor.decrypt(&out_c).unwrap();
            let out = encoder.decode_signed(&out_p).unwrap();
            
            assert_eq!(a.len(), out.len());
            assert_eq!(b.len(), out.len());
            assert_eq!(c.len(), out.len());
            assert_eq!(d.len(), out.len());

            for i in 0..a.len() {
                assert_eq!(out[i], a[i] + b[i] + c[i] + d[i]);
            }
        });
    }

    #[test]
    fn can_sub() {
        run_test(|decryptor, encoder, encryptor, evaluator| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();
            let b_c = encryptor.encrypt(&b_p).unwrap();

            let c_c = evaluator.sub(&a_c, &b_c).unwrap();

            let c_p = decryptor.decrypt(&c_c).unwrap();
            let c = encoder.decode_signed(&c_p).unwrap();
            
            assert_eq!(a.len(), c.len());
            assert_eq!(b.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] - b[i]);
            }
        });
    }

    #[test]
    fn can_sub_inplace() {
        run_test(|decryptor, encoder, encryptor, evaluator| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();
            let b_c = encryptor.encrypt(&b_p).unwrap();

            evaluator.sub_inplace(&mut a_c, &b_c).unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let c = encoder.decode_signed(&a_p).unwrap();
            
            assert_eq!(a.len(), c.len());
            assert_eq!(b.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] - b[i]);
            }
        });
    }
}
