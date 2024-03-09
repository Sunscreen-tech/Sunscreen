use num::Complex;

pub fn complex_mad(c: &mut [Complex<f64>], a: &[Complex<f64>], b: &[Complex<f64>]) {
    for ((c, a), b) in c.iter_mut().zip(a.iter()).zip(b.iter()) {
        *c += a * b;
    }
}

#[cfg(test)]
mod test {
    use rand::{thread_rng, RngCore};

    use super::*;

    #[test]
    fn can_scalar_mad_complex_f64_slice() {
        let a = (0..16)
            .map(|_| {
                Complex::new(
                    thread_rng().next_u64() as f64,
                    thread_rng().next_u64() as f64,
                )
            })
            .collect::<Vec<_>>();

        let b = (0..16)
            .map(|_| {
                Complex::new(
                    thread_rng().next_u64() as f64,
                    thread_rng().next_u64() as f64,
                )
            })
            .collect::<Vec<_>>();

        let mut expected = (0..16)
            .map(|_| {
                Complex::new(
                    thread_rng().next_u64() as f64,
                    thread_rng().next_u64() as f64,
                )
            })
            .collect::<Vec<_>>();

        let mut actual = expected.clone();

        complex_mad(&mut actual, &a, &b);

        for ((c, a), b) in expected.iter_mut().zip(a.iter()).zip(b.iter()) {
            *c += a * b;
        }

        assert_eq!(actual, expected);
    }
}
