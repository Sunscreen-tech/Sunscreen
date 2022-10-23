use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, FheProgramInput, PlainModulusConstraint, Runtime,
};

#[test]
fn can_add_array_elements() {
    fn add_impl<T, U>(x: T) -> U
    where
        T: std::ops::Index<usize, Output = U>,
        U: std::ops::Add<Output = U> + Copy,
    {
        x[0] + x[1]
    }

    #[fhe_program(scheme = "bfv")]
    fn add(x: [Cipher<Signed>; 2]) -> Cipher<Signed> {
        add_impl(x)
    }

    let app = Compiler::new()
        .fhe_program(add)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let a = Signed::try_from(2).unwrap();
    let b = Signed::try_from(4).unwrap();
    let a_c = runtime.encrypt([a, b], &public_key).unwrap();

    let result = runtime
        .run(app.get_program(add).unwrap(), vec![a_c], &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, add_impl([a, b]));
    assert_eq!(c, a + b);
}

#[test]
fn multidimensional_arrays() {
    fn determinant_impl<T, U, V>(x: T) -> V
    where
        T: std::ops::Index<usize, Output = U>,
        U: std::ops::Index<usize, Output = V>,
        V: std::ops::Add<Output = V> + std::ops::Mul<Output = V> + std::ops::Sub<Output = V> + Copy,
    {
        x[0][0] * (x[1][1] * x[2][2] - x[1][2] * x[2][1])
            - x[0][1] * (x[1][0] * x[2][2] - x[1][2] * x[2][0])
            + x[0][2] * (x[1][0] * x[2][1] - x[1][1] * x[2][0])
    }

    #[fhe_program(scheme = "bfv")]
    fn determinant(x: [[Cipher<Signed>; 3]; 3]) -> Cipher<Signed> {
        determinant_impl(x)
    }

    let app = Compiler::new()
        .fhe_program(determinant)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let mut matrix = <[[Signed; 3]; 3]>::default();

    for i in 0..3 {
        for j in 0..3 {
            let value: i64 = (3 * i + j) as i64;
            matrix[i][j] = Signed::from(value);
        }
    }

    matrix[0][0] = Signed::from(1);

    let a_c = runtime.encrypt(matrix, &public_key).unwrap();

    let result = runtime
        .run(
            app.get_program(determinant).unwrap(),
            vec![a_c],
            &public_key,
        )
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, Signed::from(-3));
    assert_eq!(c, determinant_impl(matrix));
}

#[test]
fn multidimensional_is_row_major() {
    #[fhe_program(scheme = "bfv")]
    fn determinant(x: [[Cipher<Signed>; 3]; 3]) -> Cipher<Signed> {
        x[1][2]
    }

    let app = Compiler::new()
        .fhe_program(determinant)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let mut matrix = <[[Signed; 3]; 3]>::default();

    for i in 0..3 {
        for j in 0..3 {
            let value: i64 = (3 * i + j) as i64;
            matrix[i][j] = Signed::from(value);
        }
    }

    matrix[0][0] = Signed::from(1);

    let a_c = runtime.encrypt(matrix, &public_key).unwrap();

    let result = runtime
        .run(
            app.get_program(determinant).unwrap(),
            vec![a_c],
            &public_key,
        )
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, Signed::from(5));
    assert_eq!(c, matrix[1][2]);
}

#[test]
fn cipher_plain_arrays() {
    #[fhe_program(scheme = "bfv")]
    fn dot(a: [Cipher<Signed>; 3], b: [Signed; 3]) -> Cipher<Signed> {
        let mut sum = a[0] * b[0];

        for i in 1..3 {
            sum = sum + a[i] * b[i];
        }

        sum
    }

    let app = Compiler::new()
        .fhe_program(dot)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let mut data = <[Signed; 3]>::default();
    let mut select = <[Signed; 3]>::default();

    for i in 1..4 {
        data[i - 1] = Signed::from(i as i64);
        select[i - 1] = Signed::from((2 * i) as i64);
    }

    let select_c = runtime.encrypt(select, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![select_c.into(), data.into()];

    let result = runtime
        .run(app.get_program(dot).unwrap(), args, &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, Signed::from(28));
}

#[test]
fn can_mutate_array() {
    #[fhe_program(scheme = "bfv")]
    fn mult(mut a: [Cipher<Signed>; 6]) -> Cipher<Signed> {
        let mut a = a;

        for i in 0..a.len() {
            a[i] = a[i] * 2
        }

        let mut sum = a[0];

        for i in 1..a.len() {
            sum = sum + a[i];
        }

        sum
    }

    let app = Compiler::new()
        .fhe_program(mult)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let mut a = <[Signed; 6]>::default();

    for i in 0..a.len() {
        a[i] = Signed::from((i) as i64);
    }

    let a_enc = runtime.encrypt(a, &public_key).unwrap();

    let result = runtime
        .run(app.get_program(mult).unwrap(), vec![a_enc], &public_key)
        .unwrap();

    let c: Signed = runtime.decrypt(&result[0], &private_key).unwrap();

    assert_eq!(c, Signed::from(30));
}

#[test]
fn can_return_array() {
    #[fhe_program(scheme = "bfv")]
    fn mult(mut a: [Cipher<Signed>; 6]) -> [Cipher<Signed>; 6] {
        let mut a = a;

        for i in 0..a.len() {
            a[i] = a[i] * 2
        }

        a
    }

    let app = Compiler::new()
        .fhe_program(mult)
        .additional_noise_budget(5)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(500))
        .compile()
        .unwrap();

    let runtime = Runtime::new(app.params()).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();

    let mut a = <[Signed; 6]>::default();

    for i in 0..a.len() {
        a[i] = Signed::from((i) as i64);
    }

    let a_enc = runtime.encrypt(a, &public_key).unwrap();

    let result = runtime
        .run(app.get_program(mult).unwrap(), vec![a_enc], &public_key)
        .unwrap();

    let c: [Signed; 6] = runtime.decrypt(&result[0], &private_key).unwrap();

    let expected: [Signed; 6] = a
        .iter()
        .map(|x| *x * 2)
        .collect::<Vec<Signed>>()
        .try_into()
        .unwrap();

    assert_eq!(c, expected);
}
