#include <inttypes.h.cl>

/// Kernels for implementing a run-length encoding explained here
/// https://erkaman.github.io/posts/cuda_rle.html

/// The first step of RLE is to compute a backward mask. If the element at i != 0 
/// equals the previous element, write a 0 to the mask at index i. Otherwise, write
/// 1.
kernel void rle_compute_backward_mask(
    global const u32* restrict data,
    global u32* restrict backward_mask,
    u32 cols
) {
    u32 col_id = get_global_id(0);
    u32 row_id = get_global_id(1);

    if (col_id < cols) {
        if (col_id == 0) {
            backward_mask[col_id + row_id * cols] = 1;
        } else {
            backward_mask[col_id + row_id * cols] = data[col_id + row_id * cols] != data[col_id - 1 + row_id * cols];
        }
    }
}

kernel void rle_compact_backward_mask(
    global const u32* restrict scanned_backward_mask,
    global u32* restrict compact_backward_mask,
    global u32* restrict total_runs,
    u32 cols
) {
    u32 col_id = get_global_id(0);
    u32 row_id = get_global_id(1);

    if (col_id == cols - 1) {
        compact_backward_mask[scanned_backward_mask[col_id + cols * row_id] + cols * row_id] = col_id + 1;
        total_runs[row_id] = scanned_backward_mask[col_id + cols * row_id];
    }

    if (col_id == 0) {
        compact_backward_mask[col_id + cols * row_id] = 0;
    }
    else if (scanned_backward_mask[col_id + cols * row_id] != compact_backward_mask[col_id + cols * row_id - 1]) {
        compact_backward_mask[scanned_backward_mask[col_id + cols * row_id] - 1] = col_id;
    }
}