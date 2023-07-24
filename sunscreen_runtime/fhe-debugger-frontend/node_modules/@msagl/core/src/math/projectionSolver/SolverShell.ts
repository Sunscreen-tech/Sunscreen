// just a convenient interface to the real solver

import {RealNumberSpan} from '../../utils/RealNumberSpan'
import {Solution} from './Solution'
import {Solver} from './Solver'
import {Variable} from './Variable'
import {Parameters} from './Parameters'
export class SolverShell {
  /* const */ static FixedVarWeight = 1000000000

  variables: Map<number, Variable> = new Map<number, Variable>()

  solver: Solver

  solution: Solution

  fixedVars: Map<number, number> = new Map<number, number>()

  // Constructor.

  public constructor() {
    this.InitSolver()
  }

  // Add a node that we would like as close to position i as possible, with the requested weight.

  // Caller's unique identifier for this node
  // Desired position
  // The weight of the corresponding term in the goal function
  public AddVariableWithIdealPositionNNN(id: number, position: number, weight: number) {
    // This throws an ArgumentException if a variable with id is already there.
    this.variables.set(id, this.solver.AddVariableANN(id, position, weight))
  }

  // Add a node that we would like as close to position i as possible, with the requested weight.

  public AddVariableWithIdealPositionNN(id: number, position: number) {
    this.AddVariableWithIdealPositionNNN(id, position, 1)
  }

  // Add a constraint that leftNode+gap eq|leq RightNode.

  // Caller's unique identifier for the left node
  // Caller's unique identifier for the right node
  // Required gap
  // Gap is exact rather than minimum
  public AddLeftRightSeparationConstraintNNNB(idLeft: number, idRight: number, gap: number, isEquality: boolean) {
    // The variables must already have been added by AddNodeWithDesiredPosition.
    const varLeft = this.GetVariable(idLeft)
    if (varLeft == null) {
      return
    }

    const varRight = this.GetVariable(idRight)
    if (varRight == null) {
      return
    }

    this.solver.AddConstraintVVNB(varLeft, varRight, gap, isEquality)
  }

  // Add a constraint that leftNode+gap leq RightNode.

  // Caller's unique identifier for the left node
  // Caller's unique identifier for the right node
  // Required minimal gap
  public AddLeftRightSeparationConstraintNNN(idLeft: number, idRight: number, gap: number) {
    this.AddLeftRightSeparationConstraintNNNB(idLeft, idRight, gap, false)
  }

  // Add a goal that minimizes the distance between two nodes, i.e. weight*((id1-id2)^2).

  // Caller's unique identifier for the first node.
  // Caller's unique identifier for the second node.
  // The weight of the corresponding term in the goal function
  public AddGoalTwoVariablesAreCloseNNN(id1: number, id2: number, weight: number) {
    const var1 = this.GetVariable(id1)
    if (var1 == null) {
      return
    }

    const var2 = this.GetVariable(id2)
    if (var2 == null) {
      return
    }

    this.solver.AddNeighborPair(var1, var2, weight)
  }

  //

  public AddGoalTwoVariablesAreClose(id1: number, id2: number) {
    this.AddGoalTwoVariablesAreCloseNNN(id1, id2, 1)
  }

  GetVariable(i: number): Variable {
    return this.variables.get(i)
  }

  // Execute the solver, filling in the Solution object and the values to be returned by GetVariableResolvedPosition.

  public Solve() {
    this.SolveP(null)
  }

  // Execute the solver, filling in the Solution object and the values to be returned by GetVariableResolvedPosition.

  // Parameter object class specific to the underlying solver
  // <returns>Pass or fail</returns>
  public SolveP(parameters: any) {
    const t = {executionLimitExceeded: false}
    this.SolvePNS(parameters, t)
  }

  // Execute the solver, filling in the Solution object and the values to be returned by GetVariableResolvedPosition.

  // Parameter object class specific to the underlying solver

  //         or timeout were exceeded</param>
  // <returns>Pass or fail</returns>
  public SolvePNS(parameters: any, t: {executionLimitExceeded: boolean}): boolean {
    let fixedVarsMoved: boolean
    do {
      this.solution = null
      // Remove any stale solution in case parameters validation or Solve() throws.
      let solverParameters: Parameters = null
      if (null != parameters) {
        solverParameters = <Parameters>parameters
        if (solverParameters == null) {
          throw new Error('parameters')
        }
      }

      this.solution = this.solver.SolvePar(solverParameters)
      t.executionLimitExceeded = this.solution.ExecutionLimitExceeded
      fixedVarsMoved = this.AdjustConstraintsForMovedFixedVars()
    } while (fixedVarsMoved && this.solution.ExecutionLimitExceeded === false)

    return this.solution.ExecutionLimitExceeded === false
  }

  //        void DumpToFile(string fileName) {
  //            var file = new StreamWriter(fileName);
  //            file.WriteLine("digraph {");
  //            foreach (var v in solver.Variables) {
  //                var s = v.Weight > 100 ? "color=\"red\"" : "";
  //                file.WriteLine(v.UserData + " [ label=" + "\"" + v.UserData +"\\n" +
  //                               v.DesiredPos + "\" " +s+ "]");
  //
  //            }
  //
  //            foreach (var cs in solver.Constraints) {
  //                file.WriteLine(cs.Left.UserData + " -> " + cs.Right.UserData + " [ label=\"" + cs.Gap + "\"]");
  //            }
  //            file.WriteLine("}");
  //            file.Close();
  //        }
  AdjustConstraintsForMovedFixedVars(): boolean {
    const movedFixedVars = new Set<number>()

    for (const [k, v] of this.fixedVars.entries()) {
      if (SolverShell.Close(v, this.GetVariableResolvedPosition(k))) continue
      movedFixedVars.add(k)
    }
    if (movedFixedVars.size === 0) {
      return false
    }

    return this.AdjustConstraintsForMovedFixedVarSet(movedFixedVars)
  }

  static Close(a: number, b: number): boolean {
    return Math.abs(a - b) < 0.0005
    // so if a fixed variable moved less than 0.0001 we do not care!
  }

  AdjustConstraintsForMovedFixedVarSet(movedFixedVars: Set<number>): boolean {
    while (movedFixedVars.size > 0) {
      let fixedVar: number
      for (const t of movedFixedVars) {
        fixedVar = t
        break
      }

      if (!this.AdjustSubtreeOfFixedVar(fixedVar, movedFixedVars)) {
        return false
      }
    }

    return true
  }

  AdjustSubtreeOfFixedVar(fixedVar: number, movedFixedVars: Set<number>): boolean {
    const t = {successInAdjusting: false}
    const neighbors = this.AdjustConstraintsOfNeighborsOfFixedVariable(fixedVar, t)
    if (!t.successInAdjusting) {
      return false
    }

    if (neighbors.length === 0) {
      return false
    }

    for (const i of neighbors) {
      movedFixedVars.delete(i)
    }

    return true
  }

  // returns the block of the fixed variable

  AdjustConstraintsOfNeighborsOfFixedVariable(fixedVar: number, t: {successInAdjusting: boolean}): Array<number> {
    const nbs = this.variables.get(fixedVar).Block.Variables
    const currentSpan = new RealNumberSpan()
    const idealSpan = new RealNumberSpan()
    let scale = 1
    for (const u of nbs) {
      if (!this.fixedVars.has(<number>u.UserData)) {
        continue
      }

      currentSpan.AddValue(u.ActualPos)
      idealSpan.AddValue(u.DesiredPos)
      if (idealSpan.length > 0) {
        scale = Math.max(scale, currentSpan.length / idealSpan.length)
      }
    }

    if (scale === 1) {
      scale = 2
    }

    // just relax the constraints
    t.successInAdjusting = this.FixActiveConstraints(nbs, scale)
    return nbs.map((u) => <number>u.UserData)
  }

  // if all active constraint gaps are less than this epsilon we should stop trying adjusting

  readonly FailToAdjustEpsilon = 0.001

  FixActiveConstraints(neighbs: Array<Variable>, scale: number): boolean {
    let ret = false
    for (const v of neighbs) {
      for (const c of v.LeftConstraints) {
        if (c.IsActive) {
          if (c.Gap > this.FailToAdjustEpsilon) ret = true
          this.solver.SetConstraintUpdate(c, c.Gap / scale)
        }
      }
    }

    return ret
  }

  // Obtain the solved position for a node.

  // Caller's unique identifier for the node.
  // <returns>The node's solved position.</returns>
  public GetVariableResolvedPosition(id: number): number {
    const v = this.GetVariable(id)
    return v == null ? 0 : v.ActualPos
  }

  //

  public InitSolver() {
    this.solver = new Solver()
    this.variables.clear()
  }

  // Add a variable with a known and unchanging position.

  // Caller's unique identifier for the node
  // Desired position.
  public AddFixedVariable(id: number, position: number) {
    this.AddVariableWithIdealPositionNNN(id, position, SolverShell.FixedVarWeight)
    this.fixedVars.set(id, position)
  }

  //

  public ContainsVariable(v: number): boolean {
    return this.variables.has(v)
  }

  // returns the ideal position of the node that had been set at the variable construction

  public GetVariableIdealPosition(v: number): number {
    return this.variables.get(v).DesiredPos
  }

  // Returns the solution object class specific to the underlying solver, or null if there has
  // been no call to Solve() or it threw an exception.

  public get Solution(): Solution {
    return this.solution
  }
}
