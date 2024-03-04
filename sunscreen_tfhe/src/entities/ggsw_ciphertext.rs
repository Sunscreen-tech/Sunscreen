use aligned_vec::AVec;
use num::{Complex, Zero};
use serde::{Deserialize, Serialize};

use crate::{
    dst::OverlaySize, ops::ciphertext::external_product_ggsw_glwe, scratch::SIMD_ALIGN, GlweDef, GlweDimension, RadixCount, RadixDecomposition, Torus, TorusOps
};

use super::{
    GgswCiphertextFftRef, GlevCiphertextIterator, GlevCiphertextIteratorMut, GlevCiphertextRef,
    GlweCiphertext, GlweCiphertextRef,
};

dst! {
    /// A GGSW ciphertext. For the FFT variant, see
    /// [`GgswCiphertextFft`](crate::entities::GgswCiphertextFft).
    GgswCiphertext,
    GgswCiphertextRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}
dst_iter! { GgswCiphertextIterator, GgswCiphertextIteratorMut, ParallelGgswCiphertextIterator, ParallelGgswCiphertextIteratorMut, Torus, GgswCiphertextRef, (TorusOps,)}

impl<S> OverlaySize for GgswCiphertextRef<S>
where
    S: TorusOps,
{
    type Inputs = (GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        GlevCiphertextRef::<S>::size(t) * (t.0.size.0 + 1)
    }
}

impl<S> GgswCiphertext<S>
where
    S: TorusOps,
{
    /// Create a new zero GGSW ciphertext with the given parameters.
    pub fn new(params: &GlweDef, radix: &RadixDecomposition) -> Self {
        let elems = GgswCiphertextRef::<S>::size((params.dim, radix.count));

        Self {
            data: avec![Torus::zero(); elems],
        }
    }

    /// Create a new GGSW ciphertext from a slice of Torus elements.
    pub fn from_slice(data: &[Torus<S>], params: &GlweDef, radix: &RadixDecomposition) -> Self {
        let elems = GgswCiphertextRef::<S>::size((params.dim, radix.count));

        assert_eq!(data.len(), elems);

        Self {
            data: AVec::from_slice(SIMD_ALIGN, data),
        }
    }

    /// Computes the external product between a GGSW ciphertext and a GLWE ciphertext.
    /// GGSW ⊡ GLWE -> GLWE
    pub fn external_product(
        &self,
        glwe: &GlweCiphertextRef<S>,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlweCiphertext<S> {
        external_product_ggsw_glwe(self, glwe, params, radix)
    }
}

impl<S> GgswCiphertextRef<S>
where
    S: TorusOps,
{
    /// Returns an iterator over the rows of the GGSW ciphertext, which are
    /// [`GlevCiphertext`](crate::entities::GlevCiphertext)s.
    pub fn rows(&self, params: &GlweDef, radix: &RadixDecomposition) -> GlevCiphertextIterator<S> {
        let stride = GlevCiphertextRef::<S>::size((params.dim, radix.count));

        GlevCiphertextIterator::new(&self.data, stride)
    }

    /// Returns a mutable iterator over the rows of the GGSW ciphertext, which are
    /// [`GlevCiphertext`](crate::entities::GlevCiphertext)s.
    pub fn rows_mut(
        &mut self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextIteratorMut<S> {
        let stride = GlevCiphertextRef::<S>::size((params.dim, radix.count));

        GlevCiphertextIteratorMut::new(&mut self.data, stride)
    }

    /// Compute the FFT of each of the GLWE ciphertexts in the GGSW ciphertext.
    /// The result is stored in `result`.
    pub fn fft(
        &self,
        result: &mut GgswCiphertextFftRef<Complex<f64>>,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) {
        self.assert_valid(params, radix);
        result.assert_valid(params, radix);

        for (s, r) in self.rows(params, radix).zip(result.rows_mut(params, radix)) {
            s.fft(r, params);
        }
    }

    #[inline(always)]
    /// Assert that the GGSW ciphertext is valid for the given parameters.
    pub fn assert_valid(&self, glwe: &GlweDef, radix: &RadixDecomposition) {
        assert_eq!(self.as_slice().len(), Self::size((glwe.dim, radix.count)));
    }
}
