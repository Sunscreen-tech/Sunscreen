#include <inttypes.h.cl>

/// Extracts the `window_id`'th window for a given scalar.
///
/// # Remarks
/// Scalars are assumed to be packed to maximize memory coalescing. That is,
/// the j'th limb of the i'th scalar is located at
/// &scalars[j * scalar_count + i].
///
/// For sanity, we assume windows are never larger than 32-bit, as we don't want
/// to deal with multi-limb bucketing. It probably goes without saying that
/// a 0-bit window does nothing useful.
///
/// `scalar_id` is 
/// `scalar_count` is the total number of scalar values.
u32 get_scalar_window(
    global const u32* scalars,
    u32 window_bits, // assumed to be between 1 and 32
    u32 window_id,
    u32 scalar_id,
    u32 scalars_len
) {
    u32 window;

    const u32 BITS_PER_LIMB = 8 * sizeof(u32);
    const u32 LIMBS_PER_SCALAR = 8;

    // index measured in bits, not bytes.
    u32 window_start_idx = window_bits * window_id;

    // A window can span at most 2 limbs.
    u32 limb_id_1 = window_start_idx / BITS_PER_LIMB;
    u32 limb_1 = scalars[limb_id_1 * scalars_len + scalar_id];

    u32 lo_mask = window_bits < 32 ? (0x1 << window_bits) - 1 : 0xFFFFFFFF;
    window = (limb_1 >> (window_start_idx % BITS_PER_LIMB)) & lo_mask;

    u32 limb_boundary = (limb_id_1 + 1) * BITS_PER_LIMB;

    // If this window spans 2 limbs, concatenate load the next limb and 
    // concatenate its contribution. Note that windows beginning in the most
    // significant scalar limb never span 2 limbs.
    //
    // If the window would span beyond the scalar, then don't go beyond
    // the number; we're done.
    if (window_bits + window_start_idx > limb_boundary && limb_id_1 < LIMBS_PER_SCALAR - 1) {
        u32 limb_id_2 = limb_id_1 + 1;
        u32 limb_2 = scalars[limb_id_2 * scalars_len + scalar_id];

        u32 bits_remaining = window_start_idx + window_bits - limb_boundary;
        u32 hi_mask = (0x1 << bits_remaining) - 1;

        window |= (limb_2 & hi_mask) << (window_bits - bits_remaining);
    }

    return window;
}

/// Our algorithm deviates from cuZK in a few ways.
/// * Firstly, we use a COO sparse matrix to store bucketing information. 
/// Transposing a COO matrix is effectively a no-op as you simply swap the
/// row and column pointers.
/// * Secondly, our implementation stores zero bucket items in the matrix
/// and we simply skip them when doing bucket accumulation. The overhead of
/// storing zeros and skipping them when reducing buckets in the sparse matrix 
/// is trivial compared to adding EC points.
kernel void fill_coo_matrix(
    global const u32* scalars,
    global u32* coo_data,
    global u32* coo_col_idx,
    u32 window_bits,
    u32 scalars_len
) {
    const u32 window_id = get_global_id(1);
    const u32 thread_count = get_global_size(0);
    const u32 thread_id = get_global_id(0);

    u32 window_offset = window_id * scalars_len;

    u32 thread_scalar_id = 0;

    for (u32 scalar_id = thread_id; scalar_id < scalars_len; scalar_id += thread_count) {
        u32 window = get_scalar_window(
            scalars,
            window_bits,
            window_id,
            scalar_id,
            scalars_len
        );

        coo_data[window_offset + thread_count * thread_scalar_id + thread_id] = scalar_id;

        // Our matrices can be degenerate and feature the same column more than
        // once in a row. While mathematically unsound, we aren't doing a real
        // SPMV, so this is still works.
        coo_col_idx[window_offset + thread_count * thread_scalar_id + thread_id] = window;
        //coo_row_idx[window_offset + thread_count * thread_scalar_id + thread_id] = thread_id;

        thread_scalar_id++;
    }
}

#if defined(TEST)
    kernel void test_get_scalar_windows(
        global const u32* scalars,
        global u32* windows,
        u32 window_bits,
        u32 scalars_len
    ) {
        u32 window_id = get_global_id(1);
        u32 scalar_id = get_global_id(0);

        if (scalar_id < scalars_len) {
            windows[window_id * scalars_len + scalar_id] = get_scalar_window(
                scalars,
                window_bits,
                window_id,
                scalar_id,
                scalars_len
            );
        }
    }
#endif