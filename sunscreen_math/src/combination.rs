/**
 * This module contains code for iterating over all combinations of t elements
 * from a set of n elements.
 */
use thiserror::Error;

/**
 * Returns the number of combinations of n choose k.
 * This is the binomial coefficient.
 * https://en.wikipedia.org/wiki/Binomial_coefficient
 *
 * # Arguments
 *
 * * `n` - The number of options to choose from.
 * * `k` - The number of options to choose.
 */
fn number_combinations(n: usize, mut k: usize) -> usize {
    // If we are choosing more options than we have, then there are no
    // combinations.
    if n < k {
        return 0;
    }

    // If we are choosing 0 options, then there is only one combination (the
    // empty set).
    if k == 0 {
        return 1;
    }

    // If we are choosing all the options, then there is only one combination.
    if k == n {
        return 1;
    }

    // The binomial coefficient is symmetric, so we can choose the smaller of
    // the two halves.
    if k > n / 2 {
        k = n - k;
    }

    let mut result = 1;
    for i in 1..=k {
        result = result * (n - k + i) / i;
    }

    result
}

/// Errors that can occur when getting the index of a combination.
#[derive(Debug, Error, PartialEq)]
pub enum CombinationGetIndexError {
    /// The combination provided has the wrong length for the given combination
    /// set.
    #[error("combination must have length {0}, but has length {1}")]
    IncorrectLength(usize, usize),

    /// The combination provided has an element that is too large for the given
    #[error("combination must have elements in the range 0..{0}, but has element {1}")]
    ValueTooLarge(usize, usize),
}

/// Errors that can occur when creating a new combination iterator.
#[derive(Debug, Error, PartialEq)]
pub enum CombinationNewError {
    /// The number of options must be greater than 0.
    #[error("N must be greater than 0")]
    ZeroOptions,

    /// The number of options must be greater than or equal to the number of
    /// options to choose.
    #[error("Combinations must N >= t, but N = {0} and t = {1}")]
    CombinationTooLarge(usize, usize),
}

/**
 * An iterator over all combinations of t elements from a set of n elements.
 */
#[derive(Clone, Debug)]
pub struct Combinations {
    n: usize,
    t: usize,

    // Current combination. We use an Option here so that a user can make a new Combinations
    // to access the non-iterator functions without using the space for the current combination.
    current: Option<Vec<usize>>,
}

impl Combinations {
    /**
     * Creates a new combination iterator.
     */
    pub fn new(n: usize, t: usize) -> Result<Self, CombinationNewError> {
        if n == 0 {
            return Err(CombinationNewError::ZeroOptions);
        }

        if t > n {
            return Err(CombinationNewError::CombinationTooLarge(n, t));
        }

        Ok(Self {
            n,
            t,
            current: None,
        })
    }

    /**
     * Returns the number of combinations in this combination set.
     */
    pub fn number_combinations(&self) -> usize {
        number_combinations(self.n, self.t)
    }

    /**
     * Returns the index of the given combination, where the combinations are
     * ordered lexicographically.
     *
     * # Arguments
     *
     * * `combination` - The combination to get the index of.
     */
    pub fn get_index(&self, combination: &[usize]) -> Result<usize, CombinationGetIndexError> {
        let k = combination.len();

        if k != self.t {
            return Err(CombinationGetIndexError::IncorrectLength(self.t, k));
        }

        let mut index = 0;
        let mut item_in_check = 0;

        let n = self.n - 1;

        // We iterate over the combination, and for each element, we count the
        // number of combinations that come before it.
        for (offset, item) in combination.iter().enumerate() {
            if *item > self.n - 1 {
                return Err(CombinationGetIndexError::ValueTooLarge(self.n - 1, *item));
            }

            let offset = offset + 1;

            while item_in_check < *item {
                index += number_combinations(n - item_in_check, k - offset);
                item_in_check += 1
            }
            item_in_check += 1
        }

        Ok(index)
    }

    /**
     * Returns the combination at the given index, where the combinations are
     * ordered lexicographically.
     *
     * # Arguments
     *
     * * `index` - The index of the combination to get.
     *
     * # Returns
     *
     * * `Some(combination)` - The combination at the given index.
     * * `None` - If the index is out of bounds.
     *
     * See
     * https://jamesmccaffrey.wordpress.com/2022/06/28/generating-the-mth-lexicographical-element-of-a-combination-using-the-combinadic/
     * for more details
     */
    pub fn at_index(&self, index: usize) -> Option<Vec<usize>> {
        if index >= number_combinations(self.n, self.t) {
            return None;
        }

        let mut result = Vec::new();
        let mut a = self.n;
        let mut b = self.t;
        let mut x = number_combinations(self.n, self.t) - 1 - index;

        for _ in 0..self.t {
            a -= 1;
            while number_combinations(a, b) > x {
                a -= 1;
            }
            result.push(self.n - 1 - a);
            x -= number_combinations(a, b);
            b -= 1;
        }

        Some(result)
    }
}

impl Iterator for Combinations {
    type Item = Vec<usize>;

    fn next(&mut self) -> Option<Self::Item> {
        // If we have not generated the first combination yet, then we generate
        // it and return.
        if self.current.is_none() {
            let current: Vec<usize> = (0..self.t).collect();

            self.current = Some(current.clone());
            return Some(current);
        }

        // Otherwise, we modify the current combination to get the next one.
        let current = self.current.as_mut().unwrap();

        // We find the first element that is not at its maximum value.
        // The maximum value depends on the position: for example, if we are
        // generating combinations of size 3 from 5 elements, then the maximums
        // are [2, 3, 4].
        let mut i = self.t;
        while i > 0 {
            i -= 1;

            // Is the ith element not at its maximum value?
            if current[i] != self.n - self.t + i {
                break;
            }
        }

        // If the first element is its highest possible value, then we have
        // generated all the combinations.
        if self.t == 0 || i == 0 && current[i] == self.n - self.t {
            return None;
        }

        // Otherwise, we increment the first element that is not at its maximum
        // value, and set all the elements after it to be one more than the
        // previous element.
        current[i] += 1;
        for j in i + 1..self.t {
            current[j] = current[j - 1] + 1;
        }

        Some(current.clone())
    }
}

/**
 * Adds the provided element to the given combination, and increments all elements
 * greater than or equal to the provided element by one. This is useful for generating
 * all the combinations of size t + 1 with the given element from combinations of size t.
 *
 * For example, we can generate all combinations containing the element 1 in lexicographic order
 * with the following code:
 *
 * ```rust
 * use sunscreen_math::combination::{Combinations, insert_element_into_reduced_combination};
 *
 * let n = 4;
 * let t = 3;
 * let chosen_element = 1;
 *
 * // Generate all combinations in n choose t containing 1
 * let mut combinations_with_chosen_element = Vec::new();
 * for combination in Combinations::new(n - 1, t - 1).unwrap() {
 *   let result = insert_element_into_reduced_combination(chosen_element, &combination);
 *   combinations_with_chosen_element.push(result);
 * }
 *
 * assert_eq!(
 *  combinations_with_chosen_element,
 *
 *  // combination missing is vec![0, 2, 3], as it does not contain 1.
 *  vec![
 *   (1, vec![0, 1, 2]),
 *   (1, vec![0, 1, 3]),
 *   (0, vec![1, 2, 3]),
 *  ]);
 * ```
 */
pub fn insert_element_into_reduced_combination(
    element_to_insert: usize,
    combination_without_element: &[usize],
) -> (usize, Vec<usize>) {
    let mut result = Vec::with_capacity(combination_without_element.len() + 1);
    let mut element_has_been_inserted = false;
    let mut index = combination_without_element.len();

    for (i, element) in combination_without_element.iter().enumerate() {
        if !element_has_been_inserted {
            // If we have not inserted the desired element yet, then we need to
            // check if we need to insert them here.
            if *element >= element_to_insert {
                element_has_been_inserted = true;
                index = i;

                result.push(element_to_insert);
                result.push(*element + 1);
            } else {
                // We have not inserted the desired element yet, so we copy over
                // the current element.
                result.push(*element);
            }
        } else {
            // We have already inserted the element, so we just need to
            // increment the rest of the elements.
            result.push(*element + 1)
        }
    }

    // If we never inserted the element, then we need to insert it at the end.
    if !element_has_been_inserted {
        result.push(element_to_insert);
    }

    (index, result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_combinations_5_choose_3() {
        let combinations = Combinations::new(5, 3).unwrap();
        let result: Vec<_> = combinations.collect();
        assert_eq!(
            result,
            vec![
                vec![0, 1, 2],
                vec![0, 1, 3],
                vec![0, 1, 4],
                vec![0, 2, 3],
                vec![0, 2, 4],
                vec![0, 3, 4],
                vec![1, 2, 3],
                vec![1, 2, 4],
                vec![1, 3, 4],
                vec![2, 3, 4],
            ]
        );
    }

    #[test]
    fn test_combinations_4_choose_2() {
        let combinations = Combinations::new(4, 2).unwrap();
        let result: Vec<_> = combinations.collect();
        assert_eq!(
            result,
            vec![
                vec![0, 1],
                vec![0, 2],
                vec![0, 3],
                vec![1, 2],
                vec![1, 3],
                vec![2, 3],
            ]
        );
    }

    #[test]
    fn test_combinations_are_lexicographically_sorted() {
        let combinations = Combinations::new(5, 3).unwrap();
        let result: Vec<_> = combinations.collect();
        let mut sorted_result = result.clone();
        sorted_result.sort();
        assert_eq!(result, sorted_result);
    }

    #[test]
    fn test_combinations_number_combinations() {
        let combinations = Combinations::new(5, 3).unwrap();
        assert_eq!(combinations.number_combinations(), 10);
    }

    #[test]
    fn test_combinations_get_index() {
        let combinations = Combinations::new(5, 3).unwrap();

        for (index, combination) in combinations.clone().enumerate() {
            assert_eq!(combinations.get_index(&combination).unwrap(), index);
        }
    }

    #[test]
    fn test_combinations_at_index() {
        let combinations = Combinations::new(5, 3).unwrap();

        for (index, combination) in combinations.clone().enumerate() {
            assert_eq!(combinations.at_index(index).unwrap(), combination);
        }
    }

    #[test]
    fn test_combinations_at_index_out_of_bounds() {
        let combinations = Combinations::new(5, 3).unwrap();
        assert_eq!(combinations.at_index(10), None);
    }

    #[test]
    fn test_combinations_get_index_incorrect_length() {
        let combinations = Combinations::new(5, 3).unwrap();
        assert_eq!(
            combinations.get_index(&[0, 1]),
            Err(CombinationGetIndexError::IncorrectLength(3, 2))
        );
    }

    #[test]
    fn test_combinations_get_index_value_too_large() {
        let combinations = Combinations::new(5, 3).unwrap();
        assert_eq!(
            combinations.get_index(&[0, 1, 5]),
            Err(CombinationGetIndexError::ValueTooLarge(4, 5))
        );
    }

    #[test]
    fn test_combinations_new_combination_too_large() {
        let combinations = Combinations::new(5, 6);
        assert_eq!(
            combinations.unwrap_err(),
            CombinationNewError::CombinationTooLarge(5, 6)
        );
    }

    #[test]
    fn test_combinations_new_zero_options() {
        let combinations = Combinations::new(0, 3);
        assert_eq!(combinations.unwrap_err(), CombinationNewError::ZeroOptions);
    }

    #[test]
    fn test_combinations_new_zero_combination_size() {
        let _combinations = Combinations::new(5, 0);
    }

    #[test]
    fn test_insert_element_into_reduced_combination() {
        assert_eq!(
            insert_element_into_reduced_combination(1, &[0, 2, 3]),
            (1, vec![0, 1, 3, 4])
        );

        assert_eq!(
            insert_element_into_reduced_combination(0, &[1, 2, 3]),
            (0, vec![0, 2, 3, 4])
        );

        assert_eq!(
            insert_element_into_reduced_combination(3, &[0, 1, 2]),
            (3, vec![0, 1, 2, 3])
        );
    }
}
