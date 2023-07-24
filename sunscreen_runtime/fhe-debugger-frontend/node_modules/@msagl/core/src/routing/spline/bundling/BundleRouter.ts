// The class is responsible for general edge bundling with ordered bundles.
// Currently the router will fail if there are node overlaps.

import {Point, GeomEdge} from '../../..'
import {HookUpAnywhereFromInsidePort} from '../../../layout/core/hookUpAnywhereFromInsidePort'
import {Polyline, Curve, LineSegment} from '../../../math/geometry'
import {IntersectionInfo} from '../../../math/geometry/intersectionInfo'
import {RectangleNode} from '../../../math/geometry/RTree/rectangleNode'
import {SmoothedPolyline} from '../../../math/geometry/smoothedPolyline'
import {BundlingSettings} from '../../BundlingSettings'
import {ClusterBoundaryPort} from '../../ClusterBoundaryPort'
import {CdtEdge} from '../../ConstrainedDelaunayTriangulation/CdtEdge'
import {SingleSourceMultipleTargetsShortestPathOnVisibilityGraph} from '../../SingleSourceMultipleTargetsShortestPathOnVisibilityGraph'
import {VisibilityGraph} from '../../visibility/VisibilityGraph'
import {BundlingStatus} from './BundlingStatus'
import {Algorithm} from '../../../utils/algorithm'
import {SdShortestPath} from './SdShortestPath'
import {FindIntersectionWithProperty} from '../../../math/geometry/RTree/rectangleNodeUtils'
import {MetroGraphData} from './MetroGraphData'
import {Port} from '../../../layout/core/port'
import {StationPositionsAdjuster} from './StationPositionsAdjuster'
import {EdgeNudger} from './EdgeNudger'
import {MultipleSourceMultipleTargetsShortestPathOnVisibilityGraph} from '../../MultipleSourceMultipleTargetsShortestPathOnVisibilityGraph'
import {addToMapOfSets} from '../../../utils/setOperations'
import {Arrowhead} from '../../../layout/core/arrowhead'
import {initRandom} from '../../../utils/random'

export class BundleRouter extends Algorithm {
  bundlingSettings: BundlingSettings

  edgesToRoute: GeomEdge[]

  regularEdges: GeomEdge[]

  LoosePadding: number

  // for the shortest path calculation we will use not loosePadding, but loosePadding*SuperLoosePaddingCoefficient
  /* const */ static SuperLoosePaddingCoefficient = 1.1

  shortestPathRouter: SdShortestPath

  TightHierarchy: RectangleNode<Polyline, Point>

  LooseHierarchy: RectangleNode<Polyline, Point>

  Status: BundlingStatus
  VisibilityGraph: VisibilityGraph
  loosePolylineOfPort: (a: Port) => Polyline

  constructor(
    edgesToRoute: GeomEdge[],
    shortestPathRouter: SdShortestPath,
    visibilityGraph: VisibilityGraph,
    bundlingSettings: BundlingSettings,
    loosePadding: number,
    tightHierarchy: RectangleNode<Polyline, Point>,
    looseHierarchy: RectangleNode<Polyline, Point>,
    edgeLooseEnterable: Map<GeomEdge, Set<Polyline>>,
    edgeTightEnterable: Map<GeomEdge, Set<Polyline>>,
    loosePolylineOfPort: (a: Port) => Polyline,
  ) {
    super(null)
    this.bundlingSettings = bundlingSettings
    this.bundlingSettings.edgeWidthShrinkCoeff = 1
    this.edgesToRoute = edgesToRoute
    this.regularEdges = edgesToRoute.filter((e) => e.source !== e.target)
    this.VisibilityGraph = visibilityGraph
    this.shortestPathRouter = shortestPathRouter
    this.LoosePadding = loosePadding
    this.LooseHierarchy = looseHierarchy
    this.TightHierarchy = tightHierarchy
    this.EdgeLooseEnterable = edgeLooseEnterable
    this.EdgeTightEnterable = edgeTightEnterable
    this.loosePolylineOfPort = loosePolylineOfPort
    initRandom(0)
  }

  ThereAreOverlaps(hierarchy: RectangleNode<Polyline, Point>): boolean {
    return FindIntersectionWithProperty(hierarchy, hierarchy, Curve.CurvesIntersect)
  }

  // edge routing with Ordered Bundles:
  // 1. route edges with bundling
  // 2. nudge bundles and hubs
  // 3. order paths

  run() {
    if (this.ThereAreOverlaps(this.TightHierarchy)) {
      this.Status = BundlingStatus.Overlaps
      return
    }

    this.FixLocationsForHookAnywherePorts(this.edgesToRoute)
    this.RoutePathsWithSteinerDijkstra()

    this.FixChildParentEdges()
    if (!this.bundlingSettings.StopAfterShortestPaths) {
      this.OrderOptimizeNudgeEtc()
    }

    this.RouteSelfEdges()
    this.FixArrowheads()
  }

  private OrderOptimizeNudgeEtc() {
    const metroGraphData = new MetroGraphData(
      this.regularEdges,
      this.LooseHierarchy,
      this.TightHierarchy,
      this.bundlingSettings,
      this.shortestPathRouter.cdt,
      this.EdgeLooseEnterable,
      this.EdgeTightEnterable,
      this.loosePolylineOfPort,
    )
    StationPositionsAdjuster.FixRouting(metroGraphData, this.bundlingSettings)
    new EdgeNudger(metroGraphData, this.bundlingSettings).run()
  }

  // set endpoint of the edge from child to parent (cluster) to the boundary of the parent
  // TODO: is there a better solution?

  FixChildParentEdges() {
    for (const edge of this.regularEdges) {
      const sPort = edge.sourcePort
      const ePort = edge.targetPort
      if (sPort.Curve.boundingBox.containsRect(ePort.Curve.boundingBox)) {
        const ii = Curve.intersectionOne(sPort.Curve, LineSegment.mkPP(edge.curve.start, edge.curve.end), false)
        const poly = <Polyline>edge.curve
        poly.startPoint.point = ii.x
      }

      if (ePort.Curve.boundingBox.containsRect(sPort.Curve.boundingBox)) {
        const ii: IntersectionInfo = Curve.intersectionOne(ePort.Curve, LineSegment.mkPP(edge.curve.start, edge.curve.end), true)
        const poly = <Polyline>edge.curve
        poly.endPoint.point = ii.x
      }
    }
  }

  // ReSharper disable UnusedMember.Local

  // ShowGraphLocal() {
  //  //  ReSharper restore UnusedMember.Local
  //  const l = new List<ICurve>()
  //  l.Clear()
  //  for (const e in this.geometryGraph.edges) {
  //    l.Add(new Ellipse(2, 2, e.Curve.Start))
  //    l.Add(CurveFactory.CreateDiamond(5, 5, e.Curve.End))
  //    l.Add(e.Curve)
  //  }

  //  SplineRouter.ShowVisGraph(this.VisibilityGraph, this.LooseHierarchy.GetAllLeaves(), null, l)
  // }

  FixLocationsForHookAnywherePorts(edges: GeomEdge[]) {
    for (const edge of edges) {
      let isHookPort = edge.sourcePort instanceof HookUpAnywhereFromInsidePort
      if (isHookPort) {
        const hookPort = <HookUpAnywhereFromInsidePort>edge.sourcePort
        hookPort.SetLocation(this.FigureOutHookLocation(hookPort.LoosePolyline, edge.targetPort, edge))
      } else {
        isHookPort = edge.targetPort instanceof HookUpAnywhereFromInsidePort
        if (isHookPort) {
          const hookPort = <HookUpAnywhereFromInsidePort>edge.targetPort

          hookPort.SetLocation(this.FigureOutHookLocation(hookPort.LoosePolyline, edge.sourcePort, edge))
        }
      }
    }
  }

  FigureOutHookLocation(poly: Polyline, otherEdgeEndPort: Port, edgeGeom: GeomEdge): Point {
    const isClusterPort = otherEdgeEndPort instanceof ClusterBoundaryPort
    if (!isClusterPort) {
      return this.FigureOutHookLocationForSimpleOtherPort(poly, otherEdgeEndPort, edgeGeom)
    }

    return this.FigureOutHookLocationForClusterOtherPort(poly, <ClusterBoundaryPort>otherEdgeEndPort, edgeGeom)
  }

  FigureOutHookLocationForClusterOtherPort(poly: Polyline, otherEdgeEndPort: ClusterBoundaryPort, edgeGeom: GeomEdge): Point {
    const shapes = this.shortestPathRouter.MakeTransparentShapesOfEdgeGeometry(edgeGeom)
    // SplineRouter.ShowVisGraph(this.VisibilityGraph, this.LooseHierarchy.GetAllLeaves(),
    //    shapes.Select(sh => sh.BoundaryCurve), new[] { new LineSegment(edgeGeom.SourcePort.Location, edgeGeom.TargetPort.Location) });
    const s = new MultipleSourceMultipleTargetsShortestPathOnVisibilityGraph(
      Array.from(otherEdgeEndPort.LoosePolyline).map(this.VisibilityGraph.FindVertex.bind),
      Array.from(poly).map(this.VisibilityGraph.FindVertex.bind),
      this.VisibilityGraph,
    )
    const path = s.GetPath()
    for (const sh of shapes) {
      sh.IsTransparent = false
    }

    return path[path.length - 1].point
  }

  private FigureOutHookLocationForSimpleOtherPort(poly: Polyline, otherEdgeEndPort: Port, edgeGeom: GeomEdge): Point {
    const otherEdgeEnd: Point = otherEdgeEndPort.Location
    const shapes = this.shortestPathRouter.MakeTransparentShapesOfEdgeGeometry(edgeGeom)
    // SplineRouter.ShowVisGraph(this.VisibilityGraph, this.LooseHierarchy.GetAllLeaves(),
    //    shapes.Select(sh => sh.BoundaryCurve), new[] { new LineSegment(edgeGeom.SourcePort.Location, edgeGeom.TargetPort.Location) });
    const s = new SingleSourceMultipleTargetsShortestPathOnVisibilityGraph(
      this.VisibilityGraph.FindVertex(otherEdgeEnd),
      Array.from(poly).map((p) => this.VisibilityGraph.FindVertex(p)),
      this.VisibilityGraph,
    )
    const path = s.GetPath()
    for (const sh of shapes) {
      sh.IsTransparent = false
    }

    return path[path.length - 1].point
  }

  EdgeLooseEnterable: Map<GeomEdge, Set<Polyline>>
  EdgeTightEnterable: Map<GeomEdge, Set<Polyline>>

  RoutePathsWithSteinerDijkstra() {
    this.shortestPathRouter.VisibilityGraph = this.VisibilityGraph
    this.shortestPathRouter.BundlingSettings = this.bundlingSettings
    this.shortestPathRouter.geomEdges = this.regularEdges
    this.shortestPathRouter.ObstacleHierarchy = this.LooseHierarchy
    this.shortestPathRouter.RouteEdges()
    // find appropriate edge separation
    if (this.shortestPathRouter.cdt != null) {
      this.AdjustEdgeSeparation()
    }
  }

  // calculates maximum possible edge separation for the computed routing
  //   if it is greater than bundlingSettings.EdgeSeparation, then proceed
  //   if it is smaller, then either
  //     stop edge bundling, or
  //     reduce edge separation, or
  //     move obstacles to get more free space

  AdjustEdgeSeparation() {
    const crossedCdtEdges: Map<GeomEdge, Set<CdtEdge>> = new Map<GeomEdge, Set<CdtEdge>>()
    this.shortestPathRouter.FillCrossedCdtEdges(crossedCdtEdges)
    const pathsOnCdtEdge: Map<CdtEdge, Set<GeomEdge>> = this.GetPathsOnCdtEdge(crossedCdtEdges)
    this.bundlingSettings.edgeWidthShrinkCoeff = this.CalculateEdgeWidthShrinkCoeff(pathsOnCdtEdge)
  }

  //  //  reducing edge separation
  //  //  TimeMeasurer.DebugOutput("reducing edge separation to " + es);
  //  this.bundlingSettings.EdgeSeparation = es
  //  this.shortestPathRouter.RouteEdges()
  //  return true
  // }

  GetPathsOnCdtEdge(crossedEdges: Map<GeomEdge, Set<CdtEdge>>): Map<CdtEdge, Set<GeomEdge>> {
    const res: Map<CdtEdge, Set<GeomEdge>> = new Map<CdtEdge, Set<GeomEdge>>()
    for (const edge of crossedEdges.keys()) {
      for (const cdtEdge of crossedEdges.get(edge)) {
        addToMapOfSets(res, cdtEdge, edge)
      }
    }

    return res
  }

  CalculateEdgeWidthShrinkCoeff(pathsOnCdtEdge: Map<CdtEdge, Set<GeomEdge>>): number {
    let l = 0
    let r = this.bundlingSettings.edgeWidthShrinkCoeff
    if (this.EdgeSeparationIsOkMN(pathsOnCdtEdge, r)) {
      return r
    }
    let lHasChanged = false
    while (!lHasChanged || Math.abs(r - l) > 0.01) {
      const cen: number = (l + r) / 2
      if (this.EdgeSeparationIsOkMN(pathsOnCdtEdge, cen)) {
        l = cen
        lHasChanged = true
      } else {
        r = cen
      }
    }

    return l
  }

  EdgeSeparationIsOkMN(pathsOnCdtEdge: Map<CdtEdge, Set<GeomEdge>>, widthShrinkCoeff: number): boolean {
    for (const edge of pathsOnCdtEdge.keys()) {
      if (!this.EdgeSeparationIsOk(edge, pathsOnCdtEdge.get(edge), widthShrinkCoeff)) {
        return false
      }
    }
    return true
  }

  EdgeSeparationIsOk(edge: CdtEdge, paths: Set<GeomEdge>, shrinkCoeff: number): boolean {
    const requiredWidth: number = Array.from(paths)
      .map((e) => this.bundlingSettings.ActualEdgeWidth(e, shrinkCoeff))
      .reduce((a, b) => a + b, 0)
    return requiredWidth <= edge.Capacity
  }

  RouteSelfEdges() {
    for (const edge of this.edgesToRoute) {
      if (edge.source === edge.target) {
        const t: {smoothedPolyline: SmoothedPolyline} = {smoothedPolyline: null}
        edge.curve = GeomEdge.RouteSelfEdge(edge.source.boundaryCurve, this.LoosePadding * 2, t)
      }
    }
  }

  FixArrowheads() {
    for (const edge of this.edgesToRoute) {
      Arrowhead.trimSplineAndCalculateArrowheadsII(edge, edge.source.boundaryCurve, edge.target.boundaryCurve, edge.curve, false)
    }
  }
}
