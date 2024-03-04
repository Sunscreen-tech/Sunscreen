use aligned_vec::AVec;
use num::{traits::MulAdd, Complex};

use crate::{
    dst::{NoWrapper, OverlaySize},
    fft::negacyclic::get_fft,
    scratch::{allocate_scratch, SIMD_ALIGN},
    FrequencyTransform, FromF64, NumBits, PolynomialDegree,
};

use super::PolynomialRef;

dst! {
    /// The FFT of a polynomial. See [`Polynomial`](crate::entities::Polynomial)
    /// for the non-FFT variant.
    PolynomialFft,
    PolynomialFftRef,
    NoWrapper,
    (Debug, Clone, PartialEq, Eq,),
    ()
}
dst_iter!(
    PolynomialFftIterator,
    PolynomialFftIteratorMut,
    ParallelPolynomialFftIterator,
    ParallelPolynomialFftIteratorMut,
    NoWrapper,
    PolynomialFftRef,
    ()
);

impl<T> OverlaySize for PolynomialFftRef<T>
where
    T: Clone,
{
    type Inputs = PolynomialDegree;

    fn size(t: Self::Inputs) -> usize {
        t.0 / 2
    }
}

impl<T> PolynomialFft<T>
where
    T: Clone,
{
    /// Create a new polynomial with the given length in the fourier domain.
    pub fn new(data: &[T]) -> Self {
        Self {
            data: AVec::from_slice(SIMD_ALIGN, data),
        }
    }
}

impl<T> PolynomialFftRef<T>
where
    T: Clone,
{
    /// Returns the coefficients of the polynomial in the fourier domain.
    pub fn coeffs(&self) -> &[T] {
        &self.data
    }

    /// Returns the mutable coefficients of the polynomial in the fourier domain.
    pub fn coeffs_mut(&mut self) -> &mut [T] {
        &mut self.data
    }

    /// Returns the number of coefficients in the polynomial.
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Returns true if the polynomial has no coefficients.
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

impl PolynomialFftRef<Complex<f64>> {
    /// Compute the inverse FFT of the polynomial.
    pub fn ifft<T>(&self, poly: &mut PolynomialRef<T>)
    where
        T: Clone + FromF64 + NumBits,
    {
        assert!(self.len().is_power_of_two());
        assert_eq!(self.len() * 2, poly.len());

        let log_n = poly.len().ilog2() as usize;

        let fft = get_fft(log_n);

        let mut ifft = allocate_scratch::<f64>(poly.len());
        let ifft = ifft.as_mut_slice();

        fft.reverse(&self.data, ifft);

        // When the exponent != 0 && exponent != 1024,
        // IEEE-754 doubles are represented as -1**s * 1.m * 2**(e - 1023).
        //
        // m is 52 bits, e is 11 bits, and s is 1 bit.
        //
        // Thus, to compute 2**x, we set e = 1023 + x, m=0, and s = 0. So, we just
        // need to fill in EXP and shift it up 52 places.
        //
        // We first reduce modulo q
        let exp: u64 = 1023 + T::BITS as u64;
        let q: f64 = f64::from_bits(exp << 52);

        let exp_div_2 = exp - 1;
        let q_div_2 = f64::from_bits(exp_div_2 << 52);

        // Exploit the fact that q is a power of 2 when performing the modulo
        // reduction. Could possibly be even faster by masking and shifting
        // the mantissa and tweaking the exponent. However, profiling on ARM
        // indicates this is no longer a bottleneck with the code below.
        //
        // See https://stackoverflow.com/questions/49139283/are-there-any-numbers-that-enable-fast-modulo-calculation-on-floats
        //
        // Don't know why Rust decides not to inline this. Inlining allows
        // the below loop to get unrolled, vectorized, and division gets
        // replaced with multiplication since q is a known constant.
        #[inline(always)]
        fn mod_q(val: f64, q: f64) -> f64 {
            f64::mul_add(-(val / q).trunc(), q, val)
        }

        for (o, ifft) in poly.coeffs_mut().iter_mut().zip(ifft.iter()) {
            let mut ifft = mod_q(*ifft, q);

            // Next, we need to adjust x outside [-q/2, q/2) to wrap to the correct torus
            // point.
            if ifft >= q_div_2 {
                ifft -= q;
            } else if ifft <= -q_div_2 {
                ifft += q;
            }

            *o = T::from_f64(ifft);
        }
    }

    /// Computes the multiplication of two polynomials as `c += a * b`. This is
    /// more efficient than the naive method, and has a runtime of O(N). Note
    /// that performing the FFT and IFFT to get in and out of the fourier domain
    /// costs O(N log N).
    pub fn multiply_add(
        &mut self,
        a: &PolynomialFftRef<Complex<f64>>,
        b: &PolynomialFftRef<Complex<f64>>,
    ) {
        for ((c, a), b) in self
            .coeffs_mut()
            .iter_mut()
            .zip(a.coeffs().iter())
            .zip(b.coeffs().iter())
        {
            *c = a.mul_add(b, c);
        }
    }
}
