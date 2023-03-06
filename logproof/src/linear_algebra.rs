use ark_ff::Field;
use ark_poly::{univariate::DensePolynomial, Polynomial};
use bitvec::slice::BitSlice;
use curve25519_dalek::scalar::Scalar;
use digest::Digest;
use rayon::prelude::*;
use std::borrow::Borrow;
use std::ops::{Add, Div, Index, IndexMut, Mul, Sub};

use crate::crypto::CryptoHash;
use crate::fields::{FieldFrom, FpRistretto};
use crate::math::{ModSwitch, One, Rem, SmartMul, Tensor, Zero};

#[derive(Debug, Clone, PartialEq)]
/**
 * An `m x n` matrix of elements.
 *
 * # Remarks
 * Matrix elements can be any type that implements [`Add`], [`Mul`],
 * [`Clone`], [`Zero`].
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
pub type PolynomialMatrix<F> = Matrix<DensePolynomial<F>>;

impl<F, Rhs> Sub<Rhs> for PolynomialMatrix<F>
where
    Rhs: Borrow<PolynomialMatrix<F>>,
    F: Field,
{
    type Output = PolynomialMatrix<F>;

    fn sub(self, rhs: Rhs) -> Self::Output {
        &self - rhs
    }
}

impl<F, Rhs> Sub<Rhs> for &PolynomialMatrix<F>
where
    Rhs: Borrow<PolynomialMatrix<F>>,
    F: Field,
{
    type Output = PolynomialMatrix<F>;

    fn sub(self, rhs: Rhs) -> Self::Output {
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

impl<F, Rhs> Add<Rhs> for Matrix<F>
where
    Rhs: Borrow<Self>,
    F: Add<F, Output = F> + Zero + Clone,
{
    type Output = Matrix<F>;

    fn add(self, rhs: Rhs) -> Self::Output {
        &self + rhs
    }
}

impl<F, Rhs> Add<Rhs> for &Matrix<F>
where
    Rhs: Borrow<Matrix<F>>,
    F: Add<Output = F> + Zero + Clone,
{
    type Output = Matrix<F>;

    fn add(self, rhs: Rhs) -> Self::Output {
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

impl<F> PolynomialMatrix<F>
where
    F: Field + Zero,
{
    /**
     * For a matrix of polynomials, divides each polynomial coefficient
     * of each matrix element by x.
     */
    pub fn scalar_div_q(&self, x: &F) -> Self {
        let data = self
            .data
            .iter()
            .map(|y| {
                let coeffs = y.coeffs.iter().map(|c| *c / x).collect();

                DensePolynomial { coeffs }
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
    pub fn scalar_mul_q(&self, x: &F) -> Self {
        let data = self
            .data
            .iter()
            .map(|y| {
                let coeffs = y.coeffs.iter().map(|c| *c * x).collect();

                DensePolynomial { coeffs }
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
    pub fn evaluate(&self, point: &F) -> Matrix<F> {
        let data = self.data.iter().map(|x| x.evaluate(point)).collect();

        Matrix {
            rows: self.rows,
            cols: self.cols,
            data,
        }
    }
}

impl<F, Rhs> Div<Rhs> for PolynomialMatrix<F>
where
    Rhs: Borrow<DensePolynomial<F>>,
    F: Field,
{
    type Output = PolynomialMatrix<F>;

    fn div(self, rhs: Rhs) -> Self::Output {
        &self / rhs
    }
}

impl<F, Rhs> Div<Rhs> for &PolynomialMatrix<F>
where
    Rhs: Borrow<DensePolynomial<F>>,
    F: Field,
{
    type Output = PolynomialMatrix<F>;

    fn div(self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();

        let data = self.data.par_iter().map(|x| x / rhs).collect();

        Self::Output {
            rows: self.rows,
            cols: self.cols,
            data,
        }
    }
}

impl<F, Rhs> Mul<Rhs> for Matrix<F>
where
    Rhs: Borrow<Matrix<F>>,
    F: Zero + Clone + Add<F, Output = F> + Sync + Send,
    for<'a> &'a F: SmartMul<&'a F, Output = F>,
{
    type Output = Matrix<F>;

    fn mul(self, rhs: Rhs) -> Self::Output {
        &self * rhs
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

impl<F, Rhs> Mul<Rhs> for &Matrix<F>
where
    Rhs: Borrow<Matrix<F>>,
    F: Zero + Clone + Add<F, Output = F> + Sync + Send,
    for<'a> &'a F: SmartMul<&'a F, Output = F>,
{
    type Output = Matrix<F>;

    fn mul(self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();

        assert_eq!(self.cols, rhs.rows);

        let mut c = Matrix::new(self.rows, rhs.cols);

        let mut row_cols = c.data.split_inclusive_mut(|_| true).collect::<Vec<_>>();

        row_cols.par_iter_mut().enumerate().for_each(|(i, c_elem)| {
            let row = i / c.cols;
            let col = i % c.cols;
            let mut val = F::zero();

            for k in 0..self.cols {
                let a_i = &self[(row, k)];
                let b_i = &rhs[(k, col)];

                val = val + a_i.smart_mul(b_i);
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

/**
 * This trait is used to define multiplying a U<T> by a T. In particular,
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

impl<T, Rhs> ScalarMul<Rhs> for Matrix<T>
where
    T: Zero + Clone + Sync + Send,
    for<'a> &'a T: SmartMul<&'a T, Output = T>,
    Rhs: Borrow<T>,
{
    type Output = Self;

    fn scalar_mul(self, rhs: Rhs) -> Self::Output {
        (&self).scalar_mul(rhs)
    }
}

impl<T, Rhs> ScalarMul<Rhs> for &Matrix<T>
where
    T: Zero + Clone + Sync + Send,
    for<'a> &'a T: SmartMul<&'a T, Output = T>,
    Rhs: Borrow<T>,
{
    type Output = Matrix<T>;

    fn scalar_mul(self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();

        let data = (0..self.data.len())
            .into_par_iter()
            .map(|i| self.data[i].smart_mul(rhs))
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

impl<T, Rhs> ScalarRem<Rhs> for Matrix<T>
where
    T: Zero + Clone,
    for<'a> &'a T: crate::math::Rem<&'a T, Output = T>,
    Rhs: Borrow<T>,
{
    type Output = Self;

    fn scalar_rem(self, rhs: Rhs) -> Self::Output {
        (&self).scalar_rem(rhs)
    }
}

impl<T, Rhs> ScalarRem<Rhs> for &Matrix<T>
where
    T: Zero + Clone,
    for<'a> &'a T: crate::math::Rem<&'a T, Output = T>,
    Rhs: Borrow<T>,
{
    type Output = Matrix<T>;

    fn scalar_rem(self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();

        let data = self.data.iter().map(|x| x.rem(rhs)).collect();

        Self::Output {
            rows: self.rows,
            cols: self.cols,
            data,
        }
    }
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

impl<Rhs> InnerProduct<Rhs> for Vec<FpRistretto>
where
    Rhs: Borrow<[FpRistretto]>,
{
    type Output = FpRistretto;

    fn inner_product(&self, rhs: Rhs) -> Self::Output {
        self.as_slice().inner_product(rhs)
    }
}

impl<Rhs> InnerProduct<Rhs> for [FpRistretto]
where
    Rhs: Borrow<[FpRistretto]>,
{
    type Output = FpRistretto;

    fn inner_product(&self, rhs: Rhs) -> Self::Output {
        let rhs = rhs.borrow();
        assert_eq!(self.len(), rhs.len());

        self.par_iter()
            .zip(rhs.par_iter())
            .map(|(a, b)| a * b)
            .fold(FpRistretto::zero, |s, p| s + p)
            .reduce(FpRistretto::zero, |a, b| a + b)
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

impl InnerProduct<&Matrix<FpRistretto>> for Matrix<FpRistretto> {
    type Output = FpRistretto;

    fn inner_product(&self, rhs: &Matrix<FpRistretto>) -> Self::Output {
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

impl<F> HadamardProduct<&BitSlice> for &[F]
where
    for<'a> F: Mul<&'a F, Output = F> + Field,
{
    type Output = Vec<F>;

    fn hadamard_product(&self, rhs: &BitSlice) -> Self::Output {
        self.iter()
            .zip(rhs.iter())
            .map(|(x, y)| {
                let y = if *y { F::one() } else { F::zero() };

                y * x
            })
            .collect()
    }
}

#[allow(unused)]
/**
 * Pretty print the given matrix. Handy for debugging.
 */
impl<F: Field> std::fmt::Display for &Matrix<DensePolynomial<F>> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Matrix [")?;
        for i in 0..self.rows {
            writeln!(f, "\t[")?;
            for j in 0..self.cols {
                crate::math::print_polynomial(&self[(i, j)]);
                write!(f, ", ")?;
            }
            writeln!(f, "]")?;
        }
        writeln!(f, "]")
    }
}

#[cfg(test)]
mod tests {
    use crate::fields::{FpRistretto, FqSeal128_8192};

    use super::*;
    use ark_ff::{FpConfig, MontBackend};
    use ark_poly::univariate::DensePolynomial;
    use bitvec::vec::BitVec;
    use sha3::Sha3_256;

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
                coeffs.push(FpRistretto::from((i * j) as u32));
            }

            polys.push(DensePolynomial { coeffs });
        }

        let mut cur_poly = polys.drain(0..);

        let mut a = PolynomialMatrix::new(m, k);
        let mut b = PolynomialMatrix::new(k, n);

        for i in 0..m {
            for j in 0..k {
                a[(i, j)] = cur_poly.next().unwrap();
            }
        }

        let two_x = DensePolynomial {
            coeffs: vec![FpRistretto::zero(), FpRistretto::from(2)],
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
                let expected = a[(i, j)].naive_mul(&two_x);
                let actual = &c[(i, j)];

                assert_eq!(&expected, actual);
            }
        }
    }

    #[test]
    fn can_multiply_matrix() {
        type Fp = FpRistretto;

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
        let mut a: Matrix<FqSeal128_8192> = Matrix::new(3, 3);

        for i in 0..a.rows {
            for j in 0..a.cols {
                a[(i, j)] = FqSeal128_8192::from((i + j) as u32);
            }
        }

        let b: Matrix<FpRistretto> = a.mod_switch_signed();

        assert_eq!(a.rows, b.rows);
        assert_eq!(a.cols, b.cols);

        for i in 0..a.rows {
            for j in 0..a.cols {
                assert_eq!(
                    MontBackend::into_bigint(a[(i, j)]),
                    MontBackend::into_bigint(b[(i, j)])
                );
            }
        }
    }

    #[test]
    fn can_make_matrix_from_2d_array() {
        type Fp = FpRistretto;

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
        type Fp = FpRistretto;

        let base_poly = DensePolynomial {
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
        type Fp = FpRistretto;

        let base_poly = DensePolynomial {
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
        type Fp = FpRistretto;

        let base_poly = DensePolynomial {
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
        type Fp = FpRistretto;

        let base_poly = DensePolynomial {
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
        type Fp = FpRistretto;

        let mut a: BitVec = BitVec::with_capacity(4);
        a.push(false);
        a.push(true);
        a.push(false);
        a.push(true);

        let b = vec![Fp::from(1), Fp::from(2), Fp::from(3), Fp::from(4)];

        assert_eq!(a.as_bitslice().inner_product(b.as_slice()), Fp::from(6));
    }
}
