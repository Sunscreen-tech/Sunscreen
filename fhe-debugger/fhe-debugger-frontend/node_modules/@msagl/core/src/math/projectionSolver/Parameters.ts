// Per-instance parameters for ProjectionSolver.Solver.Solve().

export class Parameters {
  // GapTolerance is the amount of violation of constraint gaps we will accept as a
  // perf/accuracy tradeoff. Anything greater than this is a violation; equal or below is not.
  // PerfAcc: setting it to a larger value yields less violations/accuracy.

  GapTolerance: number

  // When the absolute difference in Qpsc function value from the previous iteration to the current
  // iteration is below this absolute-difference threshold, or when the QpscConvergenceQuotient
  // condition is met, the function is considered converged.
  // PerfAcc: setting it to a larger value yields less iterations and thus potentially lower accuracy.

  QpscConvergenceEpsilon: number
  // When the absolute difference in Qpsc function value from the previous iteration to the current
  // iteration is divided by the previous iteration's function value, if the quotient is below
  // this value, or the QpscConvergenceEpsilon condition is met, the function is considered converged.
  // PerfAcc: setting it to a larger value yields less iterations and thus potentially lower accuracy;
  // a lower value yields more iterations and potentially greater accuracy.

  QpscConvergenceQuotient: number

  // The maximum number of times the outer Project/Split loop should be run.  If this is less than 0
  // (the default) it becomes a function based upon the number of variables; if it is 0, there is no limit.
  // Termination due to this limit will result in a feasible solution.
  // PerfAcc:  Primarily intended to mitigate nonconvergence scenarios; modify GapTolerance instead.

  OuterProjectIterationsLimit: number

  // Within any Project/Split loop iteration (see OuterProjectIterationsLimit), this is the maximum number
  // of times Project should iterate internally.  If this is less than 0 (the default) it becomes a function
  // based upon the number of constraints; if it is 0, there is no limit.
  // Termination due to this limit may result in a nonfeasible solution.
  // PerfAcc:  Primarily intended to mitigate nonconvergence scenarios; modify GapTolerance instead.

  InnerProjectIterationsLimit: number

  // The maximum time (in milliseconds) allowed for ProjectionSolver.Solver.Solve(). If less than or equal
  // to 0 (the default) there is no limit.  The cutoff is approximate since it is only examined on the outer
  // Project iteration, for performance and to ensure a feasible result in the event of early termination.
  // Termination due to this limit will result in a feasible solution.
  // PerfAcc:  Primarily intended to mitigate nonconvergence scenarios; modify GapTolerance instead.

  TimeLimit: number

  // Parameters for advanced options.

  Advanced: AdvancedParameters

  // Constructor.

  public constructor() {
    this.GapTolerance = 0.0001
    this.QpscConvergenceEpsilon = 1e-5
    this.QpscConvergenceQuotient = 1e-6
    this.OuterProjectIterationsLimit = -1
    this.InnerProjectIterationsLimit = -1
    this.TimeLimit = -1
    this.Advanced = new AdvancedParameters()
  }

  // Deep-copy the AdvancedParameters.

  public Clone(): Parameters {
    const newParams = <Parameters>this.MemberwiseClone()
    newParams.Advanced = <AdvancedParameters>this.Advanced.Clone()
    return newParams
  }
  MemberwiseClone(): Parameters {
    const par = new Parameters()
    par.GapTolerance = this.GapTolerance
    par.QpscConvergenceEpsilon = this.QpscConvergenceEpsilon
    par.QpscConvergenceQuotient = this.QpscConvergenceQuotient
    par.OuterProjectIterationsLimit = this.OuterProjectIterationsLimit
    par.InnerProjectIterationsLimit = this.InnerProjectIterationsLimit
    par.TimeLimit = this.TimeLimit
    return par
  }
}
// end struct Parameters

// Parameter specification for advanced options.

export class AdvancedParameters {
  // Whether Solve() should use the full Qpsc (Quadratic Programming for Separation Constraints; see paper)
  // algorithm even if there are no neighbour pairs specified (neighbour pairs will always use Qpsc).
  // Currently this is primarily for debugging and result verification.

  ForceQpsc: boolean

  // Whether the full Qpsc (Quadratic Programming for Separation Constraints; see paper) algorithm
  // should use Diagonal Scaling (see the other paper).

  ScaleInQpsc: boolean

  // Any Lagrangian Multiple less than (more negative than) this causes a block split.
  // PerfAcc: setting it to a larger negative value yields less splits/accuracy.

  MinSplitLagrangianThreshold: number

  // Whether to use the violation cache. PerfOnly: if false, other ViolationCache settings are ignored.

  UseViolationCache: boolean

  // Violation cache divisor for block count; the minimum of (number of initial blocks / ViolationCacheMinBlocksDivisor)
  // and ViolationCacheMinBlocksCount is used as the minimum number of blocks that enables the violation cache.
  // PerfOnly:  Modifies the number of cached violated constraints.

  ViolationCacheMinBlocksDivisor: number

  // Violation cache minimum; the minimum of (number of initial blocks / ViolationCacheMinBlocksDivisor)
  // and ViolationCacheMinBlocksCount is used as the minimum number of blocks that enables the violation cache.
  // PerfOnly:  Modifies the number of cached violated constraints.

  // PerfOnly:  Modifies the number of cached violated constraints.
  ViolationCacheMinBlocksCount: number

  // Constructor.

  public constructor() {
    this.ForceQpsc = false
    this.ScaleInQpsc = true
    this.MinSplitLagrangianThreshold = -1e-7
    this.UseViolationCache = true
    this.ViolationCacheMinBlocksDivisor = 10
    this.ViolationCacheMinBlocksCount = 100
  }

  // Shallow-copy the object (there is nothing requiring deep-copy).

  public Clone(): AdvancedParameters {
    const ret = new AdvancedParameters()
    ret.ForceQpsc = this.ForceQpsc
    ret.ScaleInQpsc = this.ScaleInQpsc
    ret.MinSplitLagrangianThreshold = this.MinSplitLagrangianThreshold
    ret.UseViolationCache = this.UseViolationCache
    ret.ViolationCacheMinBlocksDivisor = this.ViolationCacheMinBlocksDivisor
    ret.ViolationCacheMinBlocksCount = this.ViolationCacheMinBlocksCount
    return ret
  }
}
