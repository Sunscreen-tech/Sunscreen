use criterion::{criterion_group, criterion_main, Criterion};
use num::Complex;
use sunscreen_tfhe::{math::fft::negacyclic::TwistedFft, FrequencyTransform};

fn negacyclic_fft(c: &mut Criterion) {
    let n = 2048;

    let plan = TwistedFft::<f64>::new(n);

    let x = (0..n).map(|x| x as f64).collect::<Vec<_>>();
    let mut y = vec![Complex::from(0.0); x.len() / 2];

    c.bench_function("FFT 2048", |s| {
        s.iter(|| {
            plan.forward(&x, &mut y);
        });
    });

    let n = 1024;

    let plan = TwistedFft::<f64>::new(n);

    let x = (0..n).map(|x| x as f64).collect::<Vec<_>>();
    let mut y = vec![Complex::from(0.0); x.len() / 2];

    c.bench_function("FFT 1024", |s| {
        s.iter(|| {
            plan.forward(&x, &mut y);
        });
    });

    let n: usize = 256;

    let plan = TwistedFft::<f64>::new(n);

    let x = (0..n).map(|x| x as f64).collect::<Vec<_>>();
    let mut y = vec![Complex::from(0.0); x.len() / 2];

    c.bench_function("FFT 256", |s| {
        s.iter(|| {
            plan.forward(&x, &mut y);
        });
    });
}

criterion_group!(benches, negacyclic_fft);
criterion_main!(benches);
