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
#define LOG_WORDS_PER_THREAD 0
#define WORDS_PER_THREAD (0x1 << LOG_WORDS_PER_THREAD)
#define BLOCK_SIZE THREADS_PER_GROUP * WORDS_PER_THREAD

/// Performs a prefix sum on local memory. The length of this buffer
/// must be a power of 2. Each thread will return the sum of all
/// the input elements.
///
/// # Remarks
/// This implementation isn't exactly efficient for computing the prefix sums of
/// the rows of a matrix in shared memory. This is potentially future work to
/// improve performance.
u32 local_prefix_sum(
    local u32* data,
    u32 log_len
) {
    u32 local_id = get_local_id(0);
    u32 len = 0x1 << log_len;

    // Up sweep
    for (u32 i = 0; i < log_len; i++) {
        u32 two_n = 0x1 << i;
        u32 two_n_plus_1 = 0x1 << (i + 1);

        u32 k = two_n_plus_1 * local_id;
        u32 idx_1 = k + two_n - 1;
        u32 idx_2 = k + two_n_plus_1 - 1;

        if (idx_1 < len && idx_2 < len) {
            data[idx_2] = data[idx_1] + data[idx_2];
        }

        barrier(CLK_LOCAL_MEM_FENCE);
    }

    barrier(CLK_LOCAL_MEM_FENCE);

    // The last element after up sweeping contains the sum of
    // all inputs. Write this to the block_totals.
    u32 sum = data[len - 1];

    // Down sweep
    if (local_id == 0) {
        data[len - 1] = 0;
    }
    
    barrier(CLK_LOCAL_MEM_FENCE);

    for (u32 i = log_len; i > 0; i--) {
        u32 d = i - 1;
        
        u32 two_d = 0x1 << d;
        u32 two_d_plus_1 = 0x1 << (d + 1);
        u32 k = local_id * two_d_plus_1;

        u32 idx_1 = k + two_d - 1;
        u32 idx_2 = k + two_d_plus_1 - 1;

        if (idx_1 < len && idx_2 < len) {
            u32 t = data[idx_1];
            data[idx_1] = data[idx_2];
            data[idx_2] = t + data[idx_2];
        }
        
        barrier(CLK_LOCAL_MEM_FENCE);
    }

    return sum;
}

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

    u32 sum = local_prefix_sum(
        values_local,
        LOG_THREADS_PER_GROUP
    );

    // TIL, multiple GPU threads writing to the same memory address is 
    // a bad idea, *even when they're writing the same value*. In particular,
    // doing this on M1 GPUs results in undefined behavior.
    //
    // Thus, just put a stupid guard here.
    if (local_id == 0) {
        block_totals[group_id + row_id * get_num_groups(0)] = sum;
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
    u32 num_blocks = get_num_groups(0);
    u32 col = get_global_id(0);
    u32 row = get_global_id(1);

    // The first block doesn't need to be offset because no other block
    // precedes it that would affect its sums.
    if (col >= cols || block_id == 0) {
        return;
    }

    u32 val = blocks[col + cols * row];
    u32 offset = block_offsets[block_id + num_blocks * row];

    blocks[col + cols * row] = val + offset;
}

/// Place the input keys and values into the corresponding output key and bin
/// locations according to the input prefix sum.
kernel void radix_sort_emplace_val_1(
    global const u32* restrict keys,
    global const u32* restrict vals_1,
    global const u32* restrict bin_locations,
    global u32* restrict keys_out,
    global u32* restrict vals_1_out,
    u32 cur_digit,
    u32 cols
) {
    u32 row_tid = get_global_id(1);
    u32 local_id = get_local_id(0);
    u32 group_id = get_group_id(0);
    u32 num_groups = get_num_groups(0);

    // The global offset for each digit for this block.
    local u32 global_digit_idx[RADIX];

    // The offset for each digit within the current block.
    local u32 local_digit_idx[RADIX][BLOCK_SIZE];

    // We read the same word from global memory multiple times, but these
    // should fit in L1 cache, so no need for shared memory for them.

    // Zero the local index
    #pragma unroll
    for (u32 word = local_id; word < BLOCK_SIZE; word += THREADS_PER_GROUP) {
        #pragma unroll
        for (u32 radix = 0; radix < RADIX; radix++) {
            local_digit_idx[radix][word] = 0;
        }
    }

    barrier(CLK_LOCAL_MEM_FENCE);

    // Load the global radix offsets.
    if (local_id < RADIX) {
        global_digit_idx[local_id] = bin_locations[group_id + local_id * num_groups + row_tid * RADIX * num_groups];
    }

    // Load each word, compute its digit and place a 1 in the word+digit map.
    // We'll then run a prefix sum to compute the local offsets.
    for (u32 word = local_id; word < BLOCK_SIZE; word += THREADS_PER_GROUP) {
        u32 col_index = word + group_id * BLOCK_SIZE;

        if (col_index < cols) {
            u32 val = keys[col_index + row_tid * cols];
            u32 digit = (val >> (cur_digit * RADIX_BITS)) & RADIX_MASK;

            local_digit_idx[digit][word] = 1;
        }
    }

    barrier(CLK_LOCAL_MEM_FENCE);

    // Perform prefix sums on the local offsets and place the total at index
    // zero. This effectively means the bin offset is at index (bin + 1) % RADIX.
    #pragma unroll
    for (u32 digit = 0; digit < RADIX; digit++) {
        u32 sum = local_prefix_sum(local_digit_idx[digit], LOG_THREADS_PER_GROUP + LOG_WORDS_PER_THREAD);

        local_digit_idx[digit][0] = sum;
    }

    barrier(CLK_LOCAL_MEM_FENCE);

    for (u32 i = local_id; i < BLOCK_SIZE; i += THREADS_PER_GROUP) {
        u32 col_index = i + group_id * BLOCK_SIZE;

        if (col_index < cols) {
            u32 val = keys[col_index + cols * row_tid];
            u32 digit = (val >> (cur_digit * RADIX_BITS)) & RADIX_MASK;

            u32 idx = global_digit_idx[digit] + local_digit_idx[digit][(i + 1) % BLOCK_SIZE] - 1;

            keys_out[idx + row_tid * cols] = val;
            //keys_out[col_index + row_tid * cols] = idx;
            vals_1_out[idx + row_tid * cols] = vals_1[col_index + cols * row_tid];
        }
    }
}

/// Place the input keys and values into the corresponding output key and bin
/// locations according to the input prefix sum.
///
/// # Remarks
/// This variant outputs 2 values.
kernel void radix_sort_emplace_val_2(
    global const u32* restrict keys,
    global const u32* restrict vals_1,
    global const u32* restrict vals_2,
    global const u32* restrict bin_locations,
    global u32* restrict keys_out,
    global u32* restrict vals_1_out,
    global u32* restrict vals_2_out,
    u32 cur_digit,
    u32 cols
) {
    u32 row_tid = get_global_id(1);
    u32 local_id = get_local_id(0);
    u32 group_id = get_group_id(0);
    u32 num_groups = get_num_groups(0);

    // The global offset for each digit for this block.
    local u32 global_digit_idx[RADIX];

    // The offset for each digit within the current block.
    local u32 local_digit_idx[RADIX][BLOCK_SIZE];

    // We read the same word from global memory multiple times, but these
    // should fit in L1 cache, so no need for shared memory for them.

    // Zero the local index
    #pragma unroll
    for (u32 word = local_id; word < BLOCK_SIZE; word += THREADS_PER_GROUP) {
        #pragma unroll
        for (u32 radix = 0; radix < RADIX; radix++) {
            local_digit_idx[radix][word] = 0;
        }
    }

    barrier(CLK_LOCAL_MEM_FENCE);

    // Load the global radix offsets.
    if (local_id < RADIX) {
        global_digit_idx[local_id] = bin_locations[group_id + local_id * num_groups + row_tid * RADIX * num_groups];
    }

    // Load each word, compute its digit and place a 1 in the word+digit map.
    // We'll then run a prefix sum to compute the local offsets.
    for (u32 word = local_id; word < BLOCK_SIZE; word += THREADS_PER_GROUP) {
        u32 col_index = word + group_id * BLOCK_SIZE;

        if (col_index < cols) {
            u32 val = keys[col_index + row_tid * cols];
            u32 digit = (val >> (cur_digit * RADIX_BITS)) & RADIX_MASK;

            local_digit_idx[digit][word] = 1;
        }
    }

    barrier(CLK_LOCAL_MEM_FENCE);

    // Perform prefix sums on the local offsets and place the total at index
    // zero. This effectively means the bin offset is at index (bin + 1) % RADIX.
    //#pragma unroll
    for (u32 digit = 0; digit < RADIX; digit++) {
        u32 sum = local_prefix_sum(local_digit_idx[digit], LOG_THREADS_PER_GROUP + LOG_WORDS_PER_THREAD);

        local_digit_idx[digit][0] = sum;
    }

    barrier(CLK_LOCAL_MEM_FENCE);

    for (u32 i = local_id; i < BLOCK_SIZE; i += THREADS_PER_GROUP) {
        u32 col_index = i + group_id * BLOCK_SIZE;

        if (col_index < cols) {
            u32 val = keys[col_index + cols * row_tid];
            u32 digit = (val >> (cur_digit * RADIX_BITS)) & RADIX_MASK;

            u32 idx = global_digit_idx[digit] + local_digit_idx[digit][(i + 1) % BLOCK_SIZE] - 1;

            keys_out[idx + row_tid * cols] = val;
            //keys_out[col_index + row_tid * cols] = idx;
            vals_1_out[idx + row_tid * cols] = vals_1[col_index + cols * row_tid];
            vals_2_out[idx + row_tid * cols] = vals_2[col_index + cols * row_tid];

        }
    }
}