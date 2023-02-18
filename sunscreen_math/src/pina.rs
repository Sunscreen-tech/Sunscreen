use std::ops::{Add, Mul};
use std::vec::IntoIter;
use core::ops::Deref;
use core::slice::Iter;

use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar};
use rayon::{prelude::*, scope};

use crate::{GpuRistrettoPointVec, GpuScalarVec};

pub struct PinaRistrettoPointVec(Vec<RistrettoPoint>);

impl PinaRistrettoPointVec {
    pub fn new(data: &[RistrettoPoint]) -> Self {
        Self(data.to_owned())
    }
}

impl Deref for PinaRistrettoPointVec {
    type Target = [RistrettoPoint];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl IntoIterator for PinaRistrettoPointVec {
    type Item = RistrettoPoint;
    type IntoIter = IntoIter<RistrettoPoint>;
    
    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

impl Add<PinaRistrettoPointVec> for PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    fn add(self, rhs: PinaRistrettoPointVec) -> Self::Output {
        &self + &rhs
    }
}
impl Add<&PinaRistrettoPointVec> for PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    fn add(self, rhs: &PinaRistrettoPointVec) -> Self::Output {
        &self + rhs
    }
}

impl Add<PinaRistrettoPointVec> for &PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    fn add(self, rhs: PinaRistrettoPointVec) -> Self::Output {
        self + &rhs
    }
}

impl Add<&PinaRistrettoPointVec> for &PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    fn add(self, rhs: &PinaRistrettoPointVec) -> Self::Output {
        PinaRistrettoPointVec(self.par_iter().zip(rhs.par_iter()).map(|(a, b)| a + b).collect())
    }
}

impl Mul<PinaScalarVec> for PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    fn mul(self, rhs: PinaScalarVec) -> Self::Output {
        &self * &rhs
    }
}
impl Mul<&PinaScalarVec> for PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    fn mul(self, rhs: &PinaScalarVec) -> Self::Output {
        &self * rhs
    }
}

impl Mul<PinaScalarVec> for &PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    fn mul(self, rhs: PinaScalarVec) -> Self::Output {
        self * &rhs
    }
}

impl Mul<&PinaScalarVec> for &PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    fn mul(self, rhs: &PinaScalarVec) -> Self::Output {
        const GPU_SHARE: f64 = 0.8;

        let gpu_count = (GPU_SHARE * self.len() as f64) as usize;
        let (gpu_a, cpu_a) = self.split_at(gpu_count);
        let gpu_a = GpuRistrettoPointVec::new(gpu_a);
        let (gpu_b, cpu_b) = rhs.split_at(gpu_count);
        let gpu_b = GpuScalarVec::new(gpu_b);

        let mut gpu_out = GpuRistrettoPointVec::new(&[]);
        let mut cpu_out = vec![];

        scope(|s| {
            s.spawn(|_| {
                gpu_out = gpu_a * gpu_b
            });

            cpu_out = cpu_a.par_iter().zip(cpu_b.par_iter()).map(|(a, b)| a * b).collect();
        });

        PinaRistrettoPointVec(gpu_out.iter().chain(cpu_out.drain(..)).collect())
    }
}

impl Mul<Scalar> for PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    #[allow(clippy::op_ref)]
    fn mul(self, rhs: Scalar) -> Self::Output {
        &self * &rhs
    }
}

impl Mul<&Scalar> for PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    #[allow(clippy::op_ref)]
    fn mul(self, rhs: &Scalar) -> Self::Output {
        &self * rhs
    }
}

impl Mul<Scalar> for &PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    #[allow(clippy::op_ref)]
    fn mul(self, rhs: Scalar) -> Self::Output {
        self * &rhs
    }
}

impl Mul<&Scalar> for &PinaRistrettoPointVec {
    type Output = PinaRistrettoPointVec;

    fn mul(self, rhs: &Scalar) -> Self::Output {
        self * PinaScalarVec(vec![*rhs; self.len()])
    }
}

pub struct PinaScalarVec(Vec<Scalar>);

impl PinaScalarVec {
    pub fn new(data: &[Scalar]) -> Self {
        Self(data.to_owned())
    }

    pub fn iter(&self) -> Iter<'_, Scalar> {
        self.0.iter()
    }

    pub fn invert(&self) -> Self {
        const GPU_SHARE: f64 = 0.8;

        let gpu_count = (GPU_SHARE * self.len() as f64) as usize;
        let (gpu_a, cpu_a) = self.split_at(gpu_count);
        let gpu_a = GpuScalarVec::new(gpu_a);

        let mut gpu_out = GpuScalarVec::new(&[]);
        let mut cpu_out = vec![];

        scope(|s| {
            s.spawn(|_| {
                let gpu_a = gpu_a;
                gpu_out = gpu_a.invert()
            });

            cpu_out = cpu_a.par_iter().map(|a| a.invert()).collect();
        });

        PinaScalarVec(gpu_out.iter().chain(cpu_out.drain(..)).collect())
    }
}

impl Deref for PinaScalarVec {
    type Target = [Scalar];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl IntoIterator for PinaScalarVec {
    type Item = Scalar;
    type IntoIter = IntoIter<Scalar>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}