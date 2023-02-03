use sunscreen_curve25519_dalek::{ristretto::RistrettoPoint, EdwardsPoint, field::FieldElement2625};
use metal::Buffer;

use core::slice;
use std::mem::size_of;

use super::Runtime;

pub struct RistrettoPointVec {
    data: Buffer,
    len: usize,
}

impl RistrettoPointVec {
    /// Creates a new [RistrettoVec].
    /// 
    /// # Remarks
    /// This code assumes the following layout of curve25519-dalek datastructures:
    /// ```rust
    /// struct RistrettoPoint(EdwardsPoint);
    /// 
    /// struct EdwardsPoint {
    ///     X: FieldElement2625,
    ///     Y: FieldElement2625,
    ///     Z: FieldElement2625,
    ///     T: FieldElement2625,
    /// }
    /// 
    /// struct FieldElement2625([u32; 10]);
    /// ```
    /// To achieve this layout, you must use the u32 backend.
    /// 
    pub fn new(x: &[RistrettoPoint]) -> Self {
        let runtime = Runtime::get();

        let len = x.len();

        assert_eq!(size_of::<RistrettoPoint>(), size_of::<u32>() * 40);
        let byte_len = x.len() * size_of::<RistrettoPoint>();
        let data = runtime.alloc(byte_len);

        let mut field_vec = Self {
            data,
            len
        };

        let data_slice = field_vec.buffer_slice_mut();

        for (i, p) in x.iter().enumerate() {
            let x = p.0.X.0;
            let y = p.0.Y.0;
            let z = p.0.Z.0;
            let t = p.0.T.0;

            for (j, w) in x.iter().enumerate() {
                data_slice[(j + 0) * len + i] = *w;
            }

            for (j, w) in y.iter().enumerate() {
                data_slice[(j + 10) * len + i] = *w;
            }

            for (j, w) in z.iter().enumerate() {
                data_slice[(j + 20) * len + i] = *w;
            }

            for (j, w) in t.iter().enumerate() {
                data_slice[(j + 30) * len + i] = *w;
            }
        }

        field_vec
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn len_bytes(&self) -> usize {
        self.len * size_of::<RistrettoPoint>()
    }

    pub fn get(&self, index: usize) -> RistrettoPoint {
        if index > self.len {
            panic!("Index {index} exceeds bounds of {}", self.len);
        }

        let mut x = [0u32; 10];
        let mut y = [0u32; 10];
        let mut z = [0u32; 10];
        let mut t = [0u32; 10];

        let buffer_slice = self.buffer_slice();

        for i in 0..10 {
            x[i] = buffer_slice[i * self.len + index];
        }

        for i in 0..10 {
            y[i] = buffer_slice[(i + 10) * self.len + index];
        }

        for i in 0..10 {
            z[i] = buffer_slice[(i + 20) * self.len + index];
        }

        for i in 0..10 {
            t[i] = buffer_slice[(i + 30) * self.len + index];
        }

        RistrettoPoint(EdwardsPoint {
            X: FieldElement2625(x),
            Y: FieldElement2625(y),
            Z: FieldElement2625(z),
            T: FieldElement2625(t)
        })
    }

    fn buffer_slice_mut(&mut self) -> &mut [u32] {
        let byte_len = self.len * size_of::<RistrettoPoint>();

        unsafe { slice::from_raw_parts_mut(self.data.contents() as *mut u32, byte_len) }
    }

    fn buffer_slice(&self) -> &[u32] {
        let byte_len = self.len * size_of::<RistrettoPoint>();

        unsafe { slice::from_raw_parts(self.data.contents() as *const u32, byte_len) }
    }
}

#[cfg(test)]
mod tests {
    use rand::thread_rng;

    use crate::metal_impl::U32Arg;

    use super::*;

    #[test]
    fn can_pack_and_unpack_points() {
        let points = [
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ];

        let v = RistrettoPointVec::new(&points);

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

        let v = RistrettoPointVec::new(&points);

        let runtime = Runtime::get();

        let o = RistrettoPointVec {
            data: runtime.alloc(v.len_bytes()),
            len: v.len()
        };

        let len_gpu = U32Arg::new(v.len() as u32);

        runtime.run("test_can_pack_unpack_ristretto", &[&v.data, &o.data, &len_gpu.data], [(v.len() as u64, 1), (1, 1), (1, 1)]);

        for i in 0..v.len() {
            assert_eq!(v.get(i), o.get(i));
        }
    }
}