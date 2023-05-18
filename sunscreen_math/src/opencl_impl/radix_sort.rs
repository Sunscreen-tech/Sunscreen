use std::{borrow::Cow, ops::Deref};

use super::{Grid, MappedBuffer, Runtime};

const THREADS_PER_GROUP: usize = 128;
// must equal THREADS_PER_GROUP * WORDS_PER_THREAD in `radix_sort.cl`!
const BLOCK_SIZE: usize = 8 * THREADS_PER_GROUP;
// must equal RADIX in `radix_sort.cl`!
const RADIX: usize = 16;
// must equal RADIX_BITS in `radix_sort.cl`!
const RADIX_BITS: usize = 4;

pub fn radix_sort() {
    todo!();
}

fn create_histograms(
    keys: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
    cur_digit: u32,
) -> (MappedBuffer<u32>, u32) {
    let runtime = Runtime::get();

    let num_blocks = if cols as usize % BLOCK_SIZE == 0 {
        cols as usize / BLOCK_SIZE
    } else {
        cols as usize / BLOCK_SIZE + 1
    };

    let num_threads = num_blocks * THREADS_PER_GROUP;

    let histograms = runtime.alloc(rows as usize * RADIX * num_blocks);

    runtime.run_kernel(
        "create_histograms",
        &vec![
            keys.into(),
            (&histograms).into(),
            cols.into(),
            cur_digit.into(),
        ],
        &Grid::from([(num_threads, THREADS_PER_GROUP), (rows as usize, 1), (1, 1)]),
    );

    (histograms, (num_blocks * RADIX) as u32)
}

/**
 * Computes the prefix sum for each block of 128 elements for the rows of
 * an input matrix `values`.
 * 
 * # Returns
 * Returns a tuple containing
 * 1. A `rows x cols` matrix containing the per-block prefix sums of `values`. Each
 *    block of 128 columns is a prefix sum of the corresponding columns of values.
 * 2. A `rows x cols / 128` matrix. For the i'th row, the j'th column of this matrix 
 *    contains the sum of all 128 values in the j'th block of values in the i'th row.
 * 3. An integer containing the number of blocks per column.
 * 
 * # Panics
 * * The length of `values` must equal `rows * cols`.
 * * The number of rows and columns must be non-zero.
 */
fn prefix_sum_blocks(
    values: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) -> (MappedBuffer<u32>, MappedBuffer<u32>, u32) {
    assert_eq!(values.len(), rows as usize * cols as usize);

    let runtime = Runtime::get();

    let prefix_sums = runtime.alloc(rows as usize * cols as usize);

    let num_blocks = if cols as usize % THREADS_PER_GROUP == 0 {
        cols as usize / THREADS_PER_GROUP
    } else {
        cols as usize / THREADS_PER_GROUP + 1
    };

    let block_totals = runtime.alloc(rows as usize * num_blocks);

    runtime.run_kernel(
        "prefix_sum_blocks",
        &vec![
            values.into(),
            (&prefix_sums).into(),
            (&block_totals).into(),
            cols.into()
        ],
        &Grid::from([(cols as usize, THREADS_PER_GROUP), (rows as usize, 1), (1, 1)])
    );

    (prefix_sums, block_totals, num_blocks as u32)
}

/**
 * `values` is a `rows x cols` row-major matrix of u32 values. This function computes
 * and returns a prefix sum matrix `P`, where each row in `P` is the prefix sum of
 * the corresponding row in `values`.
 * 
 * # Panics
 * * The length of the values matrix must equal rows * cols.
 * * The number of rows and columns must be non-zero.
 */
pub fn prefix_sum(
    values: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) ->  MappedBuffer<u32> {
    assert_eq!(values.len(), rows as usize * cols as usize);
    assert!(rows > 0);
    assert!(cols > 0);

    let (prefix_sums, totals, num_blocks) = prefix_sum_blocks(values, rows, cols);

    fn reduce_totals(totals: &MappedBuffer<u32>, rows: u32, cols: u32) -> Cow<MappedBuffer<u32>> {
        if cols == 1 {
            return Cow::Borrowed(totals);
        }

        let (sums, totals, num_blocks) = prefix_sum_blocks(&totals, rows, cols);

        if num_blocks == 1 {
            return Cow::Owned(sums);
        } else {
            // This recursion isn't a concern for stack overflow since each recursion
            // divides the work by 128. A mere 6 recursion levels means the inputs would
            // consume over 4TB of memory, which is not plausible. 
            let reduced_totals = reduce_totals(&totals, rows, num_blocks);

            offset_blocks(&sums, &reduced_totals, rows, cols);

            return Cow::Owned(sums);
        }
    }

    let totals = reduce_totals(&totals, rows, num_blocks);

    offset_blocks(&prefix_sums, &totals, rows, cols);

    prefix_sums
}

fn offset_blocks(
    blocks: &MappedBuffer<u32>, // Gets mutated!
    offsets: &MappedBuffer<u32>,
    rows: u32,
    cols: u32
) {
    let runtime = Runtime::get();

    runtime.run_kernel(
        "offset_block",
        &vec![
            blocks.into(),
            offsets.into(),
            cols.into()
        ],
        &Grid::from([(cols as usize, THREADS_PER_GROUP), (rows as usize, 1), (1, 1)])
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_create_histograms() {
        let cols = 4567u32;

        // Construct a 3x4567 matrix of values iterating from 0 to 456 shifted into the
        // second digit.
        let matrix = (0..cols).map(|x| x << 4).collect::<Vec<_>>();
        let matrix = [matrix.clone(), matrix.clone(), matrix].concat();

        let runtime = Runtime::get();

        let matrix_gpu = runtime.alloc_from_slice(&matrix);

        let (mut histograms, elems) = create_histograms(&matrix_gpu, 3, cols, 1);

        histograms.remap();

        let histograms = histograms.iter().cloned().collect::<Vec<_>>();

        let num_blocks = if cols as usize % BLOCK_SIZE == 0 {
            cols as usize / BLOCK_SIZE
        } else {
            cols as usize / BLOCK_SIZE + 1
        };

        assert_eq!(num_blocks * RADIX, elems as usize);

        for row_id in 0..3 {
            let row_start = row_id * cols as usize;
            let row_end = row_start + cols as usize;

            let row = &matrix[row_start..row_end];

            for block_id in 0..num_blocks {
                // Compute the histogram serially and compare to the GPU result.
                let mut counts = [0u32; RADIX];

                let block_start = block_id * BLOCK_SIZE;
                let block_end = usize::min(block_start + BLOCK_SIZE, cols as usize);

                let block = &row[block_start..block_end];

                for val in block {
                    let digit = (*val >> 4) & 0xF;

                    counts[digit as usize] += 1;
                }

                for (count_id, count) in counts.iter().enumerate() {
                    let histogram_idx =
                        block_id + num_blocks * count_id + row_id * num_blocks * RADIX;

                    assert_eq!(histograms[histogram_idx], *count);
                }
            }
        }
    }

    #[test]
    fn can_prefix_sum_blocks() {
        let cols = 4567u32;

        let data = (0..cols).map(|x| cols - x).collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data.clone()].concat();

        let runtime = Runtime::get();

        let data_gpu = runtime.alloc_from_slice(&data);

        let (mut prefix_sums, mut block_totals, actual_num_blocks) = prefix_sum_blocks(&data_gpu, 3, cols);

        prefix_sums.remap();
        block_totals.remap();

        let prefix_sums = prefix_sums.iter().cloned().collect::<Vec<_>>();
        let block_totals = block_totals.iter().cloned().collect::<Vec<_>>();

        let expected_num_blocks = if cols as usize % THREADS_PER_GROUP == 0 {
            cols as usize / THREADS_PER_GROUP
        } else {
            cols as usize / THREADS_PER_GROUP + 1
        };

        assert_eq!(expected_num_blocks as u32, actual_num_blocks);

        for row in 0..3 {
            let row_start = (row * cols) as usize;
            let row_end = row_start + cols as usize;

            let sums_row = &prefix_sums[row_start..row_end];
            let data_row = &data[row_start..row_end];

            assert_eq!(sums_row.len(), data_row.len());

            for (c_id, (res_chunk, data_chunk)) in sums_row.chunks(THREADS_PER_GROUP).zip(data_row.chunks(THREADS_PER_GROUP)).enumerate() {
                // Check that the block totals match
                let expected_sum = data_chunk.iter().fold(0u32, |s, x| s + x);

                let actual = block_totals[row as usize * expected_num_blocks + c_id];

                assert_eq!(actual, expected_sum);

                // Serially compute the chunk's prefix sum and check that the
                // prefix sum matches.
                let mut data_chunk = data_chunk.to_owned();
                let mut sum = 0;

                for i in 0..data_chunk.len() {
                    let val = data_chunk[i];
                    data_chunk[i] = sum;

                    sum += val;
                }

                assert_eq!(data_chunk, res_chunk);
            }
        }
    }

    #[test]
    fn can_prefix_sum() {
        // This specific value results in 2 recursion levels to reduce the block totals.
        let cols = 128u32 * 128 * 128 + 1;

        let data = (0..cols).map(|x| cols - x).collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data.clone()].concat();

        let runtime = Runtime::get();

        let data_gpu = runtime.alloc_from_slice(&data);

        let mut actual = prefix_sum(&data_gpu, 3, cols);

        let mut expected = Vec::with_capacity(cols as usize);

        for row in 0..3 {
            let mut sum = 0;
            let row_start = (row * cols) as usize;
            let row_end = row_start + cols as usize;

            for i in &data[row_start..row_end] {
                expected.push(sum);
                sum = sum + *i;
            }
        }
        
        
        actual.remap();

        let actual = actual.iter().cloned().collect::<Vec<_>>();

        assert_eq!(actual, expected);
    }

}
