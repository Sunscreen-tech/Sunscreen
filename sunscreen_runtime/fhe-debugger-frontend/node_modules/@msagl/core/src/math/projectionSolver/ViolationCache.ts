// The ViolationCache stores the top N maximum violations initially, allowing
// a reduction in the number of times we do a full search of all constraints.
// (It is not guaranteed to retain the max-N violations strictly after the first
// block is processed following a cache fill, but the approximation is sufficient

import {Block} from './Block'
import {Constraint} from './Constraint'

// to provide significant benefit).
export class ViolationCache {
  // Minimize blocks/variables traversed when Project() calls GetMaxViolatedConstraint by repeating the
  // search over the block just modified on the next pass and then checking for out-of-block constraints
  // that are higher.  This repeats until constraints is empty and then it's refilled and repeats.
  // There is a shutoff in Project() for this when we get to a point where it's faster to go with the
  // "enumerate all constraints" approach.
  // Note: A priority queue might be better for larger s_cMaxConstraints, but we use a small value,
  // and we need arbitrary-index removal/replacement also.  Profiling is not showing the cache to be
  // taking noticeable time at 20 items and we don't seem to gain cache hits past that.
  private constraints: Constraint[]

  // Must be >= 2 for Insert() dblNextLowVio logic; > 20 seems to yield little increase in hits.
  static MaxConstraints = 20

  // Number of constraints actually present.
  private numConstraints: number

  // The lowest violation in the cache.
  LowViolation: number
  get IsFull(): boolean {
    return this.numConstraints === ViolationCache.MaxConstraints
  }

  Clear() {
    this.LowViolation = 0
    this.numConstraints = 0
    if (!this.constraints) {
      this.constraints = new Array(ViolationCache.MaxConstraints)
    }
  }

  FilterBlock(blockToFilter: Block): boolean {
    // Note: The cache does not try to retain strict accordance with highest violation.
    // Doing so lowers the hit rate, probably because if LastModifiedBlock has enough variables,
    // then it has enough high violations to flush all other blocks out of the cache, and
    // thus the next call to FilterBlock removes all for the current block (which per the following
    // paragraph results in calling SearchAllConstraints).  As it turns out, it doesn't
    // really matter what order we process the constraints in, other than the perf benefit of
    // doing the largest violations first, so using the max violation in LastModifiedBlock in this
    // situation seems to be good enough to win the tradeoff.
    //
    // If it becomes necessary to maintain strict "cache always contains the highest violations"
    // compliance, then we would have to return false if the filtering removed all elements of
    // the cache, because then we wouldn't know if there were any non-blockToFilter-related constraints
    // with a higher violation (currently we return true in that case because it is good enough to know
    // there is a good chance that this is true).  Also, SearchViolationCache would need a verification in
    // at least VERIFY mode to verify there are no higher violations in allConstraints.
    // Iterate in reverse to remove constraints belonging to LastModifiedBlock.
    // Note:  Enumerators and .Where are not used because they are much slower.
    this.LowViolation = Number.MAX_VALUE
    const fRet: boolean = this.numConstraints > 0
    for (let ii: number = this.numConstraints - 1; ii >= 0; ii--) {
      const constraint = this.constraints[ii]
      // Also remove any constraint that may have been activated by MergeBlocks or marked unsatisfiable
      // by Block.Expand.
      if (
        constraint.Left.Block === blockToFilter ||
        constraint.Right.Block === blockToFilter ||
        constraint.IsActive ||
        constraint.IsUnsatisfiable
      ) {
        // If there are any items after this one, then they are ones we want to keep,
        // so swap in the last one in the array before decrementing the count.
        if (ii < this.numConstraints - 1) {
          this.constraints[ii] = this.constraints[this.numConstraints - 1]
        }

        this.numConstraints--
      } else {
        const violation: number =
          constraint.Left.ActualPos * constraint.Left.Scale + (constraint.Gap - constraint.Right.ActualPos * constraint.Right.Scale)
        /*Assert.assert(
          constraint.Violation === violation,
          'LeftConstraints: constraint.Violation must === violation',
        )*/
        if (violation < this.LowViolation) {
          this.LowViolation = violation
        }
      }
    }

    if (0 === this.numConstraints) {
      this.LowViolation = 0
    }

    return fRet
  }

  // Find the highest constraint with a greater violation than targetViolation.
  FindIfGreater(targetViolation: number): Constraint {
    let maxViolatedConstraint: Constraint = null
    for (let ii = 0; ii < this.numConstraints; ii++) {
      const constraint = this.constraints[ii]
      const violation: number =
        constraint.Left.ActualPos * constraint.Left.Scale + (constraint.Gap - constraint.Right.ActualPos * constraint.Right.Scale)
      /*Assert.assert(
        constraint.Violation === violation,
        'constraint.Violation must === violation',
      )*/
      if (violation > targetViolation) {
        targetViolation = violation
        maxViolatedConstraint = constraint
      }
    }

    // Remains null if none was found.
    return maxViolatedConstraint
  }

  Insert(constraintToInsert: Constraint, insertViolation: number) {
    // This should be checked by the caller (instead of here, for perf reasons).
    /*Assert.assert(
      constraintToInsert.Violation > this.LowViolation,
      'constraintToInsert.Violation must be > LowViolation',
    )*/
    /*Assert.assert(
      constraintToInsert.Violation === insertViolation,
      'constraintToInsert.Violation must === insertViolation',
    )*/
    let indexOfLowestViolation = 0
    let lowViolation: number = insertViolation
    let nextLowViolation: number = insertViolation
    for (let ii = 0; ii < this.numConstraints; ii++) {
      const constraint = this.constraints[ii]
      const cacheViolation: number =
        constraint.Left.ActualPos * constraint.Left.Scale + (constraint.Gap - constraint.Right.ActualPos * constraint.Right.Scale)
      /*Assert.assert(
        constraint.Violation === cacheViolation,
        'constraint.Violation must === cacheViolation',
      )*/
      if (cacheViolation < lowViolation) {
        // If we don't replace an existing block pair, then we'll replace the lowest
        // violation in the cache, so will need to know the next-lowest violation.
        nextLowViolation = lowViolation
        indexOfLowestViolation = ii
        lowViolation = cacheViolation
      } else if (cacheViolation < nextLowViolation) {
        nextLowViolation = cacheViolation
      }
    }

    // endfor each constraint
    // If the cache isn't full yet, add the new one, else replace the lowest violation in the list.
    if (!this.IsFull) {
      // Add to the cache.
      this.constraints[this.numConstraints++] = constraintToInsert
      if (this.IsFull) {
        this.LowViolation = lowViolation
      }
    } else {
      // Replace in the cache.
      this.constraints[indexOfLowestViolation] = constraintToInsert
      this.LowViolation = nextLowViolation
    }
  }
}
