use num::Complex;
use serde::{Deserialize, Serialize};

use crate::{
    dst::{NoWrapper, OverlaySize},
    GlweDef, GlweDimension, RadixCount, TorusOps,
};

use super::{
    GlevCiphertextRef, GlweCiphertextFftIterator, GlweCiphertextFftIteratorMut,
    GlweCiphertextFftRef,
};

dst! {
    /// The FFT variant of a GLEV ciphertext. See
    /// [GlevCiphertext](crate::entities::GlevCiphertext) for more details.
    GlevCiphertextFft,
    GlevCiphertextFftRef,
    NoWrapper,
    (Clone, Debug, Serialize, Deserialize),
    ()
}
dst_iter! { GlevCiphertextFftIterator, GlevCiphertextFftIteratorMut, ParallelGlevCiphertextFftIterator, ParallelGlevCiphertextFftIteratorMut, NoWrapper, GlevCiphertextFftRef, ()}

impl OverlaySize for GlevCiphertextFftRef<Complex<f64>> {
    type Inputs = (GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        GlweCiphertextFftRef::<Complex<f64>>::size(t.0) * t.1 .0
    }
}

impl GlevCiphertextFftRef<Complex<f64>> {
    /// Returns an iterator over the rows of the GLEV ciphertext, which are
    /// [`GlweCiphertextFft`](crate::entities::GlweCiphertextFft)s.
    pub fn glwe_ciphertexts(&self, params: &GlweDef) -> GlweCiphertextFftIterator<Complex<f64>> {
        GlweCiphertextFftIterator::new(
            &self.data,
            GlweCiphertextFftRef::<Complex<f64>>::size(params.dim),
        )
    }

    /// Returns a mutable iterator over the rows of the GLEV ciphertext, which are
    /// [`GlweCiphertextFft`](crate::entities::GlweCiphertextFft)s.
    pub fn glwe_ciphertexts_mut(
        &mut self,
        params: &GlweDef,
    ) -> GlweCiphertextFftIteratorMut<Complex<f64>> {
        GlweCiphertextFftIteratorMut::new(
            &mut self.data,
            GlweCiphertextFftRef::<Complex<f64>>::size(params.dim),
        )
    }

    /// Computes the inverse FFT of the GLEV ciphertexts and stores computation
    /// in `result`.
    pub fn ifft<S: TorusOps>(&self, result: &mut GlevCiphertextRef<S>, params: &GlweDef) {
        for (i, ifft) in self
            .glwe_ciphertexts(params)
            .zip(result.glwe_ciphertexts_mut(params))
        {
            i.ifft(ifft, params);
        }
    }
}
