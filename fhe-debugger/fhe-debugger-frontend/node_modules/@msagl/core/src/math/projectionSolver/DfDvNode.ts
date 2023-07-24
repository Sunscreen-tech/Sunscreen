import {String} from 'typescript-string-operations'
import {Constraint} from './Constraint'
import {Variable} from './Variable'

// variableDoneEval is NULL if we are starting an evaluation; if recursive, it's the variable
// on that side from the parent call, which was already processed.

export class DfDvNode {
  Parent: DfDvNode
  ConstraintToEval: Constraint

  VariableToEval: Variable

  VariableDoneEval: Variable

  // For Solution.MaxConstraintTreeDepth
  Depth: number

  ChildrenHaveBeenPushed: boolean

  static constructorDCVV(parent: DfDvNode, constraintToEval: Constraint, variableToEval: Variable, variableDoneEval: Variable) {
    const ret = new DfDvNode(constraintToEval)
    ret.Set(parent, constraintToEval, variableToEval, variableDoneEval)
    return ret
  }

  // For DummyParentNode only.
  constructor(dummyConstraint: Constraint) {
    this.ConstraintToEval = dummyConstraint
    this.Depth = -1
    // The first real node adds 1, so it starts at 0.
  }

  Set(parent: DfDvNode, constraintToEval: Constraint, variableToEval: Variable, variableDoneEval: Variable): DfDvNode {
    this.Parent = parent
    this.ConstraintToEval = constraintToEval
    this.VariableToEval = variableToEval
    this.VariableDoneEval = variableDoneEval
    this.Depth = 0
    this.ChildrenHaveBeenPushed = false
    constraintToEval.Lagrangian = 0
    return this
  }

  get IsLeftToRight(): boolean {
    return this.VariableToEval === this.ConstraintToEval.Right
  }

  toString(): string {
    return String.Format(
      '{0} {1}{2} - {3}{4} ({5})',
      '',
      this.IsLeftToRight ? '' : '*',
      this.ConstraintToEval.Left.Name,
      this.IsLeftToRight ? '*' : '',
      this.ConstraintToEval.Right.Name,
      this.Depth,
    )
  }
}
