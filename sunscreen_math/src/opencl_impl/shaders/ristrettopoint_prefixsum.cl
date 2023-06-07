#include <inttypes.h.cl>
#include <ristrettopoint.h.cl>

/// Performs a prefix sum on local memory. The length of this buffer
/// must be a power of 2. Each thread will return the sum of all
/// the input elements.
///
/// # Remarks
/// This implementation isn't exactly efficient for computing the prefix sums of
/// the rows of a matrix in shared memory. This is potentially future work to
/// improve performance.
RistrettoPoint local_prefix_sum_ristretto(
    local RistrettoPoint* restrict data,
    u32 log_len
) {
    u32 local_id = get_local_id(0);
    u32 len = 0x1 << (log_len + 1);

    // Up sweep
    for (u32 i = 0; i <= log_len; i++) {
        u32 two_n = 0x1 << i;
        u32 two_n_plus_1 = 0x1 << (i + 1);

        u32 k = two_n_plus_1 * local_id;
        u32 idx_1 = k + two_n - 1;
        u32 idx_2 = k + two_n_plus_1 - 1;

        if (idx_2 < len) {
            RistrettoPoint a = data[idx_1];
            RistrettoPoint b = data[idx_2];

            RistrettoPoint c = RistrettoPoint_add(&a, &b);

            data[idx_2] = c;
        }

        barrier(CLK_LOCAL_MEM_FENCE);
    }
    
    barrier(CLK_LOCAL_MEM_FENCE);

    // The last element after up sweeping contains the sum of
    // all inputs. Write this to the block_totals.
    RistrettoPoint sum = data[len - 1];

    // Down sweep
    if (local_id == 0) {
        RistrettoPoint identity = RistrettoPoint_IDENTITY;
        data[len - 1] = identity;
    }
    
    barrier(CLK_LOCAL_MEM_FENCE);

    for (u32 i = log_len + 1; i > 0; i--) {
        u32 d = i - 1;
        
        u32 two_d = 0x1 << d;
        u32 two_d_plus_1 = 0x1 << (d + 1);
        u32 k = local_id * two_d_plus_1;

        u32 idx_1 = k + two_d - 1;
        u32 idx_2 = k + two_d_plus_1 - 1;

        if (idx_1 < len && idx_2 < len) {
            RistrettoPoint t = data[idx_1];
            RistrettoPoint a = data[idx_2];
            
            data[idx_1] = a;

            a = RistrettoPoint_add(&t, &a);

            data[idx_2] = a;
        }
        
        barrier(CLK_LOCAL_MEM_FENCE);
    }

    return sum;
}

#undef LOG_THREADS_PER_GROUP
#undef THREADS_PER_GROUP
#undef LOCAL_LEN
#undef LOCAL_WORDS

#define LOG_THREADS_PER_GROUP 6
#define THREADS_PER_GROUP (0x1 << LOG_THREADS_PER_GROUP)
#define LOCAL_LEN (2 * THREADS_PER_GROUP)
#define LOCAL_WORDS (LOCAL_LEN * WORDS_PER_RISTRETTO_POINT)

kernel void prefix_sum_blocks_ristretto(
    const global u32* restrict values,
    global u32* block_prefix_sums,
    global u32* block_totals,
    u32 len
) {
    u32 group_id = get_group_id(0);
    u32 local_id = get_local_id(0);
    u32 local_size = get_local_size(0);
    u32 global_id = get_global_id(0);
    u32 row_id = get_global_id(1);

    if (group_id > 0) {
        return;
    }

    // TODO: Prevent bank conflicts
    local RistrettoPoint values_local[0x1 << (LOG_THREADS_PER_GROUP + 1)];

    if (global_id < len) {
        RistrettoPoint val = RistrettoPoint_unpack(
            values,
            global_id + row_id * len * WORDS_PER_RISTRETTO_POINT,
            len
        );

        values_local[local_id] = val;
    } else {
        RistrettoPoint identity = RistrettoPoint_IDENTITY;

        values_local[local_id] = identity;
    }
    
    barrier(CLK_LOCAL_MEM_FENCE);

    RistrettoPoint sum = local_prefix_sum_ristretto(
        values_local,
        LOG_THREADS_PER_GROUP
    );

    // TIL, multiple GPU threads writing to the same memory address is 
    // a bad idea, *even when they're writing the same value*. In particular,
    // doing this on M1 GPUs results in undefined behavior.
    //
    // Thus, just put a stupid guard here.
    if (local_id == 0) {
        u32 block_totals_len = len % 128 ? len / 128 + 1 : len / 128;

        RistrettoPoint_pack(
            &sum,
            block_totals,
            group_id + row_id * get_num_groups(0),
            block_totals_len
        );
    }

    if (global_id < len) {
        RistrettoPoint val = values_local[local_id];

        RistrettoPoint_pack(
            &val,
            block_prefix_sums,
            global_id + row_id * len * WORDS_PER_RISTRETTO_POINT,
            len
        );
    }
}

kernel void offset_blocks_ristretto(
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

    RistrettoPoint val = RistrettoPoint_unpack(
        blocks,
        col + cols * row * WORDS_PER_RISTRETTO_POINT,
        cols
    );

    RistrettoPoint offset = RistrettoPoint_unpack(
        block_offsets,
        block_id + num_blocks * row * WORDS_PER_RISTRETTO_POINT,
        num_blocks
    );

    val = RistrettoPoint_add(&val, &offset);

    RistrettoPoint_pack(
        &val,
        blocks,
        col + cols * row * WORDS_PER_RISTRETTO_POINT,
        cols
    );
}
