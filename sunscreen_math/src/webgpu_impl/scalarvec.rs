use std::mem::size_of;

use curve25519_dalek::scalar::Scalar;
use wgpu::Buffer;

use super::{Runtime, BufferExt};

pub struct GpuScalarVec {
    data: Buffer,
}

impl Clone for GpuScalarVec {
    fn clone(&self) -> Self {
        Self {
            data: self.data.clone()
        }
    }
}

pub struct Scalars {
    data: Vec<u32>,
    i: usize
}

impl Scalars {
    #[inline]
    /// The number of [`Scalar`]s in this iterator
    fn len(&self) -> usize {
        self.data.len() / (size_of::<Scalar>() / size_of::<u32>())
    }

    fn unpack(&self, i: usize) -> Scalar {
        let data = &self.data;

        let mut bytes = [0u8; 32];
        let len = self.len();

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

impl Iterator for Scalars {
    type Item = Scalar;

    fn next(&mut self) -> Option<Self::Item> {
        if self.i >= self.len() {
            return None;
        }

        let val = Some(self.unpack(self.i));
        self.i += 1;

        val
    }
}

impl GpuScalarVec {
    pub fn new(x: &[Scalar]) -> Self {
        let runtime = Runtime::get();

        let u32_len = x.len() * size_of::<Scalar>() / size_of::<u32>();

        let mut packed_data = vec![0u32; u32_len];

        for (i, s) in x.iter().enumerate() {
            let bytes = s.as_bytes();

            for j in 0..8 {
                let mut val = bytes[4 * j] as u32;
                val |= (bytes[4 * j + 1] as u32) << 8;
                val |= (bytes[4 * j + 2] as u32) << 16;
                val |= (bytes[4 * j + 3] as u32) << 24;

                packed_data[x.len() * j + i] = val;
            }
        }

        Self {
            data: runtime.alloc_from_slice(&packed_data)
        }
    }

    pub fn iter(&self) -> Scalars {
        let packed = self.data.get_data::<u32>();

        Scalars { data: packed, i: 0 }
    }
}

#[cfg(test)]
mod tests {
    use rand::thread_rng;

    use crate::webgpu_impl::{Grid, GpuU32};

    use super::*;
    
    #[test]
    fn can_unpack_scalarvec() {
        let a = (0..238).into_iter().map(|_| Scalar::random(&mut thread_rng())).collect::<Vec<_>>();

        let a_v = GpuScalarVec::new(&a);

        let mut count = 0usize;

        for (i, val) in a_v.iter().enumerate() {
            count += 1;
            assert_eq!(val, a[i]);
        }

        assert_eq!(count, a.len());
    }

    #[test]
    fn can_clone_scalarvec() {
        let a = (0..238).into_iter().map(|_| Scalar::random(&mut thread_rng())).collect::<Vec<_>>();

        let a_v = GpuScalarVec::new(&a);
        let a_v_clone = a_v.clone();

        let mut count = 0usize;

        for (i, val) in a_v_clone.iter().enumerate() {
            count += 1;
            assert_eq!(val, a[i]);
        }

        assert_eq!(count, a.len());
    }


    #[test]
    fn can_pack_unpack_shader_operand_a() {
        // Use 238 because it's a weird number not a multiple of the threadgroup size.
        let a = (0..238).into_iter().map(|_| Scalar::random(&mut thread_rng())).collect::<Vec<_>>();

        let a_v = GpuScalarVec::new(&a);
        let c_v = a_v.clone();

        let runtime = Runtime::get();

        let len = GpuU32::new(a.len() as u32);

        runtime.run("test_scalar_can_pack_unpack_a", &[&a_v.data, &a_v.data, &c_v.data, &len.data], &Grid::new(2, 1, 1));
    }
}