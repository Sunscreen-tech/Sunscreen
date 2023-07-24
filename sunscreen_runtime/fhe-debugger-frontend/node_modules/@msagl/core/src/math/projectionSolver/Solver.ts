// A Solver is the driving class that collects Variables and Constraints and then generates a
// solution that minimally satisfies the constraints.

import {greaterDistEps} from '../../utils/compare'
import {flattenArray} from '../../utils/setOperations'
import {Block} from './Block'
import {BlockVector} from './BlockVector'
import {Constraint} from './Constraint'
import {ConstraintVector} from './ConstraintVector'
import {Parameters} from './Parameters'
import {Qpsc} from './QPSC'
import {Solution} from './Solution'
import {SolverAlgorithm} from './SolverAlgorithm'
import {Variable} from './Variable'
import {ViolationCache} from './ViolationCache'

class ConstraintListForVariable {
  // All constraints.
  Constraints: Array<Constraint>

  // The number of Constraints that are LeftConstraints for the variable keying this object.
  NumberOfLeftConstraints = 0

  constructor(constraints: Array<Constraint>, numberOfLeftConstraints: number) {
    this.Constraints = constraints
    this.NumberOfLeftConstraints = numberOfLeftConstraints
  }
}

export class Solver {
  // Notes about hierarchy:
  //  1.  Each Variable is initially assigned to its own block, and subsequently MergeBlocks()
  //      and SplitBlocks() may change its block membership, but the variable is always in one
  //      and only one block, so we enumerate variables by enumerating blocks and variables.
  //  2.  The list of (active and inactive) constraints is within each block's variable list;
  //      we simply enumerate each block's LeftConstraints.
  private allBlocks: BlockVector = new BlockVector()

  // To speed up SearchAllConstraints, have a single Array in addition to the per-block
  // variable Lists (Array indexing is faster than Array).
  private allConstraints: ConstraintVector = new ConstraintVector()

  private numberOfConstraints = 0

  // Updated on AddConstraint; used to create AllConstraints
  private numberOfVariables = 0

  // Also for speed, a separate list of Equality constraints (which we expect to be fairly rare).
  private equalityConstraints: Array<Constraint> = new Array<Constraint>()

  // Also for speed, store variables -> constraint list while we load, then convert this into
  // arrays when we call Solve().  The members are Array of constraints, and number of Left constraints.
  private loadedVariablesAndConstraintLists: Map<Variable, ConstraintListForVariable> = new Map<Variable, ConstraintListForVariable>()

  // We bundle up the constraints first, so we can use Array rather than Array iteration for speed.
  // To make the code cleaner (not having to check for NULL all over the place) use an empty Array/Array
  // for Variables' constraint Lists/Arrays, and to help memory efficiency, use a single object.
  private emptyConstraintList: Constraint[] = new Array(0)

  // For long-lived Variable objects
  // For UpdateConstraint(), we want to buffer up the changes so variable values are not changed
  // by doing an immediate Block.Split which updates the Block's ReferencePos.
  private updatedConstraints: Array<[Constraint, number]> = new Array<[Constraint, number]>()

  // For caching violations to improve GetMaxViolatedConstraint performance.
  private violationCache: ViolationCache = new ViolationCache()

  private lastModifiedBlock: Block

  private violationCacheMinBlockCutoff = 0

  private hasNeighbourPairs: boolean

  private nextVariableOrdinal = 0

  // May be overridden by the caller's Parameters object passed to Solve.
  private solverParams: Parameters = new Parameters()

  // Solution results - will be cloned to return to caller.
  private solverSolution: Solution = new Solution()

  private get IsQpsc(): boolean {
    return this.hasNeighbourPairs || this.solverParams.Advanced.ForceQpsc
  }

  // Add a Variable (for example, wrapping a node on one axis of the graph) to the Solver.

  // a tag or other user data - can be null
  // The position of the variable, such as the coordinate of a node along one axis.
  // <returns>The created variable</returns>
  public AddVariableAN(userData: any, desiredPos: number): Variable {
    return this.AddVariableANNN(userData, desiredPos, 1, 1)
  }

  // Add a Variable (for example, wrapping a node on one axis of the graph) to the Solver.

  // a tag or other user data - can be null
  // The position of the variable, such as the coordinate of a node along one axis.
  // The weight of the variable (makes it less likely to move if the weight is high).

  public AddVariableANN(userData: any, desiredPos: number, weight: number): Variable {
    return this.AddVariableANNN(userData, desiredPos, weight, 1)
  }

  // Add a Variable (for example, wrapping a node on one axis of the graph) to the Solver.

  // a tag or other user data - can be null
  // The position of the variable, such as the coordinate of a node along one axis.
  // The weight of the variable (makes it less likely to move if the weight is high).
  // The scale of the variable, for improving convergence.
  // <returns>The created variable</returns>
  public AddVariableANNN(userData: any, desiredPos: number, weight: number, scale: number): Variable {
    // @@DCR "Incremental Solving": For now we disallow this; if we support it, we'll need to
    // retain loadedVariablesAndConstraintLists, store up the added Variables (TryGetValue and if that fails add
    // the existing variable, then iterate through variables with new Constraints and replace the arrays.
    // Also remember to check for emptyConstraintList - don't add to it.
    if (!this.allConstraints.IsEmpty) {
      throw new Error('Cannot add Variables or Constraints once Solve() has been called')
    }

    const varNew = new Variable(this.nextVariableOrdinal++, userData, desiredPos, weight, scale)
    const block = new Block(varNew, this.allConstraints)
    varNew.Block = block
    this.allBlocks.Add(block)
    this.numberOfVariables++
    // Initialize the variable in the dictionary with a null list and zero left constraints.
    this.loadedVariablesAndConstraintLists.set(varNew, new ConstraintListForVariable(new Array<Constraint>(), 0))
    return varNew
  }

  // end AddVariable()

  // Must be called before Solve() if the caller has updated variable Initial positions; this
  // reconciles internals such as Block.ReferencePos.

  public UpdateVariables() {
    // Although the name is "UpdateVariables", that's just for the caller to not need to know
    // about the internals; this really is updating the blocks after the variables have already
    // been updated one at a time. (This doesn't need to be called if constraints are re-gapped
    // while variable positions are unchanged; Solve() checks for that).
    for (const block of this.allBlocks.Vector) {
      block.UpdateReferencePos()
    }
  }

  // end UpdateVariables()

  // This enumerates all Variables created by AddVariable.

  public get Variables(): Array<Variable> {
    return flattenArray(this.allBlocks.Vector, (block) => block.Variables)
  }

  // The number of variables added to the Solver.

  public get VariableCount(): number {
    return this.numberOfVariables
  }

  // This enumerates all Constraints created by AddConstraint (which in turn may have
  // been called from OverlapRemoval.ConstraintGenerator.Generate()).

  *Constraints(): IterableIterator<Constraint> {
    if (!this.allConstraints.IsEmpty) {
      // Solve() has been called.
      for (const constraint of this.allConstraints.Vector) {
        yield constraint
      }
    } else {
      // Solve() has not yet been called.
      for (const variable of this.loadedVariablesAndConstraintLists.keys()) {
        const constraintsForVar: ConstraintListForVariable = this.loadedVariablesAndConstraintLists.get(variable)
        if (null != constraintsForVar.Constraints) {
          // Return all variables in the LeftConstraints list for each variable.
          const numConstraints: number = constraintsForVar.Constraints.length
          // Cache for perf
          for (let ii = 0; ii < numConstraints; ii++) {
            const constraint: Constraint = constraintsForVar.Constraints[ii]
            if (variable === constraint.Left) {
              yield
              return constraint
            }
          }
        }
      }
    }

    // endifelse (!AllConstraints.Empty)
  }

  // end Constraints property

  // The number of constraints added to the Solver.

  public get ConstraintCount(): number {
    return this.numberOfConstraints
  }

  // Add a constraint 'left + gap' is equal to right

  public AddEqualityConstraint(left: Variable, right: Variable, gap: number): Constraint {
    return this.AddConstraintVVNB(left, right, gap, true)
  }

  // Add a constraint 'left + gap' is less than or equal to 'right'

  // The gap required between the variables.

  // <returns>The new constraint.</returns>
  public AddConstraintVVNB(left: Variable, right: Variable, gap: number, isEquality: boolean): Constraint {
    // @@DCR "Incremental Solving": See notes in AddVariable; for now, this is disallowed.
    if (!this.allConstraints.IsEmpty) {
      throw new Error('Cannot add Variables or Constraints once Solve() has been called')
    }

    if (left === right) {
      throw new Error('Cannot add a constraint between a variable and itself')
    }

    // Get the dictionary entries so we can store these until Solve() is called.  kvp.Key === lstConstraints,
    // kvp.Value === number of constraints in lstConstraints that are LeftConstraints for the variable.
    // kvpConstraintsForVar(Left|Right) are bidirectional for that variable, but we're operating only on
    // varLeft's LeftConstraints and varRight's RightConstraints; this is slightly more complicated logic
    // than just having two Lists, but for large numbers of variables, having all constraints in a single
    // list is more memory-efficient.
    const constraintsForLeftVar: ConstraintListForVariable = this.loadedVariablesAndConstraintLists.get(left)
    const constraintsForRightVar: ConstraintListForVariable = this.loadedVariablesAndConstraintLists.get(right)
    // Now create the new constraint and update the structures.  For varLeft, we must also update the
    // left-variable count and that requires another lookup to update the structure in the Map
    // since it's a value type so a copy was returned by-value from Map lookup.
    const constraint = Constraint.constructorVVNB(left, right, gap, isEquality)
    // Structure update requires replacing the full structure.
    this.loadedVariablesAndConstraintLists.set(
      left,
      new ConstraintListForVariable(constraintsForLeftVar.Constraints, constraintsForLeftVar.NumberOfLeftConstraints + 1),
    )
    constraintsForLeftVar.Constraints.push(constraint)
    constraintsForRightVar.Constraints.push(constraint)
    this.numberOfConstraints++
    if (isEquality) {
      this.equalityConstraints.push(constraint)
    }

    return constraint
  }

  // Add a constraint 'left + gap' is less than or equal to 'right'

  // The gap required between the variables.
  // <returns>The new constraint.</returns>
  public AddConstraint(left: Variable, right: Variable, gap: number): Constraint {
    return this.AddConstraintVVNB(left, right, gap, false)
  }

  // Register an update to a constraint's gap; this defers the actual update until Solve() is called.

  // The constraint to update
  // The new gap
  public SetConstraintUpdate(constraint: Constraint, gap: number) {
    // Defer this to the Solve() call, so the variables' positions are not altered by doing a
    // Block.Split here (which updates Block.ReferencePos, upon which Variable.(Scaled)ActualPos relies).
    if (gap !== constraint.Gap) {
      this.updatedConstraints.push([constraint, gap])
    }
  }

  // Add a pair of connected variables for goal functions of the form (x1-x2)^2.  These are
  // minimally satisfied, along with the default (x-i)^2 goal function, while also satisfying
  // all constraints.

  // The first variable
  // The second variable
  // The weight of the relationship
  public AddNeighborPair(variable1: Variable, variable2: Variable, relationshipWeight: number) {
    if (relationshipWeight <= 0 || Number.isNaN(relationshipWeight) || !Number.isFinite(relationshipWeight)) {
      throw new Error('relationshipWeight')
    }

    if (variable1 === variable2) {
      throw new Error()
    }

    variable1.AddNeighbor(variable2, relationshipWeight)
    variable2.AddNeighbor(variable1, relationshipWeight)
    this.hasNeighbourPairs = true
  }

  // end AddNeighborPair()

  // Sets Variable.ActualPos to the positions of the Variables that minimally satisfy the constraints
  // along this axis.  This overload uses default solution parameter values.

  // <returns>A Solution object.</returns>
  public Solve(): Solution {
    return this.SolvePar(null)
  }

  // Sets Variable.ActualPos to the positions of the Variables that minimally satisfy the constraints
  // along this axis.  This overload takes a parameter specification.

  // Solution-generation options.
  // <returns>The only failure condition is if there are one or more unsatisfiable constraints, such as cycles
  //         or mutually exclusive equality constraints; if these are encountered, a list of lists of these
  //         constraints is returned, where each list contains a single cycle, which may be of length one for
  //         unsatisfiable equality constraints.  Otherwise, the return value is null.</returns>
  public SolvePar(solverParameters: Parameters): Solution {
    if (solverParameters) {
      this.solverParams = <Parameters>solverParameters.Clone()
    }

    // Reset some parameter defaults to per-solver-instance values.
    if (this.solverParams.OuterProjectIterationsLimit < 0) {
      // If this came in 0, it stays that way, and there is no limit.  Otherwise, set it to a value
      // reflecting the expectation of convergence roughly log-linearly in the number of variables.
      this.solverParams.OuterProjectIterationsLimit = 100 * (Math.floor(Math.log2(this.numberOfVariables)) + 1)
    }

    if (this.solverParams.InnerProjectIterationsLimit < 0) {
      // If this came in 0, it stays that way, and there is no limit.  Otherwise, assume that for
      // any pass, each constraint may be violated (most likely this happens only on the first pass),
      // and add some extra based upon constraint count.  Now that we split and retry on unsatisfied
      // constraints, assume that any constraint may be seen twice on a pass.
      this.solverParams.InnerProjectIterationsLimit =
        this.numberOfConstraints * 2 + 100 * (Math.max(0, Math.floor(Math.log2(this.numberOfConstraints))) + 1)
    }

    // ReSolving can be done for updated constraints.
    const isReSolve = !this.allConstraints.IsEmpty
    this.CheckForUpdatedConstraints()
    this.solverSolution = new Solution()
    this.solverSolution.MinInnerProjectIterations = Number.MAX_VALUE
    this.allConstraints.MaxConstraintTreeDepth = 0
    this.allConstraints.SolverParameters = this.solverParams
    //
    // First set up all the  stuff we'll use for solutions.
    //
    // If no constraints have been loaded, there's nothing to do.  Two distinct variables
    // are required to create a constraint, so this also ensures a minimum number of variables.
    if (this.numberOfConstraints === 0) {
      // For Qpsc, we may have neighbours but no constraints.
      if (!this.IsQpsc) {
        return <Solution>this.solverSolution.Clone()
      }
    } else if (!isReSolve) {
      this.SetupConstraints()
    }

    // This is the number of unsatisfiable constraints encountered.
    this.allConstraints.NumberOfUnsatisfiableConstraints = 0
    // Merge Equality constraints first.  These do not do any constraint-splitting, and thus
    // remain in the same blocks, always satisfied, regardless of whether we're solving the full
    // Qpsc or the simpler loop.
    this.MergeEqualityConstraints()
    // Prepare for timeout checking.

    //
    // Done with initial setup.  Now if we have neighbour pairs, we do the full SolveQpsc logic
    // complete with Gradient projection.  Otherwise, we have a much simpler Project/Split loop.
    //
    if (this.IsQpsc) {
      this.SolveQpsc()
    } else {
      this.SolveByStandaloneProject()
      this.CalculateStandaloneProjectGoalFunctionValue()
    }

    // We initialized this to int.MaxValue so make sure it's sane if we didn't complete a Project iteration.
    if (this.solverSolution.MinInnerProjectIterations > this.solverSolution.MaxInnerProjectIterations) {
      // Probably this is 0.
      this.solverSolution.MinInnerProjectIterations = this.solverSolution.MaxInnerProjectIterations
    }

    // Done.  Caller will copy each var.ActualPos back to the Nodes.  If we had any unsatisfiable
    // constraints, copy them back out to the caller.
    this.solverSolution.NumberOfUnsatisfiableConstraints = this.allConstraints.NumberOfUnsatisfiableConstraints
    this.solverSolution.MaxConstraintTreeDepth = this.allConstraints.MaxConstraintTreeDepth
    return <Solution>this.solverSolution.Clone()
  }

  // end Solve()
  private CheckForUpdatedConstraints() {
    if (0 === this.updatedConstraints.length) {
      return
    }

    /*Assert.assert(
      !this.allConstraints.IsEmpty,
      'Cannot have updated constraints if AllConstraints is empty.',
    )*/
    // For Qpsc, all Block.ReferencePos values are based upon Variable.DesiredPos values, and the latter
    // have been restored from what they were on the last Qpsc iteration to their initial values).
    let mustReinitializeBlocks: boolean = this.IsQpsc
    for (const [key, value] of this.updatedConstraints) {
      // Update the constraint, then split its block if it's active, so the next call to Solve()
      // will start the merge/split cycle again.
      const constraint: Constraint = key
      constraint.UpdateGap(value)
      if (!mustReinitializeBlocks && !constraint.IsEquality) {
        this.SplitOnConstraintIfActive(constraint)
        continue
      }

      // Equality constraints must always be evaluated first and never split.
      // If we have updated one we must reinitialize the block structure.
      mustReinitializeBlocks = true
    }

    this.updatedConstraints = []
    if (mustReinitializeBlocks) {
      this.ReinitializeBlocks()
    }
  }

  private SplitOnConstraintIfActive(constraint: Constraint) {
    if (constraint.IsActive) {
      // Similar handling as in SplitBlocks, except that we know which constraint we're splitting on.
      const newSplitBlock: Block = constraint.Left.Block.SplitOnConstraint(constraint)
      if (null != newSplitBlock) {
        this.allBlocks.Add(newSplitBlock)
      }
    }

    // endif constraint.IsActive
  }

  private SetupConstraints() {
    // Optimize the lookup in SearchAllConstraints; create an array (which has faster
    // iteration than Array).
    this.allConstraints.Create(this.numberOfConstraints)
    for (const variable of this.loadedVariablesAndConstraintLists.keys()) {
      const constraintsForVar: ConstraintListForVariable = this.loadedVariablesAndConstraintLists.get(variable)
      const constraints: Array<Constraint> = constraintsForVar.Constraints
      let numAllConstraints = 0
      let numLeftConstraints = 0
      let numRightConstraints = 0
      if (null != constraints) {
        numAllConstraints = constraints.length
        numLeftConstraints = constraintsForVar.NumberOfLeftConstraints
        numRightConstraints = numAllConstraints - numLeftConstraints
      }

      // Create the Variable's Constraint arrays, using the single emptyConstraintList for efficiency.
      let leftConstraints: Constraint[] = this.emptyConstraintList
      if (0 !== numLeftConstraints) {
        leftConstraints = new Array(numLeftConstraints)
      }

      let rightConstraints: Constraint[] = this.emptyConstraintList
      if (0 !== numRightConstraints) {
        rightConstraints = new Array(numRightConstraints)
      }

      variable.SetConstraints(leftConstraints, rightConstraints)
      // Now load the Variables' Arrays.  We're done with the loadedVariablesAndConstraintLists lists after this.
      let leftConstraintIndex = 0
      let rightConstraintIndex = 0
      for (let loadedConstraintIndex = 0; loadedConstraintIndex < numAllConstraints; loadedConstraintIndex++) {
        // numAllConstraints is 0 if null == constraints.
        // ReSharper disable PossibleNullReferenceException
        const loadedConstraint: Constraint = constraints[loadedConstraintIndex]
        // ReSharper restore PossibleNullReferenceException
        if (variable === loadedConstraint.Left) {
          leftConstraints[leftConstraintIndex++] = loadedConstraint
        } else {
          rightConstraints[rightConstraintIndex++] = loadedConstraint
        }
      }

      /*Assert.assert(
        leftConstraintIndex === numLeftConstraints,
        'leftConstraintIndex must === numLeftConstraints',
      )*/
      /*Assert.assert(
        rightConstraintIndex === numRightConstraints,
        'rightConstraintIndex must === numRightConstraints',
      )*/
      // Done with per-variable constraint loading.  Now load the big list of all constraints.
      // All constraints are stored in a LeftConstraints array (and duplicated in a RightConstraints
      // array), so just load the LeftConstraints into AllConstraints. Array.Foreach is optimized.
      for (const constraint of variable.LeftConstraints) {
        this.allConstraints.Add(constraint)
      }
    }

    // this.allConstraints.Debug_AssertIsFull()
    // Done with the dictionary now.
    this.loadedVariablesAndConstraintLists.clear()

    // If we don't have many blocks then the caching optimization's overhead may outweigh
    // its benefit. Similarly, after blocks have merged past a certain point it's faster to
    // just enumerate them all.  Initialize this to off.
    this.violationCacheMinBlockCutoff = Number.MAX_VALUE
    if (this.solverParams.Advanced.UseViolationCache && this.solverParams.Advanced.ViolationCacheMinBlocksDivisor > 0) {
      this.violationCacheMinBlockCutoff = Math.min(
        this.allBlocks.Count / this.solverParams.Advanced.ViolationCacheMinBlocksDivisor,
        this.solverParams.Advanced.ViolationCacheMinBlocksCount,
      )
    }
  }

  private SolveByStandaloneProject() {
    // Loop until we have no constraints with violations and no blocks are split.
    // Note:  this functions differently from the loop-termination test in SolveQpsc, which tests the
    // total movement resulting from Project() against some epsilon.  We do this differently here because
    // we're not doing the Gradient portion of SolveQpsc, so we'll just keep going as long as we have any
    // violations greater than the minimum violation we look for in GetMaxViolatedConstraint (and as long
    // as we don't split any blocks whether or not we find such a violation).
    for (;;) {
      // Don't check the return of Project; defer the termination check to SplitBlocks.
      // This also examines limits post-Project; because it happens pre-SplitBlocks it ensures
      // a feasible stopping state.
      if (!this.RunProject()) {
        return
      }

      // If SplitBlocks doesn't find anything to split then Project would do nothing.
      if (!this.SplitBlocks()) {
        break
      }
    }
  }

  private RunProject(): boolean {
    this.solverSolution.OuterProjectIterations++
    this.Project()
    // Examine limits post-Project but pre-SplitBlocks to ensure a feasible stopping state.
    return !this.CheckForLimitsExceeded()
  }

  private CheckForLimitsExceeded(): boolean {
    // if (null !=  this.timeoutStopwatch) {
    //  if (
    //    this.timeoutStopwatch.ElapsedMilliseconds >= this.solverParams.TimeLimit
    //  ) {
    //    this.solverSolution.TimeLimitExceeded = true
    //    return true
    //  }
    // }

    if (this.solverParams.OuterProjectIterationsLimit > 0) {
      if (this.solverSolution.OuterProjectIterations >= this.solverParams.OuterProjectIterationsLimit) {
        this.solverSolution.OuterProjectIterationsLimitExceeded = true
        return true
      }
    }

    if (this.solverSolution.InnerProjectIterationsLimitExceeded) {
      return true
    }

    return false
  }

  private CalculateStandaloneProjectGoalFunctionValue() {
    // Fill in the non-Qpsc Goal function value.  See Qpsc.HasConverged for details; this is a
    // streamlined form of (x'Ax)/2 + bx here, where A has only the diagonals (as there are no
    // neighbours) with 2*wi and b is a vector of -2*wi*di, and x is current position.
    this.solverSolution.GoalFunctionValue = 0
    const numBlocks: number = this.allBlocks.Count
    // cache for perf
    for (let i = 0; i < numBlocks; i++) {
      const block: Block = this.allBlocks.item(i)
      const numVars: number = block.Variables.length
      for (let j = 0; j < numVars; j++) {
        const variable = block.Variables[j]
        // (x'Ax)/2
        this.solverSolution.GoalFunctionValue += variable.Weight * (variable.ActualPos * variable.ActualPos)
        // +bx
        this.solverSolution.GoalFunctionValue -= 2 * (variable.Weight * (variable.DesiredPos * variable.ActualPos))
      }
    }
  }

  // Implements the full solve_QPSC from the Ipsep_Cola and Scaling papers.
  private SolveQpsc() {
    this.solverSolution.AlgorithmUsed = this.solverParams.Advanced.ScaleInQpsc
      ? SolverAlgorithm.QpscWithScaling
      : SolverAlgorithm.QpscWithoutScaling
    if (!this.QpscMakeFeasible()) {
      return
    }

    // Initialize the Qpsc state, which also sets the scale for all variables (if we are scaling).
    const qpsc = new Qpsc(this.solverParams, this.numberOfVariables)
    for (const block of this.allBlocks.Vector) {
      for (const variable of block.Variables) {
        qpsc.AddVariable(variable)
      }
    }

    qpsc.VariablesComplete()
    this.ReinitializeBlocks()
    this.MergeEqualityConstraints()
    // this.VerifyConstraintsAreFeasible()
    // Iterations
    let foundSplit = false
    for (;;) {
      //
      // Calculate initial step movement.  We assume there will be some movement needed
      // even on the first pass in the vast majority of cases.  This also tests convergence
      // of the goal-function value; if it is sufficiently close to the previous iteration's
      // result and the previous iteration did not split or encounter a violation, we're done.
      //
      if (!qpsc.PreProject() && !foundSplit) {
        break
      }

      //
      // Split the blocks (if this the first time through the loop then all variables are in their
      // own block except for any equality constraints, which we don't split; but we still need to
      // have UpdateReferencePos called).
      //
      foundSplit = this.SplitBlocks()
      // Examine limits post-Project to ensure a feasible stopping state.  We don't test for
      // termination due to "no violations found" here, deferring that to the next iteration's PreProject().
      if (!this.RunProject()) {
        break
      }

      //
      // Calculate the new adjustment to the current positions based upon the amount of movement
      // done by split/project.  If this returns false then it means that movement was zero and
      // we're done if there was no split or constraint violation.
      //
      if (!qpsc.PostProject() && !foundSplit) {
        break
      }
    }

    // end forever
    this.solverSolution.GoalFunctionValue = qpsc.QpscComplete()
  }

  private QpscMakeFeasible(): boolean {
    // Start off with one Project pass so the initial Qpsc state is feasible (not in violation
    // of constraints).  If this takes more than the max allowable time, we're done.
    return this.RunProject()
  }

  private ReinitializeBlocks() {
    // For Qpsc we want to discard the previous block structure, because it did not consider
    // neighbors, and the gradient may want to pull things in an entirely different way.
    // We must also do this for a re-Solve that updated the gap of an equality constraint.
    const oldBlocks = Array.from(this.allBlocks.Vector)
    this.allBlocks.Vector = []
    for (const oldBlock of oldBlocks) {
      for (const variable of oldBlock.Variables) {
        variable.Reinitialize()
        const newBlock = new Block(variable, this.allConstraints)
        this.allBlocks.Add(newBlock)
      }
    }

    this.allConstraints.Reinitialize()
    this.violationCache.Clear()
  }

  private MergeEqualityConstraints() {
    // PerfNote: We only call this routine once so don't worry about Array-Enumerator overhead.
    for (const constraint of this.equalityConstraints) {
      if (constraint.Left.Block === constraint.Right.Block) {
        // They are already in the same block and we are here on the first pass that merges blocks
        // containing only equality constraints.  Thus we know that there is already a chain of equality
        // constraints joining constraint.Left and constraint.Right, and that chain will always be
        // moved as a unit because we never split or expand equality constraints, so this constraint
        // will remain retain its current satisfied state and does not need to be activated (which
        // would potentially lead to cycles; this is consistent with the non-equality constraint
        // approach of not activating constraints that are not violated).
        if (Math.abs(constraint.Violation) > this.solverParams.GapTolerance) {
          // This is an equivalence conflict, such as a + 3 === b; b + 3 === c; a + 9 === c.
          constraint.IsUnsatisfiable = true
          this.allConstraints.NumberOfUnsatisfiableConstraints++
        }

        continue
      }

      this.MergeBlocks(constraint)
    }
  }

  private Project(): boolean {
    if (this.numberOfConstraints === 0) {
      // We are here for the neighbours-only case.
      return false
    }

    // Get the maximum violation (the Constraint with the biggest difference between the
    // required gap between its two variables vs. their actual relative positions).
    // If there is no violation, we're done (although SplitBlocks may change things so
    // we have to go again).
    this.violationCache.Clear()
    this.lastModifiedBlock = null
    let useViolationCache: boolean = this.allBlocks.Count > this.violationCacheMinBlockCutoff
    // The first iteration gets the first violated constraint.
    let cIterations = 1
    const t = {maxViolation: 0}
    let maxViolatedConstraint: Constraint = this.GetMaxViolatedConstraint(t, useViolationCache)
    if (!maxViolatedConstraint) {
      return false
    }

    // We have at least one violation, so process them until there are no more.
    while (maxViolatedConstraint) {
      /*Assert.assert(
        !maxViolatedConstraint.IsUnsatisfiable,
        'maxViolatedConstraint should not be unsatisfiable',
      )*/
      /*Assert.assert(
        !maxViolatedConstraint.IsEquality,
        'maxViolatedConstraint should not be equality',
      )*/
      // Perf note: Variables (and Blocks) use the default Object.Equals implementation, which is
      // simply ReferenceEquals for reference types.
      if (maxViolatedConstraint.Left.Block === maxViolatedConstraint.Right.Block) {
        maxViolatedConstraint.Left.Block.Expand(maxViolatedConstraint)
        if (maxViolatedConstraint.IsUnsatisfiable) {
          this.violationCache.Clear()
          // We're confusing the lineage of lastModifiedBlock
        }

        this.lastModifiedBlock = maxViolatedConstraint.Left.Block
      } else {
        // The variables are in different blocks so merge the blocks.
        this.lastModifiedBlock = this.MergeBlocks(maxViolatedConstraint)
      }

      // Note that aborting here does not guarantee a feasible state.
      if (this.solverParams.InnerProjectIterationsLimit > 0) {
        if (cIterations >= this.solverParams.InnerProjectIterationsLimit) {
          this.solverSolution.InnerProjectIterationsLimitExceeded = true
          break
        }
      }

      // Now we've potentially changed one or many variables' positions so recalculate the max violation.
      useViolationCache = this.allBlocks.Count > this.violationCacheMinBlockCutoff
      if (!useViolationCache) {
        this.violationCache.Clear()
      }

      cIterations++
      const t = {maxViolation: 0}
      maxViolatedConstraint = this.GetMaxViolatedConstraint(t, useViolationCache)
    }

    // endwhile violations exist
    this.solverSolution.InnerProjectIterationsTotal = this.solverSolution.InnerProjectIterationsTotal + cIterations
    if (this.solverSolution.MaxInnerProjectIterations < cIterations) {
      this.solverSolution.MaxInnerProjectIterations = cIterations
    }

    if (this.solverSolution.MinInnerProjectIterations > cIterations) {
      this.solverSolution.MinInnerProjectIterations = cIterations
    }

    // If we got here, we had at least one violation.
    // this.allConstraints.Debug_AssertConsistency()
    return true
  }

  // end Project()
  private MergeBlocks(violatedConstraint: Constraint): Block {
    // Start off evaluating left-to-right.
    let blockTo = violatedConstraint.Left.Block
    let blockFrom = violatedConstraint.Right.Block
    /*Assert.assert(
      blockTo !== blockFrom,
      'Merging of constraints in the same block is not allowed',
    )*/
    // The violation amount is the needed distance to move to tightly satisfy the constraint.
    // Calculate this based on offsets even though the vars are in different blocks; we'll normalize
    // that when we recalculate the block reference position and the offsets in the Right block.
    let distance: number = violatedConstraint.Left.OffsetInBlock + (violatedConstraint.Gap - violatedConstraint.Right.OffsetInBlock)
    if (blockFrom.Variables.length > blockTo.Variables.length) {
      // Reverse this so we minimize variable movement by moving stuff from the block with the least
      // number of vars into the block with the greater number.
      blockTo = violatedConstraint.Right.Block
      blockFrom = violatedConstraint.Left.Block
      distance = -distance
    }

    // Move all vars from blockFrom to blockTo, and adjust their offsets by dist as
    // mentioned above.  This has the side-effect of moving the associated active constraints
    // as well (because they are carried in the variables' LeftConstraints); violatedConstraint
    // is therefore also moved if it was in blockFrom.
    const numVars = blockFrom.Variables.length
    // iteration is faster than foreach for Array<>s
    for (let i = 0; i < numVars; i++) {
      const variable = blockFrom.Variables[i]
      variable.OffsetInBlock += distance
      blockTo.AddVariable(variable)
    }

    blockTo.UpdateReferencePosFromSums()
    //blockTo.DebugVerifyReferencePos()
    // Do any final bookkeeping necessary.
    // blockTo.Debug_PostMerge(blockFrom)
    // Make the (no-longer-) violated constraint active.
    this.allConstraints.ActivateConstraint(violatedConstraint)
    // We have no further use for blockFrom as nobody references it.
    this.allBlocks.Remove(blockFrom)
    return blockTo
  }

  // end MergeBlocks()
  private SplitBlocks(): boolean {
    // First enumerate all blocks and accumulate any new ones that we form by splitting off
    // from an existing block.  Then add those to our block list in a second pass (to avoid
    // a "collection modified during enumeration" exception).
    const newBlocks = new Array<Block>()
    const numBlocks: number = this.allBlocks.Count
    // Cache for perf
    for (let i = 0; i < numBlocks; i++) {
      const block = this.allBlocks.item(i)
      /*Assert.assert(
        0 !== block.Variables.length,
        'block must have nonzero variable count',
      )*/
      const newSplitBlock = block.Split(this.IsQpsc)
      if (null != newSplitBlock) {
        newBlocks.push(newSplitBlock)
      }
    }

    const numNewBlocks: number = newBlocks.length
    // cache for perf
    for (let ii = 0; ii < numNewBlocks; ii++) {
      const block: Block = newBlocks[ii]
      this.allBlocks.Add(block)
    }

    // The paper uses "did not split" for the return but "did split" seems more intuitive
    return 0 !== newBlocks.length
  }

  // end SplitBlocks
  private GetMaxViolatedConstraint(t: {maxViolation: number}, useViolationCache: boolean): Constraint {
    // Get the most-violated constraint in the Solver.  Active constraints are calculated
    // to keep their constraint minimally satisfied, so any nonzero active-constraint
    // violation is due to rounding error; therefore just look for inactive constraints.
    // Pass maxViolation to subroutines because it is initialized to a limiting value.
    t.maxViolation = this.solverParams.GapTolerance
    const maxViolatedConstraint: Constraint = this.SearchViolationCache(t.maxViolation)
    if (null != maxViolatedConstraint) {
      return maxViolatedConstraint
    }

    // Nothing in ViolationCache or we've got too many Constraints in the block, so search
    // the list of all constraints.
    return this.SearchAllConstraints(t.maxViolation, useViolationCache)
  }

  // end GetMaxViolatedConstraint()
  private SearchViolationCache(maxViolation: number): Constraint {
    // If we have any previously cached max violated constraints, then we'll first remove any
    // that are incoming to or outgoing from the lastModifiedBlock on the current Project()
    // iteration; these constraints are the only ones that may have changed violation values
    // (due to block expansion or merging).  If any of the cached maxvio constraints remain after
    // that, then we can use the largest of these if it's larger than any constraints in lastModifiedBlock.
    // Even if no cached violations remain after filtering, we still know that the largest violations were
    // most likely associated with lastModifiedBlock.  So we take a pass through lastModifiedBlock and put
    // its top constraints into the cache and then take the largest constraint from the violation cache,
    // which may or may not be associated with lastModifiedBlock.  (This would happen after filling the
    // cache from multiple blocks in the first pass, or after Block.Split moved some variables (with
    // cached inactive constraints) to the new block).
    //
    // This iteration is slower (relative to the number of constraints in the block) than
    // SearchAllConstraints, due to two loops, so only do it if the block has a sufficiently small
    // number of constraints.  Use the Variables as a proxy for the constraint count of the block.
    // @@PERF: the block could keep a constraint count to make ViolationCache cutoff more accurate.
    let maxViolatedConstraint: Constraint = null
    if (this.lastModifiedBlock == null) return
    if (this.lastModifiedBlock.Variables.length < this.numberOfVariables + 1 && this.violationCache.FilterBlock(this.lastModifiedBlock)) {
      // Also removes unsatisfiables
    }

    // First evaluate all (inactive) outgoing constraints for all variables in the block; this gets
    // both all intra-block constraints and all inter-block constraints where the lastModifiedBlock
    // is the source.  Then evaluate incoming constraints where the source is outside the block.
    const numVarsInBlock: number = this.lastModifiedBlock.Variables.length
    // cache for perf
    for (let variableIndex = 0; variableIndex < numVarsInBlock; variableIndex++) {
      const variable = this.lastModifiedBlock.Variables[variableIndex]
      for (const constraint of variable.LeftConstraints) {
        if (!constraint.IsActive && !constraint.IsUnsatisfiable) {
          const violation: number =
            constraint.Left.ActualPos * constraint.Left.Scale + (constraint.Gap - constraint.Right.ActualPos * constraint.Right.Scale)
          /*Assert.assert(
            closeDistEps(constraint.Violation, violation),
            'LeftConstraints: constraint.Violation must === violation',
          )*/
          if (greaterDistEps(violation, maxViolation)) {
            // Cache the previous high violation.  Pass the violation as a tiny perf optimization
            // to save re-doing the double operations in this inner loop.
            if (null != maxViolatedConstraint && maxViolation > this.violationCache.LowViolation) {
              this.violationCache.Insert(maxViolatedConstraint, maxViolation)
            }

            maxViolation = constraint.Violation
            maxViolatedConstraint = constraint
          }
        }
      }

      // endfor each LeftConstraint
      for (const constraint of variable.RightConstraints) {
        if (!constraint.IsActive && !constraint.IsUnsatisfiable && constraint.Left.Block !== this.lastModifiedBlock) {
          const violation: number =
            constraint.Left.ActualPos * constraint.Left.Scale + (constraint.Gap - constraint.Right.ActualPos * constraint.Right.Scale)
          // Assert.assert(constraint.Violation === violation, "LeftConstraints: constraint.Violation must === violation");
          /*Assert.assert(
            closeDistEps(constraint.Violation, violation),
            'LeftConstraints: constraint.Violation must === violation',
          )*/
          // if (violation > maxViolation)
          if (greaterDistEps(violation, maxViolation)) {
            if (null != maxViolatedConstraint && maxViolation > this.violationCache.LowViolation) {
              this.violationCache.Insert(maxViolatedConstraint, maxViolation)
            }

            maxViolation = violation
            maxViolatedConstraint = constraint
          }
        }
      }

      // endfor each RightConstraint
    }

    // endfor each var in lastModifiedBlock.Variables
    // Now see if any of the cached maxvios are greater than we have now.  Don't remove
    // it here; we'll wait until Expand/Merge set lastModifiedBlock and then the removal
    // occurs above in ViolationCache.FilterBlock in this block when we come back in.
    const cachedConstraint: Constraint = this.violationCache.FindIfGreater(maxViolation)
    if (null != cachedConstraint) {
      // The cache had something more violated than maxViolatedConstraint, but maxViolatedConstraint
      // may be larger than at least one cache element.
      if (null != maxViolatedConstraint && maxViolation > this.violationCache.LowViolation) {
        this.violationCache.Insert(maxViolatedConstraint, maxViolation)
      }

      maxViolatedConstraint = cachedConstraint
    }

    // endif FilterBlock
    return maxViolatedConstraint
    // Remains null if we don't find one
  }

  private SearchAllConstraints(maxViolation: number, useViolationCache: boolean): Constraint {
    // Iterate all constraints, finding the most-violated and populating the violation cache
    // with the next-highest violations.
    let maxViolatedConstraint: Constraint = null
    this.violationCache.Clear()
    for (const constraint of this.allConstraints.Vector) {
      // The constraint vector is now organized with all inactive constraints first.
      if (constraint.IsActive) {
        break
      }

      if (constraint.IsUnsatisfiable) {
        continue
      }

      // Note:  The docs have >= 0 for violation condition but it should be just > 0.
      const violation: number =
        constraint.Left.ActualPos * constraint.Left.Scale + (constraint.Gap - constraint.Right.ActualPos * constraint.Right.Scale)
      /*Assert.assert(
        closeDistEps(constraint.Violation, violation),
        'constraint.Violation must === violation',
      )*/
      let cacheInsertConstraint: Constraint = null
      let cacheInsertViolation = 0
      if (greaterDistEps(violation, maxViolation)) {
        if (maxViolation > this.violationCache.LowViolation) {
          cacheInsertConstraint = maxViolatedConstraint
          cacheInsertViolation = maxViolation
        }

        maxViolation = violation
        maxViolatedConstraint = constraint
      }

      if (useViolationCache) {
        // If constraint was a violation but not > maxViolation, then we'll look to insert it into the cache.
        // (We already know that if the previous maxViolatedConstraint is to be inserted, then its violation is
        // greater than any in the cache).  On the first iteration of "for each constraint", maxViolatedConstraint
        // is null, hence the constraint !== maxViolatedConstraint test.
        if (
          cacheInsertConstraint == null &&
          constraint !== maxViolatedConstraint &&
          (!this.violationCache.IsFull || violation > this.violationCache.LowViolation)
        ) {
          // Either the cache isn't full or the new constraint is more violated than the lowest cached constraint.
          cacheInsertConstraint = constraint
          cacheInsertViolation = violation
        }

        if (null != cacheInsertConstraint && cacheInsertViolation > this.violationCache.LowViolation) {
          this.violationCache.Insert(cacheInsertConstraint, cacheInsertViolation)
        }
      }

      // endif useViolationCache
    }

    // endfor each constraint
    return maxViolatedConstraint
    // Remains null if we don't find one
  }
}
