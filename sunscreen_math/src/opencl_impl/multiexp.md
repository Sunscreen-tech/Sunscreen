What remains:
* In bucket point matrix, sort buckets in descending order rather than ascending as is done today.
* Modify prefix sum to allow specifying inclusive or exclusive.
* Perform an inclusive prefix sum on buckets (today, this is exclusive).
* Perform an inclusive prefix sum on said prefix sum. Since we're now sorting largest to smallest, this should scale each bucket point by its bucket factor and produce the window total in the final bucket.


# Example
Let P_i be the previously computed sum of all points in bucket i.

| 3  | 2  | 1  | 0  |
|----|----|----|----|
| P3 | P2 | P1 | P0 |

Computing an inclusive Prefix sum gives us

| 3  | 2       | 1            | 0                 |
|----|---------|--------------|-------------------|
| P3 | P3 + P2 | P3 + P2 + P1 | P3 + P2 + P1 + P0 |

Computing an inclusive prefix sum again gives us

| 3  | 2         | 1                    | 0                             |
|----|-----------|----------------------|-------------------------------|
| P3 | 2*P3 + P2 | 3 * P3 + 2 * P2 + P1 | 4 * P3 + 3 * P2 + 2 * P1 + P0 |

Note that the entry in bucket 1 has each point correctly scaled by it's bucket scalar!