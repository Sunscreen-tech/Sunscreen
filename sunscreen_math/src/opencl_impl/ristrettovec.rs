use curve25519_dalek::{
    edwards::EdwardsPoint, ristretto::RistrettoPoint, scalar::Scalar, CannonicalFieldElement,
};
use rayon::prelude::*;
use std::{
    mem::size_of,
    ops::{Add, Mul, Sub},
};

use crate::{opencl_impl::Runtime, GpuScalarVec};

use super::{
    multiexp::multiscalar_multiplication, GpuVec, GpuVecIter, IntoGpuVecIter, MappedBuffer,
};

/// A vector of [`RistrettoPoint`] elements laid out in a way that enables coalesced
/// reads and writes on a GPU.
///
/// # Remarks
/// Conceptually, data is laid out as a row-major `m x n x 4` tensor stored in
/// a 1 dimensional buffer. The leading dimension iterates over the Ristretto point,
/// the second dimension iterates over the limbs in a coordinate, and the trailing
/// dimension iterates over coordinates.
pub struct GpuRistrettoPointVec {
    /// The GPU buffer holding the points.
    pub(crate) data: MappedBuffer<u32>,

    /// The length of the vector, in points (not bytes).
    len: usize,
}

impl GpuRistrettoPointVec {
    #[allow(clippy::erasing_op)]
    #[allow(clippy::identity_op)]
    pub fn new(x: &[RistrettoPoint]) -> Self {
        let len = x.len();

        assert_eq!(size_of::<RistrettoPoint>(), size_of::<u32>() * 40);
        let u32_len = x.len() * size_of::<RistrettoPoint>() / size_of::<u32>();
        let mut data = vec![0u32; u32_len];

        let u29 = x
            .par_iter()
            .map(|p| {
                (
                    p.0.X.to_u29(),
                    p.0.Y.to_u29(),
                    p.0.Z.to_u29(),
                    p.0.T.to_u29(),
                )
            })
            .collect::<Vec<_>>();

        for (i, p) in u29.iter().enumerate() {
            let (x, y, z, t) = p;

            let u29_len = x.len();

            for (j, w) in x.iter().enumerate() {
                data[(j + 0 * u29_len) * len + i] = *w;
            }

            for (j, w) in y.iter().enumerate() {
                data[(j + 1 * u29_len) * len + i] = *w;
            }

            for (j, w) in z.iter().enumerate() {
                data[(j + 2 * u29_len) * len + i] = *w;
            }

            for (j, w) in t.iter().enumerate() {
                data[(j + 3 * u29_len) * len + i] = *w;
            }
        }

        Self {
            data: Runtime::get().alloc_from_slice(&data),
            len,
        }
    }

    /// Allocate a new [`RistrettoPointVev`] initialized to zero.
    pub(crate) fn alloc(len: usize) -> Self {
        assert_eq!(size_of::<RistrettoPoint>(), size_of::<u32>() * 40);

        Self {
            data: Runtime::get().alloc(len * size_of::<RistrettoPoint>()),
            len,
        }
    }

    pub fn iter(&self) -> GpuVecIter<Self> {
        <Self as GpuVec>::iter(self)
    }

    pub fn multiscalar_multiplication(&self, scalars: &GpuScalarVec) -> RistrettoPoint {
        multiscalar_multiplication(self, scalars)
    }
}

impl IntoIterator for GpuRistrettoPointVec {
    type IntoIter = IntoGpuVecIter<Self>;
    type Item = RistrettoPoint;

    fn into_iter(self) -> Self::IntoIter {
        <Self as GpuVec>::into_iter(self)
    }
}

impl GpuVec for GpuRistrettoPointVec {
    type Item = RistrettoPoint;

    fn get_buffer(&self) -> &MappedBuffer<u32> {
        &self.data
    }

    fn len(&self) -> usize {
        self.len
    }

    #[allow(clippy::erasing_op)]
    #[allow(clippy::identity_op)]
    fn get(&self, index: usize) -> RistrettoPoint {
        if index > self.len {
            panic!("Index {index} exceeds bounds of {}", self.len);
        }

        let mut x = [0u32; 10];
        let mut y = [0u32; 10];
        let mut z = [0u32; 10];
        let mut t = [0u32; 10];

        let u29_len = x.len();

        for (i, x) in x.iter_mut().enumerate() {
            *x = self.data[(i + 0 * u29_len) * self.len + index];
        }

        for (i, y) in y.iter_mut().enumerate() {
            *y = self.data[(i + 1 * u29_len) * self.len + index];
        }

        for (i, z) in z.iter_mut().enumerate() {
            *z = self.data[(i + 2 * u29_len) * self.len + index];
        }

        for (i, t) in t.iter_mut().enumerate() {
            *t = self.data[(i + 3 * u29_len) * self.len + index];
        }

        RistrettoPoint(EdwardsPoint {
            X: CannonicalFieldElement(x).to_field(),
            Y: CannonicalFieldElement(y).to_field(),
            Z: CannonicalFieldElement(z).to_field(),
            T: CannonicalFieldElement(t).to_field(),
        })
    }
}

impl Add<GpuRistrettoPointVec> for GpuRistrettoPointVec {
    type Output = Self;

    fn add(self, rhs: GpuRistrettoPointVec) -> Self::Output {
        &self + &rhs
    }
}

impl Add<&GpuRistrettoPointVec> for GpuRistrettoPointVec {
    type Output = Self;

    fn add(self, rhs: &GpuRistrettoPointVec) -> Self::Output {
        &self + rhs
    }
}

impl Add<GpuRistrettoPointVec> for &GpuRistrettoPointVec {
    type Output = GpuRistrettoPointVec;

    fn add(self, rhs: GpuRistrettoPointVec) -> Self::Output {
        self + &rhs
    }
}

impl Add<&GpuRistrettoPointVec> for &GpuRistrettoPointVec {
    type Output = GpuRistrettoPointVec;

    fn add(self, rhs: &GpuRistrettoPointVec) -> Self::Output {
        Self::Output {
            data: self.binary_gpu_kernel("ristretto_add", rhs),
            len: self.len,
        }
    }
}

impl Sub<GpuRistrettoPointVec> for GpuRistrettoPointVec {
    type Output = Self;

    fn sub(self, rhs: GpuRistrettoPointVec) -> Self::Output {
        &self - &rhs
    }
}

impl Sub<&GpuRistrettoPointVec> for GpuRistrettoPointVec {
    type Output = Self;

    fn sub(self, rhs: &GpuRistrettoPointVec) -> Self::Output {
        &self - rhs
    }
}

impl Sub<GpuRistrettoPointVec> for &GpuRistrettoPointVec {
    type Output = GpuRistrettoPointVec;

    fn sub(self, rhs: GpuRistrettoPointVec) -> Self::Output {
        self - &rhs
    }
}

impl Sub<&GpuRistrettoPointVec> for &GpuRistrettoPointVec {
    type Output = GpuRistrettoPointVec;

    fn sub(self, rhs: &GpuRistrettoPointVec) -> Self::Output {
        Self::Output {
            data: self.binary_gpu_kernel("ristretto_sub", rhs),
            len: self.len,
        }
    }
}

impl Mul<GpuScalarVec> for GpuRistrettoPointVec {
    type Output = Self;

    fn mul(self, rhs: GpuScalarVec) -> Self::Output {
        &self * &rhs
    }
}

impl Mul<&GpuScalarVec> for GpuRistrettoPointVec {
    type Output = Self;

    fn mul(self, rhs: &GpuScalarVec) -> Self::Output {
        &self * rhs
    }
}

impl Mul<GpuScalarVec> for &GpuRistrettoPointVec {
    type Output = GpuRistrettoPointVec;

    fn mul(self, rhs: GpuScalarVec) -> Self::Output {
        self * &rhs
    }
}

impl Mul<&GpuScalarVec> for &GpuRistrettoPointVec {
    type Output = GpuRistrettoPointVec;

    fn mul(self, rhs: &GpuScalarVec) -> Self::Output {
        Self::Output {
            data: self.binary_gpu_kernel("ristretto_scalar_mul", rhs),
            len: self.len,
        }
    }
}

impl Mul<Scalar> for GpuRistrettoPointVec {
    type Output = Self;

    // Clippy doesn't know what it's talking about. We want to call the &,&
    // variant
    #[allow(clippy::op_ref)]
    fn mul(self, rhs: Scalar) -> Self::Output {
        &self * &rhs
    }
}

impl Mul<&Scalar> for GpuRistrettoPointVec {
    type Output = Self;

    fn mul(self, rhs: &Scalar) -> Self::Output {
        &self * rhs
    }
}

impl Mul<Scalar> for &GpuRistrettoPointVec {
    type Output = GpuRistrettoPointVec;

    // Clippy doesn't know what it's talking about. Remove the ref and this
    // becomes infinite recursion.
    #[allow(clippy::op_ref)]
    fn mul(self, rhs: Scalar) -> Self::Output {
        self * &rhs
    }
}

impl Mul<&Scalar> for &GpuRistrettoPointVec {
    type Output = GpuRistrettoPointVec;

    fn mul(self, rhs: &Scalar) -> Self::Output {
        let rhs = vec![*rhs; self.len()];
        let rhs = GpuScalarVec::new(&rhs);

        Self::Output {
            data: self.binary_gpu_kernel("ristretto_scalar_mul", &rhs),
            len: self.len,
        }
    }
}

#[cfg(test)]
mod tests {
    use curve25519_dalek::scalar::Scalar;
    use rand::thread_rng;

    

    use super::*;

    #[test]
    fn can_pack_and_unpack_points() {
        let points = [
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ];

        let v = GpuRistrettoPointVec::new(&points);

        for (i, p) in points.into_iter().enumerate() {
            assert_eq!(v.get(i).compress(), p.compress());
        }
    }

    #[test]
    fn can_pack_and_unpack_gpu() {
        let points = [
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ];

        let v = GpuRistrettoPointVec::new(&points);

        let o = GpuRistrettoPointVec::unary_gpu_kernel(&v, "test_can_pack_unpack_ristretto");

        let o = GpuRistrettoPointVec {
            data: o,
            len: v.len(),
        };

        for (v, o) in v.iter().zip(o.iter()) {
            assert_eq!(v.compress(), o.compress())
        }
    }

    #[test]
    fn can_add_ristretto_points() {
        let a = GpuRistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = GpuRistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let c = &a + &b;

        for i in 0..c.len() {
            assert_eq!(c.get(i).compress(), (a.get(i) + b.get(i)).compress());
        }
    }

    #[test]
    fn can_sub_ristretto_points() {
        let a = GpuRistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = GpuRistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let c = &a - &b;

        for i in 0..c.len() {
            assert_eq!(c.get(i).compress(), (a.get(i) - b.get(i)).compress());
        }
    }

    #[test]
    fn can_scalar_mul_ristretto_points() {
        let a = GpuRistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = &a * &b;

        for i in 0..c.len() {
            assert_eq!(c.get(i).compress(), (a.get(i) * b.get(i)).compress());
        }
    }

    #[test]
    fn can_roundtrip_projective_point() {
        let a = [
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ];

        let a_gpu = GpuRistrettoPointVec::new(&a);

        let b_gpu =
            GpuRistrettoPointVec::unary_gpu_kernel(&a_gpu, "test_can_roundtrip_projective_point");
        let mut b_gpu = GpuRistrettoPointVec {
            data: b_gpu,
            len: a.len(),
        };

        b_gpu.data.remap();

        for (i, j) in a_gpu.iter().zip(b_gpu.iter()) {
            assert_eq!(i.compress(), j.compress());
        }
    }

    #[test]
    fn can_double_projective_point() {
        let a = GpuRistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = GpuRistrettoPointVec::unary_gpu_kernel(&a, "test_can_double_projective_point");

        let b = GpuRistrettoPointVec {
            data: b,
            len: a.len(),
        };

        for (p_a, p_b) in a.iter().zip(b.iter()) {
            assert_eq!(Scalar::from(2u8) * p_a, p_b);
        }
    }
}
