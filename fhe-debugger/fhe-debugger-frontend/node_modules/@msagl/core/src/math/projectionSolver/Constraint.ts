import {Variable} from './Variable'
import {String} from 'typescript-string-operations'
import {compareNumbers} from '../../utils/compare'

export class Constraint {
  // The Left (if horizontal; Top, if vertical) variable of the constraint.

  Left: Variable

  // The Right (if horizontal; Bottom, if vertical) variable of the constraint.

  Right: Variable

  // The required separation of the points of the two Variables along the current axis.

  Gap: number

  // Indicates if the distance between the two variables must be equal to the gap
  // (rather than greater or equal to).

  IsEquality: boolean

  Lagrangian: number

  IsActive: boolean

  IsUnsatisfiable: boolean
  // Index in Solver.AllConstraints, to segregate active from inactive constraints.
  VectorIndex: number

  SetActiveState(activeState: boolean, newVectorIndex: number) {
    // Note: newVectorIndex may be the same as the old one if we are changing the state
    // of the last inactive or first active constraint.
    /*Assert.assert(
      this.IsActive !== activeState,
      'Constraint is already set to activationState',
    )*/
    this.IsActive = activeState
    this.VectorIndex = newVectorIndex
    if (this.IsActive) {
      this.Left.ActiveConstraintCount++
      this.Right.ActiveConstraintCount++
    } else {
      this.Left.ActiveConstraintCount--
      this.Right.ActiveConstraintCount--
    }
  }

  SetVectorIndex(vectorIndex: number) {
    // This is separate from set_VectorIndex because we can't restrict the caller to a specific
    // class and we only want ConstraintVector to be able to call this.
    this.VectorIndex = vectorIndex
  }

  Reinitialize() {
    // Called by Qpsc or equivalence-constraint-regapping initial block restructuring.
    // All variables have been moved to their own blocks again, so reset solution states.
    this.IsActive = false
    this.IsUnsatisfiable = false
    this.ClearDfDv()
  }

  // This is an  function, not a propset, because we only want it called by the Solver.
  UpdateGap(newGap: number) {
    this.Gap = newGap
  }

  // The Constraint constructor takes the two variables and their required distance.
  // The constraints will be generated either manually or by ConstraintGenerator,
  // both of which know about the sizes when the constraints are generated (as
  // well as any necessary padding), so the sizes are accounted for at that time
  // and ProjectionSolver classes are not aware of Variable sizes.
  static constructorVVNB(left: Variable, right: Variable, gap: number, isEquality: boolean): Constraint {
    const v = new Constraint(left)
    v.Left = left
    v.Right = right
    v.Gap = gap
    v.IsEquality = isEquality
    v.Lagrangian = 0
    v.IsActive = false
    return v
  }

  // For Solver.ComputeDfDv's DummyParentNode's constraint only.
  constructor(variable: Variable) {
    this.Right = variable
    this.Left = variable
  }

  // Generates a string representation of the Constraint.

  // <returns>A string representation of the Constraint.</returns>
  ToString(): string {
    return String.Format(
      '  Cst: [{0}] [{1}] {2} {3:F5} vio {4:F5} Lm {5:F5}/{6:F5} {7}actv',
      this.Left,
      this.Right,
      this.IsEquality ? '==' : '>=',
      this.Gap,
      this.Violation,
      this.Lagrangian,
      this.Lagrangian * 2,
      this.IsActive ? '+' : this.IsUnsatisfiable ? '!' : '-',
    )
  }

  get Violation(): number {
    return this.Left.ActualPos * this.Left.Scale + (this.Gap - this.Right.ActualPos * this.Right.Scale)
  }

  ClearDfDv() {
    this.Lagrangian = 0
  }

  // Compare this Constraint to rhs by their Variables in ascending order (this === lhs, other === rhs).

  // The object being compared to.
  // <returns>-1 if this.Left/Right are "less"; +1 if this.Left/Right are "greater"; 0 if this.Left/Right
  //         and rhs.Left/Right are equal.</returns>
  public CompareTo(other: Constraint): number {
    let cmp: number = this.Left.CompareTo(other.Left)
    if (0 === cmp) {
      cmp = this.Right.CompareTo(other.Right)
    }

    if (0 === cmp) {
      cmp = compareNumbers(this.Gap, other.Gap)
    }

    return cmp
  }
}
