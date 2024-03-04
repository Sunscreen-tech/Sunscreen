use std::{
    num::Wrapping,
    ops::{Add, AddAssign, Mul, Sub, SubAssign},
};

use aligned_vec::AVec;
use num::{Complex, Zero};

use crate::{
    dst::{FromMutSlice, FromSlice, NoWrapper, OverlaySize},
    fft::negacyclic::get_fft,
    polynomial::{polynomial_add_assign, polynomial_external_mad, polynomial_sub_assign},
    scratch::{allocate_scratch, SIMD_ALIGN},
    FrequencyTransform, PolynomialDegree, ReinterpretAsSigned, ToF64, Torus, TorusOps,
};

use super::PolynomialFftRef;

dst! {
    /// A type representing a polynomial.
    Polynomial,
    PolynomialRef,
    NoWrapper,
    (Debug, Clone, PartialEq, Eq,),
    ()
}
dst_iter! { PolynomialIterator, PolynomialIteratorMut, ParallelPolynomialIterator, ParallelPolynomialIteratorMut, NoWrapper, PolynomialRef, () }

impl<T> OverlaySize for PolynomialRef<T>
where
    T: Clone,
{
    type Inputs = PolynomialDegree;

    fn size(t: Self::Inputs) -> usize {
        t.0
    }
}

impl<T> Polynomial<T>
where
    T: Clone,
{
    /// Create a new polynomial from a slice of coefficients.
    pub fn new(data: &[T]) -> Polynomial<T> {
        Polynomial {
            data: AVec::from_slice(SIMD_ALIGN, data),
        }
    }

    /// Create a new polynomial filled with zeros of a specified length.
    pub fn zero(len: usize) -> Polynomial<T>
    where
        T: Zero,
    {
        Polynomial {
            data: avec![T::zero(); len],
        }
    }
}

impl<T> FromIterator<T> for Polynomial<T>
where
    T: Clone,
{
    fn from_iter<I: IntoIterator<Item = T>>(iter: I) -> Self {
        Self {
            data: AVec::from_iter(SIMD_ALIGN, iter),
        }
    }
}

impl<T> PolynomialRef<T>
where
    T: Clone,
{
    /// Returns the coefficients of the polynomial in ascending order.
    pub fn coeffs(&self) -> &[T] {
        &self.data
    }

    /// Returns the mutable coefficients of the polynomial in ascending order.
    pub fn coeffs_mut(&mut self) -> &mut [T] {
        &mut self.data
    }

    /// Apply a function to each coefficient of the polynomial and return a new
    /// polynomial.
    pub fn map<F, U>(&self, f: F) -> Polynomial<U>
    where
        F: Fn(&T) -> U,
        U: Clone,
    {
        Polynomial {
            data: AVec::from_iter(SIMD_ALIGN, self.data.iter().map(f)),
        }
    }

    /// Maps this polynomial using f into the dst [`PolynomialRef`].
    ///
    /// # Panics
    /// If `dst.len() != self.len()`
    pub fn map_into<F, U>(&self, dst: &mut PolynomialRef<U>, f: F)
    where
        F: Fn(&T) -> U,
        U: Clone,
    {
        assert_eq!(dst.len(), self.len());

        dst.coeffs_mut()
            .iter_mut()
            .zip(self.coeffs().iter())
            .for_each(|(d, s)| *d = f(s));
    }

    /// Returns the number of coefficients in the polynomial.
    #[inline]
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Returns true if the polynomial has no coefficients.
    #[inline]
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

impl<T> PolynomialRef<T>
where
    T: TorusOps,
{
    /// Reinterpret the this polynomial as a polynomial of torus elements.
    pub fn as_torus(&self) -> &PolynomialRef<Torus<T>> {
        let as_torus = bytemuck::cast_slice(&self.data);

        PolynomialRef::from_slice(as_torus)
    }

    /// Reinterpret this polynomial of integers as having wrapping semantics.
    pub fn as_wrapping(&self) -> &PolynomialRef<Wrapping<T>> {
        let as_wrapping = bytemuck::cast_slice(&self.data);

        PolynomialRef::from_slice(as_wrapping)
    }

    /// Reinterpret this polynomial of integers as having wrapping semantics.
    pub fn as_wrapping_mut(&mut self) -> &mut PolynomialRef<Wrapping<T>> {
        let as_wrapping = bytemuck::cast_slice_mut(&mut self.data);

        PolynomialRef::from_mut_slice(as_wrapping)
    }
}

impl<T> PolynomialRef<Torus<T>>
where
    T: TorusOps,
{
    /**
     * Multiply by a monomial X^-degree, returning a new Polynomial.
     */
    pub fn mul_by_negative_monomial_negacyclic(&mut self, degree: usize) {
        let len = self.len();

        // The behavior of the rotation is the same for every degree + k*2N for
        // k >= 0.
        let degree = degree % (2 * len);

        // If the degree is 0 (or a multiple of 2N), the polynomial is unchanged.
        if degree == 0 {
            return;
        }

        // If the degree is N (or of the form N + k*2N), the polynomial is negated.
        if degree == len {
            self.data
                .iter_mut()
                .for_each(|x| *x = num::traits::WrappingNeg::wrapping_neg(x));
            return;
        }

        let shift = degree % len;
        self.data.rotate_left(shift);

        let negate_segment = if degree < len {
            (len - shift)..len
        } else {
            0..(len - shift)
        };

        for i in negate_segment {
            self.data[i] = num::traits::WrappingNeg::wrapping_neg(&self.data[i]);
        }
    }

    /**
     * Multiply by a monomial X^degree, returning a new Polynomial.
     */
    pub fn mul_by_positive_monomial_negacyclic(&mut self, degree: usize) {
        let len = self.len();

        // The behavior of the rotation is the same for every degree + k*2N for
        // k >= 0.
        let degree = degree % (2 * len);

        // If the degree is 0 (or a multiple of 2N), the polynomial is unchanged.
        if degree == 0 {
            return;
        }

        // If the degree is N (or of the form N + k*2N), the polynomial is negated.
        if degree == len {
            self.data
                .iter_mut()
                .for_each(|x| *x = num::traits::WrappingNeg::wrapping_neg(x));
            return;
        }

        let shift = degree % len;
        self.data.rotate_right(shift);

        let negate_segment = if degree < len { 0..degree } else { shift..len };

        for i in negate_segment {
            self.data[i] = num::traits::WrappingNeg::wrapping_neg(&self.data[i]);
        }
    }

    /**
     * Multiply by a monomial X^degree, returning a new Polynomial. The degree
     * can be either positive or negative.
     */
    pub fn mul_by_monomial_negacyclic(&mut self, degree: isize) {
        if degree < 0 {
            self.mul_by_negative_monomial_negacyclic(degree.unsigned_abs());
        } else {
            self.mul_by_positive_monomial_negacyclic(degree as usize);
        }
    }
}

impl<T, U> PolynomialRef<T>
where
    U: ToF64,
    T: Clone + Copy + ReinterpretAsSigned<Output = U>,
{
    /// Compute the FFT of the polynomial.
    pub fn fft(&self, out: &mut PolynomialFftRef<Complex<f64>>) {
        assert!(self.len().is_power_of_two());
        assert_eq!(self.len(), out.len() * 2);

        let mut self_f64 = allocate_scratch::<f64>(self.len());
        let self_f64 = self_f64.as_mut_slice();

        for (o, i) in self_f64.iter_mut().zip(self.coeffs().iter()) {
            // Reinterperet [0, 1) to [-q/2, q/2) to slightly increase
            // precision.
            *o = (*i).reinterpret_as_signed().to_f64();
        }

        let log_n = self.len().ilog2() as usize;

        let fft = get_fft(log_n);
        fft.forward(self_f64, out.as_mut_slice());
    }
}

impl<S> Add<Polynomial<S>> for Polynomial<S>
where
    S: Add<S, Output = S> + Copy,
{
    type Output = Polynomial<S>;

    fn add(self, rhs: Polynomial<S>) -> Self::Output {
        self.as_ref().add(rhs.as_ref())
    }
}

impl<S> Add<&PolynomialRef<S>> for &PolynomialRef<S>
where
    S: Add<S, Output = S> + Copy,
{
    type Output = Polynomial<S>;

    fn add(self, rhs: &PolynomialRef<S>) -> Self::Output {
        assert_eq!(self.data.as_ref().len(), rhs.data.as_ref().len());

        let coeffs = AVec::from_iter(SIMD_ALIGN, self
            .coeffs()
            .as_ref()
            .iter()
            .zip(rhs.coeffs().as_ref().iter())
            .map(|(a, b)| *a + *b)
        );

        Polynomial { data: coeffs }
    }
}

impl<S> AddAssign<&PolynomialRef<S>> for PolynomialRef<S>
where
    S: AddAssign<S> + Copy,
{
    fn add_assign(&mut self, rhs: &PolynomialRef<S>) {
        polynomial_add_assign(self, rhs)
    }
}

impl<S> Sub<Polynomial<S>> for Polynomial<S>
where
    S: Sub<S, Output = S> + Copy,
{
    type Output = Polynomial<S>;

    fn sub(self, rhs: Polynomial<S>) -> Self::Output {
        self.as_ref().sub(rhs.as_ref())
    }
}

impl<S> Sub<&PolynomialRef<S>> for &PolynomialRef<S>
where
    S: Sub<S, Output = S> + Copy,
{
    type Output = Polynomial<S>;

    fn sub(self, rhs: &PolynomialRef<S>) -> Self::Output {
        assert_eq!(self.data.as_ref().len(), rhs.data.as_ref().len());

        let coeffs = AVec::from_iter(SIMD_ALIGN, self
            .coeffs()
            .as_ref()
            .iter()
            .zip(rhs.coeffs().as_ref().iter())
            .map(|(a, b)| *a - *b)
        );

        Polynomial { data: coeffs }
    }
}

impl<S> SubAssign<&PolynomialRef<S>> for PolynomialRef<S>
where
    S: SubAssign<S> + Copy,
{
    fn sub_assign(&mut self, rhs: &PolynomialRef<S>) {
        polynomial_sub_assign(self, rhs)
    }
}

impl<S> Mul<&PolynomialRef<S>> for &PolynomialRef<Torus<S>>
where
    S: TorusOps,
{
    type Output = Polynomial<Torus<S>>;

    /// External product of T\[X\]/f * Z\[X\]/f
    /// TODO: use NTT to do in nlog(n) time.
    fn mul(self, rhs: &PolynomialRef<S>) -> Self::Output {
        assert_eq!(rhs.len(), self.len());

        let mut c = Polynomial {
            data: avec![Torus::zero(); rhs.len()],
        };

        polynomial_external_mad(&mut c, self, rhs);

        c
    }
}

#[cfg(test)]
mod tests {
    use std::ops::Deref;

    use crate::{entities::Polynomial, Torus};

    #[test]
    fn can_add_polynomials() {
        let a = Polynomial::new(&[1, 2, 3]);

        let b = Polynomial::new(&[4, 5, 6]);

        let expected = Polynomial::new(&[5, 7, 9]);

        let c = a.deref() + b.deref();
        assert_eq!(c, expected);
    }

    // A golden test but easier than recoding the logic again.
    #[test]
    fn can_multiply_by_positive_monomial_negacyclic() {
        let original = Polynomial::new(&[1, 2, 3, 4].map(Torus::<u64>::from));

        let mut shift_0 = original.clone();
        shift_0.mul_by_positive_monomial_negacyclic(0);
        let expected_0 = original.clone();

        assert_eq!(shift_0, expected_0);

        let mut shift_1 = original.clone();
        shift_1.mul_by_positive_monomial_negacyclic(1);
        let expected_1 = Polynomial::new(&[
            Torus::from(4u64.wrapping_neg()),
            Torus::from(1),
            Torus::from(2),
            Torus::from(3),
        ]);

        assert_eq!(shift_1, expected_1);

        let mut shift_2 = original.clone();
        shift_2.mul_by_positive_monomial_negacyclic(2);
        let expected_2 = Polynomial::new(&[
            Torus::from(3u64.wrapping_neg()),
            Torus::from(4u64.wrapping_neg()),
            Torus::from(1),
            Torus::from(2),
        ]);

        assert_eq!(shift_2, expected_2);

        let mut shift_3 = original.clone();
        shift_3.mul_by_positive_monomial_negacyclic(3);
        let expected_3 = Polynomial::new(&[
            Torus::from(2u64.wrapping_neg()),
            Torus::from(3u64.wrapping_neg()),
            Torus::from(4u64.wrapping_neg()),
            Torus::from(1),
        ]);

        assert_eq!(shift_3, expected_3);

        let mut shift_4 = original.clone();
        shift_4.mul_by_positive_monomial_negacyclic(4);
        let expected_4 = Polynomial::new(&[
            Torus::from(1u64.wrapping_neg()),
            Torus::from(2u64.wrapping_neg()),
            Torus::from(3u64.wrapping_neg()),
            Torus::from(4u64.wrapping_neg()),
        ]);

        assert_eq!(shift_4, expected_4);

        let mut shift_5 = original.clone();
        shift_5.mul_by_positive_monomial_negacyclic(5);
        let expected_5 = Polynomial::new(&[
            Torus::from(4u64),
            Torus::from(1u64.wrapping_neg()),
            Torus::from(2u64.wrapping_neg()),
            Torus::from(3u64.wrapping_neg()),
        ]);

        assert_eq!(shift_5, expected_5);

        let mut shift_6 = original.clone();
        shift_6.mul_by_positive_monomial_negacyclic(6);
        let expected_6 = Polynomial::new(&[
            Torus::from(3u64),
            Torus::from(4u64),
            Torus::from(1u64.wrapping_neg()),
            Torus::from(2u64.wrapping_neg()),
        ]);

        assert_eq!(shift_6, expected_6);

        let mut shift_7 = original.clone();
        shift_7.mul_by_positive_monomial_negacyclic(7);
        let expected_7 = Polynomial::new(&[
            Torus::from(2u64),
            Torus::from(3u64),
            Torus::from(4u64),
            Torus::from(1u64.wrapping_neg()),
        ]);

        assert_eq!(shift_7, expected_7);

        let mut shift_8 = original.clone();
        shift_8.mul_by_positive_monomial_negacyclic(8);
        let expected_8 = original.clone();

        assert_eq!(shift_8, expected_8);

        let mut shift_9 = original.clone();
        shift_9.mul_by_positive_monomial_negacyclic(9);
        let expected_9 = shift_1.clone();

        assert_eq!(shift_9, expected_9);
    }

    #[test]
    fn can_multiply_by_negative_monomial_negacyclic() {
        let original = Polynomial::new(&[1, 2, 3, 4].map(Torus::<u64>::from));

        let mut shift_0 = original.clone();
        shift_0.mul_by_negative_monomial_negacyclic(0);
        let expected_0 = original.clone();

        assert_eq!(shift_0, expected_0);

        let mut shift_1 = original.clone();
        shift_1.mul_by_negative_monomial_negacyclic(1);
        let expected_1 = Polynomial::new(&[
            Torus::from(2),
            Torus::from(3),
            Torus::from(4),
            Torus::from(1u64.wrapping_neg()),
        ]);

        assert_eq!(shift_1, expected_1);

        let mut shift_2 = original.clone();
        shift_2.mul_by_negative_monomial_negacyclic(2);
        let expected_2 = Polynomial::new(&[
            Torus::from(3),
            Torus::from(4),
            Torus::from(1u64.wrapping_neg()),
            Torus::from(2u64.wrapping_neg()),
        ]);

        assert_eq!(shift_2, expected_2);

        let mut shift_3 = original.clone();
        shift_3.mul_by_negative_monomial_negacyclic(3);
        let expected_3 = Polynomial::new(&[
            Torus::from(4),
            Torus::from(1u64.wrapping_neg()),
            Torus::from(2u64.wrapping_neg()),
            Torus::from(3u64.wrapping_neg()),
        ]);

        assert_eq!(shift_3, expected_3);

        let mut shift_4 = original.clone();
        shift_4.mul_by_negative_monomial_negacyclic(4);
        let expected_4 = Polynomial::new(&[
            Torus::from(1u64.wrapping_neg()),
            Torus::from(2u64.wrapping_neg()),
            Torus::from(3u64.wrapping_neg()),
            Torus::from(4u64.wrapping_neg()),
        ]);

        assert_eq!(shift_4, expected_4);

        let mut shift_5 = original.clone();
        shift_5.mul_by_negative_monomial_negacyclic(5);
        let expected_5 = Polynomial::new(&[
            Torus::from(2u64.wrapping_neg()),
            Torus::from(3u64.wrapping_neg()),
            Torus::from(4u64.wrapping_neg()),
            Torus::from(1),
        ]);

        assert_eq!(shift_5, expected_5);

        let mut shift_6 = original.clone();
        shift_6.mul_by_negative_monomial_negacyclic(6);
        let expected_6 = Polynomial::new(&[
            Torus::from(3u64.wrapping_neg()),
            Torus::from(4u64.wrapping_neg()),
            Torus::from(1),
            Torus::from(2),
        ]);

        assert_eq!(shift_6, expected_6);

        let mut shift_7 = original.clone();
        shift_7.mul_by_negative_monomial_negacyclic(7);
        let expected_7 = Polynomial::new(&[
            Torus::from(4u64.wrapping_neg()),
            Torus::from(1),
            Torus::from(2),
            Torus::from(3),
        ]);

        assert_eq!(shift_7, expected_7);

        let mut shift_8 = original.clone();
        shift_8.mul_by_negative_monomial_negacyclic(8);
        let expected_8 = original.clone();

        assert_eq!(shift_8, expected_8);

        let mut shift_9 = original.clone();
        shift_9.mul_by_negative_monomial_negacyclic(9);
        let expected_9 = shift_1.clone();

        assert_eq!(shift_9, expected_9);
    }
}
