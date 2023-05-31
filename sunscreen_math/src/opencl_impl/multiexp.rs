use curve25519_dalek::{scalar::Scalar, ristretto::RistrettoPoint};

use crate::{RistrettoPointVec, GpuScalarVec, GpuRistrettoPointVec, GpuVec, opencl_impl::{Runtime, radix_sort::radix_sort_2_vals, Grid}};

pub fn multiscalar_multiplication(points: &GpuRistrettoPointVec, scalars: &GpuScalarVec) -> RistrettoPoint {
    assert_eq!(points.len(), scalars.len());

    let runtime = Runtime::get();

    const NUM_THREADS: usize = 16384;

    // We require that NUM_THREADS be a multiple of any sane thread group size (i.e. 512).
    assert!(NUM_THREADS.is_power_of_two());
    assert!(NUM_THREADS > 512);

    let max_cols = if points.len() % NUM_THREADS == 0 {
        points.len() / NUM_THREADS
    } else {
        (points.len() + 1) / NUM_THREADS
    };

    let scalar_bit_len = 8 * std::mem::size_of::<Scalar>();
    
    // In Pippenger's algorithm, we break N-bit scalar values into w windows of
    // b-bit values. For example, for 256-bit scalars and a 16-bit window size,
    // we get 16 windows. For a given window, we bucket the scalars with the same
    // value, then sum each point associated with the scalar for the given bucket
    // to produce 2^b points. We then sum these bucket points (scaled by the 
    // bucket value) to produce a point for the given window. Finally, for each
    // window id w, we sum the window points scaled by `2^(w * b)`.
    let window_bit_len = 16usize;
    let num_windows = if scalar_bit_len % window_bit_len == 0 {
        scalar_bit_len / window_bit_len
    } else {
        scalar_bit_len / window_bit_len + 1
    };

    // Fill out COO format sparse matrices
    // (https://en.wikipedia.org/wiki/Sparse_matrix#Coordinate_list_(COO))
    // for each window on the scalar. These sparse matrices are degenerate in that
    // * It may contain some zero values.
    // * There may be multiple values associated with the same row and column.
    // The data, row_index, and col_index are each stored as 
    // `(NUM_THREADS * max_cols) x num_windows` matrices. However, the number
    // of non-zero entries in each matrix is bounded by scalars.len().
    // For a given window, the rows correspond to GPU threads, the columns 
    // correspond to window values, and the values in the matrix are indices into 
    // the EC point (and scalar) arrays.
    let coo_data = runtime.alloc::<u32>(scalars.len() * num_windows);
    let coo_row_index = runtime.alloc::<u32>(scalars.len() * num_windows);
    let coo_col_index = runtime.alloc::<u32>(scalars.len() * num_windows);

    // The first grid dimension corresponds to the number of threads `t`
    // among which we wish to split work for parallelism. The second grid
    // grid dimension corresponds to the window w. Each of these threads 
    // will bucket N / t items for the window w by pushing items into the COO
    // sparse matrix for w. The row of this matrix corresponds to the thread id
    // and the column corresponds to the bucket value.
    //
    // We handle edge cases in the following manner:
    // * If a thread encounters a zero value for the given window, we push
    //   a zero entry into the sparse matrix.
    // * If a thread encounters more than one scalar for a given bucket, we
    //   simply insert multiple scalar indices for the same row and column pair.
    //   While this creates a degenerate matrix, it doesn't break anything in
    //   the overall algorithm as we aren't doing actual linear algebra.
    // * If t doesn't divide N, the last thread simply terminates early.
    runtime.run_kernel(
        "kernel_fill_coo_matrix", 
        &vec![
            (&scalars.data).into(),
            (&coo_data).into(),
            (&coo_row_index).into(),
            (&coo_col_index).into(),
            (window_bit_len as u32).into(),
            (scalars.len() as u32).into()
        ],
        &Grid::from([(NUM_THREADS, 256), (num_windows, 1), (1, 1)])
    );

    // We transpose the matrix by just swapping references to `coo_col_index`
    // and `coo_row_index`.
    //
    // After doing this non-step, we sort the transposed matrix by its rows
    // (i.e. we sort by `coo_col_index` from the original matrix). There are
    // `num_windows` coo matrices stored as a `num_windows x scalars.len()`
    // row-major dense matrix spread over coo_{col_index, row_index, data}.
    // That is, the w'th row of these variables corresponds to the w'th window.
    //
    // Our radix-sort implementation sorts rows of a dense matrix, so a single
    // call to this function will sort every window concurrently.
    let (coo_col_index, coo_row_index, coo_data) = radix_sort_2_vals(
        &coo_col_index, 
        &coo_row_index,
        &coo_data,
        window_bit_len as u32,
        num_windows as u32,
        scalars.len() as u32
    );

     todo!();
}