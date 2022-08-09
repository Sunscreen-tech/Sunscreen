use std::ops::{Add, Div, Mul, Sub};
use sunscreen::{
    types::{bfv::Fractional, Cipher},
    *,
};

const DATA_POINTS: usize = 15;

fn mean<T, const COUNT: usize>(data: &[T; COUNT]) -> T
where
    T: Add<Output = T> + Div<f64, Output = T> + Copy,
{
    let mut sum = data[0];

    for i in 1..data.len() {
        sum = sum + data[i];
    }

    sum / (data.len() as f64)
}

fn variance<T, const COUNT: usize>(data: &[T; COUNT]) -> T
where
    T: Add<Output = T> + Sub<Output = T> + Mul<Output = T> + Div<f64, Output = T> + Copy,
{
    let mean_data = mean(data);
    let mut variance = data.clone();

    for i in 0..data.len() {
        let tmp = mean_data - data[i];

        variance[i] = tmp * tmp;
    }

    mean(&variance)
}

#[fhe_program(scheme = "bfv")]
fn mean_fhe(data: [Cipher<Fractional<64>>; DATA_POINTS]) -> Cipher<Fractional<64>> {
    mean(&data)
}

#[fhe_program(scheme = "bfv")]
fn variance_fhe(data: [Cipher<Fractional<64>>; DATA_POINTS]) -> Cipher<Fractional<64>> {
    variance(&data)
}

fn create_dataset() -> [Fractional<64>; DATA_POINTS] {
    (0..DATA_POINTS)
        .map(|x| Fractional::try_from(x as f64).unwrap())
        .collect::<Vec<Fractional<64>>>()
        .try_into()
        .unwrap()
}

fn main() {
    let app = Compiler::new()
        .fhe_program(mean_fhe)
        .fhe_program(variance_fhe)
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let data = runtime.encrypt(create_dataset(), &public_key).unwrap();

    let mean_result = runtime
        .run(
            app.get_program(mean_fhe).unwrap(),
            vec![data.clone()],
            &public_key,
        )
        .unwrap();

    let variance_result = runtime
        .run(
            app.get_program(variance_fhe).unwrap(),
            vec![data],
            &public_key,
        )
        .unwrap();

    let mean_result: Fractional<64> = runtime.decrypt(&mean_result[0], &private_key).unwrap();
    let mean_result: f64 = mean_result.into();

    let variance_result: Fractional<64> =
        runtime.decrypt(&variance_result[0], &private_key).unwrap();
    let variance_result: f64 = variance_result.into();

    println!("Mean={}, Variance={}", mean_result, variance_result);
}
