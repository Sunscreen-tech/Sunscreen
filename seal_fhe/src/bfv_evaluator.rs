use std::ptr::null_mut;

use crate::evaluator_base::EvaluatorBase;
use crate::{
    bindgen, error::convert_seal_error, Ciphertext, Context, Evaluator, GaloisKeys, Plaintext,
    RelinearizationKeys, Result,
};

/**
 * An evaluator that contains additional operations specific to the BFV scheme.
 */
pub struct BFVEvaluator(EvaluatorBase);

impl std::ops::Deref for BFVEvaluator {
    type Target = EvaluatorBase;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl BFVEvaluator {
    /**
     * Creates a BFVEvaluator instance initialized with the specified Context.
     * * `ctx` - The context.
     */
    pub fn new(ctx: &Context) -> Result<BFVEvaluator> {
        Ok(BFVEvaluator(EvaluatorBase::new(ctx)?))
    }
}

impl Evaluator for BFVEvaluator {
    fn negate_inplace(&self, a: &mut Ciphertext) -> Result<()> {
        self.0.negate_inplace(a)
    }

    fn negate(&self, a: &Ciphertext) -> Result<Ciphertext> {
        self.0.negate(a)
    }

    fn add_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()> {
        self.0.add_inplace(a, b)
    }

    fn add(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext> {
        self.0.add(a, b)
    }

    fn add_many(&self, a: &[Ciphertext]) -> Result<Ciphertext> {
        self.0.add_many(a)
    }

    fn multiply_many(
        &self,
        a: &[Ciphertext],
        relin_keys: &RelinearizationKeys,
    ) -> Result<Ciphertext> {
        self.0.multiply_many(a, relin_keys)
    }

    fn sub_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()> {
        self.0.sub_inplace(a, b)
    }

    fn sub(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext> {
        self.0.sub(a, b)
    }

    fn multiply_inplace(&self, a: &mut Ciphertext, b: &Ciphertext) -> Result<()> {
        self.0.multiply_inplace(a, b)
    }

    fn multiply(&self, a: &Ciphertext, b: &Ciphertext) -> Result<Ciphertext> {
        self.0.multiply(a, b)
    }

    fn square_inplace(&self, a: &mut Ciphertext) -> Result<()> {
        self.0.square_inplace(a)
    }

    fn square(&self, a: &Ciphertext) -> Result<Ciphertext> {
        self.0.square(a)
    }

    fn mod_switch_to_next(&self, a: &Ciphertext) -> Result<Ciphertext> {
        self.0.mod_switch_to_next(a)
    }

    fn mod_switch_to_next_inplace(&self, a: &Ciphertext) -> Result<()> {
        self.0.mod_switch_to_next_inplace(a)
    }

    fn mod_switch_to_next_plaintext(&self, a: &Plaintext) -> Result<Plaintext> {
        self.0.mod_switch_to_next_plaintext(a)
    }

    fn mod_switch_to_next_inplace_plaintext(&self, a: &Plaintext) -> Result<()> {
        self.0.mod_switch_to_next_inplace_plaintext(a)
    }

    fn exponentiate(
        &self,
        a: &Ciphertext,
        exponent: u64,
        relin_keys: &RelinearizationKeys,
    ) -> Result<Ciphertext> {
        self.0.exponentiate(a, exponent, relin_keys)
    }

    fn exponentiate_inplace(
        &self,
        a: &Ciphertext,
        exponent: u64,
        relin_keys: &RelinearizationKeys,
    ) -> Result<()> {
        self.0.exponentiate_inplace(a, exponent, relin_keys)
    }

    fn add_plain(&self, a: &Ciphertext, b: &Plaintext) -> Result<Ciphertext> {
        self.0.add_plain(a, b)
    }

    fn add_plain_inplace(&self, a: &mut Ciphertext, b: &Plaintext) -> Result<()> {
        self.0.add_plain_inplace(a, b)
    }

    fn sub_plain(&self, a: &Ciphertext, b: &Plaintext) -> Result<Ciphertext> {
        self.0.sub_plain(a, b)
    }

    fn sub_plain_inplace(&self, a: &mut Ciphertext, b: &Plaintext) -> Result<()> {
        self.0.sub_plain_inplace(a, b)
    }

    fn multiply_plain(&self, a: &Ciphertext, b: &Plaintext) -> Result<Ciphertext> {
        self.0.multiply_plain(a, b)
    }

    fn multiply_plain_inplace(&self, a: &mut Ciphertext, b: &Plaintext) -> Result<()> {
        self.0.multiply_plain_inplace(a, b)
    }

    fn relinearize_inplace(
        &self,
        a: &mut Ciphertext,
        relin_keys: &RelinearizationKeys,
    ) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_Relinearize(
                self.get_handle(),
                a.get_handle(),
                relin_keys.get_handle(),
                a.get_handle(),
                null_mut(),
            )
        })?;

        Ok(())
    }

    fn relinearize(&self, a: &Ciphertext, relin_keys: &RelinearizationKeys) -> Result<Ciphertext> {
        let out = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_Relinearize(
                self.get_handle(),
                a.get_handle(),
                relin_keys.get_handle(),
                out.get_handle(),
                null_mut(),
            )
        })?;

        Ok(out)
    }

    fn rotate_rows(
        &self,
        a: &Ciphertext,
        steps: i32,
        galois_keys: &GaloisKeys,
    ) -> Result<Ciphertext> {
        let out = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_RotateRows(
                self.get_handle(),
                a.get_handle(),
                steps,
                galois_keys.get_handle(),
                out.get_handle(),
                null_mut(),
            )
        })?;

        Ok(out)
    }

    fn rotate_rows_inplace(
        &self,
        a: &Ciphertext,
        steps: i32,
        galois_keys: &GaloisKeys,
    ) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_RotateRows(
                self.get_handle(),
                a.get_handle(),
                steps,
                galois_keys.get_handle(),
                a.get_handle(),
                null_mut(),
            )
        })?;

        Ok(())
    }

    fn rotate_columns(&self, a: &Ciphertext, galois_keys: &GaloisKeys) -> Result<Ciphertext> {
        let out = Ciphertext::new()?;

        convert_seal_error(unsafe {
            bindgen::Evaluator_RotateColumns(
                self.get_handle(),
                a.get_handle(),
                galois_keys.get_handle(),
                out.get_handle(),
                null_mut(),
            )
        })?;

        Ok(out)
    }

    fn rotate_columns_inplace(&self, a: &Ciphertext, galois_keys: &GaloisKeys) -> Result<()> {
        convert_seal_error(unsafe {
            bindgen::Evaluator_RotateColumns(
                self.get_handle(),
                a.get_handle(),
                galois_keys.get_handle(),
                a.get_handle(),
                null_mut(),
            )
        })?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::*;

    fn run_bfv_test<F>(test: F)
    where
        F: FnOnce(Decryptor, BFVEncoder, Encryptor, BFVEvaluator, KeyGenerator),
    {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &[50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus(PlainModulus::batching(8192, 32).unwrap())
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
        let evaluator = BFVEvaluator::new(&ctx).unwrap();

        test(decryptor, encoder, encryptor, evaluator, gen);
    }

    fn make_vec(encoder: &BFVEncoder) -> Vec<i64> {
        let mut data = vec![];

        for i in 0..encoder.get_slot_count() {
            data.push(encoder.get_slot_count() as i64 / 2i64 - i as i64)
        }

        data
    }

    fn make_small_vec(encoder: &BFVEncoder) -> Vec<i64> {
        let mut data = vec![];

        for i in 0..encoder.get_slot_count() {
            data.push(16i64 - i as i64 % 32i64);
        }

        data
    }

    #[test]
    fn can_create_and_destroy_evaluator() {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(8192)
            .set_coefficient_modulus(
                CoefficientModulus::create(8192, &[50, 30, 30, 50, 50]).unwrap(),
            )
            .set_plain_modulus(PlainModulus::batching(8192, 20).unwrap())
            .build()
            .unwrap();

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();

        let evaluator = EvaluatorBase::new(&ctx);

        std::mem::drop(evaluator);
    }

    #[test]
    fn can_negate() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
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
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
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
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
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
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
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
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
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
    fn can_multiply_many() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, keygen| {
            let relin_keys = keygen.create_relinearization_keys().unwrap();

            let a = make_small_vec(&encoder);
            let b = make_small_vec(&encoder);
            let c = make_small_vec(&encoder);
            let d = make_small_vec(&encoder);
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

            let out_c = evaluator.multiply_many(&data_c, &relin_keys).unwrap();

            let out_p = decryptor.decrypt(&out_c).unwrap();
            let out = encoder.decode_signed(&out_p).unwrap();

            assert_eq!(a.len(), out.len());
            assert_eq!(b.len(), out.len());
            assert_eq!(c.len(), out.len());
            assert_eq!(d.len(), out.len());

            for i in 0..a.len() {
                assert_eq!(out[i], a[i] * b[i] * c[i] * d[i]);
            }
        });
    }

    #[test]
    fn can_sub() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
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
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
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

    #[test]
    fn can_multiply() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();
            let b_c = encryptor.encrypt(&b_p).unwrap();

            let c_c = evaluator.multiply(&a_c, &b_c).unwrap();

            let c_p = decryptor.decrypt(&c_c).unwrap();
            let c = encoder.decode_signed(&c_p).unwrap();

            assert_eq!(a.len(), c.len());
            assert_eq!(b.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] * b[i]);
            }
        });
    }

    #[test]
    fn can_multiply_inplace() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();
            let b_c = encryptor.encrypt(&b_p).unwrap();

            evaluator.multiply_inplace(&mut a_c, &b_c).unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let c = encoder.decode_signed(&a_p).unwrap();

            assert_eq!(a.len(), c.len());
            assert_eq!(b.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] * b[i]);
            }
        });
    }

    #[test]
    fn can_square() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            let b_c = evaluator.square(&a_c).unwrap();

            let b_p = decryptor.decrypt(&b_c).unwrap();
            let b = encoder.decode_signed(&b_p).unwrap();

            assert_eq!(a.len(), b.len());

            for i in 0..a.len() {
                assert_eq!(b[i], a[i] * a[i]);
            }
        });
    }

    #[test]
    fn can_square_inplace() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();

            evaluator.square_inplace(&mut a_c).unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let b = encoder.decode_signed(&a_p).unwrap();

            assert_eq!(a.len(), b.len());

            for i in 0..a.len() {
                assert_eq!(b[i], a[i] * a[i]);
            }
        });
    }

    #[test]
    fn can_relinearize_inplace() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, keygen| {
            let relin_keys = keygen.create_relinearization_keys().unwrap();

            let a = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();
            let mut a_c_2 = encryptor.encrypt(&a_p).unwrap();

            let noise_before = decryptor.invariant_noise_budget(&a_c).unwrap();

            evaluator.square_inplace(&mut a_c).unwrap();
            evaluator
                .relinearize_inplace(&mut a_c, &relin_keys)
                .unwrap();
            evaluator.square_inplace(&mut a_c).unwrap();
            evaluator
                .relinearize_inplace(&mut a_c, &relin_keys)
                .unwrap();

            let relin_noise = noise_before - decryptor.invariant_noise_budget(&a_c).unwrap();

            let noise_before = decryptor.invariant_noise_budget(&a_c_2).unwrap();

            evaluator.square_inplace(&mut a_c_2).unwrap();
            evaluator.square_inplace(&mut a_c_2).unwrap();

            let no_relin_noise = noise_before - decryptor.invariant_noise_budget(&a_c_2).unwrap();

            assert_eq!(relin_noise < no_relin_noise, true)
        });
    }

    #[test]
    fn can_relinearize() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, keygen| {
            let relin_keys = keygen.create_relinearization_keys().unwrap();

            let a = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();
            let mut a_c_2 = encryptor.encrypt(&a_p).unwrap();

            let noise_before = decryptor.invariant_noise_budget(&a_c).unwrap();

            evaluator.square_inplace(&mut a_c).unwrap();
            let mut a_c = evaluator.relinearize(&a_c, &relin_keys).unwrap();
            evaluator.square_inplace(&mut a_c).unwrap();
            let a_c = evaluator.relinearize(&a_c, &relin_keys).unwrap();

            let relin_noise = noise_before - decryptor.invariant_noise_budget(&a_c).unwrap();

            let noise_before = decryptor.invariant_noise_budget(&a_c_2).unwrap();

            evaluator.square_inplace(&mut a_c_2).unwrap();
            evaluator.square_inplace(&mut a_c_2).unwrap();

            let no_relin_noise = noise_before - decryptor.invariant_noise_budget(&a_c_2).unwrap();

            assert_eq!(relin_noise < no_relin_noise, true)
        });
    }

    #[test]
    fn can_exponentiate() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, keygen| {
            let relin_keys = keygen.create_relinearization_keys().unwrap();

            let a = make_small_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            let c_c = evaluator.exponentiate(&a_c, 4, &relin_keys).unwrap();

            let c_p = decryptor.decrypt(&c_c).unwrap();
            let c = encoder.decode_signed(&c_p).unwrap();

            assert_eq!(a.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] * a[i] * a[i] * a[i]);
            }
        });
    }

    #[test]
    fn can_exponentiate_inplace() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, keygen| {
            let relin_keys = keygen.create_relinearization_keys().unwrap();

            let a = make_small_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            evaluator
                .exponentiate_inplace(&a_c, 4, &relin_keys)
                .unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let c = encoder.decode_signed(&a_p).unwrap();

            assert_eq!(a.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] * a[i] * a[i] * a[i]);
            }
        });
    }

    #[test]
    fn can_add_plain() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            let c_c = evaluator.add_plain(&a_c, &b_p).unwrap();

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
    fn can_add_plain_inplace() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();

            evaluator.add_plain_inplace(&mut a_c, &b_p).unwrap();

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
    fn can_sub_plain() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            let c_c = evaluator.sub_plain(&a_c, &b_p).unwrap();

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
    fn can_sub_plain_inplace() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();

            evaluator.sub_plain_inplace(&mut a_c, &b_p).unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let c = encoder.decode_signed(&a_p).unwrap();

            assert_eq!(a.len(), c.len());
            assert_eq!(b.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] - b[i]);
            }
        });
    }

    #[test]
    fn can_multiply_plain() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            let c_c = evaluator.multiply_plain(&a_c, &b_p).unwrap();

            let c_p = decryptor.decrypt(&c_c).unwrap();
            let c = encoder.decode_signed(&c_p).unwrap();

            assert_eq!(a.len(), c.len());
            assert_eq!(b.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] * b[i]);
            }
        });
    }

    #[test]
    fn can_multiply_plain_inplace() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, _| {
            let a = make_vec(&encoder);
            let b = make_vec(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let b_p = encoder.encode_signed(&b).unwrap();
            let mut a_c = encryptor.encrypt(&a_p).unwrap();

            evaluator.multiply_plain_inplace(&mut a_c, &b_p).unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let c = encoder.decode_signed(&a_p).unwrap();

            assert_eq!(a.len(), c.len());
            assert_eq!(b.len(), c.len());

            for i in 0..a.len() {
                assert_eq!(c[i], a[i] * b[i]);
            }
        });
    }

    fn make_matrix(encoder: &BFVEncoder) -> Vec<i64> {
        let dim = encoder.get_slot_count();
        let dim_2 = dim / 2;

        let mut matrix = vec![0i64; dim];

        matrix[0] = 1;
        matrix[1] = -2;
        matrix[dim_2] = -1;
        matrix[dim_2 + 1] = 2;

        matrix
    }

    #[test]
    fn can_rotate_rows() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, keygen| {
            let galois_keys = keygen.create_galois_keys();

            let a = make_matrix(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            let c_c = evaluator
                .rotate_rows(&a_c, -1, &galois_keys.unwrap())
                .unwrap();

            let c_p = decryptor.decrypt(&c_c).unwrap();
            let c = encoder.decode_signed(&c_p).unwrap();

            assert_eq!(a[0], c[1]);
            assert_eq!(a[1], c[2]);
            assert_eq!(a[4096], c[4097]);
            assert_eq!(a[4097], c[4098]);
        });
    }

    #[test]
    fn can_rotate_rows_inplace() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, keygen| {
            let galois_keys = keygen.create_galois_keys();

            let a = make_matrix(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            evaluator
                .rotate_rows_inplace(&a_c, -1, &galois_keys.unwrap())
                .unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let c = encoder.decode_signed(&a_p).unwrap();

            assert_eq!(a[0], c[1]);
            assert_eq!(a[1], c[2]);
            assert_eq!(a[4096], c[4097]);
            assert_eq!(a[4097], c[4098]);
        });
    }

    #[test]
    fn can_rotate_columns() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, keygen| {
            let galois_keys = keygen.create_galois_keys();

            let a = make_matrix(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            let c_c = evaluator
                .rotate_columns(&a_c, &galois_keys.unwrap())
                .unwrap();

            let c_p = decryptor.decrypt(&c_c).unwrap();
            let c = encoder.decode_signed(&c_p).unwrap();

            assert_eq!(a[0], c[4096]);
            assert_eq!(a[1], c[4097]);
            assert_eq!(a[4096], c[0]);
            assert_eq!(a[4097], c[1]);
        });
    }

    #[test]
    fn can_rotate_columns_inplace() {
        run_bfv_test(|decryptor, encoder, encryptor, evaluator, keygen| {
            let galois_keys = keygen.create_galois_keys();

            let a = make_matrix(&encoder);
            let a_p = encoder.encode_signed(&a).unwrap();
            let a_c = encryptor.encrypt(&a_p).unwrap();

            evaluator
                .rotate_columns_inplace(&a_c, &galois_keys.unwrap())
                .unwrap();

            let a_p = decryptor.decrypt(&a_c).unwrap();
            let c = encoder.decode_signed(&a_p).unwrap();

            assert_eq!(a[0], c[4096]);
            assert_eq!(a[1], c[4097]);
            assert_eq!(a[4096], c[0]);
            assert_eq!(a[4097], c[1]);
        });
    }
}
