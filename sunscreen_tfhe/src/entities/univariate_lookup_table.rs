use serde::{Deserialize, Serialize};
use sunscreen_math::Zero;

use crate::{
    dst::{FromMutSlice, FromSlice, OverlaySize},
    entities::PolynomialRef,
    ops::{bootstrapping::generate_lut, encryption::trivially_encrypt_glwe_ciphertext},
    scratch::allocate_scratch_ref,
    GlweDef, GlweDimension, PlaintextBits, Torus, TorusOps,
};

use super::GlweCiphertextRef;

dst! {
    /// Lookup table for a univariate function used during
    /// [`programmable_bootstrap`](crate::ops::bootstrapping::programmable_bootstrap)
    /// and [`circuit_bootstrap`](crate::ops::bootstrapping::circuit_bootstrap).
    UnivariateLookupTable,
    UnivariateLookupTableRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}

impl<S: TorusOps> OverlaySize for UnivariateLookupTableRef<S> {
    type Inputs = GlweDimension;

    fn size(t: Self::Inputs) -> usize {
        GlweCiphertextRef::<S>::size(t)
    }
}

impl<S: TorusOps> UnivariateLookupTable<S> {
    /// Creates a lookup table that is trivially encrypted.
    pub fn trivial_from_fn<F>(map: F, glwe: &GlweDef, plaintext_bits: PlaintextBits) -> Self
    where
        F: Fn(u64) -> u64,
    {
        let mut lut = UnivariateLookupTable {
            data: vec![Torus::zero(); UnivariateLookupTableRef::<S>::size(glwe.dim)],
        };

        lut.fill_trivial_from_fn(map, glwe, plaintext_bits);

        lut
    }
}

impl<S: TorusOps> UnivariateLookupTableRef<S> {
    /// Return the underlying GLWE representation of a lookup table.
    pub fn glwe(&self) -> &GlweCiphertextRef<S> {
        GlweCiphertextRef::from_slice(&self.data)
    }

    /// Return a mutable representation of the underlying GLWE representation of
    /// a lookup table.
    pub fn glwe_mut(&mut self) -> &mut GlweCiphertextRef<S> {
        GlweCiphertextRef::from_mut_slice(&mut self.data)
    }

    /// Generates a look up table filled with the values from the provided map,
    /// and trivially encrypts the lookup table.
    pub fn fill_trivial_from_fn<F: Fn(u64) -> u64>(
        &mut self,
        map: F,
        glwe: &GlweDef,
        plaintext_bits: PlaintextBits,
    ) {
        allocate_scratch_ref!(poly, PolynomialRef<Torus<S>>, (glwe.dim.polynomial_degree));

        generate_lut(poly, map, glwe, plaintext_bits);

        trivially_encrypt_glwe_ciphertext(self.glwe_mut(), poly, glwe);
    }

    /// Creates a lookup table filled with the same value at every entry.
    pub fn fill_with_constant(&mut self, val: S, glwe: &GlweDef, plaintext_bits: PlaintextBits) {
        self.clear();
        for o in self.glwe_mut().b_mut(glwe).coeffs_mut() {
            *o = Torus::encode(val, plaintext_bits);
        }
    }
}
