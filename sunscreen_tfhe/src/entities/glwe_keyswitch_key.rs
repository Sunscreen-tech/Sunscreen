use num::Zero;
use serde::{Deserialize, Serialize};

use crate::{
    dst::OverlaySize, GlweDef, GlweDimension, RadixCount, RadixDecomposition, Torus, TorusOps,
};

use super::{GlevCiphertextIterator, GlevCiphertextIteratorMut, GlevCiphertextRef};

// TODO: This GLWE keyswitch only works for switching to a new key with the same
// parameter. Copy what is above but changed for polynomials to enable
// converting to a different key parameter set.
dst! {
    /// A GLWE keyswitch key used to switch a ciphertext from one key to another.
    /// See [`module`](crate::ops::keyswitch) documentation for more details.
    GlweKeyswitchKey,
    GlweKeyswitchKeyRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps,)
}

impl<S> OverlaySize for GlweKeyswitchKeyRef<S>
where
    S: TorusOps,
{
    type Inputs = (GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        GlevCiphertextRef::<S>::size(t) * (t.0.size.0)
    }
}

impl<S> GlweKeyswitchKey<S>
where
    S: TorusOps,
{
    /// Creates a new GLWE keyswitch key. This enables switching to a new key as
    /// well as switching from the `original_params` that define the first key
    /// to the `new_params` that define the second key.
    pub fn new(params: &GlweDef, radix: &RadixDecomposition) -> Self {
        // TODO: Shouldn't this function take 2 GlweDefs?
        // Ryan: to whoever wrote this, yes, see the above todo next to the dst.
        let elems = GlweKeyswitchKeyRef::<S>::size((params.dim, radix.count));

        Self {
            data: avec![Torus::zero(); elems],
        }
    }
}

impl<S> GlweKeyswitchKeyRef<S>
where
    S: TorusOps,
{
    /// Returns an iterator over the rows of the GLWE keyswitch key, which are
    /// [`GlevCiphertext`](crate::entities::GlevCiphertext)s.
    pub fn rows(&self, params: &GlweDef, radix: &RadixDecomposition) -> GlevCiphertextIterator<S> {
        let stride = GlevCiphertextRef::<S>::size((params.dim, radix.count));

        GlevCiphertextIterator::new(&self.data, stride)
    }

    /// Returns a mutable iterator over the rows of the GLWE keyswitch key, which are
    /// [`GlevCiphertext`](crate::entities::GlevCiphertext)s.
    pub fn rows_mut(
        &mut self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextIteratorMut<S> {
        let stride = GlevCiphertextRef::<S>::size((params.dim, radix.count));

        GlevCiphertextIteratorMut::new(&mut self.data, stride)
    }
}
