use core::mem::size_of;
use std::ops::{Add, Mul, Neg, Sub};

use metal::Buffer;

use curve25519_dalek::scalar::Scalar;

use super::{GpuVec, GpuVecIter, IntoGpuVecIter, Runtime};

/// A vector of scalars laid out in a way that enables coalescing on
/// the GPU.
///
/// # Remarks
/// Conceptually, data is laid out as a row-major `m x n` matrix stored in
/// a 1 dimensional buffer. The leading dimension iterates over the scalars
/// while the trailing dimension iterates over limbs in the scalar.
pub struct GpuScalarVec {
    pub(crate) data: Buffer,
    len: usize,
}

unsafe impl Send for GpuScalarVec {}

impl Clone for GpuScalarVec {
    fn clone(&self) -> Self {
        Self {
            data: self.clone_buffer(),
            len: self.len,
        }
    }
}

impl GpuScalarVec {
    pub fn new(x: &[Scalar]) -> Self {
        assert_eq!(size_of::<Scalar>(), u32::BITS as usize);

        let len = x.len();
        let byte_len = x.len() * size_of::<Scalar>();

        let data = Runtime::get().alloc(byte_len);
        let mut res = Self { data, len: x.len() };

        let data_map = unsafe { res.buffer_slice_mut() };

        for (i, s) in x.iter().enumerate() {
            let bytes = s.as_bytes();

            for j in 0..8 {
                let mut val = bytes[4 * j] as u32;
                val |= (bytes[4 * j + 1] as u32) << 8;
                val |= (bytes[4 * j + 2] as u32) << 16;
                val |= (bytes[4 * j + 3] as u32) << 24;

                data_map[len * j + i].write(val);
            }
        }

        res
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

impl IntoIterator for GpuScalarVec {
    type Item = Scalar;
    type IntoIter = IntoGpuVecIter<Self>;

    fn into_iter(self) -> Self::IntoIter {
        <Self as GpuVec>::into_iter(self)
    }
}

impl GpuVec for GpuScalarVec {
    type Item = Scalar;

    fn get_buffer(&self) -> &Buffer {
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
    fn get(&self, i: usize) -> Scalar {
        if i >= self.len {
            panic!("Index out of {i} range {}.", self.len);
        }

        let data = unsafe { self.buffer_slice() };
        let mut bytes = [0u8; 32];

        bytes[0] = ((data[0 * self.len + i] & 0xFF << 0) >> 0) as u8;
        bytes[1] = ((data[0 * self.len + i] & 0xFF << 8) >> 8) as u8;
        bytes[2] = ((data[0 * self.len + i] & 0xFF << 16) >> 16) as u8;
        bytes[3] = ((data[0 * self.len + i] & 0xFF << 24) >> 24) as u8;
        bytes[4] = ((data[1 * self.len + i] & 0xFF << 0) >> 0) as u8;
        bytes[5] = ((data[1 * self.len + i] & 0xFF << 8) >> 8) as u8;
        bytes[6] = ((data[1 * self.len + i] & 0xFF << 16) >> 16) as u8;
        bytes[7] = ((data[1 * self.len + i] & 0xFF << 24) >> 24) as u8;
        bytes[8] = ((data[2 * self.len + i] & 0xFF << 0) >> 0) as u8;
        bytes[9] = ((data[2 * self.len + i] & 0xFF << 8) >> 8) as u8;
        bytes[10] = ((data[2 * self.len + i] & 0xFF << 16) >> 16) as u8;
        bytes[11] = ((data[2 * self.len + i] & 0xFF << 24) >> 24) as u8;
        bytes[12] = ((data[3 * self.len + i] & 0xFF << 0) >> 0) as u8;
        bytes[13] = ((data[3 * self.len + i] & 0xFF << 8) >> 8) as u8;
        bytes[14] = ((data[3 * self.len + i] & 0xFF << 16) >> 16) as u8;
        bytes[15] = ((data[3 * self.len + i] & 0xFF << 24) >> 24) as u8;
        bytes[16] = ((data[4 * self.len + i] & 0xFF << 0) >> 0) as u8;
        bytes[17] = ((data[4 * self.len + i] & 0xFF << 8) >> 8) as u8;
        bytes[18] = ((data[4 * self.len + i] & 0xFF << 16) >> 16) as u8;
        bytes[19] = ((data[4 * self.len + i] & 0xFF << 24) >> 24) as u8;
        bytes[20] = ((data[5 * self.len + i] & 0xFF << 0) >> 0) as u8;
        bytes[21] = ((data[5 * self.len + i] & 0xFF << 8) >> 8) as u8;
        bytes[22] = ((data[5 * self.len + i] & 0xFF << 16) >> 16) as u8;
        bytes[23] = ((data[5 * self.len + i] & 0xFF << 24) >> 24) as u8;
        bytes[24] = ((data[6 * self.len + i] & 0xFF << 0) >> 0) as u8;
        bytes[25] = ((data[6 * self.len + i] & 0xFF << 8) >> 8) as u8;
        bytes[26] = ((data[6 * self.len + i] & 0xFF << 16) >> 16) as u8;
        bytes[27] = ((data[6 * self.len + i] & 0xFF << 24) >> 24) as u8;
        bytes[28] = ((data[7 * self.len + i] & 0xFF << 0) >> 0) as u8;
        bytes[29] = ((data[7 * self.len + i] & 0xFF << 8) >> 8) as u8;
        bytes[30] = ((data[7 * self.len + i] & 0xFF << 16) >> 16) as u8;
        bytes[31] = ((data[7 * self.len + i] & 0xFF << 24) >> 24) as u8;

        Scalar::from_bits(bytes)
    }
}

/**
 * An iterator over the [`Scalar`]s in [`ScalarVec`].
 */
pub struct Scalars<'a> {
    scalar_vec: &'a GpuScalarVec,
    i: usize,
}

impl<'a> Iterator for Scalars<'a> {
    type Item = Scalar;

    fn next(&mut self) -> Option<Self::Item> {
        if self.i >= self.scalar_vec.len() {
            return None;
        }

        let val = self.scalar_vec.get(self.i);

        self.i += 1;

        Some(val)
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

#[cfg(test)]
mod tests {
    use rand::thread_rng;

    use crate::metal_impl::{Grid, U32Arg};

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
        let runtime = Runtime::get();

        let scalars = [Scalar::random(&mut thread_rng())];

        let v = GpuScalarVec::new(&scalars);
        let out = GpuScalarVec::new(&[Scalar::from(0u8)]);

        for i in 0..out.len() {
            assert_eq!(out.get(i), Scalar::from(0u8));
        }

        let len = U32Arg::new(v.len() as u32);

        runtime.run(
            "test_can_pack_unpack_scalar",
            &[&v.data, &out.data, &len],
            Grid([(1, 64), (1, 1), (1, 1)]),
        );

        for i in 0..out.len() {
            assert_eq!(v.get(i), out.get(i));
        }
    }

    #[test]
    fn can_unpack_and_pack_elements() {
        let runtime = Runtime::get();

        let scalars = [
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ];

        let v = GpuScalarVec::new(&scalars);
        let out = GpuScalarVec::new(&[
            Scalar::from(0u8),
            Scalar::from(0u8),
            Scalar::from(0u8),
            Scalar::from(0u8),
        ]);

        for i in 0..out.len() {
            assert_eq!(out.get(i), Scalar::from(0u8));
        }

        let len = U32Arg::new(v.len() as u32);

        runtime.run(
            "test_can_pack_unpack_scalar",
            &[&v.data, &out.data, &len],
            Grid([(4, 64), (1, 1), (1, 1)]),
        );

        for i in 0..out.len() {
            assert_eq!(v.get(i), out.get(i));
        }
    }

    #[test]
    fn const_l_is_correct() {
        let l = GpuScalarVec::new(&[Scalar::zero()]);

        let runtime = Runtime::get();
        runtime.run("test_get_l", &[&l.data], Grid([(1, 1), (1, 1), (1, 1)]));

        assert_eq!(l.get(0) - Scalar::one(), -Scalar::one());
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

        for i in 0..a.len() {
            assert_eq!(c.get(i), a.get(i) + b.get(i));
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

        for i in 0..a.len() {
            assert_eq!(c.get(i), a.get(i) - b.get(i));
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

        let b = GpuScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = &a - &b;

        for i in 0..a.len() {
            assert_eq!(c.get(i), a.get(i) - b.get(i));
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

        for i in 0..a.len() {
            assert_eq!(c.get(i), a.get(i) * b.get(i));
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

        for i in 0..a.len() {
            assert_eq!(c.get(i), a.get(i) * a.get(i));
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

        let out = GpuScalarVec::new(&[
            Scalar::from(0u8),
            Scalar::from(0u8),
            Scalar::from(0u8),
            Scalar::from(0u8),
        ]);

        for i in 0..out.len() {
            assert_eq!(out.get(i), Scalar::from(0u8));
        }

        let len = U32Arg::new(a.len() as u32);

        let runtime = Runtime::get();

        runtime.run(
            "test_can_roundtrip_montgomery",
            &[&a.data, &out.data, &len.data],
            Grid([(4, 64), (1, 1), (1, 1)]),
        );

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
