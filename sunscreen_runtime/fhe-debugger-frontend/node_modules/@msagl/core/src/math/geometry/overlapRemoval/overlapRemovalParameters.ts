//  Per-instance parameters for OverlapRemoval.ConstraintGenerator.Generate()/Solve().

import {Parameters} from '../../projectionSolver/Parameters'

export class OverlapRemovalParameters {
  //  If true and the current instance's IsHorizontal property is true, then by default
  //  constraints will not be generated on the horizontal pass if a vertical constraint
  //  would result in less movement.

  AllowDeferToVertical: boolean

  //  The calculation to choose in deciding which way to resolve overlap (horizontally or vertically)
  //  between two nodes u and v.
  //  If this is false the calculation is simply HOverlap > VOverlap, otherwise we use:
  //  HOverlap / (u.Width + v.Width) > VOverlap / (u.Height + v.Height)

  ConsiderProportionalOverlap: boolean

  //  Parameters to the Solver, used in Generate as well as passed through to the Solver.

  SolverParameters: Parameters

  //  Default Constructor.

  static constructorEmpty(): OverlapRemovalParameters {
    return new OverlapRemovalParameters(new Parameters())
  }

  //  Constructor taking solver parameters.

  public constructor(solverParameters: Parameters) {
    this.SolverParameters = solverParameters
    this.AllowDeferToVertical = true
  }

  //  Constructor taking OverlapRemoval parameter and solver parameters.

  static constructorBP(allowDeferToVertical: boolean, solverParameters: Parameters): OverlapRemovalParameters {
    const p = OverlapRemovalParameters.constructorEmpty()
    p.AllowDeferToVertical = allowDeferToVertical
    p.SolverParameters = solverParameters
    return p
  }

  public Clone(): OverlapRemovalParameters {
    const newParams: OverlapRemovalParameters = this.Clone()
    newParams.SolverParameters = this.SolverParameters.Clone()
    return newParams
  }
}
