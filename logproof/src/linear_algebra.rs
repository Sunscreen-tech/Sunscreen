use bitvec::slice::BitSlice;

use curve25519_dalek::scalar::Scalar;
use digest::Digest;
use rayon::prelude::*;
use std::borrow::Borrow;
use std::ops::{Add, Div, Index, IndexMut, Mul, Sub};
use sunscreen_math::field::Field;
use sunscreen_math::poly::Polynomial;
use sunscreen_math::ring::{ArithmeticBackend, FieldBackend, Ring, Zq};
use sunscreen_math::{refify_binary_op, One, Zero};

use crate::crypto::CryptoHash;
use crate::math::{ModSwitch, Tensor};
use crate::rings::{FieldFrom, ZqRistretto};

#[derive(Debug, Clone, PartialEq)]
/**
 * An `m x n` matrix of elements.
 *
 * # Remarks
 * Matrix elements can be any type that implements
 * [`Clone`], [`Zero`].
 *
 * To actually multiply matrices, `T` should also implement
 * [`Add`] and [`Mul`].
 */
pub struct Matrix<T>
where
    T: Zero + Clone,
{
    // Row major
    data: Vec<T>,

    /**
     * The number of rows in this matrix (e.g. `m`).
     */
    pub rows: usize,

    /**
     * The number of columns in this matrix (e.g. `n`).
     */
    pub cols: usize,
}

impl<T> Matrix<T>
where
    T: Zero + Clone,
{
    /**
     * Creates a new `m x n` matrix.
     *
     * # Remarks
     * Each matrix element is initialized to T::zero().
     */
    pub fn new(rows: usize, cols: usize) -> Self {
        Self {
            data: vec![T::zero(); rows * cols],
            rows,
            cols,
        }
    }

    /**
     * Creates an `m x n` zero matrix.
     *
     * # Remarks
     * This function improves readability where the caller can indicate
     * they want a zero matrix.
     */
    pub fn zero(m: usize, n: usize) -> Self {
        Self::new(m, n)
    }

    /**
     * Transposes the rows and columns of this matrix into the returned
     * matrix.
     */
    pub fn transpose(&self) -> Self {
        let mut result = Matrix::new(self.cols, self.rows);

        for i in 0..self.rows {
            for j in 0..self.cols {
                result[(j, i)] = self[(i, j)].clone()
            }
        }

        result
    }

    /**
     * Treat this matrix as a row-major slice of length `m * n`.
     */
    pub fn as_slice(&self) -> &[T] {
        &self.data
    }

    /// Create a new matrix with the same dimensions by applying the map `f`
    /// to each element.
    pub fn map<F>(&self, f: F) -> Self
    where
        F: Fn(&T) -> T,
    {
        Self {
            data: self.data.iter().map(f).collect(),
            rows: self.rows,
            cols: self.cols,
        }
    }
}

impl<T> Index<(usize, usize)> for Matrix<T>
where
    T: Zero + Clone,
{
    type Output = T;

    fn index(&self, index: (usize, usize)) -> &Self::Output {
        let (r, c) = index;

        &self.data[c + self.cols * r]
    }
}

impl<T> IndexMut<(usize, usize)> for Matrix<T>
where
    T: Zero + Clone,
{
    fn index_mut(&mut self, index: (usize, usize)) -> &mut Self::Output {
        let (r, c) = index;

        &mut self.data[c + self.cols * r]
    }
}

/**
 * A matrix of polynomials over the field `F`.
 */
pub type PolynomialMatrix<F> = Matrix<Polynomial<F>>;

#[refify_binary_op]
impl<R> Sub<&PolynomialMatrix<R>> for &PolynomialMatrix<R>
where
    R: Ring,
{
    type Output = PolynomialMatrix<R>;

    fn sub(self, rhs: &PolynomialMatrix<R>) -> Self::Output {
        let rhs = rhs.borrow();

        assert_eq!(self.rows, rhs.rows);
        assert_eq!(self.cols, rhs.cols);

        let mut c = Matrix::new(self.rows, self.cols);

        for i in 0..self.rows {
            for j in 0..self.cols {
                c[(i, j)] = &self[(i, j)] - &rhs[(i, j)];
            }
        }

        c
    }
}

#[refify_binary_op]
impl<R> Add<&Matrix<R>> for &Matrix<R>
where
    R: Add<Output = R> + Zero + Clone,
{
    type Output = Matrix<R>;

    fn add(self, rhs: &Matrix<R>) -> Self::Output {
        let rhs = rhs.borrow();

        assert_eq!(self.rows, rhs.rows);
        assert_eq!(self.cols, rhs.cols);

        let mut c = Matrix::new(self.rows, self.cols);

        for i in 0..self.rows {
            for j in 0..self.cols {
                c[(i, j)] = self[(i, j)].clone() + rhs[(i, j)].clone();
            }
        }

        c
    }
}

impl<const N: usize, B> PolynomialMatrix<Zq<N, B>>
where
    B: ArithmeticBackend<N> + FieldBackend,
{
    /**
     * For a matrix of polynomials, divides each polynomial coefficient
     * of each matrix element by x.
     *
     * # Remarks
     * Requires the value be defined over a [`Field`].
     *
     * # Panics
     * If `x` is zero.
     */
    pub fn scalar_div_q(&self, x: &Zq<N, B>) -> Self {
        let x_inv = x.inverse();

        let data = self
            .data
            .iter()
            .map(|y| {
                let coeffs = y.coeffs.iter().map(|c| c * x_inv).collect();

                Polynomial { coeffs }
            })
            .collect();

        Self {
            rows: self.rows,
            cols: self.cols,
            data,
        }
    }

    /**
     * For a matrix of polynomials, multiplies each polynomial coefficient
     * of each matrix element by x.
     */
    pub fn scalar_mul_q(&self, x: &Zq<N, B>) -> Self {
        let data = self
            .data
            .iter()
            .map(|y| {
                let coeffs = y.coeffs.iter().map(|c| *c * x).collect();

                Polynomial { coeffs }
            })
            .collect();

        Self {
            rows: self.rows,
            cols: self.cols,
            data,
        }
    }

    /**
     * Evaluates each polynomial in the matrix at `point`, returning a
     * matrix of the evaluations for each element.
     */
    pub fn evaluate(&self, point: &Zq<N, B>) -> Matrix<Zq<N, B>> {
        let data = self.data.iter().map(|x| x.evaluate(point)).collect();

        Matrix {
            rows: self.rows,
            cols: self.cols,
            data,
        }
    }
}

#[refify_binary_op]
impl<R> Div<&Polynomial<R>> for &PolynomialMatrix<R>
where
    R: Ring,
{
    type Output = PolynomialMatrix<R>;

    fn div(self, rhs: &Polynomial<R>) -> Self::Output {
        let rhs = rhs.borrow();

        let data = self
            .data
            .par_iter()
            .map(|x| x.vartime_div_rem_restricted_rhs(rhs).0)
            .collect();

        Self::Output {
            rows: self.rows,
            cols: self.cols,
            data,
        }
    }
}

impl<F> From<Vec<F>> for Matrix<F>
where
    F: Zero + Clone,
{
    fn from(data: Vec<F>) -> Self {
        Self {
            rows: data.len(),
            cols: 1,
            data,
        }
    }
}

impl<F> From<Vec<Vec<F>>> for Matrix<F>
where
    F: Zero + Clone,
{
    fn from(vec_matrix: Vec<Vec<F>>) -> Self {
        let rows = vec_matrix.len();
        assert!(rows != 0);

        let cols = vec_matrix[0].len();

        for row in &vec_matrix {
            assert_eq!(cols, row.len());
        }

        let data: Vec<F> = vec_matrix.into_iter().flatten().collect();

        Self { rows, cols, data }
    }
}

impl<F> From<&[F]> for Matrix<F>
where
    F: Zero + Clone,
{
    fn from(x: &[F]) -> Self {
        Self {
            rows: x.len(),
            cols: 1usize,
            data: x.to_owned(),
        }
    }
}

impl<F, const M: usize, const N: usize> From<[[F; N]; M]> for Matrix<F>
where
    F: Zero + Clone,
{
    fn from(x: [[F; N]; M]) -> Self {
        let x = x.iter().flatten().cloned().collect();

        Self {
            data: x,
            rows: M,
            cols: N,
        }
    }
}

impl<F> From<(usize, usize, &[F])> for Matrix<F>
where
    F: Zero + Clone,
{
    fn from(data: (usize, usize, &[F])) -> Self {
        let (rows, cols, data) = data;

        if rows * cols != data.len() {
            panic!(
                "Dimension mismatch: {}x{} doesn't match data length {}",
                rows,
                cols,
                data.len()
            );
        }

        Self {
            rows,
            cols,
            data: data.to_owned(),
        }
    }
}

#[refify_binary_op]
impl<R> Mul<&Matrix<R>> for &Matrix<R>
where
    R: Ring,
{
    type Output = Matrix<R>;

    fn mul(self, rhs: &Matrix<R>) -> Self::Output {
        assert_eq!(self.cols, rhs.rows);

        let mut c = Matrix::new(self.rows, rhs.cols);

        let mut row_cols = c.data.split_inclusive_mut(|_| true).collect::<Vec<_>>();

        row_cols.par_iter_mut().enumerate().for_each(|(i, c_elem)| {
            let row = i / c.cols;
            let col = i % c.cols;
            let mut val = R::zero();

            for k in 0..self.cols {
                let a_i = &self[(row, k)];
                let b_i = &rhs[(k, col)];

                val = val + a_i.clone() * b_i;
            }

            c_elem[0] = val;
        });

        c
    }
}

impl<F1, F2> ModSwitch<Matrix<F2>> for Matrix<F1>
where
    F1: ModSwitch<F2> + Zero + Clone,
    F2: Zero + Clone,
{
    fn mod_switch_unsigned(&self) -> Matrix<F2> {
        let switched = self.data.iter().map(|x| x.mod_switch_unsigned()).collect();

        Matrix {
            rows: self.rows,
            cols: self.cols,
            data: switched,
        }
    }

    fn mod_switch_signed(&self) -> Matrix<F2> {
        let switched = self.data.iter().map(|x| x.mod_switch_signed()).collect();

        Matrix {
            rows: self.rows,
            cols: self.cols,
            data: switched,
        }
    }
}

/**
 * This trait is used to define multiplying a `U<T>` by a `T`. In particular,
 * multiplying a matrix times a scalar.
 */
pub trait ScalarMul<Rhs> {
    /**
     * The result type of a scalar multiplication.
     */
    type Output;

    /**
     * Scale this algebraic structure (e.g. matrix) by the given value.
     */
    fn scalar_mul(self, rhs: Rhs) -> Self::Output;
}

#[refify_binary_op]
impl<T> ScalarMul<&T> for &Matrix<T>
where
    T: Zero + Clone + Sync + Send,
    for<'a> &'a T: Mul<&'a T, Output = T>,
{
    type Output = Matrix<T>;

    fn scalar_mul(self, rhs: &T) -> Self::Output {
        let data = (0..self.data.len())
            .into_par_iter()
            .map(|i| &self.data[i] * rhs)
            .collect();

        Self::Output {
            rows: self.rows,
            cols: self.cols,
            data,
        }
    }
}

impl<T, Rhs> ScalarMul<Rhs> for Vec<T>
where
    T: Clone + Mul<T, Output = T>,
    Rhs: Borrow<T>,
{
    type Output = Self;

    fn scalar_mul(self, rhs: Rhs) -> Self::Output {
        self.as_slice().scalar_mul(rhs)
    }
}

impl<T, Rhs> ScalarMul<Rhs> for &[T]
where
    T: Clone + Mul<T, Output = T>,
    Rhs: Borrow<T>,
{
    type Output = Vec<T>;

    fn scalar_mul(self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();

        self.iter().map(|x| x.clone() * rhs.clone()).collect()
    }
}

/**
 * A trait for performing the remainder operation on each element.
 */
pub trait ScalarRem<Rhs = Self> {
    /**
     * The type resulting from the remainder operation.
     */
    type Output;

    /**
     * Perform an element-wise remainder operation using the given `rhs`
     * as the modulus.
     */
    fn scalar_rem(self, rhs: Rhs) -> Self::Output;
}

impl<T> CryptoHash for Matrix<T>
where
    T: CryptoHash + Zero + Clone,
{
    fn crypto_hash(&self, hasher: &mut sha3::Sha3_256) {
        hasher.update((self.rows as u64).to_be_bytes());
        hasher.update((self.cols as u64).to_be_bytes());

        for i in &self.data {
            i.crypto_hash(hasher);
        }
    }
}

impl<F, Rhs> Tensor<Rhs> for Matrix<F>
where
    F: Zero + Clone + Mul<F, Output = F> + Sync + Send,
    Rhs: Borrow<[F]>,
{
    type Output = Vec<F>;

    fn tensor(self, rhs: Rhs) -> Self::Output {
        (&self).tensor(rhs)
    }
}

impl<F, Rhs> Tensor<Rhs> for &Matrix<F>
where
    F: Zero + Clone + Mul<F, Output = F> + Sync + Send,
    Rhs: Borrow<[F]>,
{
    type Output = Vec<F>;

    fn tensor(self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();

        (0..self.rows * self.cols)
            .into_par_iter()
            .map(|i| {
                let row = i / self.cols;
                let col = i % self.cols;

                let mut partial = Vec::with_capacity(rhs.len());

                for k in rhs {
                    partial.push(self[(row, col)].clone() * k.clone())
                }

                partial
            })
            .collect::<Vec<_>>()
            .concat()
    }
}

/**
 * Computes the kronkecker product between two matrices. This is also the
 * tensor product between two matrices.
 */
pub fn kronecker_product<F>(m: &Matrix<F>, n: &Matrix<F>) -> Matrix<F>
where
    F: Zero + Copy + Mul<F, Output = F>,
{
    let mut result = Matrix::zero(m.rows * n.rows, m.cols * n.cols);

    for i in 0..m.rows {
        for k in 0..n.rows {
            for j in 0..m.cols {
                for l in 0..n.cols {
                    result[(i * n.rows + k, j * n.cols + l)] = m[(i, j)] * n[(k, l)];
                }
            }
        }
    }

    result
}

impl<T, U> FieldFrom<Matrix<U>> for Matrix<T>
where
    U: Zero + Clone,
    T: Zero + Clone + FieldFrom<U>,
{
    fn field_from(x: Matrix<U>) -> Self {
        let data = x.data.iter().map(|x| T::field_from(x.clone())).collect();

        Matrix {
            rows: x.rows,
            cols: x.cols,
            data,
        }
    }
}

/**
 * A trait for computing an inner product.
 */
pub trait InnerProduct<Rhs> {
    /**
     * The type resulting from an inner product operation.
     */
    type Output;

    /**
     * Compute the inner product of `self` and `rhs`.
     */
    fn inner_product(&self, rhs: Rhs) -> Self::Output;
}

impl<Rhs> InnerProduct<Rhs> for Vec<Scalar>
where
    Rhs: Borrow<[Scalar]>,
{
    type Output = Scalar;

    fn inner_product(&self, rhs: Rhs) -> Self::Output {
        self.as_slice().inner_product(rhs)
    }
}

impl<Rhs> InnerProduct<Rhs> for [Scalar]
where
    Rhs: Borrow<[Scalar]>,
{
    type Output = Scalar;

    fn inner_product(&self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();
        assert_eq!(self.len(), rhs.len());

        self.par_iter()
            .zip(rhs.par_iter())
            .map(|(a, b)| a * b)
            .fold(Scalar::zero, |s, p| s + p)
            .reduce(Scalar::zero, |a, b| a + b)
    }
}

impl<Rhs> InnerProduct<Rhs> for Vec<ZqRistretto>
where
    Rhs: Borrow<[ZqRistretto]>,
{
    type Output = ZqRistretto;

    fn inner_product(&self, rhs: Rhs) -> Self::Output {
        self.as_slice().inner_product(rhs)
    }
}

impl<Rhs> InnerProduct<Rhs> for [ZqRistretto]
where
    Rhs: Borrow<[ZqRistretto]>,
{
    type Output = ZqRistretto;

    fn inner_product(&self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();
        assert_eq!(self.len(), rhs.len());

        self.par_iter()
            .zip(rhs.par_iter())
            .map(|(a, b)| a * b)
            .fold(ZqRistretto::zero, |s, p| s + p)
            .reduce(ZqRistretto::zero, |a, b| a + b)
    }
}

impl<T> InnerProduct<&[T]> for &BitSlice
where
    for<'a> T: Clone + Add<&'a T, Output = T> + Mul<&'a T, Output = T> + Zero + One,
{
    type Output = T;

    fn inner_product(&self, rhs: &[T]) -> Self::Output {
        assert_eq!(self.len(), rhs.len());

        // TODO: While not useful, is inner product defined for F^0?

        self.iter()
            .zip(rhs.iter())
            .map(|(a, b)| {
                // While we could elide the computation for zero elements,
                // this would introduce time variance and thus side channels.
                let a = if a == true { T::one() } else { T::zero() };

                a * b
            })
            .fold(T::zero(), |s, p| s + &p)
    }
}

impl InnerProduct<&Matrix<Scalar>> for Matrix<Scalar> {
    type Output = Scalar;

    fn inner_product(&self, rhs: &Matrix<Scalar>) -> Self::Output {
        assert_eq!(self.cols, 1);
        assert_eq!(rhs.cols, 1);
        assert_eq!(self.rows, rhs.rows);

        self.data.as_slice().inner_product(rhs.data.as_slice())
    }
}

impl InnerProduct<&Matrix<ZqRistretto>> for Matrix<ZqRistretto> {
    type Output = ZqRistretto;

    fn inner_product(&self, rhs: &Matrix<ZqRistretto>) -> Self::Output {
        assert_eq!(self.cols, 1);
        assert_eq!(rhs.cols, 1);
        assert_eq!(self.rows, rhs.rows);

        self.data.as_slice().inner_product(rhs.data.as_slice())
    }
}

/**
 * Creates an `m x m` identity matrix.
 */
pub trait Identity {
    /**
     * Creates an `m x m` identity matrix.
     *
     * # Remarks
     * The `m x m` matrix `I` is an identity matrix if
     * `AI = A` for all `n x m` `A` for all `n`.
     */
    fn identity(m: usize) -> Self;
}

impl<F> Identity for Matrix<F>
where
    F: Zero + One + Clone,
{
    fn identity(m: usize) -> Self {
        let mut identity = Matrix::zero(m, m);

        for i in 0..m {
            identity[(i, i)] = F::one();
        }

        identity
    }
}

/**
 * A trait for computing Hadamard products.
 */
pub trait HadamardProduct<Rhs> {
    /**
     * The type resulting from the Hadamard product.
     */
    type Output;

    /**
     * Compute the Hadamard product between `self` and `rhs`.
     *
     * # Remarks
     * The Hadamard product is element-wise multiplication.
     */
    fn hadamard_product(&self, rhs: Rhs) -> Self::Output;
}

impl<R> HadamardProduct<&BitSlice> for &[R]
where
    for<'a> R: Mul<&'a R, Output = R> + Ring,
{
    type Output = Vec<R>;

    fn hadamard_product(&self, rhs: &BitSlice) -> Self::Output {
        self.iter()
            .zip(rhs.iter())
            .map(|(x, y)| {
                let y = if *y { R::one() } else { R::zero() };

                y * x
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use crate::rings::{ZqRistretto, ZqSeal128_8192};

    use super::*;
    use bitvec::vec::BitVec;
    use sha3::Sha3_256;
    use sunscreen_math::ring::extend_bigint;

    #[test]
    fn can_multiply_poly_matrix() {
        let mut polys = vec![];

        let m = 2;
        let k = 3;
        let n = 2;

        // Multiply a 2x3 and 3x2 matrix of polynomials. The
        // right-hand matrix is diagonal, as the result is easy
        // to validate.
        for i in 1..(m * k + 1) {
            let mut coeffs = vec![];

            for j in 1..5 {
                coeffs.push(ZqRistretto::try_from((i * j) as u64).unwrap());
            }

            polys.push(Polynomial { coeffs });
        }

        let mut cur_poly = polys.drain(0..);

        let mut a = PolynomialMatrix::new(m, k);
        let mut b = PolynomialMatrix::new(k, n);

        for i in 0..m {
            for j in 0..k {
                a[(i, j)] = cur_poly.next().unwrap();
            }
        }

        let two_x = Polynomial {
            coeffs: vec![ZqRistretto::zero(), ZqRistretto::from(2)],
        };

        // Create a matrix with 0 + 2x on the diagonal.
        for i in 0..k {
            for j in 0..n {
                if i == j {
                    b[(i, j)] = two_x.clone()
                }
            }
        }

        let c = &a * &b;

        for i in 0..c.rows {
            for j in 0..c.cols {
                let expected = a[(i, j)].clone() * &two_x;
                let actual = &c[(i, j)];

                assert_eq!(&expected, actual);
            }
        }
    }

    #[test]
    fn can_multiply_matrix() {
        type Fp = ZqRistretto;

        let a = Matrix::from([
            [Fp::from(1), Fp::from(2), Fp::from(3)],
            [Fp::from(4), Fp::from(5), Fp::from(6)],
        ]);

        let b = Matrix::from([
            [Fp::from(1), Fp::from(2)],
            [Fp::from(3), Fp::from(4)],
            [Fp::from(5), Fp::from(6)],
        ]);

        let c = Matrix::from([[Fp::from(22), Fp::from(28)], [Fp::from(49), Fp::from(64)]]);

        assert_eq!(a * b, c);
    }

    #[test]
    fn can_mod_switch_matrix() {
        let mut a: Matrix<ZqSeal128_8192> = Matrix::new(3, 3);

        for i in 0..a.rows {
            for j in 0..a.cols {
                a[(i, j)] = ZqSeal128_8192::try_from((i + j) as u64).unwrap();
            }
        }

        let b: Matrix<ZqRistretto> = a.mod_switch_signed();

        assert_eq!(a.rows, b.rows);
        assert_eq!(a.cols, b.cols);

        for i in 0..a.rows {
            for j in 0..a.cols {
                assert_eq!(extend_bigint(&a[(i, j)].val), b[(i, j)].val);
            }
        }
    }

    #[test]
    fn can_make_matrix_from_2d_array() {
        type Fp = ZqRistretto;

        let a = Matrix::from([
            [Fp::from(1), Fp::from(2), Fp::from(3)],
            [Fp::from(4), Fp::from(5), Fp::from(6)],
        ]);

        assert_eq!(a.cols, 3);
        assert_eq!(a.rows, 2);
        assert_eq!(a[(0, 0)], Fp::from(1));
        assert_eq!(a[(0, 1)], Fp::from(2));
        assert_eq!(a[(0, 2)], Fp::from(3));
        assert_eq!(a[(1, 0)], Fp::from(4));
        assert_eq!(a[(1, 1)], Fp::from(5));
        assert_eq!(a[(1, 2)], Fp::from(6));
    }

    #[test]
    fn can_sub_poly_matrix() {
        type Fp = ZqRistretto;

        let base_poly = Polynomial {
            coeffs: vec![Fp::from(1), Fp::from(2), Fp::from(3)],
        };

        let a = Matrix::from([
            [&base_poly * Fp::from(1), &base_poly * Fp::from(2)],
            [&base_poly * Fp::from(3), &base_poly * Fp::from(4)],
        ]);

        let b = Matrix::from([
            [base_poly.clone(), base_poly.clone()],
            [base_poly.clone(), base_poly.clone()],
        ]);

        let c = a - b;

        let expected = Matrix::from([
            [&base_poly * Fp::from(0), &base_poly * Fp::from(1)],
            [&base_poly * Fp::from(2), &base_poly * Fp::from(3)],
        ]);

        assert_eq!(c, expected);
    }

    #[test]
    fn can_add_poly_matrix() {
        type Fp = ZqRistretto;

        let base_poly = Polynomial {
            coeffs: vec![Fp::from(1), Fp::from(2), Fp::from(3)],
        };

        let a = Matrix::from([
            [&base_poly * Fp::from(1), &base_poly * Fp::from(2)],
            [&base_poly * Fp::from(3), &base_poly * Fp::from(4)],
        ]);

        let b = Matrix::from([
            [base_poly.clone(), base_poly.clone()],
            [base_poly.clone(), base_poly.clone()],
        ]);

        let c = a + b;

        let expected = Matrix::from([
            [&base_poly * Fp::from(2), &base_poly * Fp::from(3)],
            [&base_poly * Fp::from(4), &base_poly * Fp::from(5)],
        ]);

        assert_eq!(c, expected);
    }

    #[test]
    fn can_hash_poly_matrix() {
        type Fp = ZqRistretto;

        let base_poly = Polynomial {
            coeffs: vec![Fp::from(1), Fp::from(2), Fp::from(3)],
        };

        let a = Matrix::from([
            [&base_poly * Fp::from(1), &base_poly * Fp::from(2)],
            [&base_poly * Fp::from(3), &base_poly * Fp::from(4)],
        ]);

        let mut hasher = Sha3_256::new();

        a.crypto_hash(&mut hasher);

        let hash_1 = hasher.finalize();

        let mut hasher = Sha3_256::new();

        a.crypto_hash(&mut hasher);

        let hash_2 = hasher.finalize();

        assert_eq!(hash_1, hash_2);

        let b = Matrix::from([
            [&base_poly * Fp::from(2), &base_poly * Fp::from(1)],
            [&base_poly * Fp::from(3), &base_poly * Fp::from(4)],
        ]);

        let mut hasher = Sha3_256::new();

        b.crypto_hash(&mut hasher);

        let hash_3 = hasher.finalize();

        assert_ne!(hash_1, hash_3);
    }

    #[test]
    fn can_evaluate_poly_matrix() {
        type Fp = ZqRistretto;

        let base_poly = Polynomial {
            coeffs: vec![Fp::from(1), Fp::from(2), Fp::from(3)],
        };

        let a = Matrix::from([
            [&base_poly * Fp::from(1), &base_poly * Fp::from(2)],
            [&base_poly * Fp::from(3), &base_poly * Fp::from(4)],
        ]);

        let c = a.evaluate(&Fp::from(7));

        let expected = Matrix::from([
            [Fp::from(162), Fp::from(2 * 162)],
            [Fp::from(3 * 162), Fp::from(4 * 162)],
        ]);

        assert_eq!(c, expected);
    }

    #[test]
    fn can_inner_product_bitslice() {
        type Fp = ZqRistretto;

        let mut a: BitVec = BitVec::with_capacity(4);
        a.push(false);
        a.push(true);
        a.push(false);
        a.push(true);

        let b = vec![Fp::from(1), Fp::from(2), Fp::from(3), Fp::from(4)];

        assert_eq!(a.as_bitslice().inner_product(b.as_slice()), Fp::from(6));
    }

    #[test]
    fn test_kronecker_product() {
        type Fp = ZqRistretto;

        let a_values = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

        let b_values = [[1], [2]];

        let a_kron_b_values = [
            [1, 2, 3],
            [2, 4, 6],
            [4, 5, 6],
            [8, 10, 12],
            [7, 8, 9],
            [14, 16, 18],
        ];

        let b_kron_a_values = [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
            [2, 4, 6],
            [8, 10, 12],
            [14, 16, 18],
        ];

        let a = Matrix::from(a_values.map(|row| row.map(Fp::from)));
        let b = Matrix::from(b_values.map(|row| row.map(Fp::from)));

        let a_kron_b_expected = Matrix::from(a_kron_b_values.map(|row| row.map(Fp::from)));
        let b_kron_a_expected = Matrix::from(b_kron_a_values.map(|row| row.map(Fp::from)));

        let a_kron_b = kronecker_product(&a, &b);
        let b_kron_a = kronecker_product(&b, &a);

        assert_eq!(a_kron_b, a_kron_b_expected);
        assert_eq!(b_kron_a, b_kron_a_expected);
    }
}
