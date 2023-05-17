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
#define THREADS_PER_GROUP 128
#define WORDS_PER_THREAD 8
#define BLOCK_SIZE THREADS_PER_GROUP * WORDS_PER_THREAD

kernel void create_histograms(
    const global u32* keys,
    global u32* histograms,
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
        //histograms[radix_offset] = end - start;
    }
}