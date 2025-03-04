use num::{Complex, Zero};
use serde::{Deserialize, Serialize};

use crate::{
    dst::{AsMutSlice, AsSlice, NoWrapper, OverlaySize},
    entities::{
        GgswCiphertextFftIterator, GgswCiphertextFftIteratorMut, GgswCiphertextFftRef,
        GgswCiphertextIterator, GgswCiphertextIteratorMut, GgswCiphertextRef,
    },
    GlweDef, GlweDimension, RadixCount, RadixDecomposition, Torus, TorusOps,
};

dst! {
    /// An encrypted amount to rotate the polynomials in a GLWE ciphertext by.
    /// The [BlindRotationShiftFft] variant of this type is used by the
    /// [`blind_rotate`](crate::ops::bootstrapping::blind_rotation) function.
    BlindRotationShift,
    BlindRotationShiftRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}

impl<S: TorusOps> OverlaySize for BlindRotationShiftRef<S> {
    type Inputs = (GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        let n_bits = (t.0.polynomial_degree.0 as u64).ilog2() as usize;

        GgswCiphertextRef::<S>::size(t) * n_bits
    }
}

impl<S: TorusOps> BlindRotationShift<S> {
    /// Create a new zero [BlindRotationShift] with the given parameters.
    ///
    /// A blind rotation shift is a collection of GGSW ciphertexts, each of
    /// which encrypts a single bit in position `i` representing how much to
    /// shift the input by as `2^i`.
    pub fn new(params: &GlweDef, radix: &RadixDecomposition) -> Self {
        let len = BlindRotationShiftRef::<S>::size((params.dim, radix.count));

        Self {
            data: avec![Torus::zero(); len],
        }
    }
}

impl<S: TorusOps> BlindRotationShiftRef<S> {
    /// Iterate over the rows of the [BlindRotationShift].
    pub fn rows(&self, params: &GlweDef, radix: &RadixDecomposition) -> GgswCiphertextIterator<S> {
        let stride = GgswCiphertextRef::<S>::size((params.dim, radix.count));

        GgswCiphertextIterator::new(self.as_slice(), stride)
    }

    /// Iterate over the rows of the [BlindRotationShift] mutably.
    pub fn rows_mut(
        &mut self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GgswCiphertextIteratorMut<S> {
        let stride = GgswCiphertextRef::<S>::size((params.dim, radix.count));

        GgswCiphertextIteratorMut::new(self.as_mut_slice(), stride)
    }
}

dst! {
    /// An encrypted amount to rotate the polynomials in a GLWE ciphertext by.
    /// Used by the
    /// [`blind_rotate`](crate::ops::bootstrapping::blind_rotation) function.
    /// The non-FFT version of this type is [BlindRotationShift].
    BlindRotationShiftFft,
    BlindRotationShiftFftRef,
    NoWrapper,
    (Clone, Debug, Serialize, Deserialize),
    ()
}

impl OverlaySize for BlindRotationShiftFftRef<Complex<f64>> {
    type Inputs = (GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        let n_bits = (t.0.polynomial_degree.0 as u64).ilog2() as usize;

        GgswCiphertextFftRef::<Complex<f64>>::size(t) * n_bits
    }
}

impl BlindRotationShiftFft<Complex<f64>> {
    /// Create a new zero [BlindRotationShiftFft] with the given parameters.
    pub fn new(params: &GlweDef, radix: &RadixDecomposition) -> Self {
        let len = BlindRotationShiftFftRef::size((params.dim, radix.count));

        Self {
            data: avec![Complex::zero(); len],
        }
    }
}

impl BlindRotationShiftFftRef<Complex<f64>> {
    /// Iterate over the rows of the [BlindRotationShiftFft].
    pub fn rows(
        &self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GgswCiphertextFftIterator<Complex<f64>> {
        let stride = GgswCiphertextFftRef::<Complex<f64>>::size((params.dim, radix.count));

        GgswCiphertextFftIterator::new(self.as_slice(), stride)
    }

    /// Iterate over the rows of the [BlindRotationShiftFft] mutably.
    pub fn rows_mut(
        &mut self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GgswCiphertextFftIteratorMut<Complex<f64>> {
        let stride = GgswCiphertextFftRef::<Complex<f64>>::size((params.dim, radix.count));

        GgswCiphertextFftIteratorMut::new(self.as_mut_slice(), stride)
    }

    /// Compute the inverse FFT of the [BlindRotationShiftFft] and store the
    /// result in the result [BlindRotationShift].
    pub fn ifft<S: TorusOps>(
        &self,
        result: &mut BlindRotationShiftRef<S>,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) {
        for (s, r) in self.rows(params, radix).zip(result.rows_mut(params, radix)) {
            s.ifft(r, params, radix);
        }
    }
}
