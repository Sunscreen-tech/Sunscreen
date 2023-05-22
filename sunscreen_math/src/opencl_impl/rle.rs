use super::{MappedBuffer, radix_sort::prefix_sum, Runtime, Grid};

/**
 * Returns the counts of consecutive elements in an array.
 * 
 * # Remarks
 * Doesn't compute which value appears for each count as an optimization.
 */
pub fn rle_counts(
    data: &MappedBuffer<u32>,
    rows: u32,
    cols: u32
) -> MappedBuffer<u32> {
    let backward_mask = compute_backward_mask(data, rows, cols);
    let scanned_backward_mask = prefix_sum(&backward_mask, rows, cols);

    todo!();   
}

fn compute_backward_mask(
    data: &MappedBuffer<u32>,
    rows: u32,
    cols: u32,
) -> MappedBuffer<u32> {
    let runtime = Runtime::get();

    let backward_mask = runtime.alloc::<u32>(rows as usize * cols as usize);

    runtime.run_kernel(
        "rle_compute_backward_mask",
        &vec![
            data.into(),
            (&backward_mask).into(),
            cols.into()
        ],
        &Grid::from([(cols as usize, 128), (rows as usize, 1), (1, 1)])
    );

    backward_mask
}

#[cfg(test)]
mod tests {
    use std::iter::repeat;

    use crate::opencl_impl::{rle::compute_backward_mask, Runtime};

    #[test]
    fn can_compute_backward_mask() {
        let cols = 3 * 4567u32;
        let rows = 3u32;

        let data = (0..(cols / 3)).map(|x| repeat(x).take(3)).flatten().collect::<Vec<_>>();
        let data = [data.clone(), data.clone(), data.clone()].concat();

        let data_gpu = Runtime::get().alloc_from_slice(&data);

        assert_eq!(data.len(), cols as usize * rows as usize);

        let mask = compute_backward_mask(&data_gpu, rows, cols);
        let mask_cpu = mask.iter().cloned().collect::<Vec<_>>();

        for row in 0..rows {
            for col in 0..cols {
                let val = mask_cpu[col as usize + row as usize * cols as usize];

                if col % 3 == 0 {
                    assert_eq!(val, 1);
                } else {
                    assert_eq!(val, 0);
                }
            }
        }
    }
}

