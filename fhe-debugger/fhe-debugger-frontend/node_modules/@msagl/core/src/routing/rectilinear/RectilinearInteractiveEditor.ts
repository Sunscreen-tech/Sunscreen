import {GeomEdge, GeomNode} from '../../layout/core'
import {Arrowhead} from '../../layout/core/arrowhead'
import {RelativeFloatingPort} from '../../layout/core/relativeFloatingPort'
import {Point} from '../../math/geometry'
import {CornerSite} from '../../math/geometry/cornerSite'
import {SmoothedPolyline} from '../../math/geometry/smoothedPolyline'
// import {Assert} from '../../utils/assert'
import {CancelToken} from '../../utils/cancelToken'
import {EdgeRoutingMode} from '../EdgeRoutingMode'
import {RelativeShape} from '../RelativeShape'
import {Shape} from '../shape'
import {RectilinearEdgeRouter} from './RectilinearEdgeRouter'

export class RectilinearInteractiveEditor {
  static CreatePortsAndRouteEdges(
    cornerFitRadius: number,
    padding: number,
    obstacleNodes: Iterable<GeomNode>,
    geometryEdges: Iterable<GeomEdge>,
    edgeRoutingMode: EdgeRoutingMode,

    ct: CancelToken = null,
  ) {
    const r = RectilinearInteractiveEditor.FillRouter(cornerFitRadius, padding, obstacleNodes, geometryEdges, edgeRoutingMode)
    r.run()
    RectilinearInteractiveEditor.CreateSelfEdges(
      Array.from(geometryEdges).filter((e) => e.sourcePort.Location === e.targetPort.Location),
      cornerFitRadius,
    )
  }

  //  Create a RectilinearEdgeRouter from the passed obstacleNodes, with one port at the center of each obstacle,
  //  and route between the obstacles, with default bend penalty.

  static CreatePortsAndRouteEdges_(
    cornerFitRadius: number,
    padding: number,
    obstacleNodes: Iterable<GeomNode>,
    geometryEdges: Iterable<GeomEdge>,
    edgeRoutingMode: EdgeRoutingMode,
    useSparseVisibilityGraph: boolean,
    useObstacleRectangles: boolean,
  ) {
    RectilinearInteractiveEditor.CreatePortsAndRouteEdges(cornerFitRadius, padding, obstacleNodes, geometryEdges, edgeRoutingMode)
  }

  //  Create a RectilinearEdgeRouter from the passed obstacleNodes, with one port at the center of each obstacle,
  //  and route between the obstacles, with default bend penalty.

  public static CreatePortsAndRouteEdges__(
    cornerFitRadius: number,
    padding: number,
    obstacleNodes: Iterable<GeomNode>,
    geometryEdges: Iterable<GeomEdge>,
    edgeRoutingMode: EdgeRoutingMode,
    useSparseVisibilityGraph: boolean,
  ) {
    RectilinearInteractiveEditor.CreatePortsAndRouteEdges(cornerFitRadius, padding, obstacleNodes, geometryEdges, edgeRoutingMode)
  }

  //  Create a RectilinearEdgeRouter populated with the passed obstacles.

  //  <returns>The populated RectilinearEdgeRouter</returns>
  static FillRouter(
    cornerFitRadius: number,
    padding: number,
    obstacleNodes: Iterable<GeomNode>,
    geomEdges: Iterable<GeomEdge>,
    edgeRoutingMode: EdgeRoutingMode,
  ): RectilinearEdgeRouter {
    // Assert.assert(
    //   EdgeRoutingMode.Rectilinear === edgeRoutingMode || EdgeRoutingMode.RectilinearToCenter === edgeRoutingMode,
    //   'Non-rectilinear edgeRoutingMode',
    // )
    const nodeShapesMap = new Map<GeomNode, Shape>()
    RectilinearInteractiveEditor.FillNodeShapesMap(obstacleNodes, geomEdges, nodeShapesMap)
    const router = new RectilinearEdgeRouter(nodeShapesMap.values(), padding, cornerFitRadius)
    for (const geomEdge of geomEdges) {
      geomEdge.sourcePort = first(nodeShapesMap.get(geomEdge.source).Ports)
      geomEdge.targetPort = first(nodeShapesMap.get(geomEdge.target).Ports)
      router.AddEdgeGeometryToRoute(geomEdge)
    }

    return router
  }

  private static FillNodeShapesMap(obstacleNodes: Iterable<GeomNode>, geomEdges: Iterable<GeomEdge>, nodeShapeMap: Map<GeomNode, Shape>) {
    for (const node of obstacleNodes) {
      const shape: Shape = RectilinearInteractiveEditor.CreateShapeWithRelativeNodeAtCenter(node)
      nodeShapeMap.set(node, shape)
    }

    for (const e of geomEdges) {
      let node = e.source
      if (!nodeShapeMap.has(node)) {
        nodeShapeMap.set(node, RectilinearInteractiveEditor.CreateShapeWithRelativeNodeAtCenter(node))
      }

      node = e.target
      if (!nodeShapeMap.has(node)) {
        nodeShapeMap.set(node, RectilinearInteractiveEditor.CreateShapeWithRelativeNodeAtCenter(node))
      }
    }
  }

  static CreateSelfEdges(selfEdges: Iterable<GeomEdge>, cornerFitRadius: number) {
    for (const edge of selfEdges) {
      RectilinearInteractiveEditor.CreateSimpleEdgeCurveWithGivenFitRadius(edge, cornerFitRadius)
    }
  }

  //

  public static CreateSimpleEdgeCurveWithGivenFitRadius(edge: GeomEdge, cornerFitRadius: number) {
    const a = edge.source.center
    const b = edge.target.center
    if (edge.source === edge.target) {
      const dx = edge.source.boundaryCurve.boundingBox.width / 2
      const dy = edge.source.boundingBox.height / 4
      edge.smoothedPolyline = RectilinearInteractiveEditor.CreateUnderlyingPolylineForSelfEdge(a, dx, dy)
      for (let site = edge.smoothedPolyline.headSite.next; site.next != null; site = site.next) {
        RectilinearInteractiveEditor.CalculateCoefficiensUnderSite(site, cornerFitRadius)
      }

      edge.curve = edge.smoothedPolyline.createCurve()
    } else {
      edge.smoothedPolyline = SmoothedPolyline.mkFromPoints([a, b])
      edge.curve = edge.smoothedPolyline.createCurve()
    }

    if (!Arrowhead.trimSplineAndCalculateArrowheadsII(edge, edge.source.boundaryCurve, edge.target.boundaryCurve, edge.curve, true)) {
      Arrowhead.createBigEnoughSpline(edge)
    }
  }

  //  creates an edge curve based only on the source and target geometry

  public static CreateSimpleEdgeCurve(edge: GeomEdge) {
    const a = edge.source.center
    const b = edge.target.center
    if (edge.source === edge.target) {
      const dx = edge.source.boundaryCurve.boundingBox.width / 2
      const dy = edge.source.boundingBox.height / 4
      edge.smoothedPolyline = RectilinearInteractiveEditor.CreateUnderlyingPolylineForSelfEdge(a, dx, dy)
      edge.curve = edge.smoothedPolyline.createCurve()
    } else {
      edge.smoothedPolyline = SmoothedPolyline.mkFromPoints([a, b])
      edge.curve = edge.smoothedPolyline.createCurve()
    }

    if (!Arrowhead.trimSplineAndCalculateArrowheadsII(edge, edge.source.boundaryCurve, edge.target.boundaryCurve, edge.curve, true)) {
      Arrowhead.createBigEnoughSpline(edge)
    }
  }

  static CreateUnderlyingPolylineForSelfEdge(p0: Point, dx: number, dy: number): SmoothedPolyline {
    const p1 = p0.add(new Point(0, dy))
    const p2 = p0.add(new Point(dx, dy))
    const p3 = p0.add(new Point(dx, dy * -1))
    const p4 = p0.add(new Point(0, dy * -1))
    let site = CornerSite.mkSiteP(p0)
    const polyline = new SmoothedPolyline(site)
    site = CornerSite.mkSiteSP(site, p1)
    site = CornerSite.mkSiteSP(site, p2)
    site = CornerSite.mkSiteSP(site, p3)
    site = CornerSite.mkSiteSP(site, p4)
    CornerSite.mkSiteSP(site, p0)
    return polyline
  }

  //  Create a Shape with a single relative port at its center.

  public static CreateShapeWithRelativeNodeAtCenter(node: GeomNode): Shape {
    const shape = new RelativeShape(node)
    shape.Ports.add(
      new RelativeFloatingPort(
        () => node.boundaryCurve,
        () => node.center,
        new Point(0, 0),
      ),
    )
    return shape
  }

  private static CalculateCoefficiensUnderSite(site: CornerSite, radius: number) {
    let l: number = radius / site.point.sub(site.prev.point).length
    l = Math.min(0.5, l)
    site.previouisBezierCoefficient = l
    l = radius / site.next.point.sub(site.point).length
    l = Math.min(0.5, l)
    site.nextBezierCoefficient = l
  }
}

function first<T>(collection: Iterable<T>): T {
  for (const t of collection) {
    return t
  }
}
