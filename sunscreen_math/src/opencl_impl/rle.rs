use super::{radix_sort::prefix_sum, Grid, MappedBuffer, Runtime};

/// For the given `rows x cols` matrix `data`, compute the run-length encoding of
/// each row.
/// 
/// * Returns
/// * A `rows x cols` matrix where each row contains the run lengths of the rows of
///   rows of the input matrix. Each row in this output matrix has a leading dimension
///   equal to cols, but only the first `runs_length` items will be populated.
/// * A `rows x cols` matrix containing the values associated with each run.
/// * A `row x 1` matrix where each row contains the number of runs in the run matrix.
pub fn run_length_encoding(
    data: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) -> (MappedBuffer<u32>, MappedBuffer<u32>, MappedBuffer<u32>) {
    let backward_mask = compute_backward_mask(data, rows, cols);
    let scanned_backward_mask = prefix_sum(&backward_mask, rows, cols);

    let (compacted, total_runs) =
        compact_backward_mask(&backward_mask, &scanned_backward_mask, rows, cols);

    let _cpu = compacted.iter().cloned().collect::<Vec<_>>();

    let (counts, run_vals) = compute_runs(data, &compacted, &total_runs, rows, cols);

    (counts, run_vals, total_runs)
}

fn compute_backward_mask(data: &MappedBuffer<u32>, rows: u32, cols: u32) -> MappedBuffer<u32> {
    let runtime = Runtime::get();

    let backward_mask = runtime.alloc::<u32>(rows as usize * cols as usize);

    runtime.run_kernel(
        "rle_compute_backward_mask",
        &[data.into(), (&backward_mask).into(), cols.into()],
        &Grid::from([(cols as usize, 128), (rows as usize, 1), (1, 1)]),
    );

    backward_mask
}

fn compact_backward_mask(
    data: &MappedBuffer<u32>,
    backward_mask: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) -> (MappedBuffer<u32>, MappedBuffer<u32>) {
    let runtime = Runtime::get();

    let compacted = runtime.alloc::<u32>(rows as usize * (cols + 1) as usize);
    let total_runs = runtime.alloc::<u32>(rows as usize);

    runtime.run_kernel(
        "rle_compact_backward_mask",
        &[
            data.into(),
            backward_mask.into(),
            (&compacted).into(),
            (&total_runs).into(),
            cols.into(),
        ],
        &Grid::from([(cols as usize, 128), (rows as usize, 1), (1, 1)]),
    );

    (compacted, total_runs)
}

/// Returns a tuple containing the run lengths and the values associated with the run.
fn compute_runs(
    data: &MappedBuffer<u32>,
    compact_backward_mask: &MappedBuffer<u32>,
    total_runs: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) -> (MappedBuffer<u32>, MappedBuffer<u32>) {
    let runtime = Runtime::get();

    let counts_out = runtime.alloc::<u32>(cols as usize * rows as usize);
    let vals_out = runtime.alloc::<u32>(cols as usize * rows as usize);

    runtime.run_kernel(
        "rle_compute_runs",
        &[
            data.into(),
            compact_backward_mask.into(),
            total_runs.into(),
            (&counts_out).into(),
            (&vals_out).into(),
            cols.into(),
        ],
        &Grid::from([(cols as usize, 128), (rows as usize, 1), (1, 1)]),
    );

    (counts_out, vals_out)
}

#[cfg(test)]
mod tests {
    use std::iter::repeat;

    use super::*;

    use crate::opencl_impl::{radix_sort::prefix_sum, Runtime};

    #[test]
    fn can_compute_backward_mask() {
        let cols = 3 * 4567u32;
        let rows = 3u32;

        let data = (0..(cols / 3))
            .flat_map(|x| repeat(x).take(3))
            .collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data].concat();

        let data_gpu = Runtime::get().alloc_from_slice(&data);

        assert_eq!(data.len(), cols as usize * rows as usize);

        let mask = compute_backward_mask(&data_gpu, rows, cols);
        let mask_cpu = mask.iter().cloned().collect::<Vec<_>>();

        for row in 0..rows {
            for col in 0..cols {
                let val = mask_cpu[col as usize + row as usize * cols as usize];

                if col % 3 == 0 {
                    assert_eq!(val, 1);
                } else {
                    assert_eq!(val, 0);
                }
            }
        }
    }

    #[test]
    fn can_compact_backward_mask() {
        let cols = 3 * 4567u32;
        let rows = 3u32;

        let data = (0..(cols / 3))
            .flat_map(|x| repeat(x).take(3))
            .collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data].concat();

        let data_gpu = Runtime::get().alloc_from_slice(&data);

        assert_eq!(data.len(), cols as usize * rows as usize);

        let mask = compute_backward_mask(&data_gpu, rows, cols);
        let mask_sums = prefix_sum(&mask, rows, cols);

        let _mask_sums_cpu = mask_sums.iter().cloned().collect::<Vec<_>>();

        let (compacted, total_runs) = compact_backward_mask(&mask, &mask_sums, rows, cols);

        let compacted = compacted.iter().cloned().collect::<Vec<_>>();

        for row in 0..rows {
            let len = total_runs[row as usize];
            assert_eq!(len, cols / 3);

            for col in 0..len {
                assert_eq!(
                    compacted[col as usize + row as usize * (cols as usize + 1)],
                    col * 3
                );
            }

            assert_eq!(
                compacted[len as usize + row as usize * (cols as usize + 1)],
                cols
            );
        }
    }

    #[test]
    fn can_rle() {
        let cols = 3 * 345u32;
        let rows = 3u32;

        let data = (0..(cols / 3))
            .flat_map(|x| repeat(x).take(3))
            .collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data].concat();

        let data_gpu = Runtime::get().alloc_from_slice(&data);

        assert_eq!(data.len(), cols as usize * rows as usize);

        let (counts, vals, total_runs) = run_length_encoding(&data_gpu, rows, cols);

        let vals = vals.iter().cloned().collect::<Vec<_>>();

        for row in 0..rows {
            let len = total_runs[row as usize];
            assert_eq!(len, cols / 3);

            for col in 0..len {
                let i = col as usize + row as usize * cols as usize;
                assert_eq!(counts[i], 3);
                assert_eq!(vals[i], data[3 * col as usize + row as usize * cols as usize]);
            }
        }
    }

    #[test]
    fn can_rle_unique() {
        let cols = 4567u32;
        let rows = 3u32;

        // In this test, we make each element unique so we should get `cols` run
        // lengths, each of length 1.
        let data = (0..cols).collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data].concat();

        let data_gpu = Runtime::get().alloc_from_slice(&data);

        let (counts, vals, total_runs) = run_length_encoding(&data_gpu, rows, cols);

        let counts = counts.iter().cloned().collect::<Vec<_>>();
        let vals = vals.iter().cloned().collect::<Vec<_>>();

        for row in 0..rows {
            let len = total_runs[row as usize];
            assert_eq!(len, cols);

            for col in 0..len {
                let i = col as usize + row as usize * cols as usize;

                assert_eq!(counts[i], 1);
                assert_eq!(vals[i], data[i]);
            }
        }
    }
}
