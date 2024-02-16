use serde::{Deserialize, Serialize};

use crate::{dst::OverlaySize, LweDef, LweDimension, RadixCount, Torus, TorusOps};

use super::{LweCiphertextIterator, LweCiphertextIteratorMut, LweCiphertextRef};

// Iteration over LWE ciphertexts
dst! {
    /// A Lev Ciphertext is a collection of LWE ciphertexts.
    LevCiphertext,
    LevCiphertextRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps,)
}
dst_iter! { LevCiphertextIterator, LevCiphertextIteratorMut, Torus, LevCiphertextRef, (TorusOps,)}

impl<S> OverlaySize for LevCiphertextRef<S>
where
    S: TorusOps,
{
    type Inputs = (LweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        LweCiphertextRef::<S>::size(t.0) * t.1 .0
    }
}

impl<S> LevCiphertextRef<S>
where
    S: TorusOps,
{
    /// Returns an iterator over the rows of the Lev ciphertext, which are
    /// [`LweCiphertext`](crate::entities::LweCiphertext)s.
    pub fn lwe_ciphertexts(&self, params: &LweDef) -> LweCiphertextIterator<S> {
        LweCiphertextIterator::new(&self.data, LweCiphertextRef::<S>::size(params.dim))
    }

    /// Returns a mutable iterator over the rows of the Lev ciphertext, which are
    /// [`LweCiphertext`](crate::entities::LweCiphertext)s.
    pub fn lwe_ciphertexts_mut(&mut self, params: &LweDef) -> LweCiphertextIteratorMut<S> {
        LweCiphertextIteratorMut::new(&mut self.data, LweCiphertextRef::<S>::size(params.dim))
    }
}
