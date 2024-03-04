use num::Zero;

use crate::{
    dst::{NoWrapper, OverlaySize},
    PolynomialDegree,
};

use super::{PolynomialIterator, PolynomialIteratorMut, PolynomialRef};

dst! {
   /// A list of polynomials.
   PolynomialList,
   PolynomialListRef,
   NoWrapper,
   (Debug, Clone, PartialEq, Eq,),
   ()
}

impl<S: Clone> OverlaySize for PolynomialListRef<S> {
    type Inputs = (PolynomialDegree, usize);

    fn size(t: Self::Inputs) -> usize {
        PolynomialRef::<S>::size(t.0) * t.1
    }
}

impl<S> PolynomialList<S>
where
    S: Clone + Zero,
{
    /// Create a new polynomial list, where each polynomial has the same degree.
    pub fn new(degree: PolynomialDegree, count: usize) -> Self {
        Self {
            data: avec![S::zero(); degree.0 * count],
        }
    }
}

impl<S> PolynomialListRef<S>
where
    S: Clone + Zero,
{
    /// Iterate over the polynomials in the list.
    pub fn iter(&self, degree: PolynomialDegree) -> PolynomialIterator<S> {
        PolynomialIterator::new(&self.data, PolynomialRef::<S>::size(degree))
    }

    /// Iterate over the polynomials in the list mutably.
    pub fn iter_mut(&mut self, degree: PolynomialDegree) -> PolynomialIteratorMut<S> {
        PolynomialIteratorMut::new(&mut self.data, PolynomialRef::<S>::size(degree))
    }
}
