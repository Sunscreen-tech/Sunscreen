use serde::{Deserialize, Serialize};
use sunscreen_math::Zero;

use crate::{
    dst::{FromMutSlice, FromSlice, OverlaySize},
    entities::PolynomialRef,
    ops::{bootstrapping::generate_bivariate_lut, encryption::trivially_encrypt_glwe_ciphertext},
    scratch::{allocate_scratch_ref},
    CarryBits, GlweDef, GlweDimension, PlaintextBits, Torus, TorusOps,
};

use super::{GlweCiphertextRef, UnivariateLookupTableRef};

dst! {
    /// Lookup table for a bivariate function used during
    /// [`programmable_bootstrap_bivariate`](crate::ops::bootstrapping::programmable_bootstrap_bivariate)
    /// See that function for more details.
    BivariateLookupTable,
    BivariateLookupTableRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}

impl<S: TorusOps> OverlaySize for BivariateLookupTableRef<S> {
    type Inputs = GlweDimension;

    fn size(t: Self::Inputs) -> usize {
        GlweCiphertextRef::<S>::size(t)
    }
}

impl<S: TorusOps> BivariateLookupTable<S> {
    /// Creates a [BivariateLookupTable] filled with the result of
    /// a function applied to every possible pair of plaintext inputs.
    pub fn trivial_from_fn<F>(
        map: F,
        glwe: &GlweDef,
        plaintext_bits: PlaintextBits,
        carry_bits: CarryBits,
    ) -> Self
    where
        F: Fn(u64, u64) -> u64,
    {
        let mut lut = BivariateLookupTable {
            data: avec!(Torus::zero(); BivariateLookupTableRef::<S>::size(glwe.dim))
        };

        lut.fill_trivial_from_fn(map, glwe, plaintext_bits, carry_bits);

        lut
    }
}

impl<S: TorusOps> BivariateLookupTableRef<S> {
    /// Convert a [BivariateLookupTableRef] to a [UnivariateLookupTableRef].
    pub fn as_univariate(&self) -> &UnivariateLookupTableRef<S> {
        // This works because a bivariate lookup table is just a univariate
        // lookup table.
        UnivariateLookupTableRef::from_slice(&self.data)
    }

    /// Gets a copy of the underlying [GlweCiphertextRef] from the
    /// [BivariateLookupTableRef].
    pub fn glwe(&self) -> &GlweCiphertextRef<S> {
        GlweCiphertextRef::from_slice(&self.data)
    }

    /// Gets a mutable copy of the underlying [GlweCiphertextRef] from the
    /// [BivariateLookupTableRef].
    pub fn glwe_mut(&mut self) -> &mut GlweCiphertextRef<S> {
        GlweCiphertextRef::from_mut_slice(&mut self.data)
    }

    /// Fills the [BivariateLookupTableRef] with the result of a bivariate
    /// function.
    pub fn fill_trivial_from_fn<F: Fn(u64, u64) -> u64>(
        &mut self,
        map: F,
        glwe: &GlweDef,
        plaintext_bits: PlaintextBits,
        carry_bits: CarryBits,
    ) {
        allocate_scratch_ref!(poly, PolynomialRef<Torus<S>>, (glwe.dim.polynomial_degree));

        generate_bivariate_lut(poly, map, glwe, plaintext_bits, carry_bits);

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
