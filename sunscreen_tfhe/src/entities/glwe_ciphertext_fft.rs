use num::{complex::Complex64, Complex, Zero};
use serde::{Deserialize, Serialize};

use crate::{
    dst::{FromMutSlice, FromSlice, NoWrapper, OverlaySize},
    GlweDef, GlweDimension, TorusOps,
};

use super::{GlweCiphertextRef, PolynomialFftIterator, PolynomialFftIteratorMut, PolynomialFftRef};

dst! {
    /// The FFT variant of a GLWE ciphertext. See
    /// [`GlweCiphertext`](crate::entities::GlweCiphertext) for more details.
    GlweCiphertextFft,
    GlweCiphertextFftRef,
    NoWrapper,
    (Clone, Debug, Serialize, Deserialize),
    ()
}
dst_iter! { GlweCiphertextFftIterator, GlweCiphertextFftIteratorMut, NoWrapper, GlweCiphertextFftRef, ()}

impl OverlaySize for GlweCiphertextFftRef<Complex<f64>> {
    type Inputs = GlweDimension;

    fn size(t: Self::Inputs) -> usize {
        // FFT polynomials are half the length of their standard counterparts.
        PolynomialFftRef::<Complex<f64>>::size(t.polynomial_degree) * (t.size.0 + 1)
    }
}

impl GlweCiphertextFft<Complex<f64>> {
    /// Creates a new zero GLWE ciphertext in the frequency domain.
    pub fn new(params: &GlweDef) -> Self {
        let len = GlweCiphertextFftRef::size(params.dim);

        Self {
            data: vec![Complex::zero(); len],
        }
    }
}

impl GlweCiphertextFftRef<Complex<f64>> {
    /// Returns an iterator over the `a` polynomials and the `b` polynomial.
    pub fn a_b(
        &self,
        params: &GlweDef,
    ) -> (
        PolynomialFftIterator<Complex<f64>>,
        &PolynomialFftRef<Complex<f64>>,
    ) {
        let (a, b) = self.as_slice().split_at(self.split_idx(params));

        (
            PolynomialFftIterator::new(a, params.dim.polynomial_degree.0 / 2),
            PolynomialFftRef::from_slice(b),
        )
    }

    /// Returns an interator over the a polynomials in a GLWE ciphertext.
    pub fn a(&self, params: &GlweDef) -> PolynomialFftIterator<Complex<f64>> {
        self.a_b(params).0
    }

    /// Returns a reference to the b polynomial in a GLWE ciphertext.
    pub fn b(&self, params: &GlweDef) -> &PolynomialFftRef<Complex64> {
        self.a_b(params).1
    }

    /// Returns an iterator over the `a` polynomials and the `b` polynomial.
    pub fn a_b_mut(
        &mut self,
        params: &GlweDef,
    ) -> (
        PolynomialFftIteratorMut<Complex<f64>>,
        &mut PolynomialFftRef<Complex<f64>>,
    ) {
        let polynomial_degree = params.dim.polynomial_degree;
        let split_idx = self.split_idx(params);

        let (a, b) = self.as_mut_slice().split_at_mut(split_idx);

        (
            PolynomialFftIteratorMut::new(a, polynomial_degree.0 / 2),
            PolynomialFftRef::from_mut_slice(b),
        )
    }

    /// Returns a mutable iterator over the a polynomials in a GLWE ciphertext.
    pub fn a_mut(&mut self, params: &GlweDef) -> PolynomialFftIteratorMut<Complex<f64>> {
        self.a_b_mut(params).0
    }

    /// Returns a mutable reference to the b polynomial in a GLWE ciphertext.
    pub fn b_mut(&mut self, params: &GlweDef) -> &mut PolynomialFftRef<Complex<f64>> {
        self.a_b_mut(params).1
    }

    #[inline(always)]
    fn split_idx(&self, params: &GlweDef) -> usize {
        params.dim.size.0 * params.dim.polynomial_degree.0 / 2
    }

    /// Computes the inverse FFT of the GLWE ciphertext and stores the
    /// computation in `result`.
    pub fn ifft<T: TorusOps>(&self, result: &mut GlweCiphertextRef<T>, params: &GlweDef) {
        for (a, fft) in self.a(params).zip(result.a_mut(params)) {
            a.ifft(fft);
        }

        self.b(params).ifft(result.b_mut(params));
    }
}

#[cfg(test)]
mod tests {
    use crate::{entities::Polynomial, high_level::*, PlaintextBits, GLWE_1_1024_80};

    #[test]
    fn can_decrypt_glwe_after_fft_roundtrip() {
        let params = GLWE_1_1024_80;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_binary_glwe_sk(&params);

        let pt = (0..params.dim.polynomial_degree.0 as u64)
            .map(|x| x % 2)
            .collect::<Vec<_>>();
        let pt = Polynomial::new(&pt);

        let mut ct = encryption::encrypt_glwe(&pt, &sk, &params, bits);
        let fft = fft::fft_glwe(&ct, &params);

        fft.ifft(&mut ct, &params);

        let actual = encryption::decrypt_glwe(&ct, &sk, &params, bits);

        assert_eq!(actual, pt);
    }
}
