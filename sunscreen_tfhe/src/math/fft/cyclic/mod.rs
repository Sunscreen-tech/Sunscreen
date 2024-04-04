use std::ops::{Add, Mul, Neg};
use std::sync::Arc;

use num::{complex::Complex, Float};
use realfft::{ComplexToReal, FftNum, RealFftPlanner, RealToComplex};
use sunscreen_math::{One, Zero as SunscreenZero};

use crate::{FrequencyTransform, Inverse, Pow, RootOfUnity};

/// A struct that can perform a real FFT.
pub struct RealFft<T>
where
    T: FftNum,
{
    pub(crate) fplan: Arc<dyn RealToComplex<T>>,
    pub(crate) rplan: Arc<dyn ComplexToReal<T>>,
    pub(crate) scale: T,
}

impl<T> RealFft<T>
where
    T: FftNum + Float,
{
    /// Create a new [RealFft] with the given size.
    pub fn new(n: usize) -> Self {
        let mut plan = RealFftPlanner::<T>::new();
        let fplan = plan.plan_fft_forward(n);
        let rplan = plan.plan_fft_inverse(n);

        let scale = T::from(1.0).unwrap() / T::from(n).unwrap();

        Self {
            fplan,
            rplan,
            scale,
        }
    }
}

impl<T> FrequencyTransform for RealFft<T>
where
    T: FftNum + Float,
{
    type BaseRepr = T;
    type FrequencyRepr = Complex<T>;

    fn forward(&self, data: &[Self::BaseRepr], output: &mut [Self::FrequencyRepr]) {
        assert_eq!(data.len() / 2 + 1, output.len());

        self.fplan.process(&mut data.to_owned(), output).unwrap();
    }

    fn reverse(&self, data: &[Self::FrequencyRepr], output: &mut [Self::BaseRepr]) {
        self.rplan.process(&mut data.to_owned(), output).unwrap();

        output.iter_mut().for_each(|x| {
            *x = *x * self.scale;
        });
    }
}

/// A struct that can perform a NTT using a naive algorithm.
#[allow(unused)]
pub struct NaiveNtt<T> {
    twiddle: Vec<T>,
    inv_twiddle: Vec<T>,
    n_inv: T,
}

impl<T> NaiveNtt<T>
where
    T: RootOfUnity
        + Copy
        + SunscreenZero
        + One
        + Mul<T, Output = T>
        + Add<T, Output = T>
        + Neg<Output = T>
        + Pow<u64>
        + From<u64>
        + Inverse,
{
    /// Create a new [NaiveNtt] with the given size.
    #[allow(unused)]
    pub fn new(n: usize) -> Self {
        let mut twiddle = vec![];
        let mut inv_twiddle = vec![];
        let root = T::nth_root_of_unity(n as u64);
        let inv_root = root.inverse();

        for i in 0..n as u64 {
            twiddle.push(root.pow(i));
            inv_twiddle.push(inv_root.pow(i));
        }

        Self {
            twiddle,
            inv_twiddle,
            n_inv: T::from(n as u64).inverse(),
        }
    }
}

#[cfg(test)]
mod tests {
    use num::complex::ComplexFloat;

    use super::*;

    #[test]
    fn can_roundtrip_real_fft() {
        let n = 256;

        let fft = RealFft::<f64>::new(n);
        let input = (0..n).map(|x| x as f64).collect::<Vec<_>>();
        let mut points = vec![Complex::from(0.0); input.len() / 2 + 1];
        let mut result = vec![0.0; input.len()];

        fft.forward(&input, &mut points);
        fft.reverse(&points, &mut result);

        for (l, r) in input.iter().zip(result.iter()) {
            assert!((l - r).abs() < 1e-12);
        }
    }

    #[test]
    fn negacyclic_gives_odd_harmonics() {
        let n = 512;
        let nega_len = n / 2;

        let fft = RealFft::<f64>::new(n);
        let input = (0..n)
            .enumerate()
            .map(|(i, x)| {
                let val = x % nega_len;

                if i < nega_len {
                    val as f64
                } else {
                    -(val as f64)
                }
            })
            .collect::<Vec<_>>();

        let mut points = vec![Complex::from(0.0); input.len() / 2 + 1];

        fft.forward(&input, &mut points);

        for (i, x) in points.iter().enumerate() {
            if i % 2 == 0 {
                assert!(x.re().abs() < 1e-12);
                assert!(x.im().abs() < 1e-12);
            } else {
                assert!(x.re().abs() > 1.0);
                assert!(x.im().abs() > 1.0);
            }
        }
    }

    #[test]
    fn can_cyclic_convolution() {
        let n = 4;

        let fft = RealFft::<f64>::new(n);
        let x = (0..n).map(|x| x as f64).collect::<Vec<_>>();
        let mut actual = vec![0.0; n];
        let mut y = vec![Complex::from(0.0); n / 2 + 1];

        fft.forward(&x, &mut y);

        let z = y.iter().map(|y| y * y).collect::<Vec<_>>();

        fft.reverse(&z, &mut actual);

        let expected = [10.0, 12.0, 10.0, 4.0];

        for (e, a) in expected.iter().zip(actual.iter()) {
            assert!((e - a).abs() < 1e-12);
        }
    }
}
