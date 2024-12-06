use rayon::prelude::*;

/// An iterator that generates triangular pairs from a sequence.
/// For a sequence [a, b, c], it generates pairs:
/// [(a,a), (a,b), (a,c), (b,b), (b,c), (c,c)]
pub struct TriangularPairs<I: Iterator> {
    items: Vec<I::Item>,
    outer_idx: usize, // Current outer element index
    inner_idx: usize, // Current inner element index
}

impl<I> Iterator for TriangularPairs<I>
where
    I: Iterator,
    I::Item: Clone,
{
    type Item = (I::Item, I::Item);

    fn next(&mut self) -> Option<Self::Item> {
        // Check if we've exhausted all pairs
        if self.outer_idx >= self.items.len() {
            return None;
        }

        // Generate the current pair
        let result = Some((
            self.items[self.outer_idx].clone(),
            self.items[self.inner_idx].clone(),
        ));

        // Move to next pair
        self.inner_idx += 1;
        if self.inner_idx >= self.items.len() {
            self.outer_idx += 1;
            self.inner_idx = self.outer_idx;
        }

        result
    }
}

/// Extension trait that adds triangular pairs iteration capabilities to iterators.
///
/// # Examples
///
/// ```text
/// use sunscreen_tfhe::iteration::triangular_pairs::TriangularPairsExt;
///
/// let v = vec![1, 2, 3];
/// let pairs: Vec<_> = v.iter().triangular_pairs().collect();
/// assert_eq!(
///     pairs,
///     vec![(&1, &1), (&1, &2), (&1, &3), (&2, &2), (&2, &3), (&3, &3)]
/// );
/// ```
pub trait TriangularPairsExt: Iterator {
    /// Creates an iterator that yields triangular pairs from the sequence.
    fn triangular_pairs(self) -> TriangularPairs<Self>
    where
        Self: Sized,
        Self::Item: Clone,
    {
        TriangularPairs {
            items: self.collect(),
            outer_idx: 0,
            inner_idx: 0,
        }
    }
}

impl<I: Iterator> TriangularPairsExt for I {}

/// A parallel iterator that generates triangular pairs from a sequence.
/// Similar to `TriangularPairs` but processes pairs in parallel.
pub struct ParTriangularPairs<I: ParallelIterator> {
    items: Vec<I::Item>,
}

impl<I> ParallelIterator for ParTriangularPairs<I>
where
    I: ParallelIterator,
    I::Item: Clone + Send + Sync,
{
    type Item = (I::Item, I::Item);

    fn drive_unindexed<C>(self, consumer: C) -> C::Result
    where
        C: rayon::iter::plumbing::UnindexedConsumer<Self::Item>,
    {
        // Process pairs in parallel using nested parallel iterators
        self.items
            .par_iter()
            .enumerate()
            .flat_map(|(i, item)| {
                // For each item, process it with itself and all subsequent items in parallel
                self.items[i..]
                    .par_iter()
                    .map(move |inner_item| (item.clone(), inner_item.clone()))
            })
            .drive_unindexed(consumer)
    }
}

/// Extension trait that adds parallel triangular pairs iteration capabilities to parallel iterators.
///
/// # Examples
///
/// ```text
/// use rayon::prelude::*;
/// use sunscreen_tfhe::iteration::triangular_pairs::ParTriangularPairsExt;
///
/// let v = vec![1, 2, 3];
/// let pairs: Vec<_> = v.par_iter().par_triangular_pairs().collect();
/// assert_eq!(
///     pairs,
///     vec![(&1, &1), (&1, &2), (&1, &3), (&2, &2), (&2, &3), (&3, &3)]
/// );
/// ```
#[allow(unused)]
pub trait ParTriangularPairsExt: ParallelIterator {
    /// Creates a parallel iterator that yields triangular pairs from the sequence.
    fn par_triangular_pairs(self) -> ParTriangularPairs<Self>
    where
        Self: Sized,
        Self::Item: Clone + Send + Sync,
    {
        ParTriangularPairs {
            items: self.collect(),
        }
    }
}

impl<I: ParallelIterator> ParTriangularPairsExt for I {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_triangular_pairs_empty() {
        let v: Vec<i32> = vec![];
        let pairs: Vec<_> = v.iter().triangular_pairs().collect();
        assert!(pairs.is_empty());
    }

    #[test]
    fn test_triangular_pairs_single() {
        let v = [1];
        let pairs: Vec<_> = v.iter().triangular_pairs().collect();
        assert_eq!(pairs, vec![(&1, &1)]);
    }

    #[test]
    fn test_triangular_pairs_two() {
        let v = [1, 2];
        let pairs: Vec<_> = v.iter().triangular_pairs().collect();
        assert_eq!(pairs, vec![(&1, &1), (&1, &2), (&2, &2)]);
    }

    #[test]
    fn test_triangular_pairs_three() {
        let v = [1, 2, 3];
        let pairs: Vec<_> = v.iter().triangular_pairs().collect();
        assert_eq!(
            pairs,
            vec![(&1, &1), (&1, &2), (&1, &3), (&2, &2), (&2, &3), (&3, &3),]
        );
    }

    #[test]
    fn test_par_triangular_pairs_empty() {
        let v: Vec<i32> = vec![];
        let pairs: Vec<_> = v.par_iter().par_triangular_pairs().collect();
        assert!(pairs.is_empty());
    }

    #[test]
    fn test_par_triangular_pairs_single() {
        let v = vec![1];
        let pairs: Vec<_> = v.par_iter().par_triangular_pairs().collect();
        assert_eq!(pairs, vec![(&1, &1)]);
    }

    #[test]
    fn test_par_triangular_pairs_two() {
        let v = vec![1, 2];
        let pairs: Vec<_> = v.par_iter().par_triangular_pairs().collect();
        assert_eq!(pairs, vec![(&1, &1), (&1, &2), (&2, &2)]);
    }

    #[test]
    fn test_par_triangular_pairs_three() {
        let v = vec![1, 2, 3];
        let pairs: Vec<_> = v.par_iter().par_triangular_pairs().collect();

        assert_eq!(
            pairs,
            vec![(&1, &1), (&1, &2), (&1, &3), (&2, &2), (&2, &3), (&3, &3),]
        );
    }
}
