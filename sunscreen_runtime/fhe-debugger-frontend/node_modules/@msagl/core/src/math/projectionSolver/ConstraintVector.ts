import {Stack} from 'stack-typescript'

import {Constraint} from './Constraint'
import {DfDvNode} from './DfDvNode'
import {Parameters} from './Parameters'
export class ConstraintVector {
  Vector: Constraint[]

  get IsEmpty(): boolean {
    return this.Vector == null
  }

  Create(numConstraints: number) {
    this.Vector = new Array(numConstraints)
    // Initialize this to out of range.
    this.firstActiveConstraintIndex = numConstraints
  }

  private nextConstraintIndex = 0

  Add(constraint: Constraint) {
    /*Assert.assert(!constraint.IsActive, 'Constraint should not be active')*/
    constraint.SetVectorIndex(this.nextConstraintIndex)
    this.Vector[this.nextConstraintIndex++] = constraint
  }

  private firstActiveConstraintIndex: number

  ActivateConstraint(constraint: Constraint) {
    /*Assert.assert(!constraint.IsActive, 'Constraint is already active')*/
    // Swap it from the inactive region to the start of the active region of the Vector.
    /*Assert.assert(
      this.firstActiveConstraintIndex > 0,
      'All constraints are already active',
    )*/
    this.firstActiveConstraintIndex--
    /*Assert.assert(
      !this.Vector[this.firstActiveConstraintIndex].IsActive,
      'Constraint in inactive region is active',
    )*/
    this.SwapConstraint(constraint)
    // Debug_AssertConsistency();
  }

  DeactivateConstraint(constraint: Constraint) {
    /*Assert.assert(constraint.IsActive, 'Constraint is not active')*/
    // Swap it from the active region to the end of the inactive region of the Vector.
    /*Assert.assert(
      this.firstActiveConstraintIndex < this.Vector.length,
      'All constraints are already inactive',
    )*/
    /*Assert.assert(
      this.Vector[this.firstActiveConstraintIndex].IsActive,
      'Constraint in active region is not active',
    )*/
    this.SwapConstraint(constraint)
    this.firstActiveConstraintIndex++
    // Debug_AssertConsistency();
  }

  private SwapConstraint(constraint: Constraint) {
    // Swap out the constraint at the current active/inactive border index (which has been updated
    // according to the direction we're moving it).
    const swapConstraint: Constraint = this.Vector[this.firstActiveConstraintIndex]
    swapConstraint.SetVectorIndex(constraint.VectorIndex)
    this.Vector[constraint.VectorIndex] = swapConstraint
    // Toggle the state of the constraint being updated.
    this.Vector[this.firstActiveConstraintIndex] = constraint
    constraint.SetActiveState(!constraint.IsActive, this.firstActiveConstraintIndex)
  }

  Reinitialize() {
    // Qpsc requires reinitializing the block structure
    if (this.Vector == null) {
      return
    }

    for (const constraint of this.Vector) {
      constraint.Reinitialize()
    }

    this.firstActiveConstraintIndex = this.Vector.length
  }

  // Some convenient constraint-related "globals" for communication between the Solver and Blocks.
  SolverParameters: Parameters

  // The node stack for "recursive iteration" of constraint trees, and the recycled node stack
  // to reduce inner-loop alloc/GC overhead.
  DfDvStack: Stack<DfDvNode> = new Stack<DfDvNode>()

  DfDvRecycleStack: Stack<DfDvNode> = new Stack<DfDvNode>()

  RecycleDfDvNode(node: DfDvNode) {
    // In the case of long constraint chains make sure this does not end up as big as the number of constraints in the block.
    if (this.DfDvRecycleStack.length < 1024) {
      this.DfDvRecycleStack.push(node)
    }
  }

  // Initialized in Solve() and computed during Block.ComputeDfDv.
  MaxConstraintTreeDepth: number

  // This is the list of lists of unsatisfiable constraints accumulated during all Block.Expand calls.
  // As in the doc, this can only happen during Block.Expand. The only way to get a cycle is to add a constraint
  // where both variables are already connected by an active tree, so therefore they must already be in the
  // same block; therefore the cycle can't be created by MergeBlocks.  If there is a forward non-equality
  // constraint in the path, then that constraint will be deactivated and its variables moved, so there is
  // no cycle.  So the only condition for a cycle is that Expand finds no forward non-equality constraint.
  // /
  // Equality constraints (forward or backward) returned in the path between the .left and .right variables
  // of the constraint passed to Expand() do not change this; if you have an unsatisfied inequality constraint
  // between the two variables of an equality constraint, then the inequality is unsatisfiable; and by extension
  // then if it is between two variables between which there exists a path consisting solely of equality
  // constraints and backward-inequality constraints, it is unsatisfiable.
  // /
  // Negative gaps mean "left can be up to <+gap> greater than right", so again this does not affect it.
  // /
  // Therefore the only reason multi-constraint cycles would exist is if a block was expanded to accommodate
  // the constraint (incrementing the offsets to the right) despite not having found a forward minLagrangian.
  // This also means that ComputeDfDv should never encounter cycles.
  NumberOfUnsatisfiableConstraints: number

  toString(): string {
    return this.Vector.toString()
  }
}
