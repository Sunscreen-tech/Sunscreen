
use num::{Complex, Zero};
use serde::{Deserialize, Serialize};

use crate::{
    dst::{FromMutSlice, FromSlice, OverlaySize},
    entities::GgswCiphertextRef,
    macros::{impl_binary_op, impl_unary_op},
    ops::ciphertext::external_product_ggsw_glwe,
    GlweDef, GlweDimension, RadixDecomposition, Torus, TorusOps,
};

use super::{
    GlweCiphertextFftRef, GlweSecretKeyRef, PolynomialIterator, PolynomialIteratorMut,
    PolynomialRef,
};

dst! {
    /// A GLWE ciphertext.
    GlweCiphertext,
    GlweCiphertextRef,
    Torus,
    (Debug, Clone, Serialize, Deserialize),
    (TorusOps)
}
dst_iter! { GlweCiphertextIterator, GlweCiphertextIteratorMut, ParallelGlweCiphertextIterator, ParallelGlweCiphertextIteratorMut, Torus, GlweCiphertextRef, (TorusOps,) }

// Also implements the assign operators.
impl_binary_op!(Add, GlweCiphertext, (TorusOps,));
impl_binary_op!(Sub, GlweCiphertext, (TorusOps,));
impl_unary_op!(Neg, GlweCiphertext);

impl<S> OverlaySize for GlweCiphertextRef<S>
where
    S: TorusOps,
{
    type Inputs = GlweDimension;

    fn size(t: Self::Inputs) -> usize {
        // We have `n` a polynomials plus 1 b polynomial each of degree d.
        GlweSecretKeyRef::<S>::size(t) + t.polynomial_degree.0
    }
}

impl<S> GlweCiphertext<S>
where
    S: TorusOps,
{
    /// Initialize an empty (zero) GLWE ciphertext
    pub fn new(params: &GlweDef) -> GlweCiphertext<S> {
        params.dim.assert_valid();

        let len = GlweCiphertextRef::<S>::size(params.dim);

        GlweCiphertext {
            data: avec![Torus::zero(); len],
        }
    }

    /// Computes the external product of a GLWE ciphertext and a GGSW ciphertext.
    /// GGSW ⊡ GLWE -> GLWE
    pub fn external_product(
        &self,
        ggsw: &GgswCiphertextRef<S>,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlweCiphertext<S> {
        external_product_ggsw_glwe(ggsw, self, params, radix)
    }

    /// Generate a GLWE ciphertext from a slice of [crate::TorusOps] elements.
    pub fn from_slice(data: &[S], params: &GlweDef) -> GlweCiphertext<S> {
        assert_eq!(data.len(), GlweCiphertextRef::<S>::size(params.dim));

        GlweCiphertext {
            data: avec_from_iter!(data.iter().map(|x| Torus::from(*x))),
        }
    }
}

impl<S> GlweCiphertextRef<S>
where
    S: TorusOps,
{
    /// Returns an iterator over the `a` polynomials and the `b` polynomial.
    pub fn a_b(
        &self,
        params: &GlweDef,
    ) -> (PolynomialIterator<Torus<S>>, &PolynomialRef<Torus<S>>) {
        let (a, b) = self.data.as_ref().split_at(self.split_idx(params));

        (
            PolynomialIterator::new(a, params.dim.polynomial_degree.0),
            PolynomialRef::from_slice(b),
        )
    }

    /// Returns an interator over the a polynomials in a GLWE ciphertext.
    pub fn a(&self, params: &GlweDef) -> PolynomialIterator<Torus<S>> {
        self.a_b(params).0
    }

    /// Returns a reference to the b polynomial in a GLWE ciphertext.
    pub fn b(&self, params: &GlweDef) -> &PolynomialRef<Torus<S>> {
        self.a_b(params).1
    }

    /// Returns an iterator over the `a` polynomials and the `b` polynomial.
    pub fn a_b_mut(
        &mut self,
        params: &GlweDef,
    ) -> (
        PolynomialIteratorMut<Torus<S>>,
        &mut PolynomialRef<Torus<S>>,
    ) {
        let polynomial_degree = params.dim.polynomial_degree;
        let split_idx = self.split_idx(params);

        let (a, b) = self.data.as_mut().split_at_mut(split_idx);

        (
            PolynomialIteratorMut::new(a, polynomial_degree.0),
            PolynomialRef::from_mut_slice(b),
        )
    }

    /// Returns a mutable iterator over the a polynomials in a GLWE ciphertext.
    pub fn a_mut(&mut self, params: &GlweDef) -> PolynomialIteratorMut<Torus<S>> {
        self.a_b_mut(params).0
    }

    /// Returns a mutable reference to the b polynomial in a GLWE ciphertext.
    pub fn b_mut(&mut self, params: &GlweDef) -> &mut PolynomialRef<Torus<S>> {
        self.a_b_mut(params).1
    }

    fn split_idx(&self, params: &GlweDef) -> usize {
        params.dim.size.0 * params.dim.polynomial_degree.0
    }

    /// Create an FFT transformed version of `self` stored to result.
    pub fn fft(&self, result: &mut GlweCiphertextFftRef<Complex<f64>>, params: &GlweDef) {
        self.assert_valid(params);
        result.assert_valid(params);

        for (a, fft) in self.a(params).zip(result.a_mut(params)) {
            a.fft(fft);
        }

        self.b(params).fft(result.b_mut(params));
    }

    #[inline(always)]
    /// Asserts that this entity is valid for the given `params`
    pub fn assert_valid(&self, params: &GlweDef) {
        assert_eq!(
            self.as_slice().len(),
            GlweCiphertextRef::<S>::size(params.dim)
        )
    }
}
