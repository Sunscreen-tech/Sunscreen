use std::{mem::size_of, ops::{Add, Sub, Mul}};

use curve25519_dalek::{ristretto::RistrettoPoint, edwards::EdwardsPoint, CannonicalFieldElement};

use crate::{opencl_impl::Runtime, RistrettoPointVec, GpuScalarVec};

use super::{MappedBuffer, GpuVec, GpuVecIter};

/// A vector of [`RistrettoPoint`] elements laid out in a way that enables coalesced
/// reads and writes on a GPU.
/// 
/// # Remarks
/// Conceptually, data is laid out as a row-major `m x n x 4` tensor stored in
/// a 1 dimensional buffer. The leading dimension iterates over the Ristretto point,
/// the second dimension iterates over the limbs in a coordinate, and the trailing 
/// dimension iterates over coordinates.
pub struct GpuRistrettoPointVec {
    pub(crate) data: MappedBuffer<u32>,
    len: usize,
}

impl GpuRistrettoPointVec {
    pub fn new(x: &[RistrettoPoint]) -> Self {
        let runtime = Runtime::get();

        let len = x.len();

        assert_eq!(size_of::<RistrettoPoint>(), size_of::<u32>() * 40);
        let byte_len = x.len() * size_of::<RistrettoPoint>();
        let mut data = runtime.alloc(byte_len);

        for (i, p) in x.iter().enumerate() {
            let x = p.0.X.to_u29();
            let y = p.0.Y.to_u29();
            let z = p.0.Z.to_u29();
            let t = p.0.T.to_u29();

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

        Self { data, len }
    }

    pub fn iter(&self) -> GpuVecIter<Self> {
        <Self as GpuVec>::iter(self)
    }
}

impl GpuVec for RistrettoPointVec {
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

        for i in 0..10 {
            x[i] = self.data[(i + 0 * u29_len) * self.len + index];
        }

        for i in 0..10 {
            y[i] = self.data[(i + 1 * u29_len) * self.len + index];
        }

        for i in 0..10 {
            z[i] = self.data[(i + 2 * u29_len) * self.len + index];
        }

        for i in 0..10 {
            t[i] = self.data[(i + 3 * u29_len) * self.len + index];
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

#[cfg(test)]
mod tests {
    use curve25519_dalek::{scalar::Scalar, traits::Identity};
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
            assert_eq!(v.get(i), p);
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

        let o = RistrettoPointVec::unary_gpu_kernel(
            &v,
            "test_can_pack_unpack_ristretto",
        );

        let o = RistrettoPointVec {
            data: o,
            len: v.len()
        };

        for (v, o) in v.iter().zip(o.iter()){
            assert_eq!(v, o)
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
            assert_eq!(c.get(i), a.get(i) - b.get(i));
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

        let b_gpu = GpuRistrettoPointVec::unary_gpu_kernel(&a_gpu, "test_can_roundtrip_projective_point");
        let b_gpu = RistrettoPointVec {
            data: b_gpu,
            len: a.len()
        };

        for (i, j) in a_gpu.iter().zip(b_gpu.iter()) {
            assert_eq!(i, j);
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