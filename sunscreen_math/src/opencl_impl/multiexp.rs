use curve25519_dalek::ristretto::RistrettoPoint;

use crate::{
    multiexp_num_buckets, multiexp_num_windows,
    opencl_impl::{
        radix_sort::{prefix_sum, radix_sort_1, radix_sort_2},
        rle::run_length_encoding,
        Grid, Runtime,
    },
    scalar_size_bits, GpuRistrettoPointVec, GpuScalarVec, GpuVec,
};

use super::MappedBuffer;

pub fn multiscalar_multiplication(
    points: &GpuRistrettoPointVec,
    scalars: &GpuScalarVec,
) -> RistrettoPoint {
    assert_eq!(points.len(), scalars.len());

    todo!();
}

pub struct BucketData {
    scalar_ids: MappedBuffer<u32>,
    bin_ids: MappedBuffer<u32>,
    bin_counts: MappedBuffer<u32>,
    bin_start_idx: MappedBuffer<u32>,
    num_bins: MappedBuffer<u32>,
}

const CONSTRUCT_BIN_DATA_NUM_THREADS: usize = 16384;

fn compute_bucket_data(scalars: &GpuScalarVec, window_size_bits: usize) -> BucketData {
    let runtime = Runtime::get();

    // In Pippenger's algorithm, we break N-bit scalar values into w windows of
    // b-bit values. For example, for 256-bit scalars and a 16-bit window size,
    // we get 16 windows. For a given window, we bucket the scalars with the same
    // value, then sum each point associated with the scalar for the given bucket
    // to produce 2^b points. We then sum these bucket points (scaled by the
    // bucket value) to produce a point for the given window. Finally, for each
    // window id w, we sum the window points scaled by `2^(w * b)`.
    let num_windows = multiexp_num_windows(window_size_bits);

    // Fill out COO format sparse matrices
    // (https://en.wikipedia.org/wiki/Sparse_matrix#Coordinate_list_(COO))
    // for each window on the scalar. These sparse matrices are degenerate in that
    // * It may contain some zero values.
    // * There may be multiple values associated with the same row and column.
    // The data, row_index, and col_index are each stored as
    // `(NUM_THREADS * max_cols) x num_windows` matrices. However, the number
    // of non-zero entries in each matrix is bounded by scalars.len().
    // For a given window, the rows correspond to GPU threads, the columns
    // correspond to window values, and the values in the matrix are indices into
    // the EC point (and scalar) arrays.
    let scalar_id = runtime.alloc::<u32>(scalars.len() * num_windows);
    let bin_idx = runtime.alloc::<u32>(scalars.len() * num_windows);

    // The first grid dimension corresponds to the number of threads `t`
    // among which we wish to split work for parallelism. The second grid
    // grid dimension corresponds to the window w. Each of these threads
    // will bucket N / t items for the window w by pushing items into the COO
    // sparse matrix for w. The row of this matrix corresponds to the thread id
    // and the column corresponds to the bucket value.
    //
    // We handle edge cases in the following manner:
    // * If a thread encounters a zero value for the given window, we push
    //   a zero entry into the sparse matrix.
    // * If a thread encounters more than one scalar for a given bucket, we
    //   simply insert multiple scalar indices for the same row and column pair.
    //   While this creates a degenerate matrix, it doesn't break anything in
    //   the overall algorithm as we aren't doing actual linear algebra.
    runtime.run_kernel(
        "fill_coo_matrix",
        &[
            (&scalars.data).into(),
            (&scalar_id).into(),
            (&bin_idx).into(),
            (window_size_bits as u32).into(),
            (scalars.len() as u32).into(),
        ],
        &Grid::from([
            (CONSTRUCT_BIN_DATA_NUM_THREADS, 256),
            (num_windows, 1),
            (1, 1),
        ]),
    );

    let _bins = bin_idx.iter().cloned().collect::<Vec<_>>();

    // We transpose the matrix by just swapping references to `coo_col_index`
    // and `coo_row_index`.
    //
    // After doing this non-step, we sort the transposed matrix by its rows
    // (i.e. we sort by `coo_col_index` from the original matrix). There are
    // `num_windows` coo matrices stored as a `num_windows x scalars.len()`
    // row-major dense matrix spread over coo_{col_index, row_index, data}.
    // That is, the w'th row of these variables corresponds to the w'th window.
    //
    // Our radix-sort implementation sorts rows of a dense matrix, so a single
    // call to this function will sort every window concurrently.
    let sorted_bins = radix_sort_1(
        &bin_idx,
        &scalar_id,
        window_size_bits as u32,
        num_windows as u32,
        scalars.len() as u32,
    );

    // Compute the RLE of the column indices and prefix sum them. We'll sort them
    // by run count, which effectively groups similarly length rows together
    // so warps have minimal branch divergence.
    let rle = run_length_encoding(&sorted_bins.keys, num_windows as u32, scalars.len() as u32);

    let rle_sum = prefix_sum(&rle.run_lengths, num_windows as u32, scalars.len() as u32);

    let sorted_bin_counts = radix_sort_2(
        &rle.run_lengths,
        &rle_sum,
        &rle.values,
        window_size_bits as u32,
        num_windows as u32,
        scalars.len() as u32,
    );

    BucketData {
        scalar_ids: sorted_bins.values,
        bin_ids: sorted_bin_counts.values_2,
        bin_counts: sorted_bin_counts.keys,
        bin_start_idx: sorted_bin_counts.values_1,
        num_bins: rle.num_runs,
    }
}

/// Given the bucket information we've previously computed, fill the buckets
/// sum of the appropriate ristretto points for each window.
fn compute_bucket_points(
    points: &GpuRistrettoPointVec,
    bucket_data: &BucketData,
    window_size_bits: usize,
) -> GpuRistrettoPointVec {
    let runtime = Runtime::get();

    let bucket_points = init_bucket_points(window_size_bits);

    runtime.run_kernel(
        "compute_bucket_points",
        &vec![
            (&points.data).into(),
            (&bucket_data.scalar_ids).into(),
            (&bucket_data.bin_ids).into(),
            (&bucket_data.bin_counts).into(),
            (&bucket_data.bin_start_idx).into(),
            (&bucket_data.num_bins).into(),
            (&bucket_points.data).into(),
            (points.len() as u32).into(),
            (multiexp_num_buckets(window_size_bits) as u32).into(),
        ],
        &Grid::from([
            (points.len(), 128),
            (multiexp_num_windows(window_size_bits), 1),
            (1, 1),
        ]),
    );

    bucket_points
}

fn init_bucket_points(window_size_bits: usize) -> GpuRistrettoPointVec {
    let num_buckets = multiexp_num_buckets(window_size_bits);
    let num_windows = multiexp_num_windows(window_size_bits);

    let bucket_points = GpuRistrettoPointVec::alloc(num_windows * num_buckets);

    Runtime::get().run_kernel(
        "init_bucket_points",
        &vec![(&bucket_points.data).into(), (num_buckets as u32).into()],
        &Grid::from([(num_buckets, 128), (num_windows, 1), (1, 1)]),
    );

    bucket_points
}

#[cfg(test)]
mod tests {
    use std::time::Instant;

    use curve25519_dalek::{scalar::Scalar, traits::Identity};
    use rand::thread_rng;

    use crate::{ristretto_bitwise_eq, test_impl, RistrettoPointVec, ScalarVec};

    use super::*;

    #[test]
    fn can_get_msm_scalar_windows() {
        let a = (0..4567)
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
        let mut coo_col_idx = runtime.alloc(a.len() * num_windows);

        runtime.run_kernel(
            "fill_coo_matrix",
            &[
                (&a_gpu.data).into(),
                (&coo_data).into(),
                (&coo_col_idx).into(),
                (window_bits as u32).into(),
                (a.len() as u32).into(),
            ],
            &Grid::from([(NUM_THREADS, 2), (num_windows, 1), (1, 1)]),
        );

        coo_data.remap();
        coo_col_idx.remap();

        let coo_data = coo_data.iter().cloned().collect::<Vec<_>>();
        let coo_col_idx = coo_col_idx.iter().cloned().collect::<Vec<_>>();

        for w in 0..num_windows {
            let start = a.len() * w;
            let end = start + a.len();

            let window = &windows[start..end];
            let cols = &coo_col_idx[start..end];

            for r in 0..a.len() {
                assert_eq!(window[r], cols[r]);
            }
        }

        for i in 0..a.len() {
            assert!(coo_data.contains(&(i as u32)));
        }
    }

    #[test]
    fn can_construct_bin_data_basic() {
        let a = vec![1, 1, 1, 2, 2, 4, 5, 5, 5, 5, 6, 7, 7, 8];
        let a_scalar = a
            .iter()
            .rev()
            .map(|x| Scalar::from(*x as u32))
            .collect::<Vec<_>>();

        let a_gpu = ScalarVec::new(&a_scalar);

        let bin_info = compute_bucket_data(&a_gpu, 16);

        let bin_counts = bin_info.bin_counts.iter().cloned().collect::<Vec<_>>();
        let bin_start_idx = bin_info.bin_start_idx.iter().cloned().collect::<Vec<_>>();
        let scalar_id_cpu = bin_info.bin_ids.iter().cloned().collect::<Vec<_>>();
        let num_runs = bin_info.num_bins.iter().cloned().collect::<Vec<_>>();

        assert_eq!(
            num_runs,
            vec![7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        );

        // I did this example by hand and confirmed its correctness.
        // TODO: write a serial CPU implementation and test against that.
        assert_eq!(
            bin_counts[0..num_runs[0] as usize],
            vec![1, 1, 1, 2, 2, 3, 4]
        );
        assert_eq!(
            bin_start_idx[0..num_runs[0] as usize],
            vec![5, 10, 13, 3, 11, 0, 6]
        );
        assert_eq!(
            scalar_id_cpu[0..num_runs[0] as usize],
            vec![4, 6, 8, 2, 7, 1, 5]
        );
    }

    #[test]
    fn can_construct_bin_data() {
        let count = 11u32;

        let a = (0..count)
            .rev()
            .map(|_| Scalar::random(&mut thread_rng()))
            .collect::<Vec<_>>();
        let a_gpu = ScalarVec::new(&a);

        let window_size_bits = 7;

        let bin_info = compute_bucket_data(&a_gpu, window_size_bits);

        let bin_counts = bin_info.bin_counts.iter().cloned().collect::<Vec<_>>();
        let bin_start_idx = bin_info.bin_start_idx.iter().cloned().collect::<Vec<_>>();
        let scalar_ids = bin_info.scalar_ids.iter().cloned().collect::<Vec<_>>();
        let bin_ids = bin_info.bin_ids.iter().cloned().collect::<Vec<_>>();
        let num_runs = bin_info.num_bins.iter().cloned().collect::<Vec<_>>();

        let expected = crate::test_impl::construct_bin_data(&a, window_size_bits);

        let num_windows = multiexp_num_windows(window_size_bits);

        assert_eq!(expected.len(), num_windows);

        for i in 0..num_windows {
            let start = i * a.len();
            let end = start + a.len();
            assert_eq!(scalar_ids[start..end], expected[i].sorted_scalar_ids);

            let bin_len = num_runs[i];
            assert_eq!(bin_len as usize, expected[i].bin_ids.len());
            assert_eq!(bin_len as usize, expected[i].bin_counts.len());
            assert_eq!(bin_len as usize, expected[i].bin_start_idx.len());

            let end = start + bin_len as usize;
            assert_eq!(bin_counts[start..end], expected[i].bin_counts);
            assert_eq!(bin_start_idx[start..end], expected[i].bin_start_idx);
            assert_eq!(bin_ids[start..end], expected[i].bin_ids);
        }
    }

    #[test]
    fn can_init_buckets() {
        for window_size_bits in 1..17 {
            let num_buckets = multiexp_num_buckets(window_size_bits);
            let num_windows = multiexp_num_windows(window_size_bits);

            let buckets = init_bucket_points(window_size_bits);

            let buckets = buckets.iter().collect::<Vec<_>>();

            let identity = RistrettoPoint::identity();

            for w in 0..num_windows {
                for b in 0..num_buckets {
                    let bucket_point = buckets[b + w * num_buckets];

                    // RistrettoPoint's eq function returns true for invalid points.
                    // So use something spicier.
                    assert!(ristretto_bitwise_eq(identity, bucket_point));
                }
            }
        }
    }

    #[test]
    fn can_populate_bins() {
        let count = 4567u32;

        let scalars = (0..count)
            .map(|x| Scalar::random(&mut thread_rng()))
            .collect::<Vec<_>>();
        let points = (0..count)
            .map(|x| RistrettoPoint::random(&mut thread_rng()))
            .collect::<Vec<_>>();

        let scalars_gpu = ScalarVec::new(&scalars);
        let points_gpu = RistrettoPointVec::new(&points);

        let window_size_bits = 16;

        let bucket_data = compute_bucket_data(&scalars_gpu, window_size_bits);

        let actual_gpu = compute_bucket_points(&points_gpu, &bucket_data, window_size_bits);

        let actual = actual_gpu.iter().collect::<Vec<_>>();

        let expected = crate::test_impl::compute_bucket_points(&scalars, &points, window_size_bits);

        let num_buckets = multiexp_num_buckets(window_size_bits);

        for (actual_window_buckets, expected_window_buckets) in
            actual.chunks(num_buckets).zip(expected)
        {
            for (actual_bucket, expected_bucket) in
                actual_window_buckets.iter().zip(expected_window_buckets)
            {
                assert!(ristretto_bitwise_eq(*actual_bucket, expected_bucket));
            }
        }
    }
}
