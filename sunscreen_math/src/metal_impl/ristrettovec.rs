use curve25519_dalek::{
    edwards::EdwardsPoint, ristretto::RistrettoPoint, scalar::Scalar, CannonicalFieldElement,
};
use metal::Buffer;
use rayon::prelude::*;
use std::{
    mem::{size_of, MaybeUninit},
    ops::{Add, Mul, Sub},
};

use crate::metal_impl::GpuScalarVec;

use super::{GpuVec, GpuVecIter, IntoGpuVecIter, Runtime};

pub struct GpuRistrettoPointVec {
    data: Buffer,
    len: usize,
}

unsafe impl Send for GpuRistrettoPointVec {}

impl Clone for GpuRistrettoPointVec {
    fn clone(&self) -> Self {
        Self {
            data: self.clone_buffer(),
            len: self.len,
        }
    }
}

impl GpuRistrettoPointVec {
    #[allow(clippy::erasing_op)]
    #[allow(clippy::identity_op)]
    /**
     * Creates a new [`RistrettoPointVec`].
     */
    pub fn new(x: &[RistrettoPoint]) -> Self {
        let runtime = Runtime::get();

        let len = x.len();

        assert_eq!(size_of::<RistrettoPoint>(), size_of::<u32>() * 40);
        let byte_len = x.len() * size_of::<RistrettoPoint>();
        let data = runtime.alloc(byte_len);

        let mut field_vec = Self { data, len };

        // Turn the slice into a ptr into a usize so we can share it across threads.
        // Each cell in the slice is going to be written to exactly 1 time, so there
        // is no data race here.
        let data_ptr = unsafe { field_vec.buffer_slice_mut().as_ptr() } as usize;

        x.par_iter()
            .map(|p| {
                (
                    p.0.X.to_u29(),
                    p.0.Y.to_u29(),
                    p.0.Z.to_u29(),
                    p.0.T.to_u29(),
                )
            })
            .enumerate()
            .for_each(|(i, (x, y, z, t))| unsafe {
                // Cast the usize back to a pointer. No two items (much less threads)
                // write to the same u32, concurrently or otherwise. Mechanically, this
                // is equivalent to doing `split_at_mut()` `byte_len` times and moving
                // a bunch of the slices to each closure and is sound for the same reason.
                let data_ptr = data_ptr as *mut MaybeUninit<u32>;

                let u29_len = x.len();

                for (j, w) in x.iter().enumerate() {
                    let elem = data_ptr.add((j + 0 * u29_len) * len + i);

                    (*elem).write(*w);
                }

                for (j, w) in y.iter().enumerate() {
                    let elem = data_ptr.add((j + 0 * u29_len) * len + i);

                    (*elem).write(*w);
                }

                for (j, w) in z.iter().enumerate() {
                    let elem = data_ptr.add((j + 0 * u29_len) * len + i);

                    (*elem).write(*w);
                }

                for (j, w) in t.iter().enumerate() {
                    let elem = data_ptr.add((j + 0 * u29_len) * len + i);

                    (*elem).write(*w);
                }
            });

        field_vec
    }

    pub fn iter(&self) -> GpuVecIter<Self> {
        <Self as GpuVec>::iter(self)
    }
}

impl IntoIterator for GpuRistrettoPointVec {
    type Item = RistrettoPoint;
    type IntoIter = IntoGpuVecIter<Self>;

    fn into_iter(self) -> Self::IntoIter {
        <Self as GpuVec>::into_iter(self)
    }
}

impl GpuVec for GpuRistrettoPointVec {
    type Item = RistrettoPoint;

    fn get_buffer(&self) -> &Buffer {
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

        // This should be sound because this instance has been initialized by
        // the time you can call get.
        let buffer_slice = unsafe { self.buffer_slice() };

        for i in 0..10 {
            x[i] = buffer_slice[(i + 0 * u29_len) * self.len + index];
        }

        for i in 0..10 {
            y[i] = buffer_slice[(i + 1 * u29_len) * self.len + index];
        }

        for i in 0..10 {
            z[i] = buffer_slice[(i + 2 * u29_len) * self.len + index];
        }

        for i in 0..10 {
            t[i] = buffer_slice[(i + 3 * u29_len) * self.len + index];
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

    /**
     * This variant multiplies each point by the single scalar.
     */
    fn mul(self, rhs: &Scalar) -> Self::Output {
        let scalar_vec = GpuScalarVec::new(&vec![*rhs; self.len()]);

        self * scalar_vec
    }
}

#[cfg(test)]
mod tests {
    use curve25519_dalek::{scalar::Scalar, traits::Identity};
    use rand::thread_rng;

    use crate::metal_impl::{Grid, U32Arg};

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

        let runtime = Runtime::get();

        let o = GpuRistrettoPointVec {
            data: runtime.alloc(v.len_bytes()),
            len: v.len(),
        };

        let len_gpu = U32Arg::new(v.len() as u32);

        runtime.run(
            "test_can_pack_unpack_ristretto",
            &[&v.data, &o.data, &len_gpu.data],
            Grid([(v.len() as u64, 64), (1, 1), (1, 1)]),
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

        let v = GpuRistrettoPointVec::new(&points);

        let runtime = Runtime::get();

        let o = GpuRistrettoPointVec {
            data: runtime.alloc(v.len_bytes()),
            len: v.len(),
        };

        let len_gpu = U32Arg::new(v.len() as u32);

        runtime.run(
            "test_add_identity_ristretto",
            &[&v.data, &o.data, &len_gpu.data],
            Grid([(v.len() as u64, 64), (1, 1), (1, 1)]),
        );

        for i in 0..v.len() {
            dbg!(v.get(i).compress());
            dbg!(o.get(i).compress());

            assert_eq!(v.get(i).compress(), o.get(i).compress());
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
    fn can_single_scalar_mul_ristretto_points() {
        let a = GpuRistrettoPointVec::new(&[
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
            RistrettoPoint::random(&mut thread_rng()),
        ]);

        let b = Scalar::random(&mut thread_rng());

        let c = &a * b;

        for i in 0..c.len() {
            assert_eq!(c.get(i).compress(), (a.get(i) * b).compress());
        }
    }

    #[test]
    fn can_iter() {
        let a = GpuRistrettoPointVec::new(&[
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

        let a_gpu = GpuRistrettoPointVec::new(&a);

        // Allocate space for the output coordinates
        let b_gpu = GpuRistrettoPointVec::new(&a);

        let n = U32Arg::new(a.len() as u32);

        runtime.run(
            "test_can_roundtrip_projective_point",
            &[&a_gpu.data, &b_gpu.data, &n.data],
            Grid([(4, 64), (1, 1), (1, 1)]),
        );

        for (i, j) in a_gpu.iter().zip(b_gpu.iter()) {
            assert_eq!(i, j);
        }
    }

    #[test]
    fn clone_yields_new_buffer() {
        let a = GpuRistrettoPointVec::new(&[
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

        let a = GpuRistrettoPointVec::new(&[
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
            Grid([(a.len() as u64, 64), (1, 1), (1, 1)]),
        );

        for (p_a, p_b) in a.iter().zip(b.iter()) {
            assert_eq!(Scalar::from(2u8) * p_a, p_b);
        }
    }

    #[test]
    fn can_add_projective() {
        let runtime = Runtime::get();

        let a = GpuRistrettoPointVec::new(&[
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
            Grid([(a.len() as u64, 64), (1, 1), (1, 1)]),
        );
    }

    #[test]
    fn lookup_tables_are_correct() {
        let runtime = Runtime::get();

        let a = GpuRistrettoPointVec::new(&[
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
            &[
                &a.data, &b0.data, &b1.data, &b2.data, &b3.data, &b4.data, &b5.data, &b6.data,
                &b7.data, &n.data,
            ],
            Grid([(a.len() as u64, 64), (1, 1), (1, 1)]),
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
