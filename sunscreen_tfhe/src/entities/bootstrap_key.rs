use num::{Complex, Zero};
use serde::{Deserialize, Serialize};

use crate::{
    dst::{AsMutSlice, AsSlice, NoWrapper, OverlaySize},
    entities::{
        GgswCiphertextFftIterator, GgswCiphertextFftIteratorMut, GgswCiphertextFftRef,
        GgswCiphertextIterator, GgswCiphertextIteratorMut, GgswCiphertextRef,
        ParallelGgswCiphertextIterator, ParallelGgswCiphertextIteratorMut,
    },
    GlweDef, GlweDimension, LweDef, LweDimension, RadixCount, RadixDecomposition, Torus, TorusOps,
};

dst! {
    /// Keys used for bootstrapping. The [BootstrapKeyFft] variant of this type
    /// is used by the bootstrapping functions such as
    /// [`programmable_bootstrap_univariate`](crate::ops::bootstrapping::programmable_bootstrap_univariate).
    BootstrapKey,
    BootstrapKeyRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}

impl<S: TorusOps> OverlaySize for BootstrapKeyRef<S> {
    type Inputs = (LweDimension, GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        GgswCiphertextRef::<S>::size((t.1, t.2)) * t.0 .0
    }
}

impl<S: TorusOps> BootstrapKey<S> {
    /// Create a new zero [BootstrapKey] with the given parameters.
    ///
    /// A bootstrapping key is a collection of GGSW ciphertexts, each of which
    /// encrypts a single bit of an LWE secret key. This representation cannot
    /// be directly with the bootstrapping functions, but the FFT version of the
    /// bootstrapping key that can be used with the bootstrapping functions can
    /// be created by calling the [BootstrapKeyRef::fft] method
    pub fn new(lwe_params: &LweDef, glwe_params: &GlweDef, radix: &RadixDecomposition) -> Self {
        let len = BootstrapKeyRef::<S>::size((lwe_params.dim, glwe_params.dim, radix.count));

        Self {
            data: avec![Torus::zero(); len],
        }
    }
}

impl<S: TorusOps> BootstrapKeyRef<S> {
    /// Iterate over the rows of the [BootstrapKey].
    pub fn rows(&self, params: &GlweDef, radix: &RadixDecomposition) -> GgswCiphertextIterator<S> {
        let stride = GgswCiphertextRef::<S>::size((params.dim, radix.count));

        GgswCiphertextIterator::new(self.as_slice(), stride)
    }

    /// Iterate in parallel over the rows of the [BootstrapKey].
    pub fn rows_par(
        &self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> ParallelGgswCiphertextIterator<S> {
        let stride = GgswCiphertextRef::<S>::size((params.dim, radix.count));

        ParallelGgswCiphertextIterator::new(self.as_slice(), stride)
    }

    /// Iterate over the rows of the [BootstrapKey] mutably.
    pub fn rows_mut(
        &mut self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GgswCiphertextIteratorMut<S> {
        let stride = GgswCiphertextRef::<S>::size((params.dim, radix.count));

        GgswCiphertextIteratorMut::new(self.as_mut_slice(), stride)
    }

    /// Iterate in parallel over the rows of the [BootstrapKey].
    pub fn rows_par_mut(
        &mut self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> ParallelGgswCiphertextIteratorMut<S> {
        let stride = GgswCiphertextRef::<S>::size((params.dim, radix.count));

        ParallelGgswCiphertextIteratorMut::new(self.as_mut_slice(), stride)
    }

    /// Perform an FFT on the [BootstrapKey] to obtain a [BootstrapKeyFft].
    pub fn fft(
        &self,
        result: &mut BootstrapKeyFftRef<Complex<f64>>,
        lwe: &LweDef,
        glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) {
        self.assert_valid(lwe, glwe, radix);
        result.assert_valid(lwe, glwe, radix);

        for (s, r) in self.rows(glwe, radix).zip(result.rows_mut(glwe, radix)) {
            s.fft(r, glwe, radix);
        }
    }

    #[inline(always)]
    /// Asserts that this entity is valid under the passed parameters.
    pub fn assert_valid(&self, lwe: &LweDef, glwe: &GlweDef, radix: &RadixDecomposition) {
        assert_eq!(
            Self::size((lwe.dim, glwe.dim, radix.count)),
            self.data.len()
        );
    }
}

dst! {
    /// Keys used for bootstrapping. Used by the bootstrapping functions such as
    /// [`programmable_bootstrap_univariate`](crate::ops::bootstrapping::programmable_bootstrap_univariate).
    /// The non-FFT variant of this type is [BootstrapKey].
    BootstrapKeyFft,
    BootstrapKeyFftRef,
    NoWrapper,
    (Clone, Debug, Serialize, Deserialize),
    ()
}

impl OverlaySize for BootstrapKeyFftRef<Complex<f64>> {
    type Inputs = (LweDimension, GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        GgswCiphertextFftRef::<Complex<f64>>::size((t.1, t.2)) * t.0 .0
    }
}

impl BootstrapKeyFft<Complex<f64>> {
    /// Create a new zero [BootstrapKeyFft] with the given parameters.
    ///
    /// A bootstrapping key is a collection of GGSW ciphertexts, each of which
    /// encrypts a single bit of an LWE secret key. In this representation, the
    /// GGSW ciphertexts are in the frequency domain and can be used directly by
    /// the bootstrapping functions such as
    /// [`programmable_bootstrap_univariate`](crate::ops::bootstrapping::programmable_bootstrap_univariate).
    pub fn new(lwe_params: &LweDef, glwe_params: &GlweDef, radix: &RadixDecomposition) -> Self {
        let len = BootstrapKeyFftRef::size((lwe_params.dim, glwe_params.dim, radix.count));

        Self {
            data: avec![Complex::zero(); len],
        }
    }
}

impl BootstrapKeyFftRef<Complex<f64>> {
    /// Iterate over the rows of the [BootstrapKeyFft].
    pub fn rows(
        &self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GgswCiphertextFftIterator<Complex<f64>> {
        let stride = GgswCiphertextFftRef::<Complex<f64>>::size((params.dim, radix.count));

        GgswCiphertextFftIterator::new(self.as_slice(), stride)
    }

    /// Iterate over the rows of the [BootstrapKeyFft] mutably.
    pub fn rows_mut(
        &mut self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GgswCiphertextFftIteratorMut<Complex<f64>> {
        let stride = GgswCiphertextFftRef::<Complex<f64>>::size((params.dim, radix.count));

        GgswCiphertextFftIteratorMut::new(self.as_mut_slice(), stride)
    }

    /// Perform an IFFT on the [BootstrapKeyFft] to obtain a [BootstrapKey].
    pub fn ifft<S: TorusOps>(
        &self,
        result: &mut BootstrapKeyRef<S>,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) {
        for (s, r) in self.rows(params, radix).zip(result.rows_mut(params, radix)) {
            s.ifft(r, params, radix);
        }
    }

    /// Asserts that the [BootstrapKeyFft] is valid for the given parameters.
    #[inline(always)]
    pub fn assert_valid(&self, lwe: &LweDef, glwe: &GlweDef, radix: &RadixDecomposition) {
        assert_eq!(
            self.as_slice().len(),
            BootstrapKeyFftRef::size((lwe.dim, glwe.dim, radix.count))
        );
    }
}
