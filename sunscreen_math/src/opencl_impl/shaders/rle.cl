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

/// Compacts the backward mask using an exclusive prefix sum. Takes the original data
/// as well so we can in-place compute an inclusive prefix sum for the last element.
kernel void rle_compact_backward_mask(
    global const u32* restrict mask,
    global const u32* restrict scanned_backward_mask,
    global u32* restrict compact_backward_mask,
    global u32* restrict total_runs,
    u32 cols
) {
    u32 col_id = get_global_id(0);
    u32 row_id = get_global_id(1);

    if (col_id >= cols) {
        return;
    }

    u32 cols_1 = cols + 1;
    u32 cur = col_id == cols - 1
        ? scanned_backward_mask[col_id + cols * row_id] + mask[col_id]
        : scanned_backward_mask[col_id + cols * row_id + 1];

    u32 prev = scanned_backward_mask[col_id + cols * row_id];

    if (col_id == cols - 1) {
        compact_backward_mask[cur + cols_1 * row_id] = col_id + 1;
        total_runs[row_id] = cur;
    }

    // This algorithm requires an inclusive scan, but we have an exclusive scan.
    // We can in-place create an inclusive scan by
    // 1. For elements col_id < cols - 1, read element cols_id + 1 from the scan.
    // 2. For element col_id, read the last element from the scan and add it to
    // the last element of the data from which the scan was created.
    if (col_id == 0) {
        compact_backward_mask[0 + cols_1 * row_id] = 0;
    } else if (cur != prev) {
        compact_backward_mask[cur + row_id * cols_1 - 1] = col_id;
    }
}

/// Computes the RLE counts.
kernel void rle_compute_runs(
    global const u32* restrict vals_in,
    global const u32* restrict compact_backward_mask,
    global const u32* restrict total_runs,
    global u32* counts_out,
    global u32* vals_out,
    u32 cols
) {
    u32 col_id = get_global_id(0);
    u32 row_id = get_global_id(1);
    u32 cols_1 = cols + 1;

    if (col_id < total_runs[row_id]) {
        u32 a = compact_backward_mask[col_id + row_id * cols_1];
        u32 b = compact_backward_mask[col_id + 1 + row_id * cols_1];

        vals_out[col_id + row_id * cols] = vals_in[a];
        counts_out[col_id + row_id * cols] = b - a;
    }
}