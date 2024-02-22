use serde::{Deserialize, Serialize};
use sunscreen_math::Zero;

use crate::{
    dst::OverlaySize,
    entities::{GlevCiphertextIterator, GlevCiphertextIteratorMut, GlevCiphertextRef},
    GlweDef, GlweDimension, LweDef, LweDimension, PrivateFunctionalKeyswitchLweCount, RadixCount,
    RadixDecomposition, Torus, TorusOps,
};

use super::LweSecretKeyRef;

dst! {
    /// Key for Private Functional Key Switching. See
    /// [`module`](crate::ops::keyswitch::private_functional_keyswitch)
    /// documentation for more details.
    PrivateFunctionalKeyswitchKey,
    PrivateFunctionalKeyswitchKeyRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}
dst_iter!(
    PrivateFunctionalKeyswitchKeyIter,
    PrivateFunctionalKeyswitchKeyIterMut,
    ParallelPrivateFunctionalKeyswitchKeyIter,
    ParallelPrivateFunctionalKeyswitchKeyIterMut,
    Torus,
    PrivateFunctionalKeyswitchKeyRef,
    (TorusOps,)
);

impl<S: TorusOps> OverlaySize for PrivateFunctionalKeyswitchKeyRef<S> {
    type Inputs = (
        LweDimension,
        GlweDimension,
        RadixCount,
        PrivateFunctionalKeyswitchLweCount,
    );

    fn size(t: Self::Inputs) -> usize {
        GlevCiphertextRef::<S>::size((t.1, t.2)) * (LweSecretKeyRef::<S>::size(t.0) + 1) * t.3 .0
    }
}

impl<S: TorusOps> PrivateFunctionalKeyswitchKey<S> {
    /// Construct a new uninitialized [`PrivateFunctionalKeyswitchKey`]. This key is used
    /// compute a secret function mapping `lwe_count`
    /// [`LweCiphertext`](crate::entities::LweCiphertext)s to a
    /// [`GlweCiphertext`](crate::entities::GlweCiphertext).
    ///
    /// # Remarks
    /// The key is composed of a `(from_lwe.dim + 1) * lwe_count.0` matrix of
    /// [`GlevCiphertext`](crate::entities::GlevCiphertext)s. The leading
    /// dimension contains radix-scaled encryptions of the bits in a
    /// [`LweSecretKey`](crate::entities::LweSecretKey) followed by a scaled
    /// encryption of -1.
    ///
    /// Plaintexts in the GLEV are scaled by the usual `q/beta^(j+1)`.
    ///
    /// The trailing dimension iterates over `0..lwe_count.0`.
    pub fn new(
        from_lwe: &LweDef,
        to_glwe: &GlweDef,
        radix: &RadixDecomposition,
        lwe_count: &PrivateFunctionalKeyswitchLweCount,
    ) -> Self {
        Self {
            data: vec![
                Torus::zero();
                PrivateFunctionalKeyswitchKeyRef::<S>::size((
                    from_lwe.dim,
                    to_glwe.dim,
                    radix.count,
                    *lwe_count
                ))
            ],
        }
    }
}

impl<S: TorusOps> PrivateFunctionalKeyswitchKeyRef<S> {
    /// Returns an iterator over the
    /// [`GlevCiphertext`](crate::entities::GlevCiphertext)s that
    /// compose this key.
    ///
    /// # See also
    /// To make sense of the layout, see also [`PrivateFunctionalKeyswitchKey::new()`](./struct.PrivateFunctionalKeyswitchKey.html#remarks).
    pub fn glevs(
        &self,
        to_glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextIterator<S> {
        GlevCiphertextIterator::new(
            self.as_slice(),
            GlevCiphertextRef::<S>::size((to_glwe.dim, radix.count)),
        )
    }

    /// Returns a muitable iterator over the
    /// [`GlevCiphertext`](crate::entities::GlevCiphertext)s that compose this
    /// key.
    ///
    /// # See also
    /// To make sense of the layout, see also [`PrivateFunctionalKeyswitchKey::new()`](./struct.PrivateFunctionalKeyswitchKey.html#remarks).
    pub fn glevs_mut(
        &mut self,
        to_glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextIteratorMut<S> {
        GlevCiphertextIteratorMut::new(
            self.as_mut_slice(),
            GlevCiphertextRef::<S>::size((to_glwe.dim, radix.count)),
        )
    }

    #[inline(always)]
    /// Assert this value is correct for the given parameters.
    pub fn assert_valid(
        &self,
        from_lwe: &LweDef,
        to_glwe: &GlweDef,
        radix: &RadixDecomposition,
        lwe_count: &PrivateFunctionalKeyswitchLweCount,
    ) {
        assert_eq!(
            self.as_slice().len(),
            PrivateFunctionalKeyswitchKeyRef::<S>::size((
                from_lwe.dim,
                to_glwe.dim,
                radix.count,
                *lwe_count
            ))
        )
    }
}
