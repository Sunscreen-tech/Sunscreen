use serde::{Deserialize, Serialize};
use sunscreen_math::Zero;

use crate::{
    dst::{AsMutSlice, AsSlice, OverlaySize},
    GlweDef, GlweDimension, LweDef, LweDimension, PrivateFunctionalKeyswitchLweCount, RadixCount,
    RadixDecomposition, Torus, TorusOps,
};

use super::{
    ParallelPrivateFunctionalKeyswitchKeyIter, ParallelPrivateFunctionalKeyswitchKeyIterMut,
    PrivateFunctionalKeyswitchKeyIter, PrivateFunctionalKeyswitchKeyIterMut,
    PrivateFunctionalKeyswitchKeyRef,
};

dst! {
    /// Key for Circuit Bootstrapping Key Switching.
    CircuitBootstrappingKeyswitchKeys,
    CircuitBootstrappingKeyswitchKeysRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}

impl<S: TorusOps> OverlaySize for CircuitBootstrappingKeyswitchKeysRef<S> {
    type Inputs = (LweDimension, GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        PrivateFunctionalKeyswitchKeyRef::<S>::size((
            t.0,
            t.1,
            t.2,
            PrivateFunctionalKeyswitchLweCount(1),
        )) * (t.1.size.0 + 1)
    }
}

impl<S: TorusOps> CircuitBootstrappingKeyswitchKeys<S> {
    /// Allocate a new [`CircuitBootstrappingKeyswitchKeys`] for the given parameters.
    pub fn new(from_lwe: &LweDef, to_glwe: &GlweDef, radix: &RadixDecomposition) -> Self {
        let len = CircuitBootstrappingKeyswitchKeysRef::<S>::size((
            from_lwe.dim,
            to_glwe.dim,
            radix.count,
        ));

        Self {
            data: avec![Torus::zero(); len],
        }
    }
}

impl<S: TorusOps> CircuitBootstrappingKeyswitchKeysRef<S> {
    /// Get an iterator over the contained [`PrivateFunctionalKeyswitchKey`](crate::entities::PrivateFunctionalKeyswitchKey)s.
    pub fn keys(
        &self,
        lwe: &LweDef,
        glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> PrivateFunctionalKeyswitchKeyIter<S> {
        let stride = PrivateFunctionalKeyswitchKeyRef::<S>::size((
            lwe.dim,
            glwe.dim,
            radix.count,
            PrivateFunctionalKeyswitchLweCount(1),
        ));

        PrivateFunctionalKeyswitchKeyIter::new(self.as_slice(), stride)
    }

    /// Get a parallel iterator over the contained [`PrivateFunctionalKeyswitchKey`](crate::entities::PrivateFunctionalKeyswitchKey)s.
    pub fn keys_par(
        &self,
        lwe: &LweDef,
        glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> ParallelPrivateFunctionalKeyswitchKeyIter<S> {
        let stride = PrivateFunctionalKeyswitchKeyRef::<S>::size((
            lwe.dim,
            glwe.dim,
            radix.count,
            PrivateFunctionalKeyswitchLweCount(1),
        ));

        ParallelPrivateFunctionalKeyswitchKeyIter::new(self.as_slice(), stride)
    }

    /// Get a mutable iterator over the contained [`PrivateFunctionalKeyswitchKey`](crate::entities::PrivateFunctionalKeyswitchKey)s.
    pub fn keys_mut(
        &mut self,
        lwe: &LweDef,
        glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> PrivateFunctionalKeyswitchKeyIterMut<S> {
        let stride = PrivateFunctionalKeyswitchKeyRef::<S>::size((
            lwe.dim,
            glwe.dim,
            radix.count,
            PrivateFunctionalKeyswitchLweCount(1),
        ));

        PrivateFunctionalKeyswitchKeyIterMut::new(self.as_mut_slice(), stride)
    }

    /// Get a mutable parallel iterator over the contained [`PrivateFunctionalKeyswitchKey`](crate::entities::PrivateFunctionalKeyswitchKey)s.
    pub fn keys_par_mut(
        &mut self,
        lwe: &LweDef,
        glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> ParallelPrivateFunctionalKeyswitchKeyIterMut<S> {
        let stride = PrivateFunctionalKeyswitchKeyRef::<S>::size((
            lwe.dim,
            glwe.dim,
            radix.count,
            PrivateFunctionalKeyswitchLweCount(1),
        ));

        ParallelPrivateFunctionalKeyswitchKeyIterMut::new(self.as_mut_slice(), stride)
    }
}
