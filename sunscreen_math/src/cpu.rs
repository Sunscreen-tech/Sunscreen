use core::ops::Deref;
use core::slice::Iter;
use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar};
use rayon::prelude::*;
use std::{
    ops::{Add, Mul},
    vec::IntoIter,
};

/// A vector of [`RistrettoPoint`]s that supports batching operations.
///
/// # Remarks
/// This implementation performs calculations in parallel on the CPU.
pub struct CpuRistrettoPointVec(Vec<RistrettoPoint>);

impl CpuRistrettoPointVec {
    /// Creates a [`CpuRistrettoPointVec`].
    pub fn new(data: &[RistrettoPoint]) -> Self {
        Self(data.to_owned())
    }

    /// Produce an iterator over [`RistrettoPoint`]s.
    pub fn iter(&self) -> Iter<'_, RistrettoPoint> {
        self.0.iter()
    }
}

impl IntoIterator for CpuRistrettoPointVec {
    type Item = RistrettoPoint;
    type IntoIter = IntoIter<RistrettoPoint>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

impl Deref for CpuRistrettoPointVec {
    type Target = [RistrettoPoint];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Add<CpuRistrettoPointVec> for CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn add(self, rhs: CpuRistrettoPointVec) -> Self::Output {
        &self + &rhs
    }
}

impl Add<&CpuRistrettoPointVec> for CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn add(self, rhs: &CpuRistrettoPointVec) -> Self::Output {
        &self + rhs
    }
}

impl Add<CpuRistrettoPointVec> for &CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn add(self, rhs: CpuRistrettoPointVec) -> Self::Output {
        self + &rhs
    }
}

impl Add<&CpuRistrettoPointVec> for &CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn add(self, rhs: &CpuRistrettoPointVec) -> Self::Output {
        CpuRistrettoPointVec(
            self.par_iter()
                .zip(rhs.par_iter())
                .map(|(a, b)| a + b)
                .collect(),
        )
    }
}

impl Mul<CpuScalarVec> for CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn mul(self, rhs: CpuScalarVec) -> Self::Output {
        &self * &rhs
    }
}

impl Mul<&CpuScalarVec> for CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn mul(self, rhs: &CpuScalarVec) -> Self::Output {
        &self * rhs
    }
}

impl Mul<CpuScalarVec> for &CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn mul(self, rhs: CpuScalarVec) -> Self::Output {
        self * &rhs
    }
}

impl Mul<&CpuScalarVec> for &CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn mul(self, rhs: &CpuScalarVec) -> Self::Output {
        CpuRistrettoPointVec(
            self.par_iter()
                .zip(rhs.par_iter())
                .map(|(a, b)| a * b)
                .collect(),
        )
    }
}

impl Mul<Scalar> for CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    #[allow(clippy::op_ref)]
    fn mul(self, rhs: Scalar) -> Self::Output {
        &self * &rhs
    }
}

impl Mul<&Scalar> for CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn mul(self, rhs: &Scalar) -> Self::Output {
        &self * rhs
    }
}

impl Mul<Scalar> for &CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    #[allow(clippy::op_ref)]
    fn mul(self, rhs: Scalar) -> Self::Output {
        self * &rhs
    }
}

impl Mul<&Scalar> for &CpuRistrettoPointVec {
    type Output = CpuRistrettoPointVec;

    fn mul(self, rhs: &Scalar) -> Self::Output {
        CpuRistrettoPointVec(self.par_iter().map(|p| p * rhs).collect())
    }
}

/// A vector of [`Scalar`]s that supports batching operations.
///
/// # Remarks
/// This implementation performs calculations in parallel on the CPU.
pub struct CpuScalarVec(Vec<Scalar>);

impl CpuScalarVec {
    /// Create a new [`CpuScalarVec`].
    pub fn new(data: &[Scalar]) -> Self {
        Self(data.to_owned())
    }

    /// Create an iterator over [`Scalar`] values.
    pub fn iter(&self) -> Iter<'_, Scalar> {
        self.0.iter()
    }

    /// Inverts each [`Scalar`] in the vector.
    pub fn invert(&self) -> Self {
        Self(self.par_iter().map(|x| x.invert()).collect())
    }
}

impl Deref for CpuScalarVec {
    type Target = [Scalar];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl IntoIterator for CpuScalarVec {
    type Item = Scalar;
    type IntoIter = IntoIter<Scalar>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}
