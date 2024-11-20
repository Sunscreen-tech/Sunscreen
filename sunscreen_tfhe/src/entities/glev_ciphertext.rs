use num::{Complex, Zero};
use serde::{Deserialize, Serialize};

use crate::{
    dst::OverlaySize, GlweDef, GlweDimension, RadixCount, RadixDecomposition, Torus, TorusOps,
};

use super::{
    GlevCiphertextFftRef, GlweCiphertextIterator, GlweCiphertextIteratorMut, GlweCiphertextRef,
};

dst! {
    /// A GLEV ciphertext. For the FFT variant, see
    /// [`GlevCiphertextFft`](crate::entities::GlevCiphertextFft).
    GlevCiphertext,
    GlevCiphertextRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps,)
}
dst_iter! { GlevCiphertextIterator, GlevCiphertextIteratorMut, ParallelGlevCiphertextIterator, ParallelGlevCiphertextIteratorMut, Torus, GlevCiphertextRef, (TorusOps,)}

impl<S> OverlaySize for GlevCiphertextRef<S>
where
    S: TorusOps,
{
    type Inputs = (GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        GlweCiphertextRef::<S>::size(t.0) * t.1 .0
    }
}

impl<S> GlevCiphertext<S>
where
    S: TorusOps,
{
    /// Create a new zero GGSW ciphertext with the given parameters.
    pub fn new(params: &GlweDef, radix: &RadixDecomposition) -> Self {
        let elems = GlevCiphertextRef::<S>::size((params.dim, radix.count));

        Self {
            data: avec![Torus::zero(); elems],
        }
    }
}

impl<S> GlevCiphertextRef<S>
where
    S: TorusOps,
{
    /// Returns an iterator over the rows of the GLEV ciphertext, which are
    /// [`GlweCiphertext`](crate::entities::GlweCiphertext)s.
    pub fn glwe_ciphertexts(&self, params: &GlweDef) -> GlweCiphertextIterator<S> {
        GlweCiphertextIterator::new(&self.data, GlweCiphertextRef::<S>::size(params.dim))
    }

    /// Returns a mutable iterator over the rows of the GLEV ciphertext, which are
    /// [`GlweCiphertext](crate::entities::GlweCiphertext)s.
    pub fn glwe_ciphertexts_mut(&mut self, params: &GlweDef) -> GlweCiphertextIteratorMut<S> {
        GlweCiphertextIteratorMut::new(&mut self.data, GlweCiphertextRef::<S>::size(params.dim))
    }

    /// Compute the FFT of each of the GLWE ciphertexts in the GLEV ciphertext.
    /// The result is stored in `result`.
    pub fn fft(&self, result: &mut GlevCiphertextFftRef<Complex<f64>>, params: &GlweDef) {
        for (i, fft) in self
            .glwe_ciphertexts(params)
            .zip(result.glwe_ciphertexts_mut(params))
        {
            i.fft(fft, params);
        }
    }

    /// Assert that this entityt is valid.
    pub fn assert_valid(&self, params: &GlweDef, radix: &RadixDecomposition) {
        assert_eq!(
            self.data.len(),
            GlevCiphertextRef::<S>::size((params.dim, radix.count))
        );
    }
}
