import {String} from 'typescript-string-operations'
import {compareNumbers} from '../../utils/compare'
import {Block} from './Block'
import {Constraint} from './Constraint'
// MSAGL class for Variables for Projection Solver.

export class NeighborAndWeight {
  Neighbor: Variable

  Weight: number

  public constructor(neighbor: Variable, weight: number) {
    this.Neighbor = neighbor
    this.Weight = weight
  }
}

// A Variable is essentially a wrapper around a node, containing the node's initial and
// current (Actual) positions along the current axis and a collection of Constraints.

export class Variable {
  // Passed through as a convenience to the caller; it is not used by ProjectionSolver directly
  // (except in VERIFY/VERBOSE where it uses ToString()), but if the variable list returned by
  // Solver.Variables is sorted, then UserData must implement IComparable.  When Solve() is
  // complete, the caller should copy the Variable's ActualPos property into whatever property
  // the class specialization for this has.

  UserData: any

  // These properties are initialized by caller before being passed to Solver.AddVariable.

  // This holds the desired position of the node (the position we'd like it to have, initially
  // calculated before any constraint application).  This may change during the process of
  // solution; currently that only happens if there are neighbors.  Each iteration of the
  // solution keeps block reference-position calculation as close as possible to this position.

  DesiredPos: number

  // Variable has no Size member.  We use only the DesiredPos and (Scaled)ActualPos and
  // assume only a point (in a single dimension).  OverlapRemoval takes care of generating
  // constraints using size information.  It would not make sense to incorporate Size into
  // the violation calculation at the ProjectionSolver level for two reasons:
  //   - It would not take into account the potential deferral from horizontal to vertical
  //     when the vertical movement could be much less.
  //   - It would not automatically ensure that all overlap constraints were even calculated;
  //     it would only enforce constraints added by the caller, which would either use
  //     OverlapRemoval or have constraint-generation logic optimized for its own scenario.

  // The weight of the node; a variable with a higher weight than others in its block will
  // move less than it would if all weights were equal.

  Weight: number

  // The scale of the variable.  May be set by the application.  For Qpsc this is computed
  // from the Hessian diagonal and replaces any application-set value during Solve().

  Scale: number

  // The current position of the variable; s[i]y[i] in the scaling paper.  It is updated on each
  // iteration inside Solve(), then unscaled to contain the final position when Solve() completes.

  ActualPos: number

  // The derivative value - essentially the weighted difference in position.

  public get DfDv(): number {
    return (2 * (this.Weight * (this.ActualPos - this.DesiredPos))) / this.Scale
  }

  // Updated through Solve().
  OffsetInBlock: number

  Block: Block

  // For Qpsc
  Ordinal: number
  // Use an array[] for Constraints for performance.  Their membership in the Variable doesn't change after
  // Solve() initializes, so we can use the fixed-size array and gain performance (at some up-front cost due
  // to buffering in AddVariable/AddConstraint, but the tradeoff is a great improvement).  This cannot be done
  // for Variables (whose membership in a Block changes) or Blocks (whose membership in the block list changes).
  // Constraints where 'this' is constraint.Left
  LeftConstraints: Constraint[]

  // Constraints where 'this' is constraint.Right
  RightConstraints: Constraint[]

  ActiveConstraintCount = 0

  // The (x1-x2)^2 neighbor relationships: Key === NeighborVar, Value === Weight of relationship
  Neighbors: Array<NeighborAndWeight>

  constructor(ordinal: number, userData: any, desiredPos: number, weight: number, scale: number) {
    if (weight <= 0) {
      throw new Error('weight')
    }

    if (scale <= 0) {
      throw new Error('scale')
    }

    let check: number = desiredPos * weight
    if (!Number.isFinite(check) || Number.isNaN(check)) {
      throw new Error('desiredPos')
    }

    check = desiredPos * scale
    if (!Number.isFinite(check) || Number.isNaN(check)) {
      throw new Error('desiredPos')
    }

    this.Ordinal = ordinal
    this.UserData = userData
    this.DesiredPos = desiredPos
    this.Weight = weight
    this.Scale = scale
    this.OffsetInBlock = 0
    this.ActualPos = this.DesiredPos
  }

  Reinitialize(): void {
    // // Called by Qpsc or equivalence-constraint-regapping initial block restructuring.
    this.ActiveConstraintCount = 0
    this.OffsetInBlock = 0.0

    // If we are in Qpsc, this simply repeats (in the opposite direction) what
    // Qpsc.VariablesComplete did after (possibly) scaling.  If we're not in Qpsc,
    // then we've reset all the blocks because we could not incrementally re-Solve
    // due to changes to equality constraints, so this restores the initial state.
    this.ActualPos = this.DesiredPos
  }

  public AddNeighbor(neighbor: Variable, weight: number) {
    if (this.Neighbors == null) {
      this.Neighbors = new Array<NeighborAndWeight>()
    }

    this.Neighbors.push(new NeighborAndWeight(neighbor, weight))
  }

  // Gets a string representation of the Variable; calls UserData.ToString as part of this.

  // <returns>A string representation of the variable.</returns>
  public toString(): string {
    return String.Format('{0} {1:F5} ({2:F5}) {3:F5} {4:F5}', this.Name, this.ActualPos, this.DesiredPos, this.Weight, this.Scale)
  }

  // Gets the string representation of UserData.

  // <returns>A string representation of Node.Object.</returns>
  get Name(): string {
    return this.UserData == null ? '-0-' : this.UserData.toString()
  }

  public SetConstraints(leftConstraints: Constraint[], rightConstraints: Constraint[]) {
    this.LeftConstraints = leftConstraints
    this.RightConstraints = rightConstraints
  }

  // Compare the Variables by their ordinals, in ascending order (this === lhs, other === rhs).

  // The object being compared to.
  // <returns>-1 if this.Ordinal is "less"; +1 if this.Ordinal is "greater"; 0 if this.Ordinal
  //         and rhs are equal.</returns>
  public CompareTo(other: Variable): number {
    return compareNumbers(this.Ordinal, other.Ordinal)
  }
}
