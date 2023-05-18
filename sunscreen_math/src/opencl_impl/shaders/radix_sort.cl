#include <inttypes.h.cl>

/// This Radix sort implementation allows for sorting keys alongside
/// 2 values arrays. Additionally, keys is treated as an mxn matrix
/// and this algorithm sorts the rows of this matrix.
///
/// m is global_work_size(1) and n is len.
///
/// # Remarks
/// The local work size must be 128x1

#define RADIX_BITS 4
#define RADIX 16
#define RADIX_MASK 0xF
#define LOG_THREADS_PER_GROUP 7
#define THREADS_PER_GROUP (0x1 << LOG_THREADS_PER_GROUP)
#define WORDS_PER_THREAD 8
#define BLOCK_SIZE THREADS_PER_GROUP * WORDS_PER_THREAD

kernel void create_histograms(
    const global u32* restrict keys,
    global u32* restrict histograms,
    const u32 len,
    const u32 cur_digit
) {
    u32 group_id = get_group_id(0);
    u32 row_tid = get_global_id(1);
    u32 local_id = get_local_id(0);

    local u32 counts[RADIX];

    if (local_id < RADIX) {
        counts[local_id] = 0;
    }

    barrier(CLK_LOCAL_MEM_FENCE);

    u32 start = row_tid * len + group_id * BLOCK_SIZE + local_id;
    u32 end = min(start + BLOCK_SIZE, len * (row_tid + 1));

    for (u32 i = start; i < end; i += THREADS_PER_GROUP) {
        u32 value = keys[i];

        u32 digit = (value >> (cur_digit * RADIX_BITS)) & RADIX_MASK;

        // TODO: atomic_add is simple, but is probably slower reducing
        // a bunch of thread counters with bank-conflict optimization. 
        // If we need more perf out of sort (unlikely), this is a 
        // place to get it.
        atomic_add(&counts[digit], 1);
    }
    
    barrier(CLK_LOCAL_MEM_FENCE);

    if (local_id < RADIX) {
        u32 num_groups = get_num_groups(0);

        u32 radix_offset = group_id + local_id * num_groups + RADIX * num_groups * row_tid;

        // Store all the 0 counts, then 1 counts, and so on to make
        // prefix summation simpler.
        histograms[radix_offset] = counts[local_id];
    }
}

/// Given an mxn u32 input matrix, for each row and 
/// block of THREADS_PER_GROUP columns, this kernel computes:
/// * Per-block prefix sums that get written into block_prefix_sums.
/// * The sum of each column block that gets written to block_totals.
///
/// # Remarks
/// See https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-39-parallel-prefix-sum-scan-cuda
/// for core implementation.
/// However, this algorithm has been extended to work on multiple rows
/// in a matrix in parallel.
kernel void prefix_sum_blocks(
    const global u32* restrict values,
    global u32* restrict block_prefix_sums,
    global u32* restrict block_totals,
    u32 len
) {
    u32 group_id = get_group_id(0);
    u32 global_id = get_global_id(0);
    u32 local_id = get_local_id(0);
    u32 row_id = get_global_id(1);

    // TODO: Prevent bank conflicts
    local u32 values_local[THREADS_PER_GROUP];

    if (global_id < len) {
        values_local[local_id] = values[global_id + row_id * len];
    } else {
        values_local[local_id] = 0;
    }

    barrier(CLK_LOCAL_MEM_FENCE);

    // Up sweep
    for (u32 i = 0; i < LOG_THREADS_PER_GROUP; i++) {
        u32 two_n = 0x1 << i;
        u32 two_n_plus_1 = 0x1 << (i + 1);

        u32 k = two_n_plus_1 * local_id;
        u32 idx_1 = k + two_n - 1;
        u32 idx_2 = k + two_n_plus_1 - 1;

        if (idx_2 < THREADS_PER_GROUP) {
            values_local[idx_2] = values_local[idx_1] + values_local[idx_2];
        }

        barrier(CLK_LOCAL_MEM_FENCE);
    }

    // The last element after up sweeping contains the sum of
    // all inputs. Write this to the block_totals.
    if (local_id == 0) {
        block_totals[group_id + row_id * get_num_groups(0)] = values_local[THREADS_PER_GROUP - 1];
    }

    // Down sweep
    if (local_id == 0) {
        values_local[THREADS_PER_GROUP - 1] = 0;
    }
    
    barrier(CLK_LOCAL_MEM_FENCE);

    for (u32 i = LOG_THREADS_PER_GROUP; i > 0; i--) {
        u32 d = i - 1;
        
        u32 two_d = 0x1 << d;
        u32 two_d_plus_1 = 0x1 << (d + 1);
        u32 k = local_id * two_d_plus_1;

        u32 idx_1 = k + two_d - 1;
        u32 idx_2 = k + two_d_plus_1 - 1;

        if (idx_2 < THREADS_PER_GROUP) {
            u32 t = values_local[idx_1];
            values_local[idx_1] = values_local[idx_2];
            values_local[idx_2] = t + values_local[idx_2];
        }
        
        barrier(CLK_LOCAL_MEM_FENCE);
    }

    if (global_id < len) {
        block_prefix_sums[global_id + row_id * len] = values_local[local_id];
    }
}

kernel void offset_block(
    global u32* restrict blocks,
    global const u32* restrict block_offsets,
    u32 cols
) {
    u32 block_id = get_group_id(0);
    u32 local_id = get_local_id(0);
    u32 num_blocks = get_num_groups(0);
    u32 col = get_global_id(0);
    u32 row = get_global_id(1);

    if (col >= cols) {
        return;
    }

    u32 val = blocks[col + cols * row];
    u32 offset = block_offsets[block_id + num_blocks * row];

    blocks[col + cols * row] = val + offset;
}