use curve25519_dalek::{
    edwards::EdwardsPoint, ristretto::RistrettoPoint, scalar::Scalar, CannonicalFieldElement,
};
use rayon::prelude::*;
use std::{
    mem::size_of,
    ops::{Add, Mul, Sub},
};

use crate::{opencl_impl::{Runtime, Grid, radix_sort::radix_sort_2_vals}, GpuScalarVec};

use super::{GpuVec, GpuVecIter, IntoGpuVecIter, MappedBuffer, multiexp::multiscalar_multiplication};

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

    use crate::{opencl_impl::Grid, ScalarVec};

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

    #[test]
    fn can_get_msm_scalar_windows() {
        let a = (0..456)
            .map(|_| Scalar::random(&mut thread_rng()))
            .collect::<Vec<_>>();

        let a_gpu = ScalarVec::new(&a);
        let runtime = Runtime::get();

        for window_bits in 1..33 {
            const SCALAR_BITS: usize = 8 * std::mem::size_of::<Scalar>();

            let num_windows = if SCALAR_BITS % window_bits == 0 {
                SCALAR_BITS / window_bits
            } else {
                SCALAR_BITS / window_bits + 1
            };

            let mut windows_gpu = runtime.alloc::<u32>(num_windows * a.len());

            runtime.run_kernel(
                "test_get_scalar_windows",
                &[
                    (&a_gpu.data).into(),
                    (&windows_gpu).into(),
                    (window_bits as u32).into(),
                    (a.len() as u32).into(),
                ],
                &Grid::from([(a.len(), 256), (num_windows, 1), (1, 1)]),
            );

            // The windows buffer's contents have changed since running the kernel, so we need
            // to remap the host address on some (e.g. Nvidia) platforms.
            windows_gpu.remap();

            let windows = windows_gpu.iter().cloned().collect::<Vec<_>>();

            for i in 0..a.len() {
                let mut actual = Scalar::zero();
                let mut radix = Scalar::one();

                for j in 0..num_windows {
                    let cur_window = windows[j * a.len() + i];
                    assert!((cur_window as u64) < (0x1u64 << window_bits as u64));

                    actual += Scalar::from(cur_window) * radix;
                    radix *= Scalar::from(0x1u64 << window_bits as u64);
                }

                assert_eq!(actual, a[i]);
            }
        }
    }

    #[test]
    fn can_fill_coo_matrix() {
        let a = (0..4567)
            .map(|_| Scalar::random(&mut thread_rng()))
            .collect::<Vec<_>>();

        let a_gpu = ScalarVec::new(&a);
        let runtime = Runtime::get();

        let window_bits = 15;

        const SCALAR_BITS: usize = 8 * std::mem::size_of::<Scalar>();

        let num_windows = if SCALAR_BITS % window_bits == 0 {
            SCALAR_BITS / window_bits
        } else {
            SCALAR_BITS / window_bits + 1
        };

        let mut windows_gpu = runtime.alloc::<u32>(num_windows * a.len());

        runtime.run_kernel(
            "test_get_scalar_windows",
            &[
                (&a_gpu.data).into(),
                (&windows_gpu).into(),
                (window_bits as u32).into(),
                (a.len() as u32).into(),
            ],
            &Grid::from([(a.len(), 256), (num_windows, 1), (1, 1)]),
        );

        // The windows buffer's contents have changed since running the kernel, so we need
        // to remap the host address on some (e.g. Nvidia) platforms.
        windows_gpu.remap();

        let windows = windows_gpu.iter().cloned().collect::<Vec<_>>();

        const NUM_THREADS: usize = 4;

        let mut coo_data = runtime.alloc(a.len() * num_windows);
        let mut coo_row_idx = runtime.alloc(a.len() * num_windows);
        let mut coo_col_idx = runtime.alloc(a.len() * num_windows);

        runtime.run_kernel(
            "fill_coo_matrix",
            &[
                (&a_gpu.data).into(),
                (&coo_data).into(),
                (&coo_row_idx).into(),
                (&coo_col_idx).into(),
                (window_bits as u32).into(),
                (a.len() as u32).into(),
            ],
            &Grid::from([(NUM_THREADS, 2), (num_windows, 1), (1, 1)]),
        );

        coo_data.remap();
        coo_row_idx.remap();
        coo_col_idx.remap();

        let coo_data = coo_data.iter().cloned().collect::<Vec<_>>();
        let coo_row_idx = coo_row_idx.iter().cloned().collect::<Vec<_>>();
        let coo_col_idx = coo_col_idx.iter().cloned().collect::<Vec<_>>();

        for w in 0..num_windows {
            for r in 0..a.len() {
                assert_eq!(coo_row_idx[a.len() * w + r], (r % NUM_THREADS) as u32);
            }
        }

        assert_eq!(windows, coo_col_idx);

        for i in 0..a.len() {
            assert!(coo_data.contains(&(i as u32)));
        }
    }
}
