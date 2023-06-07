///! Our GPU implementation of some of the intermediate steps
///! of multiexp are quite complex. This module provides simple
///! sequential implementations to compare against.
use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar, traits::Identity};
use rand::thread_rng;

use crate::{multiexp_num_buckets, multiexp_num_windows};

pub(crate) struct BinData {
    /// The scalar ids sorted by the corresponding bin id as the key.
    /// Length is the number of input scalars to `get_scalar_window`.
    pub sorted_scalar_ids: Vec<u32>,

    /// The bin id corresponding to the scalar at sorted_scalar_ids[i].
    /// The length is the number of unique bins.
    pub bin_ids: Vec<u32>,

    /// The counts of items for each bin.
    /// The length is the number of unique bins.
    pub bin_counts: Vec<u32>,

    /// The offset into sorted_scalar_ids where a given bin starts.
    /// The length is the number of unique bins.
    pub bin_start_idx: Vec<u32>,
}

const LIMBS_PER_SCALAR: u32 = 8;

fn get_scalar_window(
    scalar: &Scalar,
    window_bits: u32, // assumed to be between 1 and 32
    window_id: u32,
) -> u32 {
    const BITS_PER_LIMB: u32 = 8 * std::mem::size_of::<u32>() as u32;

    // index measured in bits, not bytes.
    let window_start_idx = window_bits * window_id;

    // A window can span at most 2 limbs.
    let limb_id_1 = window_start_idx / BITS_PER_LIMB;
    let limbs = bytemuck::cast_slice::<_, u32>(scalar.as_bytes());
    let limb_1 = limbs[limb_id_1 as usize];

    let lo_mask = if window_bits < 32 {
        (0x1 << window_bits) - 1
    } else {
        0xFFFFFFFF
    };
    let mut window = (limb_1 >> (window_start_idx % BITS_PER_LIMB)) & lo_mask;

    let limb_boundary: u32 = (limb_id_1 + 1) * BITS_PER_LIMB;

    // If this window spans 2 limbs, concatenate load the next limb and
    // concatenate its contribution. Note that windows beginning in the most
    // significant scalar limb never span 2 limbs.
    //
    // If the window would span beyond the scalar, then don't go beyond
    // the number; we're done.
    if window_bits + window_start_idx > limb_boundary && limb_id_1 < LIMBS_PER_SCALAR - 1 {
        let limb_id_2 = limb_id_1 + 1;
        let limb_2 = limbs[limb_id_2 as usize];

        let bits_remaining = window_start_idx + window_bits - limb_boundary;
        let hi_mask = (0x1 << bits_remaining) - 1;

        window |= (limb_2 & hi_mask) << (window_bits - bits_remaining);
    }

    window
}

fn rle(data: &[u32]) -> (Vec<u32>, Vec<u32>) {
    if data.is_empty() {
        return (vec![], vec![]);
    }

    let mut prev = data[0];
    let mut count = 1;

    let mut vals = vec![prev];
    let mut runs = vec![];

    for val in data.iter().skip(1).cloned() {
        if val != prev {
            vals.push(val);
            runs.push(count);
            prev = val;
            count = 1;
        } else {
            count += 1;
        }
    }

    runs.push(count);

    assert_eq!(vals.len(), runs.len());

    (vals, runs)
}

fn prefix_sum(x: &[u32]) -> Vec<u32> {
    if x.is_empty() {
        return vec![];
    }

    let mut sum = vec![0];

    for (i, val) in x[0..(x.len() - 1)].iter().enumerate() {
        sum.push(sum[i] + val);
    }

    sum
}

/// A serial implementation of constructing multiexp bin data used for
/// testing.
pub(crate) fn construct_bin_data(scalars: &[Scalar], window_bits: usize) -> Vec<BinData> {
    const SCALAR_BIT_LEN: usize = 8 * std::mem::size_of::<Scalar>();

    let num_windows = if SCALAR_BIT_LEN % window_bits == 0 {
        SCALAR_BIT_LEN / window_bits
    } else {
        SCALAR_BIT_LEN / window_bits + 1
    };

    let mut bin_data = vec![];

    for i in 0..num_windows {
        let mut bins = scalars
            .iter()
            .enumerate()
            .map(|x| (x.0, get_scalar_window(x.1, window_bits as u32, i as u32)))
            .collect::<Vec<_>>();

        // Sort the tuples by the bin id
        bins.sort_by(|x, y| x.1.cmp(&y.1));

        let sorted_scalar_ids = bins.iter().map(|x| x.0 as u32).collect::<Vec<_>>();

        let sorted_bin_ids = bins.iter().map(|x| x.1).collect::<Vec<_>>();

        let rle_bins = rle(&sorted_bin_ids);
        let rle_sum = prefix_sum(&rle_bins.1);

        // A tuple of the number of items in the bin, offset into the sorted
        // scalars array for the bin, and bin id.
        let mut bin_offset_lengths = rle_bins
            .1
            .iter()
            .zip(rle_sum.iter())
            .zip(&rle_bins.0)
            .collect::<Vec<_>>();

        bin_offset_lengths.sort_by(|x, y| x.0 .0.cmp(y.0 .0));

        let sorted_bin_counts = bin_offset_lengths
            .iter()
            .map(|x| *x.0 .0)
            .collect::<Vec<_>>();
        let sorted_bin_offsets = bin_offset_lengths
            .iter()
            .map(|x| *x.0 .1)
            .collect::<Vec<_>>();
        let sorted_bin_ids = bin_offset_lengths.iter().map(|x| *x.1).collect::<Vec<_>>();

        bin_data.push(BinData {
            sorted_scalar_ids,
            bin_start_idx: sorted_bin_offsets,
            bin_ids: sorted_bin_ids,
            bin_counts: sorted_bin_counts,
        });
    }

    bin_data
}

/// A simple serial implementation of bucket population for comparison
/// in testing complex GPU implementations.
pub(crate) fn compute_bucket_points(
    scalars: &[Scalar],
    points: &[RistrettoPoint],
    window_size: usize,
) -> Vec<Vec<RistrettoPoint>> {
    assert_eq!(scalars.len(), points.len());

    let num_buckets = multiexp_num_buckets(window_size);
    let num_windows = multiexp_num_windows(window_size);

    let mut window_bucket_points = vec![];

    for window_id in 0..num_windows {
        let mut written = vec![false; num_buckets];
        let mut bucket_points = vec![RistrettoPoint::identity(); num_buckets];

        for (i, s) in scalars.iter().enumerate() {
            let cur_window = get_scalar_window(s, window_size as u32, window_id as u32);

            assert!((cur_window as usize) < num_buckets);

            // Don't bother computing zero windows
            if cur_window != 0 {
                if !written[cur_window as usize] {
                    bucket_points[cur_window as usize] = points[i];
                    written[cur_window as usize] = true;
                } else {
                    bucket_points[cur_window as usize] += points[i];
                }
            }
        }

        window_bucket_points.push(bucket_points);
    }

    assert_eq!(window_bucket_points.len(), num_windows);

    window_bucket_points
}

#[test]
fn test_impl_get_scalar_window() {
    let expected = Scalar::random(&mut thread_rng());

    for window_size in 10..33 {
        let mut windows = vec![];

        const SCALAR_BITS: usize = 8 * std::mem::size_of::<Scalar>();

        let num_windows = if SCALAR_BITS % window_size == 0 {
            SCALAR_BITS / window_size
        } else {
            SCALAR_BITS / window_size + 1
        };

        for window_id in 0..num_windows as u32 {
            windows.push(get_scalar_window(&expected, window_size as u32, window_id));
        }

        let mut actual = Scalar::zero();
        let mut radix = Scalar::one();

        // Attempt to reconstruct the scalar and assert we get the same value
        // back.
        for window in windows.iter() {
            assert!((*window as u64) < (0x1u64 << window_size as u64));

            actual += Scalar::from(*window) * radix;
            radix *= Scalar::from(0x1u64 << window_size as u64);
        }

        assert_eq!(actual, expected);
    }
}

pub(crate) struct PrefixSumBlockRistretto {
    /// Length = input
    pub block_sums: Vec<RistrettoPoint>,

    /// Length = input / block_size
    pub block_totals: Vec<RistrettoPoint>,
}

pub(crate) fn prefix_sum_blocks_ristretto(
    points: &[RistrettoPoint],
    block_size: usize,
) -> PrefixSumBlockRistretto {
    let block_totals = points
        .chunks(block_size)
        .map(|c| c.iter().fold(RistrettoPoint::identity(), |s, x| s + x))
        .collect::<Vec<_>>();

    let block_sums = points
        .chunks(block_size)
        .map(|c| {
            let mut sum = RistrettoPoint::identity();
            let mut t;

            let mut out = c.to_owned();

            for val in out.iter_mut() {
                t = *val;
                *val = sum;
                sum += t;
            }

            out
        })
        .collect::<Vec<_>>()
        .concat();

    let expected_total_len = if points.len() % block_size == 0 {
        points.len() / block_size
    } else {
        points.len() / block_size + 1
    };

    assert_eq!(block_totals.len(), expected_total_len);
    assert_eq!(block_sums.len(), points.len());

    PrefixSumBlockRistretto {
        block_sums,
        block_totals,
    }
}

#[test]
fn test_rle_impl_works() {
    let (vals, runs) = rle(&[1, 1, 1, 2, 2, 3, 4, 4, 4, 4, 5, 5, 7, 7, 7]);

    assert_eq!(vals, vec![1, 2, 3, 4, 5, 7]);
    assert_eq!(runs, vec![3, 2, 1, 4, 2, 3]);
}

#[test]
fn test_prefix_sum_works() {
    let sum = prefix_sum(&[1, 3, 5, 7, 8, 11]);

    assert_eq!(sum, vec![0, 1, 4, 9, 16, 24]);
}
