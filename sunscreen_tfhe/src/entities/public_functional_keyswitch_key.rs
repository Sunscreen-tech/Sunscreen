use serde::{Deserialize, Serialize};
use sunscreen_math::Zero;

use crate::{
    dst::OverlaySize,
    entities::{GlevCiphertextIterator, GlevCiphertextIteratorMut, GlevCiphertextRef},
    GlweDef, GlweDimension, LweDef, LweDimension, RadixCount, RadixDecomposition, Torus, TorusOps,
};

use super::GlweCiphertextRef;

dst! {
    /// Public Functional Key Switching Key. See
    /// [`module`](crate::ops::keyswitch::public_functional_keyswitch)
    /// documentation for more details.
    PublicFunctionalKeyswitchKey,
    PublicFunctionalKeyswitchKeyRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}

impl<S: TorusOps> OverlaySize for PublicFunctionalKeyswitchKeyRef<S> {
    type Inputs = (LweDimension, GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        GlweCiphertextRef::<S>::size(t.1) * t.0 .0 * t.2 .0
    }
}

impl<S: TorusOps> PublicFunctionalKeyswitchKey<S> {
    /// Construct a new uninitialized [`PublicFunctionalKeyswitchKey`]. This key is used
    /// when performing a [`public_functional_keyswitch`](crate::ops::keyswitch::public_functional_keyswitch).
    pub fn new(from_lwe: &LweDef, to_glwe: &GlweDef, radix: &RadixDecomposition) -> Self {
        let len =
            PublicFunctionalKeyswitchKeyRef::<S>::size((from_lwe.dim, to_glwe.dim, radix.count));

        Self {
            data: avec![Torus::zero(); len],
        }
    }
}

impl<S: TorusOps> PublicFunctionalKeyswitchKeyRef<S> {
    /// Iterate over the rows of the [`PublicFunctionalKeyswitchKey`].
    pub fn glevs(
        &self,
        to_glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextIterator<S> {
        let stride = GlevCiphertextRef::<S>::size((to_glwe.dim, radix.count));

        GlevCiphertextIterator::new(self.as_slice(), stride)
    }

    /// Iterate over the rows of the [`PublicFunctionalKeyswitchKey`] mutably.
    pub fn glevs_mut(
        &mut self,
        to_glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextIteratorMut<S> {
        let stride = GlevCiphertextRef::<S>::size((to_glwe.dim, radix.count));

        GlevCiphertextIteratorMut::new(self.as_mut_slice(), stride)
    }

    /// Asserts that the key is valid for the given parameters.
    pub fn assert_valid(&self, from_lwe: &LweDef, to_glwe: &GlweDef, radix: &RadixDecomposition) {
        assert_eq!(
            self.as_slice().len(),
            PublicFunctionalKeyswitchKeyRef::<S>::size((from_lwe.dim, to_glwe.dim, radix.count))
        );
    }
}
