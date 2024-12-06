use std::{
    f64::consts::PI,
    sync::{Arc, OnceLock},
};

use num::{Complex, Float, One};
use realfft::FftNum;
use rustfft::{Fft, FftPlanner};

use crate::{scratch::allocate_scratch, FrequencyTransform};

static FFT_CACHE: OnceLock<Vec<TwistedFft<f64>>> = OnceLock::new();

/// Get a [TwistedFft] for a given log N.
pub fn get_fft(log_n: usize) -> &'static TwistedFft<f64> {
    // Can FFT powers of 2 from N=1 up to 4096.
    assert!(log_n < 13);

    let cache = FFT_CACHE.get_or_init(|| {
        (0..13).map(|i| TwistedFft::new(0x1 << i)).collect()
    });

    &cache[log_n]
}

/// Perform FFT with a twist so points can be used for
/// negacyclic convolution.
///
/// # Remarks
/// See `<https://jeremykun.com/2022/12/09/negacyclic-polynomial-multiplication/>` for algorithm.
pub struct TwistedFft<T>
where
    T: FftNum,
{
    fwd: Arc<dyn Fft<T>>,
    rev: Arc<dyn Fft<T>>,

    twist: Vec<Complex<T>>,
    twist_inv: Vec<Complex<T>>,
}

impl<T> TwistedFft<T>
where
    T: FftNum + Float,
{
    /// Create a new [TwistedFft] with the given size.
    pub fn new(n: usize) -> Self {
        assert!(n.is_power_of_two());

        let n_2 = T::from(n * 2).unwrap();
        let k = n / 2;

        // The true length of the negacyclic sequence is 2N
        let mut plan = FftPlanner::new();
        let fwd = plan.plan_fft_forward(k);
        let rev = plan.plan_fft_inverse(k);

        let two_pi = T::from(PI).unwrap() * T::from(2.0).unwrap();

        let twist = (0..k)
            .map(|x| {
                let x = T::from(x).unwrap();
                let (s, c) = (two_pi * x / n_2).sin_cos();

                Complex::new(c, s)
            })
            .collect::<Vec<_>>();

        let twist_inv = twist
            .iter()
            .copied()
            .map(|t| t.powf(-T::one()))
            .collect::<Vec<_>>();

        debug_assert!(twist.iter().zip(twist_inv.iter()).all(|(a, b)| {
            let a_a_inv = a * b;
            let err = a_a_inv - Complex::one();

            err.re.abs() < T::from(1e-15).unwrap() && err.im.abs() < T::from(1e-15).unwrap()
        }));

        Self {
            fwd,
            rev,
            twist,
            twist_inv,
        }
    }
}

impl<T> FrequencyTransform for TwistedFft<T>
where
    T: FftNum + Float,
{
    type BaseRepr = T;
    type FrequencyRepr = Complex<T>;

    fn forward(&self, x: &[Self::BaseRepr], output: &mut [Self::FrequencyRepr]) {
        assert_eq!(x.len(), self.fwd.len() * 2);

        let n_div_2 = x.len() / 2;

        for i in 0..n_div_2 {
            output[i] = Complex::new(x[i], x[i + n_div_2]) * self.twist[i];
        }

        let mut scratch = allocate_scratch(self.fwd.get_inplace_scratch_len());
        let scratch_slice = scratch.as_mut_slice();

        self.fwd.process_with_scratch(output, scratch_slice);
    }

    fn reverse(&self, data: &[Self::FrequencyRepr], output: &mut [Self::BaseRepr]) {
        assert_eq!(data.len(), self.rev.len());

        let mut ifft = allocate_scratch(data.len());
        let ifft_slice = ifft.as_mut_slice();
        ifft_slice.copy_from_slice(data);

        let mut scratch = allocate_scratch(self.rev.get_inplace_scratch_len());
        let scratch_slice = scratch.as_mut_slice();

        self.rev.process_with_scratch(ifft_slice, scratch_slice);

        let n_inv = T::one() / T::from(data.len()).unwrap();

        for (i, x) in ifft_slice.iter().enumerate() {
            let tmp = *x * n_inv * self.twist_inv[i];

            output[i] = tmp.re.round();
            output[i + data.len()] = tmp.im.round();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_roundtrip_negacyclic_fft() {
        let n = 8;

        let plan = TwistedFft::<f64>::new(n);

        let x = (0..n).map(|x| x as f64).collect::<Vec<_>>();
        let mut y = vec![Complex::from(0.0); x.len() / 2];
        let mut actual = vec![0.0; x.len()];

        plan.forward(&x, &mut y);
        plan.reverse(&y, &mut actual);

        for (l, r) in actual.iter().zip(x.iter()) {
            assert!((l - r).abs() < 1e-12);
        }
    }

    #[test]
    fn can_negacyclic_conv() {
        let n = 4;

        let plan = TwistedFft::<f64>::new(n);

        let x = (0..n).map(|x| x as f64).collect::<Vec<_>>();
        let mut y = vec![Complex::from(0.0); x.len() / 2];
        let mut actual = vec![0.0; x.len()];

        plan.forward(&x, &mut y);

        let z = y.iter().map(|y| y * y).collect::<Vec<_>>();

        plan.reverse(&z, &mut actual);

        assert_eq!(actual, vec![-10.0, -12.0, -8.0, 4.0]);
    }
}
