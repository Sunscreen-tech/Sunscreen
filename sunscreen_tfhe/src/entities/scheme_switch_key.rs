use num::{Complex, Zero};
use serde::{Deserialize, Serialize};

use crate::{
    dst::OverlaySize, GlweDef, GlweDimension, RadixCount, RadixDecomposition, Torus, TorusOps,
};

use super::{
    GlevCiphertextIterator, GlevCiphertextIteratorMut, GlevCiphertextRef, GlweCiphertextRef,
    SchemeSwitchKeyFftRef,
};

/// Calculates the number of entries in an upper/lower triangular square matrix,
/// including the diagonal.
pub(crate) fn triangular_number_entries(n: usize) -> usize {
    (n * (n + 1)) / 2
}

/// Returns the linear index of the upper triangular matrix at the given row and
/// column index.
pub(crate) fn get_linear_index(i: usize, j: usize, n: usize) -> usize {
    assert!(i < n && j < n, "Indices must be less than matrix dimension");

    // Ensure we're always working with the upper triangle (transpose lower
    // triangular values)
    let (row, col) = if i <= j { (i, j) } else { (j, i) };

    // https://stackoverflow.com/a/39796318
    (n * (n + 1) / 2) - (n - row) * ((n - row) + 1) / 2 + col - row
}

dst! {
    /// A scheme switch key
    SchemeSwitchKey,
    SchemeSwitchKeyRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps,)
}
dst_iter! { SchemeSwitchKeyIterator, SchemeSwitchKeyIteratorMut, ParallelSchemeSwitchKeyIterator, ParallelSchemeSwitchKeyIteratorMut, Torus, SchemeSwitchKeyRef, (TorusOps,)}

impl<S> OverlaySize for SchemeSwitchKeyRef<S>
where
    S: TorusOps,
{
    // GLWE, Radix
    type Inputs = (GlweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        // A scheme switch key is a collection of GLEVs encrypting the secret
        // key polynomials multiplied by each other.
        let number_polynomials = t.0.size.0;
        let radix_count = t.1 .0;
        let number_key_combinations = triangular_number_entries(number_polynomials);
        let glwe_encryption_size = GlweCiphertextRef::<S>::size(t.0);

        let glev_size = glwe_encryption_size * radix_count;

        glev_size * number_key_combinations
    }
}

impl<S> SchemeSwitchKey<S>
where
    S: TorusOps,
{
    /// Create a new zero scheme switch key.
    pub fn new(glwe: &GlweDef, radix: &RadixDecomposition) -> Self {
        let elems = SchemeSwitchKeyRef::<S>::size((glwe.dim, radix.count));

        Self {
            data: avec![Torus::zero(); elems],
        }
    }
}

impl<S> SchemeSwitchKeyRef<S>
where
    S: TorusOps,
{
    /// Returns an iterator over the components of the scheme switch key
    /// components, which are
    /// [`GlevCiphertext`](crate::entities::GlevCiphertext)s. Note that this
    /// order will be the order of the secret key polynomials as if they were
    /// laid out in an upper triangular matrix. For example, for a GLWE size of
    /// 2, the third GLev returned will contain the message of sk_1 * sk_1
    /// (indexed from zero) Note that this order will be the order of the secret
    /// key polynomials as if they were laid out in an upper triangular matrix.
    pub fn glev_ciphertexts(
        &self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextIterator<S> {
        GlevCiphertextIterator::new(
            &self.data,
            GlevCiphertextRef::<S>::size((params.dim, radix.count)),
        )
    }

    /// Returns a mutable iterator over the components of the scheme switch key
    /// components, which are
    /// [`GlevCiphertext`](crate::entities::GlevCiphertext)s. Note that this
    /// order will be the order of the secret key polynomials as if they were
    /// laid out in an upper triangular matrix. For example, for a GLWE size of
    /// 2, the third GLev returned will contain the message of sk_1 * sk_1
    /// (indexed from zero) Note that this order will be the order of the secret
    /// key polynomials as if they were laid out in an upper triangular matrix.
    pub fn glev_ciphertexts_mut(
        &mut self,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlevCiphertextIteratorMut<S> {
        GlevCiphertextIteratorMut::new(
            &mut self.data,
            GlevCiphertextRef::<S>::size((params.dim, radix.count)),
        )
    }

    /// Gets the GLEV ciphertext at the given tuple index (i,j) representing the
    /// entry for s_i * s_j
    ///
    /// # Arguments
    /// * `i` - First index in the upper triangular matrix
    /// * `j` - Second index in the upper triangular matrix
    /// * `params` - GLWE parameters containing dimension information
    /// * `radix` - Radix decomposition parameters
    ///
    /// # Panics
    /// Panics if either index is >= the number of polynomials in the GLWE
    /// dimension
    pub fn get_glev_at_index(
        &self,
        i: usize,
        j: usize,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> &GlevCiphertextRef<S> {
        let n = params.dim.size.0;
        let linear_idx = get_linear_index(i, j, n);

        self.glev_ciphertexts(params, radix)
            .nth(linear_idx)
            .expect("Index out of bounds")
    }

    /// Gets a mutable reference to the GLev ciphertext at the given tuple index (i,j)
    ///
    /// # Arguments
    /// * `i` - First index in the upper triangular matrix
    /// * `j` - Second index in the upper triangular matrix
    /// * `params` - GLWE parameters containing dimension information
    /// * `radix` - Radix decomposition parameters
    ///
    /// # Panics
    /// Panics if either index is >= the number of polynomials in the GLWE
    /// dimension
    pub fn get_glev_at_index_mut(
        &mut self,
        i: usize,
        j: usize,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> &GlevCiphertextRef<S> {
        let n = params.dim.size.0;
        let linear_idx = get_linear_index(i, j, n);

        self.glev_ciphertexts_mut(params, radix)
            .nth(linear_idx)
            .expect("Index out of bounds")
    }

    /// Compute the FFT of each of the GLev ciphertexts in the GGSW ciphertext.
    /// The result is stored in `result`.
    pub fn fft(
        &self,
        result: &mut SchemeSwitchKeyFftRef<Complex<f64>>,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) {
        self.assert_is_valid((params.dim, radix.count));
        result.assert_is_valid((params.dim, radix.count));

        for (s, r) in self
            .glev_ciphertexts(params, radix)
            .zip(result.glev_ciphertexts_mut(params, radix))
        {
            s.fft(r, params);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_linear_index_3x3() {
        // Test 3x3 matrix
        // [0,1,2]
        // [_,3,4]
        // [_,_,5]
        let n = 3;

        // Test upper triangle
        assert_eq!(get_linear_index(0, 0, n), 0);
        assert_eq!(get_linear_index(0, 1, n), 1);
        assert_eq!(get_linear_index(0, 2, n), 2);
        assert_eq!(get_linear_index(1, 1, n), 3);
        assert_eq!(get_linear_index(1, 2, n), 4);
        assert_eq!(get_linear_index(2, 2, n), 5);

        // Test lower triangle (should map to upper triangle)
        assert_eq!(get_linear_index(1, 0, n), 1);
        assert_eq!(get_linear_index(2, 0, n), 2);
        assert_eq!(get_linear_index(2, 1, n), 4);
    }

    #[test]
    fn test_edge_cases() {
        // Test 1x1 matrix
        assert_eq!(get_linear_index(0, 0, 1), 0);

        // Test 2x2 matrix
        let n = 2;
        assert_eq!(get_linear_index(0, 0, n), 0);
        assert_eq!(get_linear_index(0, 1, n), 1);
        assert_eq!(get_linear_index(1, 1, n), 2);
        assert_eq!(get_linear_index(1, 0, n), 1); // lower triangle
    }

    #[test]
    fn test_matrices() {
        for n in 1..=8 {
            let mut index = 0;
            // Only need to test upper triangle due to symmetry
            for i in 0..n {
                for j in i..n {
                    assert_eq!(
                        get_linear_index(i, j, n),
                        index,
                        "Failed at n={}, i={}, j={}",
                        n,
                        i,
                        j
                    );
                    index += 1;
                }
            }
            // Verify total number of entries
            assert_eq!(index, triangular_number_entries(n));
        }
    }

    #[test]
    #[should_panic]
    fn test_out_of_bounds() {
        get_linear_index(3, 2, 3); // i >= n should panic
    }

    #[test]
    #[should_panic]
    fn test_out_of_bounds_2() {
        get_linear_index(2, 3, 3); // j >= n should panic
    }
}
