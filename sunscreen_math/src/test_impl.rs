#[cfg(test)]
mod test_impl {
    use curve25519_dalek::scalar::Scalar;
    use rand::thread_rng;
    use super::*;

    pub(crate) struct BinData {
        bin_ids: Vec<u32>,
        bin_counts: Vec<u32>,
        bin_start_idx: Vec<u32>,
        num_bins: Vec<u32>,
    }

    const LIMBS_PER_SCALAR: u32 = 8;

    fn get_scalar_window(
        scalar: &Scalar,
        window_bits: u32, // assumed to be between 1 and 32
        window_id: u32,
    ) -> u32 {
        let mut window: u32 = 0;
    
        const BITS_PER_LIMB: u32  = 8 * std::mem::size_of::<u32>() as u32;
    
        // index measured in bits, not bytes.
        let window_start_idx = window_bits * window_id;
    
        // A window can span at most 2 limbs.
        let limb_id_1 = window_start_idx / BITS_PER_LIMB;
        let limbs = bytemuck::cast_slice::<_, u32>(scalar.as_bytes());
        let limb_1 = limbs[limb_id_1 as usize];
    
        let lo_mask = if window_bits < 32 { (0x1 << window_bits) - 1 } else { 0xFFFFFFFF };
        window = (limb_1 >> (window_start_idx % BITS_PER_LIMB)) & lo_mask;
    
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
    
        return window;
    }

    /// A serial implementation of constructing multiexp bin data used for 
    /// testing.
    pub(crate) fn construct_bin_data(
        scalars: &[Scalar],
        num_threads: usize,
        window_bit_len: usize
    ) -> BinData {
        let max_cols = if scalars.len() % num_threads == 0 {
            scalars.len() / num_threads
        } else {
            (scalars.len() + 1) / num_threads
        };

        todo!();
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
}