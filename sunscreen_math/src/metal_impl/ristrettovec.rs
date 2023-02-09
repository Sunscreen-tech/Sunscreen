use metal::Buffer;
use sunscreen_curve25519_dalek::{
    field::FieldElement2625, ristretto::RistrettoPoint, EdwardsPoint,
};

use core::slice;
use std::{
    mem::size_of,
    ops::{Add, Mul, Sub},
};

use crate::{metal_impl::U32Arg, ScalarVec};

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

        let mut field_vec = Self { data, len };

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
            T: FieldElement2625(t),
        })
    }

    pub fn iter(&self) -> RistrettoPoints {
        RistrettoPoints {
            vec: self,
            i: 0usize,
        }
    }

    // TODO: This probably needs to return a slice of MaybeUninit<u32>.
    fn buffer_slice_mut(&mut self) -> &mut [u32] {
        let byte_len = self.len * size_of::<RistrettoPoint>();

        unsafe { slice::from_raw_parts_mut(self.data.contents() as *mut u32, byte_len) }
    }

    fn buffer_slice(&self) -> &[u32] {
        let byte_len = self.len * size_of::<RistrettoPoint>();

        unsafe { slice::from_raw_parts(self.data.contents() as *const u32, byte_len) }
    }
}

impl Add<RistrettoPointVec> for RistrettoPointVec {
    type Output = Self;

    fn add(self, rhs: RistrettoPointVec) -> Self::Output {
        &self + &rhs
    }
}

impl Add<&RistrettoPointVec> for RistrettoPointVec {
    type Output = Self;

    fn add(self, rhs: &RistrettoPointVec) -> Self::Output {
        &self + rhs
    }
}

impl Add<RistrettoPointVec> for &RistrettoPointVec {
    type Output = RistrettoPointVec;

    fn add(self, rhs: RistrettoPointVec) -> Self::Output {
        self + &rhs
    }
}

impl Add<&RistrettoPointVec> for &RistrettoPointVec {
    type Output = RistrettoPointVec;

    fn add(self, rhs: &RistrettoPointVec) -> Self::Output {
        assert_eq!(self.len(), rhs.len());

        let runtime = Runtime::get();

        let len = self.len_bytes();

        let o = Self::Output {
            data: runtime.alloc(len),
            len: rhs.len(),
        };

        let len_gpu = U32Arg::new(rhs.len() as u32);

        // TODO: o gets mutated here. Need to figure out what that means in terms of UB.
        runtime.run(
            "ristretto_add",
            &[&self.data, &rhs.data, &o.data, &len_gpu.data],
            [(rhs.len() as u64, 64), (1, 1), (1, 1)],
        );

        o
    }
}

impl Sub<RistrettoPointVec> for RistrettoPointVec {
    type Output = Self;

    fn sub(self, rhs: RistrettoPointVec) -> Self::Output {
        &self + &rhs
    }
}

impl Sub<&RistrettoPointVec> for RistrettoPointVec {
    type Output = Self;

    fn sub(self, rhs: &RistrettoPointVec) -> Self::Output {
        &self + rhs
    }
}

impl Sub<RistrettoPointVec> for &RistrettoPointVec {
    type Output = RistrettoPointVec;

    fn sub(self, rhs: RistrettoPointVec) -> Self::Output {
        self + &rhs
    }
}

impl Sub<&RistrettoPointVec> for &RistrettoPointVec {
    type Output = RistrettoPointVec;

    fn sub(self, rhs: &RistrettoPointVec) -> Self::Output {
        assert_eq!(self.len(), rhs.len());

        let runtime = Runtime::get();

        let len = self.len_bytes();

        let o = Self::Output {
            data: runtime.alloc(len),
            len: rhs.len(),
        };

        let len_gpu = U32Arg::new(rhs.len() as u32);

        // TODO: o gets mutated here. Need to figure out what that means in terms of UB.
        runtime.run(
            "ristretto_sub",
            &[&self.data, &rhs.data, &o.data, &len_gpu.data],
            [(rhs.len() as u64, 64), (1, 1), (1, 1)],
        );

        o
    }
}

impl Mul<ScalarVec> for RistrettoPointVec {
    type Output = Self;

    fn mul(self, rhs: ScalarVec) -> Self::Output {
        &self * &rhs
    }
}

impl Mul<&ScalarVec> for RistrettoPointVec {
    type Output = Self;

    fn mul(self, rhs: &ScalarVec) -> Self::Output {
        &self * rhs
    }
}

impl Mul<ScalarVec> for &RistrettoPointVec {
    type Output = RistrettoPointVec;

    fn mul(self, rhs: ScalarVec) -> Self::Output {
        self * &rhs
    }
}

impl Mul<&ScalarVec> for &RistrettoPointVec {
    type Output = RistrettoPointVec;

    fn mul(self, rhs: &ScalarVec) -> Self::Output {
        assert_eq!(self.len(), rhs.len());

        let runtime = Runtime::get();

        let out = RistrettoPointVec {
            data: runtime.alloc(self.len_bytes()),
            len: self.len(),
        };

        let len_gpu = U32Arg::new(self.len() as u32);

        runtime.run(
            "ristretto_scalar_mul",
            &[&self.data, &rhs.data, &out.data, &len_gpu.data],
            [(self.len() as u64, 64), (1, 1), (1, 1)],
        );

        out
    }
}

impl Clone for RistrettoPointVec {
    fn clone(&self) -> Self {
        let runtime = Runtime::get();

        let buffer = runtime.alloc(self.len_bytes());

        unsafe {
            std::ptr::copy_nonoverlapping(
                self.data.contents() as *const u8,
                buffer.contents() as *mut u8,
                self.len_bytes(),
            )
        };

        Self {
            data: buffer,
            len: self.len(),
        }
    }
}

/**
 * An iterator over the [RistrettoPoint]s in a [RistrettoPointVec].
 */
pub struct RistrettoPoints<'a> {
    vec: &'a RistrettoPointVec,
    i: usize,
}

impl<'a> Iterator for RistrettoPoints<'a> {
    type Item = RistrettoPoint;

    fn next(&mut self) -> Option<Self::Item> {
        let ret = if self.i < self.vec.len() {
            Some(self.vec.get(self.i))
        } else {
            None
        };

        self.i += 1;

        ret
    }
}

#[cfg(test)]
mod tests {
    use rand::thread_rng;
    use sunscreen_curve25519_dalek::{traits::Identity, Scalar};

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
            len: v.len(),
        };

        let len_gpu = U32Arg::new(v.len() as u32);

        runtime.run(
            "test_can_pack_unpack_ristretto",
            &[&v.data, &o.data, &len_gpu.data],
            [(v.len() as u64, 64), (1, 1), (1, 1)],
        );

        for i in 0..v.len() {
            assert_eq!(v.get(i), o.get(i));
        }
    }

    #[test]
    fn can_add_identity() {
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
            len: v.len(),
        };

        let len_gpu = U32Arg::new(v.len() as u32);

        runtime.run(
            "test_add_identity_ristretto",
            &[&v.data, &o.data, &len_gpu.data],
            [(v.len() as u64, 64), (1, 1), (1, 1)],
        );

        for i in 0..v.len() {
            dbg!(v.get(i).compress());
            dbg!(o.get(i).compress());

            assert_eq!(v.get(i).compress(), o.get(i).compress());
        }
    }

    #[test]
    fn can_add_ristretto_points() {
        let a = RistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = RistrettoPointVec::new(&[
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
        let a = RistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = RistrettoPointVec::new(&[
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
        let a = RistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = ScalarVec::new(&[
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
            Scalar::random(&mut thread_rng()),
        ]);

        /*
        let b_s = Scalar::from(9u8);
        let b = ScalarVec::new(&[
            b_s,
            b_s,
            b_s,
            b_s
        ]);*/

        let c = &a * &b;

        for i in 0..c.len() {
            assert_eq!(c.get(i).compress(), (a.get(i) * b.get(i)).compress());
        }
    }

    #[test]
    fn can_iter() {
        let a = RistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        for (i, e) in a.iter().enumerate() {
            assert_eq!(e, a.get(i));
        }
    }

    #[test]
    fn can_roundtrip_projective_point() {
        let runtime = Runtime::get();

        let a = [
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ];

        let a_gpu = RistrettoPointVec::new(&a);

        // Allocate space for the output coordinates
        let b_gpu = RistrettoPointVec::new(&a);

        let n = U32Arg::new(a.len() as u32);

        runtime.run(
            "test_can_roundtrip_projective_point",
            &[&a_gpu.data, &b_gpu.data, &n.data],
            [(4, 64), (1, 1), (1, 1)],
        );

        for (i, j) in a_gpu.iter().zip(b_gpu.iter()) {
            assert_eq!(i, j);
        }
    }

    #[test]
    fn clone_yields_new_buffer() {
        let a = RistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = a.clone();

        assert_ne!(a.data.contents(), b.data.contents());

        for (i, j) in a.iter().zip(b.iter()) {
            assert_eq!(i, j);
        }
    }

    #[test]
    fn can_double_projective_point() {
        let runtime = Runtime::get();

        let a = RistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = a.clone();
        let n = U32Arg::new(a.len() as u32);

        runtime.run(
            "test_can_double_projective_point",
            &[&a.data, &b.data, &n.data],
            [(a.len() as u64, 64), (1, 1), (1, 1)],
        );

        for (p_a, p_b) in a.iter().zip(b.iter()) {
            assert_eq!(Scalar::from(2u8) * p_a, p_b);
        }
    }

    #[test]
    fn can_add_projective() {
        let runtime = Runtime::get();

        let a = RistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = a.clone();
        let n = U32Arg::new(a.len() as u32);

        runtime.run(
            "test_can_add_ristretto_projective_niels_point",
            &[&a.data, &b.data, &n.data],
            [(a.len() as u64, 64), (1, 1), (1, 1)],
        );
    }

    #[test]
    fn lookup_tables_are_correct() {
        let runtime = Runtime::get();

        let a = RistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b0 = a.clone();
        let b1 = a.clone();
        let b2 = a.clone();
        let b3 = a.clone();
        let b4 = a.clone();
        let b5 = a.clone();
        let b6 = a.clone();
        let b7 = a.clone();

        let n = U32Arg::new(a.len() as u32);

        runtime.run(
            "test_lut",
            &[&a.data, &b0.data, &b1.data, &b2.data, &b3.data, &b4.data, &b5.data, &b6.data, &b7.data, &n.data],
            [(a.len() as u64, 64), (1, 1), (1, 1)],
        );

        for (i, p) in a.iter().enumerate() {
            assert_eq!(b0.get(i), RistrettoPoint::identity());
            assert_eq!(b1.get(i), p);
            assert_eq!(b2.get(i), Scalar::from(2u8) * p);
            assert_eq!(b3.get(i), Scalar::from(3u8) * p);
            assert_eq!(b4.get(i), -p);
            assert_eq!(b5.get(i), Scalar::from(2u8) * -p);
            assert_eq!(b6.get(i), Scalar::from(3u8) * -p);
            assert_eq!(b7.get(i), Scalar::from(4u8) * -p);
        }
    }
}

#[cfg(all(test, feature = "nightly-features"))]
mod benches {
    use std::time::Instant;
    extern crate test;

    use rand::thread_rng;
    use sunscreen_curve25519_dalek::Scalar;

    use super::*;
    use crate::metal_impl::U32Arg;
    use rayon::prelude::*;
    use test::Bencher;

    use core::mem::size_of;

    #[bench]
    fn bench_scalar_mul_ristretto_points(_: &mut Bencher) {
        const LEN: usize = 256 * 1024;

        let mut a = Vec::with_capacity(LEN);
        let mut b = Vec::with_capacity(LEN);

        for _ in 0..LEN {
            a.push(RistrettoPoint::random(&mut thread_rng()));
            b.push(Scalar::random(&mut thread_rng()))
        }

        let a_gpu = RistrettoPointVec::new(&a);
        let b_gpu = ScalarVec::new(&b);

        println!("Benchmarking...");

        let now = Instant::now();

        let c = &a_gpu * &b_gpu;

        println!(
            "GPU: {} sm/s",
            a_gpu.len() as f64 / now.elapsed().as_secs_f64()
        );
    }
}
