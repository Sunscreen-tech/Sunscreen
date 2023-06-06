use std::borrow::Cow;

use curve25519_dalek::ristretto::RistrettoPoint;
use ocl::OclPrm;

use super::{Grid, MappedBuffer, Runtime};

// must equal THREADS_PER_GROUP in `radix_sort.cl`!
const THREADS_PER_GROUP: usize = 128;
// must equal WORDS_PER_THREAD in `radix_sort.cl`!
const WORDS_PER_THREAD: usize = 1;
// must equal THREADS_PER_GROUP * WORDS_PER_THREAD in `radix_sort.cl`!
const BLOCK_SIZE: usize = WORDS_PER_THREAD * THREADS_PER_GROUP;
// must equal RADIX in `radix_sort.cl`!
const RADIX: usize = 16;
// must equal RADIX_BITS in `radix_sort.cl`!
const RADIX_BITS: usize = 4;

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

    let histograms = unsafe { runtime.alloc(rows as usize * RADIX * num_blocks) };

    runtime.run_kernel(
        "create_histograms",
        &[
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
fn prefix_sum_blocks<T: PrefixSum>(
    values: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) -> (MappedBuffer<u32>, MappedBuffer<u32>, u32) {
    assert_eq!(values.len(), rows as usize * cols as usize * T::LEN_IN_U32);

    let runtime = Runtime::get();

    let prefix_sums = unsafe { runtime.alloc(rows as usize * cols as usize * T::LEN_IN_U32) };

    let num_blocks = if cols as usize % T::LOCAL_THREADS == 0 {
        cols as usize / T::LOCAL_THREADS
    } else {
        cols as usize / T::LOCAL_THREADS + 1
    };

    let block_totals = unsafe { runtime.alloc(rows as usize * num_blocks * T::LEN_IN_U32) };

    runtime.run_kernel(
        T::PREFIX_SUM_BLOCKS_KERNEL,
        &[
            values.into(),
            (&prefix_sums).into(),
            (&block_totals).into(),
            cols.into(),
        ],
        &Grid::from([
            (cols as usize, T::LOCAL_THREADS),
            (rows as usize, 1),
            (1, 1),
        ]),
    );

    (prefix_sums, block_totals, num_blocks as u32)
}

pub trait PrefixSum {
    const PREFIX_SUM_BLOCKS_KERNEL: &'static str;
    const OFFSET_BLOCKS_KERNEL: &'static str;
    const LEN_IN_U32: usize;
    const LOCAL_THREADS: usize;
}

impl PrefixSum for u32 {
    const PREFIX_SUM_BLOCKS_KERNEL: &'static str = "prefix_sum_blocks_u32";
    const OFFSET_BLOCKS_KERNEL: &'static str = "offset_blocks_u32";
    const LEN_IN_U32: usize = 1;
    const LOCAL_THREADS: usize = 128;
}

impl PrefixSum for RistrettoPoint {
    const PREFIX_SUM_BLOCKS_KERNEL: &'static str = "prefix_sum_blocks_ristretto";
    const OFFSET_BLOCKS_KERNEL: &'static str = "offset_blocks_ristretto";
    const LEN_IN_U32: usize = std::mem::size_of::<RistrettoPoint>() / std::mem::size_of::<u32>();
    const LOCAL_THREADS: usize = 64;
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
pub fn prefix_sum<T: PrefixSum>(
    values: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) -> MappedBuffer<u32> {
    assert_eq!(values.len(), rows as usize * cols as usize * T::LEN_IN_U32);
    assert!(rows > 0);
    assert!(cols > 0);

    let (prefix_sums, totals, num_blocks) = prefix_sum_blocks::<T>(values, rows, cols);

    fn reduce_totals<T: PrefixSum>(
        totals: &MappedBuffer<u32>,
        rows: u32,
        cols: u32,
    ) -> Cow<MappedBuffer<u32>> {
        let (sums, totals, num_blocks) = prefix_sum_blocks::<T>(totals, rows, cols);

        if num_blocks == 1 {
            return Cow::Owned(sums);
        } else {
            // This recursion isn't a concern for stack overflow since each recursion
            // divides the work by 128. A mere 6 recursion levels means the inputs would
            // consume over 4TB of memory, which is not plausible.
            let reduced_totals = reduce_totals::<T>(&totals, rows, num_blocks);

            offset_blocks::<T>(&sums, &reduced_totals, rows, cols);

            return Cow::Owned(sums);
        }
    }

    // If we only had 1 block, the singular total will be the sum of the first block
    // rather than zero, but this is okay because offsetting the blocks always ignores the
    // first block.
    //
    // If there is more than one block, reduce the totals into a prefix sum so we can offset
    // each block as appropriate.
    let totals = if num_blocks > 1 {
        reduce_totals::<T>(&totals, rows, num_blocks)
    } else {
        Cow::Owned(totals)
    };

    offset_blocks::<T>(&prefix_sums, &totals, rows, cols);

    prefix_sums
}

fn offset_blocks<T: PrefixSum>(
    blocks: &MappedBuffer<u32>, // Gets mutated!
    offsets: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) {
    let runtime = Runtime::get();

    runtime.run_kernel(
        T::OFFSET_BLOCKS_KERNEL,
        &[blocks.into(), offsets.into(), cols.into()],
        &Grid::from([
            (cols as usize, THREADS_PER_GROUP),
            (rows as usize, 1),
            (1, 1),
        ]),
    );
}

pub struct RadixSort {
    pub keys: MappedBuffer<u32>,
    pub values: MappedBuffer<u32>,
}

/// Sort the keys in each row of the keys matrix such that they appear in increasing order. This variant sorts one values array
/// vals_1 is a u32 array that get sorted according to the corresponding key at
/// the same index.
///
/// `max_bits` allows you to choose many bits are needed to represent the keys (up to 32). If your
/// data fits in a smaller number of bits and you reduce this parameter accordingly, this will
/// reduce the runtime of the radix sort
/// # Panics
/// * If rows * cols != keys.len()
/// * If keys.len() != vals_1.len() != vals_2.len()
/// * If max_bits > 32
pub fn radix_sort_1(
    keys: &MappedBuffer<u32>,
    vals_1: &MappedBuffer<u32>,
    max_bits: u32,
    rows: u32,
    cols: u32,
) -> RadixSort {
    assert_eq!(keys.len(), vals_1.len());
    assert_eq!(keys.len(), rows as usize * cols as usize);
    assert!(max_bits <= 32);

    let num_digits = if max_bits % RADIX_BITS as u32 == 0 {
        max_bits / RADIX_BITS as u32
    } else {
        max_bits / RADIX_BITS as u32 + 1
    };

    let num_blocks = if cols as usize % BLOCK_SIZE == 0 {
        cols as usize / BLOCK_SIZE
    } else {
        cols as usize / BLOCK_SIZE + 1
    };

    let num_threads = num_blocks * THREADS_PER_GROUP;

    let runtime = Runtime::get();

    let keys_clone = [keys.clone(), keys.clone()];
    let vals_1_clone = [vals_1.clone(), vals_1.clone()];

    let mut cur = 0;
    let mut next = 1;

    for cur_digit in 0..num_digits {
        let (hist, num_blocks) = create_histograms(&keys_clone[cur], rows, cols, cur_digit);

        let bin_locations = prefix_sum::<u32>(&hist, rows, num_blocks);

        runtime.run_kernel(
            "radix_sort_emplace_val_1",
            &[
                (&keys_clone[cur]).into(),
                (&vals_1_clone[cur]).into(),
                (&bin_locations).into(),
                (&keys_clone[next]).into(),
                (&vals_1_clone[next]).into(),
                cur_digit.into(),
                cols.into(),
            ],
            &Grid::from([(num_threads, THREADS_PER_GROUP), (rows as usize, 1), (1, 1)]),
        );

        std::mem::swap(&mut cur, &mut next);
    }

    RadixSort {
        keys: keys_clone.into_iter().nth(cur).unwrap(),
        values: vals_1_clone.into_iter().nth(cur).unwrap(),
    }
}

pub struct RadixSort2 {
    pub keys: MappedBuffer<u32>,
    pub values_1: MappedBuffer<u32>,
    pub values_2: MappedBuffer<u32>,
}

/// Sort the keys in each row of the keys matrix such that they appear in increasing order. This variant sorts 2 values arrays alongside the keys.
/// vals_1, vals_2 are u32 arrays that get sorted according to the corresponding key at
/// the same index.
///
/// `max_bits` allows you to choose many bits are needed to represent the keys (up to 32).
///  If your data fits in a smaller number of bits and you reduce this parameter
/// accordingly, this will reduce the runtime of the radix sort
///
/// # Panics
/// * If rows * cols != keys.len()
/// * If keys.len() != vals_1.len() != vals_2.len()
/// * If max_bits > 32
pub fn radix_sort_2(
    keys: &MappedBuffer<u32>,
    vals_1: &MappedBuffer<u32>,
    vals_2: &MappedBuffer<u32>,
    max_bits: u32,
    rows: u32,
    cols: u32,
) -> RadixSort2 {
    assert_eq!(keys.len(), vals_1.len());
    assert_eq!(keys.len(), rows as usize * cols as usize);
    assert!(max_bits <= 32);

    let num_digits = if max_bits % RADIX_BITS as u32 == 0 {
        max_bits / RADIX_BITS as u32
    } else {
        max_bits / RADIX_BITS as u32 + 1
    };

    let num_blocks = if cols as usize % BLOCK_SIZE == 0 {
        cols as usize / BLOCK_SIZE
    } else {
        cols as usize / BLOCK_SIZE + 1
    };

    let num_threads = num_blocks * THREADS_PER_GROUP;

    let runtime = Runtime::get();

    let keys_clone = [keys.clone(), keys.clone()];
    let vals_1_clone = [vals_1.clone(), vals_1.clone()];
    let vals_2_clone = [vals_2.clone(), vals_2.clone()];

    let mut cur = 0;
    let mut next = 1;

    for cur_digit in 0..num_digits {
        let (hist, num_blocks) = create_histograms(&keys_clone[cur], rows, cols, cur_digit);

        let bin_locations = prefix_sum::<u32>(&hist, rows, num_blocks);

        runtime.run_kernel(
            "radix_sort_emplace_val_2",
            &[
                (&keys_clone[cur]).into(),
                (&vals_1_clone[cur]).into(),
                (&vals_2_clone[cur]).into(),
                (&bin_locations).into(),
                (&keys_clone[next]).into(),
                (&vals_1_clone[next]).into(),
                (&vals_2_clone[next]).into(),
                cur_digit.into(),
                cols.into(),
            ],
            &Grid::from([(num_threads, THREADS_PER_GROUP), (rows as usize, 1), (1, 1)]),
        );

        std::mem::swap(&mut cur, &mut next);
    }

    RadixSort2 {
        keys: keys_clone.into_iter().nth(cur).unwrap(),
        values_1: vals_1_clone.into_iter().nth(cur).unwrap(),
        values_2: vals_2_clone.into_iter().nth(cur).unwrap(),
    }
}

#[cfg(test)]
mod tests {
    use curve25519_dalek::traits::Identity;
    use rand::thread_rng;

    use crate::{GpuRistrettoPointVec, GpuVec, RistrettoPointVec};

    use super::*;

    const WORDS_PER_POINT: usize =
        std::mem::size_of::<RistrettoPoint>() / std::mem::size_of::<u32>();

    #[test]
    fn can_create_histograms() {
        let cols = 4567u32;

        // Construct a 3x4567 matrix of values iterating from 0 to 456 shifted into the
        // second digit.
        let matrix = (0..cols).map(|x| x << 4).collect::<Vec<_>>();
        let matrix = [matrix.clone(), matrix.clone(), matrix].concat();

        let runtime = Runtime::get();

        let matrix_gpu = unsafe { runtime.alloc_from_slice(&matrix) };

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
    fn can_prefix_sum_blocks_u32() {
        let cols = 4567u32;

        let data = (0..cols).map(|x| cols - x).collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data].concat();

        let runtime = Runtime::get();

        let data_gpu = unsafe { runtime.alloc_from_slice(&data) };

        let (mut prefix_sums, mut block_totals, actual_num_blocks) =
            prefix_sum_blocks::<u32>(&data_gpu, 3, cols);

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

            for (c_id, (res_chunk, data_chunk)) in sums_row
                .chunks(THREADS_PER_GROUP)
                .zip(data_row.chunks(THREADS_PER_GROUP))
                .enumerate()
            {
                // Check that the block totals match
                let expected_sum: u32 = data_chunk.iter().sum();

                let actual = block_totals[row as usize * expected_num_blocks + c_id];

                assert_eq!(actual, expected_sum);

                // Serially compute the chunk's prefix sum and check that the
                // prefix sum matches.
                let mut data_chunk = data_chunk.to_owned();
                let mut sum = 0;

                for i in data_chunk.iter_mut() {
                    let val = *i;
                    *i = sum;

                    sum += val;
                }

                assert_eq!(data_chunk, res_chunk);
            }
        }
    }

    #[test]
    fn can_prefix_sum_blocks_ristretto() {
        let cols = 2u32;
        let rows = 1;

        let data = (0..cols)
            .map(|x| {
                //RistrettoPoint::identity()
                RistrettoPoint::random(&mut thread_rng())
            })
            .collect::<Vec<_>>();

        //let data = [data.clone(), data.clone(), data].concat();

        let data_gpu = RistrettoPointVec::new(&data);

        let (mut prefix_sums, mut block_totals, actual_num_blocks) =
            prefix_sum_blocks::<RistrettoPoint>(&data_gpu.data, rows, cols);

        prefix_sums.remap();
        block_totals.remap();

        let expected_num_blocks = if cols as usize % RistrettoPoint::LOCAL_THREADS == 0 {
            cols as usize / RistrettoPoint::LOCAL_THREADS
        } else {
            cols as usize / RistrettoPoint::LOCAL_THREADS + 1
        };

        assert_eq!(prefix_sums.len() % WORDS_PER_POINT, 0);
        assert_eq!(block_totals.len() % WORDS_PER_POINT, 0);
        assert_eq!(prefix_sums.len() / WORDS_PER_POINT, data_gpu.len());
        assert_eq!(
            block_totals.len() / WORDS_PER_POINT,
            expected_num_blocks
        );

        let prefix_sums = RistrettoPointVec {
            data: prefix_sums,
            len: cols as usize,
        }
        .iter()
        .collect::<Vec<_>>();

        let block_totals = RistrettoPointVec {
            data: block_totals,
            len: expected_num_blocks,
        }
        .iter()
        .collect::<Vec<_>>();

        assert_eq!(expected_num_blocks as u32, actual_num_blocks);

        for row in 0..rows {
            let row_start = (row * cols) as usize;
            let row_end = row_start + cols as usize;

            let sums_row = &prefix_sums[row_start..row_end];
            let data_row = &data[row_start..row_end];

            assert_eq!(sums_row.len(), data_row.len());

            for (c_id, (actual_chunk, expected_chunk)) in sums_row
                .chunks(2 * RistrettoPoint::LOCAL_THREADS)
                .zip(data_row.chunks(2 * RistrettoPoint::LOCAL_THREADS))
                .enumerate()
            {
                // Check that the block totals match
                let expected_sum = expected_chunk
                    .iter()
                    .fold(RistrettoPoint::identity(), |s, x| s + x);

                let actual_sum = block_totals[row as usize * expected_num_blocks + c_id];

                dbg!(actual_sum);
                assert_eq!(actual_sum.compress(), expected_sum.compress());

                // Serially compute the chunk's prefix sum and check that the
                // prefix sum matches.
                let mut data_chunk = expected_chunk.to_owned();
                let mut sum = RistrettoPoint::identity();

                for i in data_chunk.iter_mut() {
                    let val = *i;
                    *i = sum;

                    sum += val;
                }

                for (a, e) in data_chunk.iter().zip(actual_chunk.iter()) {
                    assert_eq!(a.compress(), e.compress());
                }
            }
        }
    }

    #[test]
    fn can_prefix_sum_u32() {
        // This specific value results in 2 recursion levels to reduce the block totals.
        let cols = 1024u32 * 1024 * 32 + 1;
        let rows = 3;

        let data = (0..cols).map(|x| cols - x).collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data].concat();

        let runtime = Runtime::get();

        let data_gpu = unsafe { runtime.alloc_from_slice(&data) };

        let mut actual = prefix_sum::<u32>(&data_gpu, rows, cols);

        let mut expected = Vec::with_capacity(cols as usize);

        for row in 0..rows {
            let mut sum = 0u32;
            let row_start = (row * cols) as usize;
            let row_end = row_start + cols as usize;

            for i in &data[row_start..row_end] {
                expected.push(sum);
                sum = sum.wrapping_add(*i);
            }
        }

        actual.remap();

        let actual = actual.iter().cloned().collect::<Vec<_>>();

        assert_eq!(actual, expected);
    }

    #[test]
    fn can_prefix_sum_ristretto() {
        let cols = 1u32;
        let rows = 3;

        let data = (0..cols)
            .map(|x| {
                let bytes = [
                    x.to_le_bytes().iter().cloned().collect::<Vec<_>>(),
                    vec![0; 60],
                ]
                .concat();

                RistrettoPoint::from_uniform_bytes(&bytes.try_into().unwrap())
            })
            .collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data].concat();

        let points = GpuRistrettoPointVec::new(&data);

        let sum = prefix_sum::<RistrettoPoint>(&points.data, rows, cols);

        let actual = GpuRistrettoPointVec {
            data: sum,
            len: points.len(),
        };

        let actual = actual.iter().collect::<Vec<_>>();

        let mut expected = data.clone();

        for row in 0..rows {
            let start = row as usize * cols as usize;
            let end = start + cols as usize;

            let expected_slice = &mut expected[start..end];
            let actual_slice = &actual[start..end];

            let mut t;
            let mut sum = RistrettoPoint::identity();

            for i in 0..expected_slice.len() - 1 {
                t = expected_slice[i];
                expected_slice[i] = sum;
                sum += t;
            }

            for i in 0..expected_slice.len() {
                assert_eq!(expected_slice[i], actual_slice[i]);
            }
        }
    }

    #[test]
    fn can_radix_sort() {
        let cols: u32 = 128 * 128 * 4 + 1;
        let rows = 16;

        let keys = (0..cols).map(|x| (cols - x - 1)).collect::<Vec<_>>();
        let keys = [
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys.clone(),
            keys,
        ]
        .concat();

        let vals_1 = keys.clone();
        let _vals_2 = keys.clone();

        let runtime = Runtime::get();

        let data_gpu = unsafe { runtime.alloc_from_slice(&keys) };
        let vals_1_gpu = unsafe { runtime.alloc_from_slice(&vals_1) };

        let mut sorted = radix_sort_1(&data_gpu, &vals_1_gpu, 24, rows, cols);

        sorted.keys.remap();
        sorted.values.remap();

        let keys_sorted = sorted.keys.iter().cloned().collect::<Vec<_>>();
        let vals_1_sorted = sorted.values.iter().cloned().collect::<Vec<_>>();

        for row in 0..rows {
            let row_start = (row * cols) as usize;
            let row_end = row_start + cols as usize;

            let mut expected = keys[row_start..row_end].to_owned();
            expected.sort();

            assert_eq!(expected, &keys_sorted[row_start..row_end]);
            assert_eq!(expected, &vals_1_sorted[row_start..row_end]);
        }
    }
}
