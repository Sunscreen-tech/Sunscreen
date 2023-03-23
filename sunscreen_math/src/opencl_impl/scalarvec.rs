use core::mem::size_of;
use std::ops::{Add, Mul, Neg, Sub};

use curve25519_dalek::scalar::Scalar;

use crate::opencl_impl::Runtime;

use super::{Buffer, GpuVec, GpuVecIter};

#[derive(Clone)]
/// A vector of scalars laid out in a way that enables coalescing on
/// the GPU.    
///
/// # Remarks
/// Conceptually, data is laid out as a row-major `m x n` matrix stored in
/// a 1 dimensional buffer. The leading dimension iterates over the scalars
/// while the trailing dimension iterates over limbs in the scalar.
pub struct GpuScalarVec {
    pub(crate) data: Buffer<u32>,
    len: usize,
}

// unsafe impl Send for GpuScalarVec {}

impl GpuScalarVec {
    pub fn new(x: &[Scalar]) -> Self {
        assert_eq!(size_of::<Scalar>(), u32::BITS as usize);

        let len = x.len();
        let byte_len = x.len() * size_of::<Scalar>() / size_of::<u32>();

        let mut data = vec![0u32; byte_len];

        for (i, s) in x.iter().enumerate() {
            let bytes = s.as_bytes();

            for j in 0..8 {
                let mut val = bytes[4 * j] as u32;
                val |= (bytes[4 * j + 1] as u32) << 8;
                val |= (bytes[4 * j + 2] as u32) << 16;
                val |= (bytes[4 * j + 3] as u32) << 24;

                data[len * j + i] = val;
            }
        }

        Self {
            data: Runtime::get().alloc_from_slice(&data),
            len,
        }
    }

    pub fn iter(&self) -> GpuVecIter<Self> {
        <Self as GpuVec>::iter(self)
    }

    pub fn invert(&self) -> Self {
        GpuScalarVec {
            data: self.unary_gpu_kernel("scalar_invert"),
            len: self.len,
        }
    }

    /**
     * Computes self * self.
     *
     * #Remarks
     * This is more performant than using `mul`.
     */
    pub fn square(&self) -> Self {
        GpuScalarVec {
            data: self.unary_gpu_kernel("scalar_square"),
            len: self.len,
        }
    }
}

impl GpuVec for GpuScalarVec {
    type Item = Scalar;

    fn get_buffer(&self) -> &Buffer<u32> {
        &self.data
    }

    fn len(&self) -> usize {
        self.len
    }

    // Multiplying by zero and shifting zero actually makes the code
    // clearer.
    #[allow(clippy::identity_op)]
    #[allow(clippy::erasing_op)]
    /// Get the [`Scalar`] at index i.
    fn get(data: &[u32], i: usize) -> Scalar {
        let len = data.len() / size_of::<Scalar>() * size_of::<u32>();

        if i >= len {
            panic!("Index out of {i} range {}.", len);
        }

        let mut bytes = [0u8; 32];

        bytes[0] = ((data[0 * len + i] & 0xFF << 0) >> 0) as u8;
        bytes[1] = ((data[0 * len + i] & 0xFF << 8) >> 8) as u8;
        bytes[2] = ((data[0 * len + i] & 0xFF << 16) >> 16) as u8;
        bytes[3] = ((data[0 * len + i] & 0xFF << 24) >> 24) as u8;
        bytes[4] = ((data[1 * len + i] & 0xFF << 0) >> 0) as u8;
        bytes[5] = ((data[1 * len + i] & 0xFF << 8) >> 8) as u8;
        bytes[6] = ((data[1 * len + i] & 0xFF << 16) >> 16) as u8;
        bytes[7] = ((data[1 * len + i] & 0xFF << 24) >> 24) as u8;
        bytes[8] = ((data[2 * len + i] & 0xFF << 0) >> 0) as u8;
        bytes[9] = ((data[2 * len + i] & 0xFF << 8) >> 8) as u8;
        bytes[10] = ((data[2 * len + i] & 0xFF << 16) >> 16) as u8;
        bytes[11] = ((data[2 * len + i] & 0xFF << 24) >> 24) as u8;
        bytes[12] = ((data[3 * len + i] & 0xFF << 0) >> 0) as u8;
        bytes[13] = ((data[3 * len + i] & 0xFF << 8) >> 8) as u8;
        bytes[14] = ((data[3 * len + i] & 0xFF << 16) >> 16) as u8;
        bytes[15] = ((data[3 * len + i] & 0xFF << 24) >> 24) as u8;
        bytes[16] = ((data[4 * len + i] & 0xFF << 0) >> 0) as u8;
        bytes[17] = ((data[4 * len + i] & 0xFF << 8) >> 8) as u8;
        bytes[18] = ((data[4 * len + i] & 0xFF << 16) >> 16) as u8;
        bytes[19] = ((data[4 * len + i] & 0xFF << 24) >> 24) as u8;
        bytes[20] = ((data[5 * len + i] & 0xFF << 0) >> 0) as u8;
        bytes[21] = ((data[5 * len + i] & 0xFF << 8) >> 8) as u8;
        bytes[22] = ((data[5 * len + i] & 0xFF << 16) >> 16) as u8;
        bytes[23] = ((data[5 * len + i] & 0xFF << 24) >> 24) as u8;
        bytes[24] = ((data[6 * len + i] & 0xFF << 0) >> 0) as u8;
        bytes[25] = ((data[6 * len + i] & 0xFF << 8) >> 8) as u8;
        bytes[26] = ((data[6 * len + i] & 0xFF << 16) >> 16) as u8;
        bytes[27] = ((data[6 * len + i] & 0xFF << 24) >> 24) as u8;
        bytes[28] = ((data[7 * len + i] & 0xFF << 0) >> 0) as u8;
        bytes[29] = ((data[7 * len + i] & 0xFF << 8) >> 8) as u8;
        bytes[30] = ((data[7 * len + i] & 0xFF << 16) >> 16) as u8;
        bytes[31] = ((data[7 * len + i] & 0xFF << 24) >> 24) as u8;

        Scalar::from_bits(bytes)
    }
}

impl Add<GpuScalarVec> for GpuScalarVec {
    type Output = Self;

    fn add(self, rhs: GpuScalarVec) -> Self::Output {
        &self + &rhs
    }
}

impl Add<&GpuScalarVec> for GpuScalarVec {
    type Output = Self;

    fn add(self, rhs: &GpuScalarVec) -> Self::Output {
        &self + rhs
    }
}

impl Add<GpuScalarVec> for &GpuScalarVec {
    type Output = GpuScalarVec;

    fn add(self, rhs: GpuScalarVec) -> Self::Output {
        self + &rhs
    }
}

impl Add<&GpuScalarVec> for &GpuScalarVec {
    type Output = GpuScalarVec;

    fn add(self, rhs: &GpuScalarVec) -> Self::Output {
        GpuScalarVec {
            data: self.binary_gpu_kernel("scalar_add", rhs),
            len: self.len,
        }
    }
}

impl Sub<GpuScalarVec> for GpuScalarVec {
    type Output = Self;

    fn sub(self, rhs: GpuScalarVec) -> Self::Output {
        &self - &rhs
    }
}

impl Sub<&GpuScalarVec> for GpuScalarVec {
    type Output = Self;

    fn sub(self, rhs: &GpuScalarVec) -> Self::Output {
        &self - rhs
    }
}

impl Sub<GpuScalarVec> for &GpuScalarVec {
    type Output = GpuScalarVec;

    fn sub(self, rhs: GpuScalarVec) -> Self::Output {
        self - &rhs
    }
}

impl Sub<&GpuScalarVec> for &GpuScalarVec {
    type Output = GpuScalarVec;

    fn sub(self, rhs: &GpuScalarVec) -> Self::Output {
        GpuScalarVec {
            data: self.binary_gpu_kernel("scalar_sub", rhs),
            len: self.len,
        }
    }
}

impl Neg for GpuScalarVec {
    type Output = Self;

    fn neg(self) -> Self::Output {
        -&self
    }
}

impl Neg for &GpuScalarVec {
    type Output = GpuScalarVec;

    fn neg(self) -> Self::Output {
        GpuScalarVec {
            data: self.unary_gpu_kernel("scalar_neg"),
            len: self.len,
        }
    }
}

impl Mul<GpuScalarVec> for GpuScalarVec {
    type Output = Self;

    fn mul(self, rhs: GpuScalarVec) -> Self::Output {
        &self * &rhs
    }
}

impl Mul<&GpuScalarVec> for GpuScalarVec {
    type Output = Self;

    fn mul(self, rhs: &GpuScalarVec) -> Self::Output {
        &self * rhs
    }
}

impl Mul<GpuScalarVec> for &GpuScalarVec {
    type Output = GpuScalarVec;

    fn mul(self, rhs: GpuScalarVec) -> Self::Output {
        self * &rhs
    }
}

impl Mul<&GpuScalarVec> for &GpuScalarVec {
    type Output = GpuScalarVec;

    fn mul(self, rhs: &GpuScalarVec) -> Self::Output {
        GpuScalarVec {
            data: self.binary_gpu_kernel("scalar_mul", rhs),
            len: self.len,
        }
    }
}

#[cfg(test)]
mod tests {
    use rand::thread_rng;

    use super::*;

    #[test]
    fn can_roundtrip_scalarvec_elements() {
        let s = &[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ];

        let v = GpuScalarVec::new(s);

        for (i, v) in v.iter().enumerate() {
            assert_eq!(v, s[i]);
        }
    }

    #[test]
    fn can_unpack_and_pack_1_element() {
        let scalars = [Scalar::random(&mut thread_rng())];

        let v = GpuScalarVec::new(&scalars);

        let out = GpuScalarVec::unary_gpu_kernel(&v, "test_can_pack_unpack_scalar");

        let out = GpuScalarVec {
            data: out,
            len: v.len(),
        };

        for (cpu, (a, b)) in scalars.iter().zip(v.iter().zip(out.iter())) {
            assert_eq!(*cpu, a);
            assert_eq!(a, b)
        }
    }

    #[test]
    fn can_unpack_and_pack_elements() {
        let scalars = [
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ];

        let v = GpuScalarVec::new(&scalars);

        let out = GpuScalarVec::unary_gpu_kernel(&v, "test_can_pack_unpack_scalar");

        let out = GpuScalarVec {
            data: out,
            len: v.len(),
        };

        for (cpu, (a, b)) in scalars.iter().zip(v.iter().zip(out.iter())) {
            assert_eq!(*cpu, a);
            assert_eq!(a, b)
        }
    }

    #[test]
    fn can_add_scalars() {
        let a = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let b = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = &a + &b;

        for (c, (a, b)) in c.iter().zip(a.iter().zip(b.iter())) {
            assert_eq!(c, a + b);
        }
    }

    #[test]
    fn can_sub_scalars() {
        let a = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let b = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = &a - &b;

        for (c, (a, b)) in c.iter().zip(a.iter().zip(b.iter())) {
            assert_eq!(c, a - b);
        }
    }

    #[test]
    fn can_neg_scalars() {
        let a = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = -&a;

        for (c, a) in c.iter().zip(a.iter()) {
            assert_eq!(c, -a);
        }
    }

    #[test]
    fn can_mul_scalars() {
        let a = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let b = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = &a * &b;

        for (c, (a, b)) in c.iter().zip(a.iter().zip(b.iter())) {
            assert_eq!(c, a * b);
        }
    }

    #[test]
    fn can_square_scalars() {
        let a = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = a.square();

        for (c, a) in c.iter().zip(a.iter()) {
            assert_eq!(c, a * a);
        }
    }

    #[test]
    fn can_roundtrip_montgomery() {
        let a = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let out = GpuScalarVec::unary_gpu_kernel(&a, "test_can_roundtrip_montgomery");

        let out = GpuScalarVec {
            data: out,
            len: a.len,
        };

        for (a, b) in a.iter().zip(out.iter()) {
            assert_eq!(a, b);
        }
    }

    #[test]
    fn can_invert_scalars() {
        let a = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let b = a.invert();

        for (a, b) in a.iter().zip(b.iter()) {
            assert_eq!(a, b.invert());
        }
    }
}
