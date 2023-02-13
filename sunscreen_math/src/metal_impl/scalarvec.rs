use core::{mem::size_of, slice};
use std::ops::{Add, Mul, Neg, Sub};

use metal::Buffer;

use curve25519_dalek::scalar::Scalar;

use crate::metal_impl::U32Arg;

use super::Runtime;

/// A vector of scalars laid out in a way that enables coalescing on
/// the GPU.
///
/// # Remarks
/// Conceptually, data is laid out as a row-major `m x n` matrix stored in
/// a 1 dimensional buffer. The leading dimension iterates over the scalars
/// while the trailing dimension iterates over limbs in the scalar.
pub struct ScalarVec {
    pub(crate) data: Buffer,
    len: usize,
}

impl ScalarVec {
    pub fn new(x: &[Scalar]) -> Self {
        let len = x.len();
        let byte_len = x.len() * size_of::<Scalar>();

        let data = Runtime::get().alloc(byte_len);
        let mut res = Self { data, len: x.len() };

        let data_map = res.buffer_slice_mut();

        for (i, s) in x.iter().enumerate() {
            let bytes = s.as_bytes();

            for j in 0..8 {
                data_map[len * j + i] = (bytes[4 * j + 0] as u32) << 0;
                data_map[len * j + i] |= (bytes[4 * j + 1] as u32) << 8;
                data_map[len * j + i] |= (bytes[4 * j + 2] as u32) << 16;
                data_map[len * j + i] |= (bytes[4 * j + 3] as u32) << 24;
            }
        }

        res
    }

    fn buffer_slice_mut(&mut self) -> &mut [u32] {
        let byte_len = self.len * size_of::<Scalar>();

        unsafe { slice::from_raw_parts_mut(self.data.contents() as *mut u32, byte_len) }
    }

    fn buffer_slice(&self) -> &[u32] {
        let byte_len = self.len * size_of::<Scalar>();

        unsafe { slice::from_raw_parts(self.data.contents() as *const u32, byte_len) }
    }

    /**
     * Returns the number of scalars in this vector.
     */
    pub fn len(&self) -> usize {
        self.len
    }

    pub fn byte_len(&self) -> usize {
        self.len() * size_of::<Scalar>()
    }

    /// Get the [`Scalar`] at index i.
    pub fn get(&self, i: usize) -> Scalar {
        if i >= self.len {
            panic!("Index out of {i} range {}.", self.len);
        }

        let data = self.buffer_slice();
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

    /**
     * Computes self * self.
     *
     * #Remarks
     * This is more performant than using `mul`.
     */
    pub fn square(&self) -> Self {
        let runtime = Runtime::get();
        let out_buf = runtime.alloc(self.byte_len());
        let len = U32Arg::new(self.len as u32);

        runtime.run(
            "scalar_square",
            &[&self.data, &out_buf, &len.data],
            [(self.len() as u64, 64), (1, 1), (1, 1)],
        );

        ScalarVec {
            data: out_buf,
            len: self.len,
        }
    }
}

impl Add<ScalarVec> for ScalarVec {
    type Output = Self;

    fn add(self, rhs: ScalarVec) -> Self::Output {
        &self + &rhs
    }
}

impl Add<&ScalarVec> for ScalarVec {
    type Output = Self;

    fn add(self, rhs: &ScalarVec) -> Self::Output {
        &self + rhs
    }
}

impl Add<ScalarVec> for &ScalarVec {
    type Output = ScalarVec;

    fn add(self, rhs: ScalarVec) -> Self::Output {
        self + &rhs
    }
}

impl Add<&ScalarVec> for &ScalarVec {
    type Output = ScalarVec;

    fn add(self, rhs: &ScalarVec) -> Self::Output {
        assert_eq!(self.len(), rhs.len());

        let runtime = Runtime::get();
        let out_buf = runtime.alloc(self.byte_len());
        let len = U32Arg::new(self.len as u32);

        runtime.run(
            "scalar_add",
            &[&self.data, &rhs.data, &out_buf, &len.data],
            [(self.len() as u64, 64), (1, 1), (1, 1)],
        );

        ScalarVec {
            data: out_buf,
            len: self.len,
        }
    }
}

impl Sub<ScalarVec> for ScalarVec {
    type Output = Self;

    fn sub(self, rhs: ScalarVec) -> Self::Output {
        &self + &rhs
    }
}

impl Sub<&ScalarVec> for ScalarVec {
    type Output = Self;

    fn sub(self, rhs: &ScalarVec) -> Self::Output {
        &self + rhs
    }
}

impl Sub<ScalarVec> for &ScalarVec {
    type Output = ScalarVec;

    fn sub(self, rhs: ScalarVec) -> Self::Output {
        self + &rhs
    }
}

impl Sub<&ScalarVec> for &ScalarVec {
    type Output = ScalarVec;

    fn sub(self, rhs: &ScalarVec) -> Self::Output {
        assert_eq!(self.len(), rhs.len());

        let runtime = Runtime::get();
        let out_buf = runtime.alloc(self.byte_len());
        let len = U32Arg::new(self.len as u32);

        runtime.run(
            "scalar_sub",
            &[&self.data, &rhs.data, &out_buf, &len.data],
            [(self.len() as u64, 64), (1, 1), (1, 1)],
        );

        ScalarVec {
            data: out_buf,
            len: self.len,
        }
    }
}

impl Mul<ScalarVec> for ScalarVec {
    type Output = Self;

    fn mul(self, rhs: ScalarVec) -> Self::Output {
        &self + &rhs
    }
}

impl Mul<&ScalarVec> for ScalarVec {
    type Output = Self;

    fn mul(self, rhs: &ScalarVec) -> Self::Output {
        &self + rhs
    }
}

impl Mul<ScalarVec> for &ScalarVec {
    type Output = ScalarVec;

    fn mul(self, rhs: ScalarVec) -> Self::Output {
        self + &rhs
    }
}

impl Mul<&ScalarVec> for &ScalarVec {
    type Output = ScalarVec;

    fn mul(self, rhs: &ScalarVec) -> Self::Output {
        assert_eq!(self.len(), rhs.len());

        let runtime = Runtime::get();
        let out_buf = runtime.alloc(self.byte_len());
        let len = U32Arg::new(self.len as u32);

        runtime.run(
            "scalar_mul",
            &[&self.data, &rhs.data, &out_buf, &len.data],
            [(self.len() as u64, 64), (1, 1), (1, 1)],
        );

        ScalarVec {
            data: out_buf,
            len: self.len,
        }
    }
}

impl Neg for ScalarVec {
    type Output = Self;

    fn neg(self) -> Self::Output {
        -&self
    }
}

impl Neg for &ScalarVec {
    type Output = ScalarVec;

    fn neg(self) -> Self::Output {
        let runtime = Runtime::get();
        let out_buf = runtime.alloc(self.byte_len());
        let len = U32Arg::new(self.len as u32);

        runtime.run(
            "scalar_neg",
            &[&self.data, &out_buf, &len.data],
            [(self.len() as u64, 64), (1, 1), (1, 1)],
        );

        ScalarVec {
            data: out_buf,
            len: self.len,
        }
    }
}

#[cfg(test)]
mod tests {
    use rand::thread_rng;

    use crate::metal_impl::U32Arg;

    use super::*;

    #[test]
    fn can_roundtrip_scalarvec_elements() {
        let s = &[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ];

        let v = ScalarVec::new(s);

        for i in 0..v.len() {
            assert_eq!(v.get(i), s[i]);
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

        let v = ScalarVec::new(&scalars);
        let mut out = ScalarVec::new(&[
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
            [(4, 64), (1, 1), (1, 1)],
        );

        for i in 0..out.len() {
            assert_eq!(v.get(i), out.get(i));
        }
    }

    #[test]
    fn const_l_is_correct() {
        let l = ScalarVec::new(&[Scalar::ZERO]);

        let runtime = Runtime::get();
        runtime.run("test_get_l", &[&l.data], [(1, 1), (1, 1), (1, 1)]);

        assert_eq!(l.get(0) - Scalar::ONE, -Scalar::ONE);
    }

    #[test]
    fn can_add_scalars() {
        let a = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let b = ScalarVec::new(&[
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
        let a = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let b = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = &a - &b;

        for i in 0..a.len() {
            let a_i = a.get(i);
            let b_i = b.get(i);

            assert_eq!(c.get(i), a.get(i) - b.get(i));
        }
    }

    #[test]
    fn can_neg_scalars() {
        let a = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let b = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = &a - &b;

        for i in 0..a.len() {
            let a_i = a.get(i);
            let b_i = b.get(i);

            assert_eq!(c.get(i), a.get(i) - b.get(i));
        }
    }

    #[test]
    fn can_mul_scalars() {
        let a = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let b = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = &a * &b;

        for i in 0..a.len() {
            let a_i = a.get(i);
            let b_i = b.get(i);

            assert_eq!(c.get(i), a.get(i) * b.get(i));
        }
    }

    #[test]
    fn can_square_scalars() {
        let a = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let c = a.square();

        for i in 0..a.len() {
            let a_i = a.get(i);

            assert_eq!(c.get(i), a.get(i) * a.get(i));
        }
    }

    #[test]
    fn can_radix_16() {
        let runtime = Runtime::get();

        let a = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        let b = runtime.alloc(a.len() * 64);
        let len = U32Arg::new(a.len() as u32);

        runtime.run(
            "test_can_radix_16",
            &[&a.data, &b, &len.data],
            [(a.len() as u64, 1), (1, 1), (1, 1)],
        );

        for i in 0..a.len() {
            let expected = a.get(i).as_radix_16();
            let b_slice = unsafe { slice::from_raw_parts(b.contents() as *const i8, a.len() * 64) };

            for (j, v) in expected.iter().enumerate() {
                assert_eq!(*v, b_slice[j * a.len() + i]);
            }
        }
    }
}
