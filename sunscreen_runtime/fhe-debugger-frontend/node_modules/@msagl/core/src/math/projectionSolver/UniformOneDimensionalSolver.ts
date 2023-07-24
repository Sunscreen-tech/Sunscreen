import {CycleRemoval} from '../../layout/layered/CycleRemoval'
import {BasicGraphOnEdges, mkGraphOnEdgesN} from '../../structs/basicGraphOnEdges'

import {IntPair} from '../../utils/IntPair'
import {SolverShell} from './SolverShell'
import {UniformSolverVar} from './UniformSolverVar'

export class UniformOneDimensionalSolver {
  idealPositions: Map<number, number> = new Map<number, number>()

  varSepartion: number

  // desired variable separation

  public constructor(variableSeparation: number) {
    this.varSepartion = variableSeparation
  }

  varList = new Array<UniformSolverVar>()

  constraints: Set<IntPair> = new Set<IntPair>()

  graph: BasicGraphOnEdges<IntPair>

  //        delegate Array<NudgerConstraint> Edges(int i);
  //
  //        delegate int End(NudgerConstraint constraint);
  //        Edges outEdgesDel;
  //        Edges inEdgesDel;
  //        End sourceDelegate;
  //        End targetDelegate;
  //        Supremum minDel;
  //        Supremum maxDel;
  SetLowBound(bound: number, id: number) {
    const v = this.Var(id)
    v.LowBound = Math.max(bound, v.LowBound)
  }

  Var(id: number): UniformSolverVar {
    return this.varList[id]
  }

  SetUpperBound(id: number, bound: number) {
    const v = this.Var(id)
    v.UpperBound = Math.min(bound, v.UpperBound)
  }

  private /*  */ Solve() {
    this.SolveByRegularSolver()
  }

  solverShell: SolverShell = new SolverShell()

  SolveByRegularSolver() {
    this.CreateVariablesForBounds()
    for (let i = 0; i < this.varList.length; i++) {
      const v = this.varList[i]
      if (v.IsFixed) {
        this.solverShell.AddFixedVariable(i, v.Position)
      } else {
        this.solverShell.AddVariableWithIdealPositionNN(i, this.idealPositions.get(i))
        if (v.LowBound !== Number.NEGATIVE_INFINITY) {
          this.constraints.add(new IntPair(this.GetBoundId(v.LowBound), i))
        }

        if (v.UpperBound !== Number.POSITIVE_INFINITY) {
          this.constraints.add(new IntPair(i, this.GetBoundId(v.UpperBound)))
        }
      }
    }

    this.CreateGraphAndRemoveCycles()
    for (const edge of this.graph.edges) {
      let w = 0
      if (edge.x < this.varList.length) {
        w += this.varList[edge.x].Width
      }

      if (edge.y < this.varList.length) {
        w += this.varList[edge.y].Width
      }
      w /= 2
      this.solverShell.AddLeftRightSeparationConstraintNNN(edge.x, edge.y, this.varSepartion + w)
    }

    this.solverShell.Solve()
    for (let i = 0; i < this.varList.length; i++) {
      this.varList[i].Position = this.solverShell.GetVariableResolvedPosition(i)
    }
  }

  GetBoundId(bound: number): number {
    return this.boundsToInt.get(bound)
  }

  CreateVariablesForBounds() {
    for (const v of this.varList) {
      if (v.IsFixed) {
        continue
      }

      if (v.LowBound !== Number.NEGATIVE_INFINITY) {
        this.RegisterBoundVar(v.LowBound)
      }

      if (v.UpperBound !== Number.POSITIVE_INFINITY) {
        this.RegisterBoundVar(v.UpperBound)
      }
    }
  }

  boundsToInt: Map<number, number> = new Map<number, number>()

  RegisterBoundVar(bound: number) {
    if (!this.boundsToInt.has(bound)) {
      const varIndex: number = this.varList.length + this.boundsToInt.size
      this.boundsToInt.set(bound, varIndex)
      this.solverShell.AddFixedVariable(varIndex, bound)
    }
  }

  CreateGraphAndRemoveCycles() {
    // edges in the graph go from a smaller value to a bigger value
    this.graph = mkGraphOnEdgesN(Array.from(this.constraints), this.varList.length + this.boundsToInt.size)
    // removing cycles
    const feedbackSet = CycleRemoval.getFeedbackSet(this.graph)
    if (feedbackSet != null) {
      for (const edge of feedbackSet) {
        this.graph.removeEdge(<IntPair>edge)
      }
    }
  }

  GetVariablePosition(id: number): number {
    return this.varList[id].Position
  }

  AddConstraint(i: number, j: number) {
    this.constraints.add(new IntPair(i, j))
  }

  AddVariableNNNN(id: number, currentPosition: number, idealPosition: number, width: number) {
    this.idealPositions.set(id, idealPosition)
    this.AddVariableNNBN(id, currentPosition, false, width)
  }

  AddFixedVariable(id: number, position: number) {
    this.AddVariableNNBN(id, position, true, 0)
    // 0 for width
  }

  AddVariableNNBN(id: number, position: number, isFixed: boolean, width: number) {
    /*Assert.assert(id === this.varList.length)*/
    //new UniformSolverVar { IsFixed = isFixed, Position = position, Width=width
    const v = new UniformSolverVar()
    v.Position = position
    v.IsFixed = isFixed
    v.Width = width
    this.varList.push(v)
  }
}
