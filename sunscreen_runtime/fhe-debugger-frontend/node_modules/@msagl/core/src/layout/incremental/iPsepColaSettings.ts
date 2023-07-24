import {EdgeRoutingSettings} from '../../routing/EdgeRoutingSettings'
import {CancelToken} from '../../utils/cancelToken'
import {CommonLayoutSettings} from '../commonLayoutSettings'
import {GeomGraph} from '../core/geomGraph'
import {ILayoutSettings} from '../iLayoutSettings'
import {IPsepCola} from './iPsepCola'

export class IPsepColaSetting implements ILayoutSettings {
  get edgeRoutingSettings() {
    return this.commonSettings.edgeRoutingSettings
  }
  set edgeRoutingSettings(value: EdgeRoutingSettings) {
    this.commonSettings.edgeRoutingSettings = value
  }
  commonSettings: CommonLayoutSettings = new CommonLayoutSettings()
  get PackingAspectRatio() {
    return this.commonSettings.PackingAspectRatio
  }
  set PackingAspectRatio(value: number) {
    this.commonSettings.PackingAspectRatio = value
  }
  get NodeSeparation() {
    return this.commonSettings.NodeSeparation
  }
  set NodeSeparation(value: number) {
    this.commonSettings.NodeSeparation = value
  }

  //  Stop after maxIterations completed

  maxIterations = 100
  clusterMargin = 10

  //  Stop after maxIterations completed

  public get MaxIterations(): number {
    return this.maxIterations
  }
  public set MaxIterations(value: number) {
    this.maxIterations = value
  }

  minorIterations = 3

  //  Number of iterations in inner loop.

  public get MinorIterations(): number {
    return this.minorIterations
  }
  public set MinorIterations(value: number) {
    this.minorIterations = value
  }

  iterations: number

  //  Number of iterations completed

  public get Iterations(): number {
    return this.iterations
  }
  public set Iterations(value: number) {
    this.iterations = value
  }

  projectionIterations = 5

  //  number of times to project over all constraints at each layout iteration

  public get ProjectionIterations(): number {
    return this.projectionIterations
  }
  public set ProjectionIterations(value: number) {
    this.projectionIterations = value
  }

  approximateRepulsion = true

  //  Rather than computing the exact repulsive force between all pairs of nodes (which would take O(n^2) time for n nodes)
  //  use a fast inexact technique (that takes O(n log n) time)

  public get ApproximateRepulsion(): boolean {
    return this.approximateRepulsion
  }
  public set ApproximateRepulsion(value: boolean) {
    this.approximateRepulsion = value
  }

  //  RungaKutta integration potentially gives smoother increments, but is more expensive

  RungeKuttaIntegration = false

  initialStepSize = 1.4

  //  StepSize taken at each iteration (a coefficient of the force on each node) adapts depending on change in
  //  potential energy at each step.  With this scheme changing the InitialStepSize doesn't have much effect
  //  because if it is too large or too small it will be quickly updated by the algorithm anyway.

  public get InitialStepSize(): number {
    return this.initialStepSize
  }
  public set InitialStepSize(value: number) {
    if (value <= 0 || value > 2) {
      throw new Error(
        'ForceScalar should be greater than 0 and less than 2 (if we let you set it to 0 nothing would happen, greater than 2 would most likely be very unstable!)',
      )
    }

    this.initialStepSize = value
  }

  decay = 0.9

  //  FrictionalDecay isn't really friction so much as a scaling of velocity to improve convergence.  0.8 seems to work well.

  public get Decay(): number {
    return this.decay
  }
  public set Decay(value: number) {
    if (value < 0.1 || value > 1) {
      throw new Error('Setting decay too small gives no progress.  1==no decay, 0.1==minimum allowed value')
    }

    this.decay = value
  }

  private friction = 0.8

  //  Friction isn't really friction so much as a scaling of velocity to improve convergence.  0.8 seems to work well.

  public get Friction(): number {
    return this.friction
  }
  public set Friction(value: number) {
    if (value < 0 || value > 1) {
      throw new Error(
        'Setting friction less than 0 or greater than 1 would just be strange.  1==no friction, 0==no conservation of velocity',
      )
    }

    this.friction = value
  }

  repulsiveForceConstant = 1

  //  strength of repulsive force between each pair of nodes.  A setting of 1.0 should work OK.

  public get RepulsiveForceConstant(): number {
    return this.repulsiveForceConstant
  }
  public set RepulsiveForceConstant(value: number) {
    this.repulsiveForceConstant = value
  }

  attractiveForceConstant = 1

  //  strength of attractive force between pairs of nodes joined by an edge.  A setting of 1.0 should work OK.

  public get AttractiveForceConstant(): number {
    return this.attractiveForceConstant
  }
  public set AttractiveForceConstant(value: number) {
    this.attractiveForceConstant = value
  }

  gravity = 1

  //  gravity is a constant force applied to all nodes attracting them to the Origin
  //  and keeping disconnected components from flying apart.  A setting of 1.0 should work OK.

  public get GravityConstant(): number {
    return this.gravity
  }
  public set GravityConstant(value: number) {
    this.gravity = value
  }

  interComponentForces = true

  //  If the following is false forces will not be considered between each component and each component will have its own gravity origin.

  public get InterComponentForces(): boolean {
    return this.interComponentForces
  }
  public set InterComponentForces(value: boolean) {
    this.interComponentForces = value
  }

  applyForces = true

  //  If the following is false forces will not be applied, but constraints will still be satisfied.

  public get ApplyForces(): boolean {
    return this.applyForces
  }
  public set ApplyForces(value: boolean) {
    this.applyForces = value
  }

  algorithm: IPsepCola

  constructor() {
    this.commonSettings.NodeSeparation *= 2
  }
  //  restart layout, use e.g. after a mouse drag or non-structural change to the graph

  public ResetLayout() {
    this.Unconverge()
    if (this.algorithm != null) {
      this.algorithm.ResetNodePositions()
    }
  }

  /**   reset iterations and convergence status*/
  Unconverge() {
    this.iterations = 0
    this.converged = false
  }

  public InitializeLayoutGN(graph: GeomGraph, initialConstraintLevel: number) {
    this.InitializeLayout(graph, initialConstraintLevel)
  }

  //  Initialize the layout algorithm

  public InitializeLayout(graph: GeomGraph, initialConstraintLevel: number) {
    this.algorithm = new IPsepCola(graph, this, initialConstraintLevel)
    this.ResetLayout()
  }

  //

  public Uninitialize() {
    this.algorithm = null
  }

  //

  public get IsInitialized(): boolean {
    return this.algorithm != null
  }

  //

  public IncrementalRunG(graph: GeomGraph) {
    this.IncrementalRunGF(graph)
  }

  private SetupIncrementalRun(graph: GeomGraph) {
    if (!this.IsInitialized) {
      this.InitializeLayout(graph, this.MaxConstraintLevel)
    } else if (this.IsDone) {
      //  If we were already done from last time but we are doing more work then something has changed.
      this.ResetLayout()
    }
  }

  //  Run the FastIncrementalLayout instance incrementally

  public IncrementalRunGF(graph: GeomGraph) {
    this.SetupIncrementalRun(graph)
    this.algorithm.run()
    // graph.UpdateBoundingBox()
  }

  //

  public IncrementalRun(cancelToken: CancelToken, graph: GeomGraph) {
    if (cancelToken != null) {
      cancelToken.throwIfCanceled()
    }

    this.SetupIncrementalRun(graph)
    this.algorithm.cancelToken = cancelToken
    this.algorithm.run()
    // graph.UpdateBoundingBox()
  }

  Clone(): IPsepColaSetting {
    return IPsepColaSetting.ctorClone(this)
  }

  //  Avoid overlaps between nodes boundaries, and if there are any
  //  clusters, then between each cluster boundary and nodes that are not
  //  part of that cluster.

  AvoidOverlaps = true

  //  If edges have FloatingPorts then the layout will optimize edge lengths based on the port locations.
  //  If MultiLocationFloatingPorts are specified then the layout will choose the nearest pair of locations for each such edge.

  RespectEdgePorts: boolean

  //  Apply nice but expensive routing of edges once layout converges

  RouteEdges: boolean

  approximateRouting = true

  //  If RouteEdges is true then the following is checked to see whether to do optimal shortest path routing
  //  or use a sparse visibility graph spanner to do approximate---but much faster---shortest path routing

  public get ApproximateRouting(): boolean {
    return this.approximateRouting
  }
  public set ApproximateRouting(value: boolean) {
    this.approximateRouting = value
  }

  logScaleEdgeForces = true

  //  If true then attractive forces across edges are computed as:
  //  AttractiveForceConstant * actualLength * Math.Log((actualLength + epsilon) / (idealLength + epsilon))
  //  where epsilon is a small positive constant to avoid divide by zero or taking the log of zero.
  //  Note that LogScaleEdges can lead to ghost forces in highly constrained scenarios.
  //  If false then a the edge force is based on (actualLength - idealLength)^2, which works better with
  //  lots of constraints.

  public get LogScaleEdgeForces(): boolean {
    return this.logScaleEdgeForces
  }
  public set LogScaleEdgeForces(value: boolean) {
    this.logScaleEdgeForces = value
  }

  displacementThreshold = 0.1

  //  If the amount of total squared displacement after a particular iteration falls below DisplacementThreshold then Converged is set to true.
  //  Make DisplacementThreshold larger if you want layout to finish sooner - but not necessarily make as much progress towards a good layout.

  public get DisplacementThreshold(): number {
    return this.displacementThreshold
  }
  public set DisplacementThreshold(value: number) {
    this.displacementThreshold = value
  }

  converged: boolean

  //  Set to true if displacement from the last iteration was less than DisplacementThreshold.
  //  The caller should invoke FastIncrementalLayout.CalculateLayout() in a loop, e.g.:
  //
  //   while(!settings.Converged)
  //   {
  //     layout.CalculateLayout();
  //     redrawGraphOrHandleInteractionOrWhatever();
  //   }
  //
  //  RemainingIterations affects damping.

  public get Converged(): boolean {
    return this.converged
  }
  public set Converged(value: boolean) {
    this.converged = value
  }

  //  Return iterations as a percentage of MaxIterations.  Useful for reporting progress, e.g. in a progress bar.

  public get PercentDone(): number {
    if (this.Converged) {
      return 100
    } else {
      return <number>((100 * <number>this.iterations) / <number>this.MaxIterations)
    }
  }

  //  Not quite the same as Converged:

  public get IsDone(): boolean {
    return this.Converged || this.iterations >= this.MaxIterations
  }

  //  Returns an estimate of the cost function calculated in the most recent iteration.
  //  It's a float because FastIncrementalLayout.Energy is a volatile float so it
  //  can be safely read from other threads

  public get Energy(): number {
    if (this.algorithm != null) {
      return this.algorithm.energy
    }

    return 0
  }

  //  When layout is in progress the following is false.
  //  When layout has converged, routes are populated and this is set to true to tell the UI that the routes can be drawn.

  EdgeRoutesUpToDate: boolean

  maxConstraintLevel = 2

  //

  public get MaxConstraintLevel(): number {
    return this.maxConstraintLevel
  }
  public set MaxConstraintLevel(value: number) {
    if (this.maxConstraintLevel != value) {
      this.maxConstraintLevel = value
      if (this.IsInitialized) {
        this.Uninitialize()
      }
    }
  }

  minConstraintLevel = 0

  //

  public get MinConstraintLevel(): number {
    return this.minConstraintLevel
  }
  public set MinConstraintLevel(value: number) {
    this.minConstraintLevel = value
  }

  //  Constraint level ranges from Min to MaxConstraintLevel.
  //  0 = no constraints
  //  1 = only structural constraints
  //  2 = all constraints including non-overlap constraints
  //
  //  A typical run of FastIncrementalLayout will apply it at each constraint level, starting at 0 to
  //  obtain an untangled unconstrained layout, then 1 to introduce structural constraints and finally 2 to beautify.
  //  Running only at level 2 will most likely leave the graph stuck in a tangled local minimum.

  public getCurrentConstraintLevel(): number {
    if (this.algorithm == null) {
      return 0
    }

    return this.algorithm.getCurrentConstraintLevel()
  }
  public setCurrentConstraintLevel(value: number) {
    this.algorithm.setCurrentConstraintLevel(value)
  }

  attractiveInterClusterForceConstant = 1

  //  Attractive strength of edges connected to clusters

  public get AttractiveInterClusterForceConstant(): number {
    return this.attractiveInterClusterForceConstant
  }
  public set AttractiveInterClusterForceConstant(value: number) {
    this.attractiveInterClusterForceConstant = value
  }

  //  Shallow copy the settings

  public static ctorClone(previousSettings: IPsepColaSetting): IPsepColaSetting {
    const ret = new IPsepColaSetting()
    ret.maxIterations = previousSettings.maxIterations
    ret.minorIterations = previousSettings.minorIterations
    ret.projectionIterations = previousSettings.projectionIterations
    ret.approximateRepulsion = previousSettings.approximateRepulsion
    ret.initialStepSize = previousSettings.initialStepSize
    ret.RungeKuttaIntegration = previousSettings.RungeKuttaIntegration
    ret.decay = previousSettings.decay
    ret.friction = previousSettings.friction
    ret.repulsiveForceConstant = previousSettings.repulsiveForceConstant
    ret.attractiveForceConstant = previousSettings.attractiveForceConstant
    ret.gravity = previousSettings.gravity
    ret.interComponentForces = previousSettings.interComponentForces
    ret.applyForces = previousSettings.applyForces
    ret.AvoidOverlaps = previousSettings.AvoidOverlaps
    ret.RespectEdgePorts = previousSettings.RespectEdgePorts
    ret.RouteEdges = previousSettings.RouteEdges
    ret.approximateRouting = previousSettings.approximateRouting
    ret.logScaleEdgeForces = previousSettings.logScaleEdgeForces
    ret.displacementThreshold = previousSettings.displacementThreshold
    ret.minConstraintLevel = previousSettings.minConstraintLevel
    ret.maxConstraintLevel = previousSettings.maxConstraintLevel
    ret.attractiveInterClusterForceConstant = previousSettings.attractiveInterClusterForceConstant
    ret.clusterGravity = previousSettings.clusterGravity
    ret.PackingAspectRatio = previousSettings.PackingAspectRatio
    ret.NodeSeparation = previousSettings.NodeSeparation
    ret.clusterMargin = previousSettings.clusterMargin
    return ret
  }

  clusterGravity = 1

  //  Controls how tightly members of clusters are pulled together

  public get ClusterGravity(): number {
    return this.clusterGravity
  }
  public set ClusterGravity(value: number) {
    this.clusterGravity = value
  }

  //      creates the settings that seems working

  //  <returns></returns>
  public static CreateFastIncrementalLayoutSettings(): IPsepColaSetting {
    const f = new IPsepColaSetting()
    f.ApplyForces = false
    f.ApproximateRepulsion = true
    f.ApproximateRouting = true
    f.AttractiveForceConstant = 1.0
    f.AttractiveInterClusterForceConstant = 1.0
    f.AvoidOverlaps = true
    f.ClusterGravity = 1.0
    f.Decay = 0.9
    f.DisplacementThreshold = 0.00000005
    f.Friction = 0.8
    f.GravityConstant = 1.0
    f.InitialStepSize = 2.0
    f.InterComponentForces = false
    f.Iterations = 0
    f.LogScaleEdgeForces = false
    f.MaxConstraintLevel = 2
    f.MaxIterations = 20
    f.MinConstraintLevel = 0
    f.MinorIterations = 1
    f.ProjectionIterations = 5
    f.RepulsiveForceConstant = 2.0
    f.RespectEdgePorts = false
    f.RouteEdges = false
    f.RungeKuttaIntegration = true
    f.NodeSeparation = 20
    return f
  }
}
