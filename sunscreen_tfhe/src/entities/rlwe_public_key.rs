use serde::{Deserialize, Serialize};
use sunscreen_math::Zero;

use crate::dst::{FromMutSlice, FromSlice};
use crate::GlweDef;
use crate::{dst::OverlaySize, GlweDimension, Torus, TorusOps};

use crate::entities::GlweCiphertextRef;

use super::PolynomialRef;

dst! {
    /// An RLWE public key.
    RlwePublicKey,
    RlwePublicKeyRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}

impl<S> OverlaySize for RlwePublicKeyRef<S>
where
    S: TorusOps,
{
    type Inputs = GlweDimension;

    fn size(t: Self::Inputs) -> usize {
        GlweCiphertextRef::<S>::size(t)
    }
}

impl<S> RlwePublicKey<S>
where
    S: TorusOps,
{
    /// Creates an uninitialized public key.
    pub fn new(glwe: &GlweDef) -> Self {
        assert_eq!(glwe.dim.size.0, 1);

        Self {
            data: avec![Torus::zero(); GlweCiphertextRef::<S>::size(glwe.dim)],
        }
    }
}

impl<S> RlwePublicKeyRef<S>
where
    S: TorusOps,
{
    /// Returns a reference to the internal encryption of zero.
    pub fn zero_encryption(&self) -> &GlweCiphertextRef<S> {
        GlweCiphertextRef::from_slice(&self.data)
    }

    /// Returns a mutable reference to the internal encryption of zero.
    pub fn zero_encryption_mut(&mut self) -> &mut GlweCiphertextRef<S> {
        GlweCiphertextRef::from_mut_slice(&mut self.data)
    }

    /// Returns the p0 and p1 components of this public key.
    pub fn p0_p1(&self, glwe: &GlweDef) -> (&PolynomialRef<Torus<S>>, &PolynomialRef<Torus<S>>) {
        let (mut p0, p1) = self.zero_encryption().a_b(glwe);

        (p0.next().unwrap(), p1)
    }

    /// Asserts this (`RlwePublicKey`)[RlwePublicKey] matches the given glwe parameters.
    pub fn assert_valid(&self, glwe: &GlweDef) {
        assert_eq!(
            self.as_slice().len(),
            GlweCiphertextRef::<S>::size(glwe.dim)
        )
    }
}
