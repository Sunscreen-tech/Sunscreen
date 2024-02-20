use num::{Complex, Zero};
use serde::{Deserialize, Serialize};

use crate::{
    dst::{NoWrapper, OverlaySize},
    entities::GgswCiphertextRef,
    GlweDef, GlweDimension, RadixCount, RadixDecomposition, TorusOps,
};

use super::{GlevCiphertextFftIterator, GlevCiphertextFftIteratorMut, GlevCiphertextFftRef};

dst! {
    /// The FFT variant of a GGSW ciphertext. See
    /// [`GgswCiphertext`](crate::entities::GgswCiphertext) for more details.
    GgswCiphertextFft,
    GgswCiphertextFftRef,
    NoWrapper,
    (Clone, Debug, Serialize, Deserialize),
    ()
}
dst_iter! { GgswCiphertextFftIterator, GgswCiphertextFftIteratorMut, NoWrapper, GgswCiphertextFftRef, ()}

impl OverlaySize for GgswCiphertextFftRef<Complex<f64>> {
    type Inputs = (GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        GlevCiphertextFftRef::<Complex<f64>>::size(t) * (t.0.size.0 + 1)
    }
}

impl GgswCiphertextFft<Complex<f64>> {
    /// Creates a new GGSW ciphertext with FFT representation.
    pub fn new(params: &GlweDef, radix: &RadixDecomposition) -> GgswCiphertextFft<Complex<f64>> {
        let len = GgswCiphertextFftRef::size((params.dim, radix.count));

        GgswCiphertextFft {
            data: vec![Complex::zero(); len],
        }
    }
}

impl GgswCiphertextFftRef<Complex<f64>> {
    /// Returns an iterator over the rows of the GGSW ciphertext, which are
    /// [GlevCiphertextFft](crate::entities::GlevCiphertextFft)s.
    pub fn rows(
        &self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextFftIterator<Complex<f64>> {
        let stride = GlevCiphertextFftRef::<Complex<f64>>::size((params.dim, radix.count));

        GlevCiphertextFftIterator::new(self.as_slice(), stride)
    }

    /// Returns a mutable iterator over the rows of the GGSW ciphertext, which are
    /// [GlevCiphertextFft](crate::entities::GlevCiphertextFft)s.
    pub fn rows_mut(
        &mut self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextFftIteratorMut<Complex<f64>> {
        let stride = GlevCiphertextFftRef::<Complex<f64>>::size((params.dim, radix.count));

        GlevCiphertextFftIteratorMut::new(self.as_mut_slice(), stride)
    }

    /// Computes the inverse FFT of the GGSW ciphertexts and stores computation
    /// in `result`.
    pub fn ifft<S: TorusOps>(
        &self,
        result: &mut GgswCiphertextRef<S>,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) {
        for (s, r) in self.rows(params, radix).zip(result.rows_mut(params, radix)) {
            s.ifft(r, params);
        }
    }

    #[inline(always)]
    /// Asserts that this entity is valid under the passed parameters.
    pub fn assert_valid(&self, glwe: &GlweDef, radix: &RadixDecomposition) {
        assert_eq!(Self::size((glwe.dim, radix.count)), self.data.len());
    }
}
