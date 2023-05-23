use super::{radix_sort::prefix_sum, Grid, MappedBuffer, Runtime};

/**
* Returns
* * A `rows x cols` matrix where each row contains the run lengths of the rows of
* rows of the input matrix. Each row in this output matrix has a leading dimension
* equal to cols, but only the first `runs_length` items will be populated.
* * A `row x 1` matrix where each row contains the number of runs in the run matrix.
*
* # Remarks
* Doesn't compute which value appears for each count as an optimization.

*/
pub fn rle_counts(
    data: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) -> (MappedBuffer<u32>, MappedBuffer<u32>) {
    let backward_mask = compute_backward_mask(data, rows, cols);
    let scanned_backward_mask = prefix_sum(&backward_mask, rows, cols);

    let (compacted, total_runs) =
        compact_backward_mask(&backward_mask, &scanned_backward_mask, rows, cols);

    let cpu = compacted.iter().cloned().collect::<Vec<_>>();

    let counts = compute_counts(&compacted, &total_runs, rows, cols);

    (counts, total_runs)
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

fn compute_counts(
    compact_backward_mask: &MappedBuffer<u32>,
    total_runs: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) -> MappedBuffer<u32> {
    let runtime = Runtime::get();

    let counts_out = runtime.alloc::<u32>(cols as usize * rows as usize);

    runtime.run_kernel(
        "rle_compute_counts",
        &[
            compact_backward_mask.into(),
            total_runs.into(),
            (&counts_out).into(),
            cols.into(),
        ],
        &Grid::from([(cols as usize, 128), (rows as usize, 1), (1, 1)]),
    );

    counts_out
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
        let cols = 3 * 4567u32;
        let rows = 3u32;

        let data = (0..(cols / 3))
            .flat_map(|x| repeat(x).take(3))
            .collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data].concat();

        let data_gpu = Runtime::get().alloc_from_slice(&data);

        assert_eq!(data.len(), cols as usize * rows as usize);

        let (counts, total_runs) = rle_counts(&data_gpu, rows, cols);

        for row in 0..rows {
            let len = total_runs[row as usize];
            assert_eq!(len, cols / 3);

            for col in 0..len {
                assert_eq!(counts[col as usize + row as usize * cols as usize], 3);
            }
        }
    }

    #[test]
    fn can_rle_unique() {
        let cols = 4567u32;
        let rows = 3u32;

        // In this test, we make each element unique so we should get `cols` run
        // lengths, each of length 1.
        let data = (0..cols).into_iter().collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data.clone()].concat();

        let data_gpu = Runtime::get().alloc_from_slice(&data);

        let (counts, total_runs) = rle_counts(&data_gpu, rows, cols);

        let counts = counts.iter().cloned().collect::<Vec<_>>();

        for row in 0..rows {
            let len = total_runs[row as usize];
            assert_eq!(len, cols);

            for col in 0..len {
                assert_eq!(counts[col as usize + row as usize * cols as usize], 1);
            }
        }
    }
}
