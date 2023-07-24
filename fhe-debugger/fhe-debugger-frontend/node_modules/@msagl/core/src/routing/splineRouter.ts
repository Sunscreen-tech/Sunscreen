import {Shape} from './shape'
import {mkRTree} from '../math/geometry/RTree/rTree'
import {GeomEdge} from '../layout/core/geomEdge'
import {RelativeFloatingPort} from '../layout/core/relativeFloatingPort'
import {Point} from '../math/geometry/point'
import {Algorithm} from '../utils/algorithm'
import {Curve, CurveFactory, ICurve, LineSegment, PointLocation, Polyline, Rectangle} from '../math/geometry'
import {PolylinePoint} from '../math/geometry/polylinePoint'
import {closeDistEps} from '../utils/compare'
import {PointSet} from '../utils/PointSet'
import {RTree} from '../math/geometry/RTree/rTree'
import {LineSweeper} from './spline/coneSpanner/LineSweeper'
import {VisibilityGraph} from './visibility/VisibilityGraph'
import {TightLooseCouple} from './TightLooseCouple'
import {VisibilityEdge} from './visibility/VisibilityEdge'
import {ConeSpanner} from './spline/coneSpanner/ConeSpanner'
import {HookUpAnywhereFromInsidePort} from '../layout/core/hookUpAnywhereFromInsidePort'
import {ClusterBoundaryPort} from './ClusterBoundaryPort'
import {
  createRectangleNodeOnData,
  CreateRectNodeOnArrayOfRectNodes,
  mkRectangleNode,
  RectangleNode,
} from '../math/geometry/RTree/rectangleNode'
import {CurvePort} from '../layout/core/curvePort'
import {BundlingSettings} from './BundlingSettings'
import {Assert, CancelToken, GeomGraph} from '..'
import {EdgeRoutingSettings} from './EdgeRoutingSettings'
import {ShapeCreatorForRoutingToParents} from './ShapeCreatorForRoutingToParents'
import {Port} from '../layout/core/port'
import {ShapeObstacleCalculator} from './ShapeObstacleCalculator'
import {InteractiveEdgeRouter} from './interactiveEdgeRouter'
import {SmoothedPolyline} from '../math/geometry/smoothedPolyline'
import {addRange, uniteSets, insertRange, setIntersection, setsAreEqual} from '../utils/setOperations'
import {Queue} from 'queue-typescript'
import {Arrowhead} from '../layout/core/arrowhead'
import {Polygon} from './visibility/Polygon'
import {PointPairMap} from '../utils/pointPairMap'
import {InteractiveObstacleCalculator} from './interactiveObstacleCalculator'
import {ShapeCreator} from './ShapeCreator'
import {getEdgeRoutingSettingsFromAncestorsOrDefault} from '../layout/driver'
import {PointPair} from '../math/geometry/pointPair'
import {MultiEdgeRouter} from './MultiEdgeRouter'
import {BundleRouter} from './spline/bundling/BundleRouter'
import {SdShortestPath} from './spline/bundling/SdShortestPath'
import {Cdt, createCDTOnPolylineRectNode} from './ConstrainedDelaunayTriangulation/Cdt'
import {CdtEdge} from './ConstrainedDelaunayTriangulation/CdtEdge'
import {DebugCurve} from '../math/geometry/debugCurve'

import {PathOptimizer} from './spline/pathOptimizer'
import {CrossRectangleNodes} from '../math/geometry/RTree/rectangleNodeUtils'
import {Node} from '..'
import {edgeNodesBelongToSet} from '../structs/graph'
import {initRandom} from '../utils/random'
import {RelativeShape} from './RelativeShape'
/**  routing edges around shapes */
export class SplineRouter extends Algorithm {
  // setting this to true forces the calculation to go on even when node overlaps are present
  //
  continueOnOverlaps = true
  obstacleCalculator: ShapeObstacleCalculator
  /** each polyline points to the nodes within it, maximal with this property */
  loosePolylinesToNodes: Map<Polyline, Set<Node>>
  get ContinueOnOverlaps(): boolean {
    return this.continueOnOverlaps
  }
  set ContinueOnOverlaps(value: boolean) {
    this.continueOnOverlaps = value
  }

  rootShapes: Shape[]

  coneAngle: number

  tightPadding: number
  loosePadding: number
  get LoosePadding(): number {
    return this.loosePadding
  }
  set LoosePadding(value: number) {
    this.loosePadding = value
  }

  rootWasCreated: boolean

  root: Shape

  visGraph: VisibilityGraph

  ancestorSets: Map<Shape, Set<Shape>>

  shapesToTightLooseCouples: Map<Shape, TightLooseCouple> = new Map<Shape, TightLooseCouple>()

  portsToShapes: Map<Port, Shape>
  portsToEnterableShapes: Map<Port, Set<Shape>>

  portRTree: RTree<Point, Point>

  looseRoot: Shape

  BundlingSettings: BundlingSettings
  enterableLoose: Map<GeomEdge, Set<Polyline>>
  enterableTight: Map<GeomEdge, Set<Polyline>>

  geomGraph: GeomGraph

  multiEdgesSeparation = 0.5

  private routeMultiEdgesAsBundles = true

  UseEdgeLengthMultiplier: boolean

  // if set to true the algorithm will try to shortcut a shortest polyline inner points
  UsePolylineEndShortcutting = true

  // if set to true the algorithm will try to shortcut a shortest polyline start and end
  UseInnerPolylingShortcutting = true

  AllowedShootingStraightLines = true

  get MultiEdgesSeparation(): number {
    return this.multiEdgesSeparation
  }
  set MultiEdgesSeparation(value: number) {
    this.multiEdgesSeparation = value
  }

  static mk2(graph: GeomGraph, edgeRoutingSettings: EdgeRoutingSettings) {
    return SplineRouter.mk5(
      graph,
      edgeRoutingSettings.Padding,
      edgeRoutingSettings.PolylinePadding,
      edgeRoutingSettings.ConeAngle,
      edgeRoutingSettings.bundlingSettings,
    )
  }

  static mk4(graph: GeomGraph, tightTightPadding: number, loosePadding: number, coneAngle: number): SplineRouter {
    return new SplineRouter(graph, Array.from(graph.deepEdges), tightTightPadding, loosePadding, coneAngle, null)
  }

  // Creates a spline group router for the given graph
  static mk5(graph: GeomGraph, tightTightPadding: number, loosePadding: number, coneAngle: number, bundlingSettings: BundlingSettings) {
    return new SplineRouter(graph, Array.from(graph.deepEdges), tightTightPadding, loosePadding, coneAngle, bundlingSettings)
  }

  // Creates a spline group router for a given GeomGraph.
  constructor(
    graph: GeomGraph,
    edges: Array<GeomEdge>,
    tightPadding = 1,
    loosePadding = 2,
    coneAngle = 30 * (Math.PI / 180),
    bundlingSettings: BundlingSettings = null,
    cancelToken: CancelToken = null,
  ) {
    super(cancelToken)
    this.edges = edges
    this.BundlingSettings = bundlingSettings
    this.geomGraph = graph
    this.LoosePadding = loosePadding
    this.tightPadding = tightPadding
    this.coneAngle = coneAngle
    this.routeMultiEdgesAsBundles = edges.length < 1000 && graph.deepNodeCount < 1000
  }

  private edges: GeomEdge[]
  static mk6(
    graph: GeomGraph,
    tightPadding: number,
    loosePadding: number,
    coneAngle: number,
    inParentEdges: Array<GeomEdge>,
    outParentEdges: Array<GeomEdge>,
  ): SplineRouter {
    const ret = SplineRouter.mk4(graph, tightPadding, loosePadding, coneAngle)
    const obstacles = ShapeCreatorForRoutingToParents.GetShapes(inParentEdges, outParentEdges)
    ret.Initialize(obstacles, coneAngle)
    return ret
  }
  Initialize(obstacles: Array<Shape>, coneAngleValue: number) {
    this.rootShapes = obstacles.filter((s) => s.Parents == null || s.Parents.length === 0)
    this.coneAngle = coneAngleValue
    if (this.coneAngle === 0) {
      this.coneAngle = Math.PI / 6
    }
  }

  // Executes the algorithm.
  run() {
    if (this.edges.length == 0) {
      return
    }

    if (this.geomGraph.isEmpty()) {
      return
    }
    const obstacles = ShapeCreator.GetShapes(this.geomGraph, this.edges)
    if (
      this.BundlingSettings == null &&
      this.geomGraph.layoutSettings &&
      this.geomGraph.layoutSettings.commonSettings.edgeRoutingSettings &&
      this.geomGraph.layoutSettings.commonSettings.edgeRoutingSettings.bundlingSettings
    ) {
      this.BundlingSettings = this.geomGraph.layoutSettings.commonSettings.edgeRoutingSettings.bundlingSettings
    }

    this.Initialize(obstacles, this.coneAngle)
    this.GetOrCreateRoot()
    this.RouteOnRoot()
    this.RemoveRoot()
  }

  /** Uses the existing routes and optimizing them only to avoid 'activeNodes'.   */
  rerouteOnSubsetOfNodes(activeNodes: Set<Node>) {
    this.RouteMultiEdgesAsBundles = false
    this.edges = Array.from(this.geomGraph.deepEdges).filter((e) => edgeNodesBelongToSet(e.edge, activeNodes))
    const obstacles = ShapeCreator.GetShapes(this.geomGraph, this.edges)
    this.rootShapes = obstacles.filter((s) => s.Parents == null || s.Parents.length === 0)
    this.GetOrCreateRoot()
    this.CalculateShapeToBoundaries(this.root)
    this.calcLooseShapesToNodes()
    this.CalculatePortsToShapes()
    this.rerouteOnActiveNodes(activeNodes)
    this.RemoveRoot()
  }
  calcLooseShapesToNodes() {
    this.loosePolylinesToNodes = new Map<Polyline, Set<Node>>()
    if (!this.OverlapsDetected) {
      for (const [nodeShape, cpl] of this.shapesToTightLooseCouples) {
        this.loosePolylinesToNodes.set(cpl.LooseShape.BoundaryCurve as Polyline, new Set<Node>([(<RelativeShape>nodeShape).node.node]))
      }
      return
    }

    const nodeTree = createRectangleNodeOnData(this.geomGraph.nodesBreadthFirst, (n) => n.boundingBox)
    const looseTree = this.GetLooseHierarchy()
    CrossRectangleNodes(looseTree, nodeTree, (poly, geomNode) => {
      if (Curve.CurveIsInsideOther(geomNode.boundaryCurve, poly)) {
        let polyNodes = this.loosePolylinesToNodes.get(poly)

        for (const an of geomNode.getAncestors()) {
          if (an instanceof GeomGraph && an.parent == null) continue
          if (an.boundaryCurve == null) continue
          if (Curve.CurveIsInsideOther(an.boundaryCurve, poly)) return // we need to take an ancestor instead
        }
        if (polyNodes == null) {
          this.loosePolylinesToNodes.set(poly, (polyNodes = new Set<Node>()))
        }
        polyNodes.add(geomNode.node)
      }
    })
  }

  RouteOnRoot() {
    initRandom(0)
    this.CalculatePortsToShapes()
    this.CalculatePortsToEnterableShapes()
    this.CalculateShapeToBoundaries(this.root)
    if (this.OverlapsDetected && !this.ContinueOnOverlaps) {
      return
    }

    this.BindLooseShapes()
    this.SetLoosePolylinesForAnywherePorts()
    this.CalculateVisibilityGraph()
    this.RouteOnVisGraph()
  }

  CalculatePortsToEnterableShapes() {
    this.portsToEnterableShapes = new Map<Port, Set<Shape>>()
    for (const [port, shape] of this.portsToShapes) {
      const portShapes = new Set<Shape>()
      if (!SplineRouter.EdgesAttachedToPortAvoidTheNode(port)) {
        portShapes.add(shape)
      }

      this.portsToEnterableShapes.set(port, portShapes)
    }

    for (const rootShape of this.rootShapes) {
      for (const sh of rootShape.Descendants()) {
        for (const port of sh.Ports) {
          const enterableSet = this.portsToEnterableShapes.get(port)
          insertRange(
            enterableSet,
            Array.from(sh.Ancestors()).filter((s) => s.BoundaryCurve != null),
          )
        }
      }
    }
  }

  static EdgesAttachedToPortAvoidTheNode(port: Port): boolean {
    return port instanceof CurvePort || port instanceof ClusterBoundaryPort
  }

  SetLoosePolylinesForAnywherePorts() {
    for (const [shape, cpl] of this.shapesToTightLooseCouples) {
      for (const port of shape.Ports) {
        const isHport = port instanceof HookUpAnywhereFromInsidePort

        if (isHport) {
          const aport = <HookUpAnywhereFromInsidePort>port
          aport.LoosePolyline = <Polyline>cpl.LooseShape.BoundaryCurve
        }

        if (port instanceof ClusterBoundaryPort) {
          const c = <ClusterBoundaryPort>port
          c.LoosePolyline = <Polyline>cpl.LooseShape.BoundaryCurve
        }
      }
    }
  }

  BindLooseShapes() {
    this.looseRoot = new Shape()
    for (const shape of this.root.Children) {
      const looseShape = this.shapesToTightLooseCouples.get(shape).LooseShape
      this.BindLooseShapesUnderShape(shape)
      this.looseRoot.AddChild(looseShape)
    }
  }

  BindLooseShapesUnderShape(shape: Shape) {
    const loose = this.shapesToTightLooseCouples.get(shape).LooseShape
    for (const child of shape.Children) {
      const childLooseShape = this.shapesToTightLooseCouples.get(child).LooseShape
      loose.AddChild(childLooseShape)
      this.BindLooseShapesUnderShape(child)
    }
  }

  CalculateShapeToBoundaries(shape: Shape) {
    this.ProgressStep()
    if (shape.Children.length === 0) {
      return
    }

    for (const child of shape.Children) {
      this.CalculateShapeToBoundaries(child)
    }

    this.obstacleCalculator = new ShapeObstacleCalculator(
      shape,
      this.tightPadding,
      this.AdjustedLoosePadding,
      this.shapesToTightLooseCouples,
    )
    this.obstacleCalculator.Calculate(0.01)
    this.OverlapsDetected ||= this.obstacleCalculator.OverlapsDetected
  }

  private _overlapsDetected = false
  get OverlapsDetected() {
    return this._overlapsDetected
  }
  set OverlapsDetected(value) {
    this._overlapsDetected = value
  }

  get AdjustedLoosePadding(): number {
    return this.BundlingSettings == null ? this.LoosePadding : this.LoosePadding * BundleRouter.SuperLoosePaddingCoefficient
  }

  GroupEdgesByPassport(): Array<{
    passport: Set<Shape>
    edges: Array<GeomEdge>
  }> {
    const ret = new Array<{passport: Set<Shape>; edges: Array<GeomEdge>}>()
    for (const edge of this.edges) {
      const edgePassport = this.EdgePassport(edge) // todo : is ret.find() too slow?
      let pair = ret.find((p) => setsAreEqual(p.passport, edgePassport))
      if (!pair) {
        pair = {passport: edgePassport, edges: []}
        ret.push(pair)
      }
      pair.edges.push(edge)
    }
    return ret
  }

  RouteOnVisGraph() {
    this.ancestorSets = SplineRouter.GetAncestorSetsMap(Array.from(this.root.Descendants()))
    if (this.BundlingSettings == null) {
      const edgeGroups = this.GroupEdgesByPassport()
      for (let i = 0; i < edgeGroups.length; i++) {
        const edgeGroup = edgeGroups[i]
        const passport = edgeGroup.passport
        const obstacleShapes: Set<Shape> = this.GetObstaclesFromPassport(passport)
        const interactiveEdgeRouter = this.CreateInteractiveEdgeRouter(Array.from(obstacleShapes))
        this.RouteEdgesWithTheSamePassport(edgeGroup, interactiveEdgeRouter, obstacleShapes)
      }
    } else {
      this.RouteBundles()
    }
  }

  private rerouteOnActiveNodes(activeNodeSet: Set<Node>) {
    this.ancestorSets = SplineRouter.GetAncestorSetsMap(Array.from(this.root.Descendants()))
    if (this.BundlingSettings == null) {
      for (const edgeGroup of this.GroupEdgesByPassport()) {
        const passport = edgeGroup.passport
        const obstacleShapes: Set<Shape> = this.GetObstaclesFromPassport(passport)
        const filteredObstacleShapes = new Set<Shape>()
        for (const sh of obstacleShapes) {
          const lsh = this.LooseShapeOfOriginalShape(sh)
          for (const n of this.loosePolylinesToNodes.get(lsh.BoundaryCurve as Polyline)) {
            if (activeNodeSet.has(n)) {
              filteredObstacleShapes.add(sh)
            }
          }
        }
        const interactiveEdgeRouter = this.CreateInteractiveEdgeRouter(Array.from(filteredObstacleShapes))
        this.rerouteEdgesWithTheSamePassportActiveNodes(edgeGroup, interactiveEdgeRouter, filteredObstacleShapes, activeNodeSet)
      }
    } else {
      this.RouteBundles()
    }
  }
  getDebugCurvesFromEdgesAndCdt(cdt: Cdt): DebugCurve[] {
    const ret = Array.from(this.geomGraph.deepEdges)
      .map((e) => e.curve as Polyline)
      .filter((c) => c != null)
      .filter((c) => c.count > 5)
      .map((c) => DebugCurve.mkDebugCurveTWCI(200, 1, 'Red', c))
    for (const s of cdt.PointsToSites.values()) {
      for (const e of s.Edges) {
        ret.push(
          DebugCurve.mkDebugCurveTWCI(200, 0.5, e.constrained ? 'Blue' : 'Green', LineSegment.mkPP(e.lowerSite.point, e.upperSite.point)),
        )
      }
    }

    return ret
  }

  private RouteEdgesWithTheSamePassport(
    edgeGeometryGroup: {passport: Set<Shape>; edges: Array<GeomEdge>},
    interactiveEdgeRouter: InteractiveEdgeRouter,
    obstacleShapes: Set<Shape>,
  ) {
    const t: {regularEdges: Array<GeomEdge>; multiEdges: Array<GeomEdge[]>} = {
      regularEdges: [],
      multiEdges: [],
    }
    try {
      const cdtOnLooseObstacles = this.getCdtFromPassport(obstacleShapes)
      interactiveEdgeRouter.pathOptimizer.setCdt(cdtOnLooseObstacles)
    } catch (e: any) {
      interactiveEdgeRouter.pathOptimizer.setCdt(null)
    }
    if (this.RouteMultiEdgesAsBundles) {
      this.SplitOnRegularAndMultiedges(edgeGeometryGroup.edges, t)
      if (t.regularEdges.length > 0) {
        for (let i = 0; i < t.regularEdges.length; i++) {
          this.routeEdge(interactiveEdgeRouter, t.regularEdges[i])
        }
      }
      if (t.multiEdges != null) {
        this.ScaleDownLooseHierarchy(interactiveEdgeRouter, obstacleShapes)
        this.RouteMultiEdges(t.multiEdges, interactiveEdgeRouter, edgeGeometryGroup.passport)
      }
    } else {
      for (let i = 0; i < edgeGeometryGroup.edges.length; i++) {
        this.routeEdge(interactiveEdgeRouter, edgeGeometryGroup.edges[i])
      }
    }
  }
  /** edgeToPolys maps edges to their original polyline routes */
  private rerouteEdgesWithTheSamePassportActiveNodes(
    edgeGeometryGroup: {passport: Set<Shape>; edges: Array<GeomEdge>},
    interactiveEdgeRouter: InteractiveEdgeRouter,
    obstacleShapes: Set<Shape>,
    activeNodes: Set<Node>,
  ) {
    const t: {regularEdges: Array<GeomEdge>; multiEdges: Array<GeomEdge[]>} = {
      regularEdges: [],
      multiEdges: [],
    }
    try {
      const cdtOnLooseObstacles = this.getCdtFromPassport(obstacleShapes)

      interactiveEdgeRouter.pathOptimizer.setCdt(cdtOnLooseObstacles)
    } catch (e: any) {
      console.log(e)
      interactiveEdgeRouter.pathOptimizer.setCdt(null)
    }
    if (this.RouteMultiEdgesAsBundles) {
      this.SplitOnRegularAndMultiedges(edgeGeometryGroup.edges, t)
      if (t.regularEdges.length > 0) {
        for (let i = 0; i < t.regularEdges.length; i++) {
          const e = t.regularEdges[i]
          Assert.assert(edgeNodesBelongToSet(e.edge, activeNodes))
          this.rerouteEdge(interactiveEdgeRouter, e)
        }
      }
      if (t.multiEdges != null) {
        this.ScaleDownLooseHierarchy(interactiveEdgeRouter, obstacleShapes)
        this.RouteMultiEdges(t.multiEdges, interactiveEdgeRouter, edgeGeometryGroup.passport)
      }
    } else {
      for (let i = 0; i < edgeGeometryGroup.edges.length; i++) {
        const e = edgeGeometryGroup.edges[i]
        if (edgeNodesBelongToSet(e.edge, activeNodes)) {
          this.rerouteEdge(interactiveEdgeRouter, e)
        }
      }
    }
  }
  /** poly gives the polyline to reroute */
  private rerouteEdge(interactiveEdgeRouter: InteractiveEdgeRouter, edge: GeomEdge) {
    try {
      interactiveEdgeRouter.rerouteEdge(edge)
      Arrowhead.trimSplineAndCalculateArrowheadsII(edge, edge.sourcePort.Curve, edge.targetPort.Curve, edge.curve, false)
    } catch (e: any) {
      // It is fine for reroute to fail
      // Just do nothing in this case: the edge will remain unchanged.
      // this happens when the polyline corresponding to the edge is crossing a loose polyline, passinge too close to a node.
      // This might happen, for example, when the polyline was generated by from the Sugiyama layout.
      // Consider in the future to try to fix the polyline in this case, TODO
    }
  }
  private getCdtFromPassport(passport: Set<Shape>): Cdt {
    // we need a set here because a loose polyline could be the same for different shapes
    // in the case of overlaps
    const loosePolys = new Set<Polyline>()
    const ports: Point[] = []
    // we cannot rely on the bounding box of the graph because it is not updated, or might be too large - would create thin triangles
    const bb = Rectangle.mkEmpty()
    for (const shape of passport) {
      const lp = this.LoosePolyOfOriginalShape(shape)
      if (lp == null) continue
      loosePolys.add(lp)
      for (const port of shape.Ports) {
        ports.push(port.Location)
      }
      bb.addRecSelf(lp.boundingBox)
    }

    bb.pad(Math.max(bb.diagonal / 4, 100))

    const lps = Array.from(loosePolys)
    lps.push(bb.perimeter()) // this will give some space for the edges to be routed near the graph border

    const cdt = new Cdt(ports, lps, [])
    cdt.run()
    return cdt
  }

  // if set to true routes multi edges as ordered bundles
  get RouteMultiEdgesAsBundles(): boolean {
    return this.routeMultiEdgesAsBundles
  }
  set RouteMultiEdgesAsBundles(value: boolean) {
    this.routeMultiEdgesAsBundles = value
  }

  private routeEdge(interactiveEdgeRouter: InteractiveEdgeRouter, edge: GeomEdge) {
    const transparentShapes = this.makeTransparentShapesOfEdgeAndGetTheShapes(edge)
    this.ProgressStep()
    this.RouteEdgeInternal(edge, interactiveEdgeRouter)
    SplineRouter.SetTransparency(transparentShapes, false)
  }

  ScaleDownLooseHierarchy(interactiveEdgeRouter: InteractiveEdgeRouter, obstacleShapes: Set<Shape>) {
    const loosePolys = new Array<Polyline>()
    for (const obstacleShape of obstacleShapes) {
      const tl = this.shapesToTightLooseCouples.get(obstacleShape)
      loosePolys.push(
        InteractiveObstacleCalculator.LoosePolylineWithFewCorners(
          tl.TightPolyline,
          tl.Distance / 1.1, // 1.1 is BundleRouter.SuperLoosePaddingCoefficient,
          0,
        ),
      )
    }

    interactiveEdgeRouter.LooseHierarchy = SplineRouter.CreateLooseObstacleHierarachy(loosePolys)
    interactiveEdgeRouter.ClearActivePolygons()
    interactiveEdgeRouter.AddActivePolygons(loosePolys.map((poly) => new Polygon(poly)))
  }

  RouteMultiEdges(multiEdges: Array<GeomEdge[]>, interactiveEdgeRouter: InteractiveEdgeRouter, parents: Set<Shape>) {
    const nodeBoundaries: ICurve[] = []
    for (const p of parents) {
      for (const ch of p.Children) nodeBoundaries.push(ch.BoundaryCurve)
    }
    const bs = new BundlingSettings()
    //giving more importance to ink might produce weird routings with huge detours, maybe 0 is the best value here
    bs.InkImportance = 0.00001
    bs.EdgeSeparation = this.MultiEdgesSeparation

    const mer = new MultiEdgeRouter(multiEdges, interactiveEdgeRouter, nodeBoundaries, bs, (a) =>
      this.makeTransparentShapesOfEdgeAndGetTheShapes(a),
    )

    mer.run()
  }

  SplitOnRegularAndMultiedges(edges: Iterable<GeomEdge>, t: {regularEdges: Array<GeomEdge>; multiEdges: Array<GeomEdge[]>}) {
    const portLocationPairsToEdges = new PointPairMap<Array<GeomEdge>>()
    for (const eg of edges) {
      if (SplineRouter.IsEdgeToParent(eg)) {
        t.regularEdges.push(eg)
      } else {
        SplineRouter.RegisterInPortLocationsToEdges(eg, portLocationPairsToEdges)
      }
    }

    t.multiEdges = null
    for (const edgeGroup of portLocationPairsToEdges.values()) {
      if (edgeGroup.length === 1 || this.OverlapsDetected) {
        addRange(t.regularEdges, edgeGroup)
      } else {
        if (t.multiEdges == null) {
          t.multiEdges = new Array<GeomEdge[]>()
        }
        t.multiEdges.push(edgeGroup)
      }
    }
  }

  static RegisterInPortLocationsToEdges(eg: GeomEdge, portLocationPairsToEdges: PointPairMap<Array<GeomEdge>>) {
    let list: Array<GeomEdge>
    const pp = new PointPair(eg.sourcePort.Location, eg.targetPort.Location)
    list = portLocationPairsToEdges.get(pp)
    if (!list) {
      list = new Array<GeomEdge>()
      portLocationPairsToEdges.set(pp, list)
    }
    list.push(eg)
  }

  static IsEdgeToParent(e: GeomEdge): boolean {
    return e.sourcePort instanceof HookUpAnywhereFromInsidePort || e.targetPort instanceof HookUpAnywhereFromInsidePort
  }

  CreateInteractiveEdgeRouter(obstacleShapes: Array<Shape>): InteractiveEdgeRouter {
    // we need to create a set here because one loose polyline can hold several original shapes
    const loosePolys = new Set<Polyline>(
      obstacleShapes.map((sh) => <Polyline>this.shapesToTightLooseCouples.get(sh).LooseShape.BoundaryCurve),
    )
    const router = new InteractiveEdgeRouter(this.cancelToken)
    router.pathOptimizer = new PathOptimizer()
    router.ObstacleCalculator = new InteractiveObstacleCalculator(
      obstacleShapes.map((sh) => sh.BoundaryCurve),
      this.tightPadding,
      this.loosePadding,
      false,
    )

    router.VisibilityGraph = this.visGraph
    router.TightHierarchy = this.CreateTightObstacleHierarachy(obstacleShapes)
    router.LooseHierarchy = SplineRouter.CreateLooseObstacleHierarachy(Array.from(loosePolys))
    router.UseSpanner = true
    router.LookForRoundedVertices = true
    router.TightPadding = this.tightPadding
    router.LoosePadding = this.LoosePadding
    router.UseEdgeLengthMultiplier = this.UseEdgeLengthMultiplier

    router.UsePolylineEndShortcutting = this.UsePolylineEndShortcutting
    router.UseInnerPolylingShortcutting = this.UseInnerPolylingShortcutting
    router.AllowedShootingStraightLines = this.AllowedShootingStraightLines
    router.AddActivePolygons(Array.from(loosePolys).map((polyline) => new Polygon(polyline)))

    return router
  }

  GetObstaclesFromPassport(passport: Set<Shape>): Set<Shape> {
    if (passport.size === 0) {
      return new Set<Shape>(this.root.Children)
    }

    const commonAncestors = this.GetCommonAncestorsAbovePassport(passport)
    const allAncestors = this.GetAllAncestors(passport)
    const ret = new Set<Shape>()
    for (const p of passport) {
      for (const child of p.Children) {
        if (!allAncestors.has(child)) ret.add(child)
      }
    }
    const enqueued = uniteSets(new Set<Shape>(passport), ret)
    const queue = new Queue<Shape>()

    for (const shape of passport) {
      if (!commonAncestors.has(shape)) queue.enqueue(shape)
    }

    while (queue.length > 0) {
      const a = queue.dequeue()
      for (const parent of a.Parents) {
        for (const sibling of parent.Children) {
          if (!allAncestors.has(sibling)) {
            ret.add(sibling)
          }
        }

        if (!commonAncestors.has(parent) && !enqueued.has(parent)) {
          queue.enqueue(parent)
          enqueued.add(parent)
        }
      }
    }

    return ret
  }

  GetAllAncestors(passport: Set<Shape>): Set<Shape> {
    if (passport.size === 0) {
      return new Set<Shape>()
    }

    let ret = new Set<Shape>(passport)
    for (const shape of passport) {
      ret = uniteSets(ret, this.ancestorSets.get(shape))
    }

    return ret
  }

  GetCommonAncestorsAbovePassport(passport: Set<Shape>): Set<Shape> {
    if (passport.size === 0) {
      return new Set<Shape>()
    }

    const en = Array.from(passport)
    let ret = this.ancestorSets.get(en[0])
    for (let i = 1; i < en.length; i++) {
      const shape = en[i]
      ret = setIntersection(ret, this.ancestorSets.get(shape))
    }

    return ret
  }

  RouteBundles() {
    this.ScaleLooseShapesDown()
    this.CalculateEdgeEnterablePolylines()
    const looseHierarchy = this.GetLooseHierarchy()
    const cdt = createCDTOnPolylineRectNode(looseHierarchy)
    // CdtSweeper.ShowFront(cdt.GetTriangles(), null, null,this.visGraph.Edges.Select(e=>new LineSegment(e.SourcePoint,e.TargetPoint)));
    const shortestPath = new SdShortestPath((a) => this.makeTransparentShapesOfEdgeAndGetTheShapes(a), cdt, this.FindCdtGates(cdt))
    const bundleRouter = new BundleRouter(
      this.edges,
      shortestPath,
      this.visGraph,
      this.BundlingSettings,
      this.LoosePadding,
      this.GetTightHierarchy(),
      looseHierarchy,
      this.enterableLoose,
      this.enterableTight,
      (port) => this.LoosePolyOfOriginalShape(this.portsToShapes.get(port)),
    )
    bundleRouter.run()
  }

  CreateTheMapToParentLooseShapes(shape: Shape, loosePolylinesToLooseParentShapeMap: Map<ICurve, Shape>) {
    for (const childShape of shape.Children) {
      const tightLooseCouple = this.shapesToTightLooseCouples.get(childShape)
      const poly = tightLooseCouple.LooseShape.BoundaryCurve
      loosePolylinesToLooseParentShapeMap.set(poly, shape)
      this.CreateTheMapToParentLooseShapes(childShape, loosePolylinesToLooseParentShapeMap)
    }
  }

  FindCdtGates(cdt: Cdt): Set<CdtEdge> {
    const loosePolylinesToLooseParentShapeMap: Map<ICurve, Shape> = new Map<ICurve, Shape>()
    this.CreateTheMapToParentLooseShapes(this.root, loosePolylinesToLooseParentShapeMap)
    // looking for Cdt edges connecting two siblings; only those we define as gates
    const gates = new Set<CdtEdge>()
    for (const cdtSite of cdt.PointsToSites.values()) {
      for (const cdtEdge of cdtSite.Edges) {
        if (cdtEdge.CwTriangle == null && cdtEdge.CcwTriangle == null) {
          continue
        }

        const a = <Polyline>cdtSite.Owner
        const b = <Polyline>cdtEdge.lowerSite.Owner
        if (a === b) {
          continue
        }

        const aParent: Shape = loosePolylinesToLooseParentShapeMap.get(a)
        if (aParent) {
          const bParent: Shape = loosePolylinesToLooseParentShapeMap.get(b)
          if (aParent === bParent) {
            gates.add(cdtEdge)
          }
        }
      }
    }

    // CdtSweeper.ShowFront(cdt.GetTriangles(), null,
    //                    gates.Select(g => new LineSegment(g.upperSite.Point, g.lowerSite.Point)), null);
    return gates
  }

  CalculateEdgeEnterablePolylines() {
    this.enterableLoose = new Map<GeomEdge, Set<Polyline>>()
    this.enterableTight = new Map<GeomEdge, Set<Polyline>>()
    for (const edge of this.edges) {
      const looseSet = new Set<Polyline>()
      const tightSet = new Set<Polyline>()
      this.GetEdgeEnterablePolylines(edge, looseSet, tightSet)
      this.enterableLoose.set(edge, looseSet)
      this.enterableTight.set(edge, tightSet)
    }
  }

  GetEdgeEnterablePolylines(edge: GeomEdge, looseEnterable: Set<Polyline>, tightEnterable: Set<Polyline>) {
    const sourceShape = this.portsToShapes.get(edge.sourcePort)
    const targetShape = this.portsToShapes.get(edge.targetPort)
    if (sourceShape !== this.root) {
      this.GetEnterablesForShape(sourceShape, looseEnterable, tightEnterable)
    }
    if (targetShape !== this.root) {
      this.GetEnterablesForShape(targetShape, looseEnterable, tightEnterable)
    }
  }

  GetEnterablesForShape(shape: Shape, looseEnterable: Set<Polyline>, tightEnterable: Set<Polyline>) {
    for (const a of this.ancestorSets.get(shape)) {
      const la = this.LoosePolyOfOriginalShape(a)
      if (la) {
        looseEnterable.add(la)
      }
      const ta = this.TightPolyOfOriginalShape(a)
      if (ta) {
        tightEnterable.add(ta)
      }
    }
  }

  GetTightHierarchy(): RectangleNode<Polyline, Point> {
    return CreateRectNodeOnArrayOfRectNodes(
      Array.from(this.shapesToTightLooseCouples.values()).map((tl) => mkRectangleNode(tl.TightPolyline, tl.TightPolyline.boundingBox)),
    )
  }

  GetLooseHierarchy(): RectangleNode<Polyline, Point> {
    const loosePolylines = new Set<Polyline>()
    for (const t of this.shapesToTightLooseCouples.values()) {
      loosePolylines.add(<Polyline>t.LooseShape.BoundaryCurve)
    }
    return CreateRectNodeOnArrayOfRectNodes(Array.from(loosePolylines).map((p) => mkRectangleNode(p, p.boundingBox)))
  }

  ScaleLooseShapesDown() {
    for (const [, tl] of this.shapesToTightLooseCouples) {
      tl.LooseShape.BoundaryCurve = InteractiveObstacleCalculator.LoosePolylineWithFewCorners(
        tl.TightPolyline,
        tl.Distance / BundleRouter.SuperLoosePaddingCoefficient,
        0, // randomizationShift
      )
    }
  }

  /**
   * The set of shapes where the edge source and target ports shapes are citizens: the shapes who's interior the edge can cross
   *   In the simple case it is the union of the target port shape parents and the sourceport shape parents.
   *   When one end shape contains another, the passport is the set consisting of the end shape and all other shape parents.
   */
  EdgePassport(edge: GeomEdge): Set<Shape> {
    const ret = new Set<Shape>()
    const sourceShape = this.portsToShapes.get(edge.sourcePort)
    const targetShape = this.portsToShapes.get(edge.targetPort)
    if (this.IsAncestor(sourceShape, targetShape)) {
      insertRange(ret, targetShape.Parents)
      ret.add(sourceShape)
      return ret
    }

    if (this.IsAncestor(targetShape, sourceShape)) {
      insertRange(ret, sourceShape.Parents)
      ret.add(targetShape)
      return ret
    }

    if (sourceShape !== this.looseRoot) {
      insertRange(ret, sourceShape.Parents)
    }

    if (targetShape !== this.looseRoot) {
      insertRange(ret, targetShape.Parents)
    }

    return ret
  }

  *AllPorts(): IterableIterator<Port> {
    for (const edge of this.edges) {
      yield edge.sourcePort
      yield edge.targetPort
    }
  }

  CalculatePortsToShapes() {
    this.portsToShapes = new Map<Port, Shape>()
    for (const shape of this.root.Descendants()) {
      for (const port of shape.Ports) {
        this.portsToShapes.set(port, shape)
      }
    }

    // assign all orphan ports to the root
    for (const port of this.AllPorts()) {
      if (!this.portsToShapes.has(port)) {
        this.root.Ports.add(port)
        this.portsToShapes.set(port, this.root)
      }
    }
  }

  RouteEdgeInternal(edge: GeomEdge, iRouter: InteractiveEdgeRouter) {
    const addedEdges = new Array<VisibilityEdge>()
    if (!(edge.sourcePort instanceof HookUpAnywhereFromInsidePort)) {
      addRange(addedEdges, this.AddVisibilityEdgesFromPort(edge.sourcePort))
    }

    if (!(edge.targetPort instanceof HookUpAnywhereFromInsidePort)) {
      addRange(addedEdges, this.AddVisibilityEdgesFromPort(edge.targetPort))
    }

    const t: {smoothedPolyline: SmoothedPolyline} = {smoothedPolyline: null}
    if (!Point.closeDistEps(edge.sourcePort.Location, edge.targetPort.Location)) {
      edge.curve = iRouter.RouteSplineFromPortToPortWhenTheWholeGraphIsReady(edge.sourcePort, edge.targetPort, true, t)
    } else {
      edge.curve = GeomEdge.RouteSelfEdge(edge.sourcePort.Curve, Math.max(this.LoosePadding * 2, edge.GetMaxArrowheadLength()), t)
    }

    edge.smoothedPolyline = t.smoothedPolyline
    if (edge.curve == null) {
      throw new Error()
    }

    for (const visibilityEdge of addedEdges) {
      VisibilityGraph.RemoveEdge(visibilityEdge)
    }

    Arrowhead.trimSplineAndCalculateArrowheadsII(edge, edge.sourcePort.Curve, edge.targetPort.Curve, edge.curve, false)
    //  SetTransparency(transparentShapes, false);
  }
  /** returns ToAncestorEnum.None if the source and the target are just siblings
   *          ToAncestorEnum. if the source is a descendant of the target
   *         -1 if the target is a descendant of the source
   */
  LineSweeperPorts: Point[];

  *AddVisibilityEdgesFromPort(port: Port): IterableIterator<VisibilityEdge> {
    let portShape: Shape
    let boundaryCouple: TightLooseCouple
    if (
      port instanceof CurvePort ||
      !(portShape = this.portsToShapes.get(port)) ||
      !(boundaryCouple = this.shapesToTightLooseCouples.get(portShape))
    ) {
      return
    }

    const portLoosePoly = boundaryCouple.LooseShape

    for (const point of portLoosePoly.BoundaryCurve as Polyline) {
      if (this.visGraph.FindEdgePP(port.Location, point) == null) yield this.visGraph.AddEdgePP(port.Location, point)
    }
  }

  makeTransparentShapesOfEdgeAndGetTheShapes(edge: GeomEdge): Array<Shape> {
    // it is OK here to repeat a shape in the returned list
    const sourceShape: Shape = this.portsToShapes.get(edge.sourcePort)
    const targetShape: Shape = this.portsToShapes.get(edge.targetPort)
    const transparentLooseShapes = new Array<Shape>()
    for (const shape of this.GetTransparentShapes(edge.sourcePort, edge.targetPort, sourceShape, targetShape)) {
      if (shape != null) {
        transparentLooseShapes.push(this.LooseShapeOfOriginalShape(shape))
      }
    }

    for (const shape of this.portsToEnterableShapes.get(edge.sourcePort)) {
      transparentLooseShapes.push(this.LooseShapeOfOriginalShape(shape))
    }

    for (const shape of this.portsToEnterableShapes.get(edge.targetPort)) {
      transparentLooseShapes.push(this.LooseShapeOfOriginalShape(shape))
    }

    SplineRouter.SetTransparency(transparentLooseShapes, true)
    return transparentLooseShapes
  }

  LooseShapeOfOriginalShape(s: Shape): Shape {
    if (s === this.root) {
      return this.looseRoot
    }

    return this.shapesToTightLooseCouples.get(s).LooseShape
  }

  LoosePolyOfOriginalShape(s: Shape): Polyline {
    return <Polyline>this.LooseShapeOfOriginalShape(s).BoundaryCurve
  }

  TightPolyOfOriginalShape(s: Shape): Polyline {
    if (s === this.root) {
      return null
    }

    return this.shapesToTightLooseCouples.get(s).TightPolyline
  }

  //    static GetEdgeColor(e: VisibilityEdge, sourcePort: Port, targetPort: Port): string {
  //  if (((sourcePort == null )
  //    || (targetPort == null ))) {
  //    return "green";
  //  }

  //  if ((closeDistEps(e.SourcePoint, sourcePort.Location)
  //    || (closeDistEps(e.SourcePoint, targetPort.Location)
  //      || (closeDistEps(e.TargetPoint, sourcePort.Location) || closeDistEps(e.TargetPoint, targetPort.Location))))) {
  //    return "lightgreen";
  //  }

  //  return "green";
  //  // TODO: Warning!!!, inline IF is not supported ?
  //  ((e.IsPassable == null )
  //    || e.IsPassable());
  //  "red";
  // }

  *GetTransparentShapes(sourcePort: Port, targetPort: Port, sourceShape: Shape, targetShape: Shape): IterableIterator<Shape> {
    for (const s of this.ancestorSets.get(sourceShape)) {
      yield s
    }

    for (const s of this.ancestorSets.get(targetShape)) {
      yield s
    }

    if (!SplineRouter.EdgesAttachedToPortAvoidTheNode(sourcePort)) yield sourceShape
    if (!SplineRouter.EdgesAttachedToPortAvoidTheNode(targetPort)) yield targetShape
  }

  static SetTransparency(shapes: Iterable<Shape>, v: boolean) {
    for (const shape of shapes) {
      shape.IsTransparent = v
    }
  }

  IsAncestor(possibleAncestor: Shape, possiblePredecessor: Shape): boolean {
    let ancestors: Set<Shape>

    return (
      possiblePredecessor != null && (ancestors = this.ancestorSets.get(possiblePredecessor)) != null && ancestors.has(possibleAncestor)
    )
  }

  static CreateLooseObstacleHierarachy(loosePolys: Array<Polyline>): RectangleNode<Polyline, Point> {
    return CreateRectNodeOnArrayOfRectNodes(loosePolys.map((poly) => mkRectangleNode(poly, poly.boundingBox)))
  }

  CreateTightObstacleHierarachy(obstacles: Array<Shape>): RectangleNode<Polyline, Point> {
    const tightPolys = obstacles.map((sh) => this.shapesToTightLooseCouples.get(sh).TightPolyline)
    return CreateRectNodeOnArrayOfRectNodes(
      tightPolys.map((tightPoly) => mkRectangleNode<Polyline, Point>(tightPoly, tightPoly.boundingBox)),
    )
  }

  CalculateVisibilityGraph() {
    const setOfPortLocations = this.LineSweeperPorts != null ? PointSet.mk(this.LineSweeperPorts) : new PointSet()
    this.ProcessHookAnyWherePorts(setOfPortLocations)
    this.portRTree = mkRTree(Array.from(setOfPortLocations.values()).map((p) => [Rectangle.rectangleOnPoint(p), p]))
    this.visGraph = new VisibilityGraph()
    this.FillVisibilityGraphUnderShape(this.root)
    // debug start
    //this.dumpSvg()
    // throw new Error()
  }

  // dumpSvg() {
  //  SplineRouter.ShowVisGraph(
  //    './tmp/vg.svg',
  //    this.visGraph,
  //    Array.from(new Set<Polyline>(Array.from(this.shapesToTightLooseCouples.values()).map((tl) => <Polyline>tl.LooseShape.BoundaryCurve))),
  //    Array.from(this.geomGraph.shallowNodes)
  //      .map((n) => n.boundaryCurve)
  //      .concat(Array.from(this.root.Descendants()).map((d) => d.BoundaryCurve)),
  //    null,
  //  )
  // }

  static ShowVisGraph(
    fileName: string,
    tmpVisGraph: VisibilityGraph,
    obstacles: Array<Polyline>,
    greenCurves: Array<ICurve> = null,
    redCurves: Array<ICurve> = null,
  ) {
    const l = Array.from(tmpVisGraph.Edges).map((e) =>
      DebugCurve.mkDebugCurveTWCI(
        100,
        1,
        e.IsPassable != null && e.IsPassable() ? 'green' : 'black',
        LineSegment.mkPP(e.SourcePoint, e.TargetPoint),
      ),
    )
    if (obstacles != null) {
      for (const p of obstacles) {
        l.push(DebugCurve.mkDebugCurveTWCI(100, 0.3, 'brown', p))
        for (const t of p) {
          l.push(DebugCurve.mkDebugCurveTWCI(100, 1, 'green', CurveFactory.mkCircle(1, t)))
        }
      }
    }

    if (greenCurves != null) {
      for (const p of greenCurves) {
        l.push(DebugCurve.mkDebugCurveTWCI(100, 10, 'navy', p))
      }
    }

    if (redCurves != null) {
      for (const p of redCurves) l.push(DebugCurve.mkDebugCurveTWCI(100, 10, 'red', p))
    }

    // SvgDebugWriter.dumpDebugCurves(fileName, l)
  }
  private ProcessHookAnyWherePorts(setOfPortLocations: PointSet) {
    for (const edge of this.edges) {
      if (!(edge.sourcePort instanceof HookUpAnywhereFromInsidePort || edge.sourcePort instanceof ClusterBoundaryPort)) {
        setOfPortLocations.add(edge.sourcePort.Location)
      }

      if (!(edge.targetPort instanceof HookUpAnywhereFromInsidePort || edge.targetPort instanceof ClusterBoundaryPort)) {
        setOfPortLocations.add(edge.targetPort.Location)
      }
    }
  }

  // this function might change the shape's loose polylines by inserting new points
  FillVisibilityGraphUnderShape(shape: Shape) {
    // going depth first
    const children = shape.Children
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      this.FillVisibilityGraphUnderShape(child)
    }

    const tightLooseCouple: TightLooseCouple = this.shapesToTightLooseCouples.get(shape)
    const looseBoundary: Polyline = tightLooseCouple ? <Polyline>tightLooseCouple.LooseShape.BoundaryCurve : null
    const looseShape: Shape = tightLooseCouple ? tightLooseCouple.LooseShape : this.looseRoot
    const obstacles = new Set<Polyline>(looseShape.Children.map((c) => <Polyline>c.BoundaryCurve))
    const portLocations = this.RemoveInsidePortsAndSplitBoundaryIfNeeded(looseBoundary)

    let tmpVisGraph = new VisibilityGraph()
    let coneSpanner = ConeSpanner.mk([], tmpVisGraph, this.coneAngle, portLocations, looseBoundary)
    coneSpanner.run()
    //SplineRouter.ShowVisGraph('c:/tmp/vg' + this.debcount++ + '.svg', tmpVisGraph, Array.from(obstacles))
    // now run the spanner again to create the correct visibility graph around the inner obstacles
    tmpVisGraph = new VisibilityGraph()
    coneSpanner = ConeSpanner.mk(Array.from(obstacles), tmpVisGraph, this.coneAngle, portLocations, looseBoundary)
    coneSpanner.run()
    // SplineRouter.ShowVisGraph('./tmp/splineRouter' + ++SplineRouter.debCount + '.svg', tmpVisGraph, Array.from(obstacles))

    this.ProgressStep()
    for (const edge of tmpVisGraph.Edges) {
      this.TryToCreateNewEdgeAndSetIsPassable(edge, looseShape)
    }

    this.AddBoundaryEdgesToVisGraph(looseBoundary)
    //            if (obstacles.Count > 0)
    //                SplineRouter.ShowVisGraph(tmpVisGraph, obstacles, null, null);
  }

  // #if TEST_MSAGL

  //     static internal void ShowVisGraph(VisibilityGraph tmpVisGraph, Iterable<Polyline> obstacles, Iterable<ICurve> greenCurves, Iterable<ICurve> redCurves) {
  //       var l = new Array<DebugCurve>(tmpVisGraph.Edges.Select(e => new DebugCurve(100, 1,
  //           e.IsPassable != null && e.IsPassable() ? "green" : "black"
  //           , new LineSegment(e.SourcePoint, e.TargetPoint))));
  //       if (obstacles != null)
  //         l.AddRange(obstacles.Select(p => new DebugCurve(100, 1, "brown", p)));
  //       if (greenCurves != null)
  //         l.AddRange(greenCurves.Select(p => new DebugCurve(100, 10, "navy", p)));
  //       if (redCurves != null)
  //         l.AddRange(redCurves.Select(p => new DebugCurve(100, 10, "red", p)));
  //       LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  //     }
  // #endif
  TryToCreateNewEdgeAndSetIsPassable(edge: VisibilityEdge, looseShape: Shape) {
    let e = this.visGraph.FindEdgePP(edge.SourcePoint, edge.TargetPoint)
    if (e != null) {
      return
    }

    e = this.visGraph.AddEdgePP(edge.SourcePoint, edge.TargetPoint)
    if (looseShape != null) e.IsPassable = () => looseShape.IsTransparent
  }

  AddBoundaryEdgesToVisGraph(boundary: Polyline) {
    if (boundary == null) {
      return
    }
    let pn: PolylinePoint
    for (let p = boundary.startPoint; true; p = pn) {
      pn = p.nextOnPolyline
      this.visGraph.AddEdgePP(p.point, pn.point)
      if (pn === boundary.startPoint) {
        break
      }
    }
  }

  /** this run will split the polyline enough to route later from the inner ports */
  RemoveInsidePortsAndSplitBoundaryIfNeeded(boundary: Polyline): PointSet {
    const ret = new PointSet()
    if (boundary == null) {
      for (const point of this.portRTree.GetAllLeaves()) {
        ret.add(point)
      }

      this.portRTree.clear()
      return ret
    }

    const boundaryBox: Rectangle = boundary.boundingBox
    const portLocationsInQuestion = this.portRTree.GetAllIntersecting(boundaryBox)

    for (const point of portLocationsInQuestion) {
      switch (Curve.PointRelativeToCurveLocation(point, boundary)) {
        case PointLocation.Inside:
          ret.add(point)
          this.portRTree.Remove(Rectangle.rectangleOnPoint(point), point)
          break
        case PointLocation.Boundary:
          this.portRTree.Remove(Rectangle.rectangleOnPoint(point), point)
          const polylinePoint: PolylinePoint = SplineRouter.FindPointOnPolylineToInsertAfter(boundary, point)
          if (polylinePoint != null) {
            LineSweeper.InsertPointIntoPolylineAfter(boundary, polylinePoint, point)
          } else {
            throw new Error()
          }

          break
      }
    }

    return ret
  }

  static FindPointOnPolylineToInsertAfter(boundary: Polyline, point: Point): PolylinePoint {
    for (let p: PolylinePoint = boundary.startPoint; ; ) {
      const pn: PolylinePoint = p.nextOnPolyline
      if (Point.closeDistEps(point, p.point) || Point.closeDistEps(point, pn.point)) {
        return null
      }

      // the point is already inside
      const dist = Point.distToLineSegment(point, p.point, pn.point).dist
      if (closeDistEps(dist, 0)) {
        return p
      }

      p = pn
      if (p === boundary.startPoint) {
        throw new Error()
      }
    }
  }

  // creates a root; a shape with BoundaryCurve set to null
  GetOrCreateRoot() {
    if (this.rootShapes.length === 1) {
      const r: Shape = this.rootShapes[0]
      if (r.BoundaryCurve == null) {
        this.root = r
        return
      }
    }

    this.rootWasCreated = true
    this.root = new Shape(null)
    for (const rootShape of this.rootShapes) {
      this.root.AddChild(rootShape)
    }
  }

  RemoveRoot() {
    if (!this.rootWasCreated) return
    for (const rootShape of this.rootShapes) {
      rootShape.RemoveParent(this.root)
    }
    this.root = null
    this.rootWasCreated = false
  }

  // #if TEST_MSAGL
  //     // ReSharper disable UnusedMember.Local

  //     static void Show(
  //         Iterable<GeomEdge> edgeGeometries, Iterable<Shape> listOfShapes) {
  //       // ReSharper restore UnusedMember.Local
  //       var r = new Random(1);
  //       LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(
  //           listOfShapes.Select(s => s.BoundaryCurve).Select(
  //               c => new DebugCurve(50, 1, DebugCurve.Colors[r.Next(DebugCurve.Colors.Length - 1)], c)).Concat(
  //                   edgeGeometries.Select(e => new DebugCurve(100, 1, "red", e.Curve))));
  //     }
  // #endif
  static GetAncestorSetsMap(shapes: Array<Shape>): Map<Shape, Set<Shape>> {
    const ancSets = new Map<Shape, Set<Shape>>()
    for (const child of shapes.filter((child) => !ancSets.has(child))) {
      ancSets.set(child, SplineRouter.GetAncestorSet(child, ancSets))
    }
    return ancSets
  }

  static GetAncestorSet(child: Shape, ancSets: Map<Shape, Set<Shape>>): Set<Shape> {
    const ret = new Set<Shape>(child.Parents)
    for (const parent of child.Parents) {
      let addition = ancSets.get(parent)
      if (!addition) {
        ancSets.set(parent, (addition = SplineRouter.GetAncestorSet(parent, ancSets)))
      }
      for (const t of addition) ret.add(t)
    }
    return ret
  }

  static CreatePortsIfNeeded(edges: GeomEdge[]) {
    for (const edge of edges) {
      if (edge.sourcePort == null) {
        const ed = edge
        new RelativeFloatingPort(
          () => ed.source.boundaryCurve,
          () => ed.source.center,
          new Point(0, 0),
        )
      }

      if (edge.targetPort == null) {
        const ed = edge
        new RelativeFloatingPort(
          () => ed.target.boundaryCurve,
          () => ed.target.center,
          new Point(0, 0),
        )
      }
    }
  }
}
export function routeSplines(gg: GeomGraph, edgesToRoute: GeomEdge[], cancelToken: CancelToken): void {
  const ers = getEdgeRoutingSettingsFromAncestorsOrDefault(gg)
  const sr = new SplineRouter(gg, edgesToRoute, ers.Padding, ers.PolylinePadding, ers.coneAngle, ers.bundlingSettings, cancelToken)
  sr.run()
}
