use std::ffi::c_void;
use std::ptr::null_mut;

use crate::bindgen;
use crate::error::*;
use crate::{Ciphertext, Context, Plaintext, RelinearizationKeys};

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
pub struct EvaluatorBase {
    handle: *mut c_void,
}

unsafe impl Sync for EvaluatorBase {}
unsafe impl Send for EvaluatorBase {}

impl Drop for EvaluatorBase {
    fn drop(&mut self) {
        convert_seal_error(unsafe { bindgen::Evaluator_Destroy(self.handle) })
            .expect("Internal error in Evaluator::drop()");
    }
}

impl EvaluatorBase {
    /**
     * Creates an Evaluator instance initialized with the specified Context.
     * * `ctx` - The context.
     */
    pub(crate) fn new(ctx: &Context) -> Result<Self> {
        let mut handle = null_mut();

        convert_seal_error(unsafe { bindgen::Evaluator_Create(ctx.get_handle(), &mut handle) })?;

        Ok(Self { handle })
    }

    /**
     * Gets the handle to the internal SEAL object.
     */
    pub fn get_handle(&self) -> *mut c_void {
        self.handle
    }

    pub(crate) fn negate_inplace(&self, a: &mut Ciphertext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Negate(self.handle, a.get_handle(), a.get_handle())
        })?;

        Ok(())
    }

    pub(crate) fn negate(&self, a: &Ciphertext) -> Result<Ciphertext> {
        let out = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Negate(self.handle, a.get_handle(), out.get_handle())
        })?;

        Ok(out)
    }

    pub(crate) fn add_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Add(self.handle, a.get_handle(), b.get_handle(), a.get_handle())
        })?;

        Ok(())
    }

    pub(crate) fn add(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Add(self.handle, a.get_handle(), b.get_handle(), c.get_handle())
        })?;

        Ok(c)
    }

    pub(crate) fn add_many(&self, a: &[Ciphertext]) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        let mut a = a
            .iter()
            .map(|x| x.get_handle())
            .collect::<Vec<*mut c_void>>();

        convert_seal_error(unsafe {
            bindgen::Evaluator_AddMany(self.handle, a.len() as u64, a.as_mut_ptr(), c.get_handle())
        })?;

        Ok(c)
    }

    pub(crate) fn multiply_many(
        &self,
        a: &[Ciphertext],
        relin_keys: &RelinearizationKeys,
    ) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        let mut a = a
            .iter()
            .map(|x| x.get_handle())
            .collect::<Vec<*mut c_void>>();

        convert_seal_error(unsafe {
            bindgen::Evaluator_MultiplyMany(
                self.handle,
                a.len() as u64,
                a.as_mut_ptr(),
                relin_keys.get_handle(),
                c.get_handle(),
                null_mut(),
            )
        })?;

        Ok(c)
    }

    pub(crate) fn sub_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Sub(self.handle, a.get_handle(), b.get_handle(), a.get_handle())
        })?;

        Ok(())
    }

    pub(crate) fn sub(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Sub(self.handle, a.get_handle(), b.get_handle(), c.get_handle())
        })?;

        Ok(c)
    }

    pub(crate) fn multiply_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Multiply(
                self.handle,
                a.get_handle(),
                b.get_handle(),
                a.get_handle(),
                null_mut(),
            )
        })?;

        Ok(())
    }

    pub(crate) fn multiply(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Multiply(
                self.handle,
                a.get_handle(),
                b.get_handle(),
                c.get_handle(),
                null_mut(),
            )
        })?;

        Ok(c)
    }

    pub(crate) fn square_inplace(&self, a: &mut Ciphertext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Square(self.handle, a.get_handle(), a.get_handle(), null_mut())
        })?;

        Ok(())
    }

    pub(crate) fn square(&self, a: &Ciphertext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Square(self.handle, a.get_handle(), c.get_handle(), null_mut())
        })?;

        Ok(c)
    }

    pub(crate) fn mod_switch_to_next(&self, a: &Ciphertext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_ModSwitchToNext1(
                self.get_handle(),
                a.get_handle(),
                c.get_handle(),
                null_mut(),
            )
        })?;

        Ok(c)
    }

    pub(crate) fn mod_switch_to_next_inplace(&self, a: &Ciphertext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_ModSwitchToNext1(
                self.get_handle(),
                a.get_handle(),
                a.get_handle(),
                null_mut(),
            )
        })?;

        Ok(())
    }

    pub(crate) fn mod_switch_to_next_plaintext(&self, a: &Plaintext) -> Result<Plaintext> {
        let p = Plaintext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_ModSwitchToNext2(self.get_handle(), a.get_handle(), p.get_handle())
        })?;

        Ok(p)
    }

    pub(crate) fn mod_switch_to_next_inplace_plaintext(&self, a: &Plaintext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_ModSwitchToNext2(self.get_handle(), a.get_handle(), a.get_handle())
        })?;

        Ok(())
    }

    pub(crate) fn exponentiate(
        &self,
        a: &Ciphertext,
        exponent: u64,
        relin_keys: &RelinearizationKeys,
    ) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Exponentiate(
                self.get_handle(),
                a.get_handle(),
                exponent,
                relin_keys.get_handle(),
                c.get_handle(),
                null_mut(),
            )
        })?;

        Ok(c)
    }

    pub(crate) fn exponentiate_inplace(
        &self,
        a: &Ciphertext,
        exponent: u64,
        relin_keys: &RelinearizationKeys,
    ) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Exponentiate(
                self.get_handle(),
                a.get_handle(),
                exponent,
                relin_keys.get_handle(),
                a.get_handle(),
                null_mut(),
            )
        })?;

        Ok(())
    }

    pub(crate) fn add_plain(&self, a: &Ciphertext, b: &Plaintext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_AddPlain(
                self.get_handle(),
                a.get_handle(),
                b.get_handle(),
                c.get_handle(),
            )
        })?;

        Ok(c)
    }

    pub(crate) fn add_plain_inplace(&self, a: &mut Ciphertext, b: &Plaintext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_AddPlain(
                self.get_handle(),
                a.get_handle(),
                b.get_handle(),
                a.get_handle(),
            )
        })?;

        Ok(())
    }

    pub(crate) fn sub_plain(&self, a: &Ciphertext, b: &Plaintext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_SubPlain(
                self.get_handle(),
                a.get_handle(),
                b.get_handle(),
                c.get_handle(),
            )
        })?;

        Ok(c)
    }

    pub(crate) fn sub_plain_inplace(&self, a: &mut Ciphertext, b: &Plaintext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_SubPlain(
                self.get_handle(),
                a.get_handle(),
                b.get_handle(),
                a.get_handle(),
            )
        })?;

        Ok(())
    }

    pub(crate) fn multiply_plain(&self, a: &Ciphertext, b: &Plaintext) -> Result<Ciphertext> {
        let c = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_MultiplyPlain(
                self.get_handle(),
                a.get_handle(),
                b.get_handle(),
                c.get_handle(),
                null_mut(),
            )
        })?;

        Ok(c)
    }

    pub(crate) fn multiply_plain_inplace(&self, a: &mut Ciphertext, b: &Plaintext) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_MultiplyPlain(
                self.get_handle(),
                a.get_handle(),
                b.get_handle(),
                a.get_handle(),
                null_mut(),
            )
        })?;

        Ok(())
    }

    // TODO: NTT transform.
}
