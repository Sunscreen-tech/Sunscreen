// Basic geomedge router for producing straight edges.

import {GeomGraph} from '../layout/core/geomGraph'
import {Arrowhead} from '../layout/core/arrowhead'
import {GeomEdge} from '../layout/core/geomEdge'
import {CornerSite} from '../math/geometry/cornerSite'
import {Curve} from '../math/geometry/curve'
import {GeomConstants} from '../math/geometry/geomConstants'
import {ICurve} from '../math/geometry/icurve'
import {LineSegment} from '../math/geometry/lineSegment'
import {Point} from '../math/geometry/point'
import {Rectangle} from '../math/geometry/rectangle'
import {SmoothedPolyline} from '../math/geometry/smoothedPolyline'
import {Algorithm} from '../utils/algorithm'
import {SplineRouter} from './splineRouter'
import {RelativeFloatingPort} from '../layout/core/relativeFloatingPort'
import {CancelToken} from '..'

export function straightLineEdgePatcher(geomGraph: GeomGraph, edgesToRoute: GeomEdge[], cancelToken: CancelToken): void {
  if (edgesToRoute) {
    for (const e of edgesToRoute) {
      if (cancelToken && cancelToken.canceled) {
        return
      }
      StraightLineEdges.RouteEdge(e, geomGraph.padding)
    }
  } else {
    for (const n of geomGraph.nodesBreadthFirst) {
      if (cancelToken && cancelToken.canceled) {
        return
      }
      for (const e of n.outEdges()) if (e.curve == null) StraightLineEdges.RouteEdge(e, geomGraph.padding)
      for (const e of n.selfEdges()) if (e.curve == null) StraightLineEdges.RouteEdge(e, geomGraph.padding)
    }
  }
}

export class StraightLineEdges extends Algorithm {
  private edges: GeomEdge[]

  private padding: number

  // Constructs a basic straight geomedge router.
  public constructor(edges: GeomEdge[], padding: number) {
    super(null)
    this.edges = edges
    this.padding = padding
  }

  // Executes the algorithm.
  run() {
    SplineRouter.CreatePortsIfNeeded(this.edges)
    for (const geomedge of this.edges) {
      StraightLineEdges.RouteEdge(geomedge, this.padding)
    }
  }

  // populate the geometry including curve and arrowhead positioning for the given geomedge using simple
  // straight line routing style.  Self edges will be drawn as a loop, padding is used to control the
  // size of the loop.
  static RouteEdge(geomedge: GeomEdge, padding: number) {
    const eg = geomedge
    if (eg.sourcePort == null) {
      eg.sourcePort = RelativeFloatingPort.mk(
        () => geomedge.source.boundaryCurve,
        () => geomedge.source.center,
      )
    }

    if (eg.targetPort == null) {
      eg.targetPort = RelativeFloatingPort.mk(
        () => geomedge.target.boundaryCurve,
        () => geomedge.target.center,
      )
    }

    if (!StraightLineEdges.ContainmentLoop(eg, padding)) {
      eg.curve = StraightLineEdges.GetEdgeLine(geomedge)
    }

    Arrowhead.trimSplineAndCalculateArrowheadsII(eg, eg.sourcePort.Curve, eg.targetPort.Curve, geomedge.curve, false)
  }

  static ContainmentLoop(eg: GeomEdge, padding: number): boolean {
    const sourceCurve = eg.sourcePort.Curve
    const targetCurve = eg.targetPort.Curve
    if (sourceCurve == null || targetCurve == null) {
      return false
    }

    const targetBox: Rectangle = sourceCurve.boundingBox
    const sourceBox: Rectangle = targetCurve.boundingBox
    const targetInSource: boolean = targetBox.containsRect(sourceBox)
    const sourceInTarget: boolean = !targetInSource && sourceBox.containsRect(targetBox)
    if (targetInSource || sourceInTarget) {
      eg.curve = StraightLineEdges.CreateLoop(targetBox, sourceBox, sourceInTarget, padding)
      return true
    }

    return false
  }

  static CreateLoop(targetBox: Rectangle, sourceBox: Rectangle, sourceContainsTarget: boolean, padding: number): Curve {
    return sourceContainsTarget
      ? StraightLineEdges.CreateLoop_(targetBox, sourceBox, padding, false)
      : StraightLineEdges.CreateLoop_(sourceBox, targetBox, padding, true)
  }

  // creates a loop from sourceBox center to the closest point on the targetBox boundary
  static CreateLoop_(sourceBox: Rectangle, targetBox: Rectangle, howMuchToStickOut: number, reverse: boolean): Curve {
    const center = sourceBox.center
    const closestPoint = StraightLineEdges.FindClosestPointOnBoxBoundary(sourceBox.center, targetBox)
    let dir = closestPoint.sub(center)
    const vert = Math.abs(dir.x) < GeomConstants.distanceEpsilon
    const maxWidth =
      (vert
        ? Math.min(center.y - targetBox.bottom, targetBox.top - center.y)
        : Math.min(center.x - targetBox.left, targetBox.right - center.x)) / 2 //divide over 2 to not miss the rect

    const width = Math.min(howMuchToStickOut, maxWidth)
    if (dir.length <= GeomConstants.distanceEpsilon) {
      dir = new Point(1, 0)
    }

    const hookDir = dir.normalize()
    const hookPerp = hookDir.rotate(Math.PI / 2)
    const p1 = closestPoint.add(hookDir.mul(howMuchToStickOut))
    const p2 = p1.add(hookPerp.mul(width))
    const p3 = closestPoint.add(hookPerp.mul(width))
    const end = center.add(hookPerp.mul(width))
    const smoothedPoly = reverse
      ? SmoothedPolyline.mkFromPoints([end, p3, p2, p1, closestPoint, center])
      : SmoothedPolyline.mkFromPoints([center, closestPoint, p1, p2, p3, end])
    return smoothedPoly.createCurve()
  }

  static FindClosestPointOnBoxBoundary(c: Point, targetBox: Rectangle): Point {
    const x = c.x - targetBox.left < targetBox.right - c.x ? targetBox.left : targetBox.right
    const y = c.y - targetBox.bottom < targetBox.top - c.y ? targetBox.bottom : targetBox.top
    return Math.abs(x - c.x) < Math.abs(y - c.y) ? new Point(x, c.y) : new Point(c.x, y)
  }

  // Returns a line segment for the given geomedge.
  static GetEdgeLine(geomedge: GeomEdge): LineSegment {
    let sourcePoint: Point
    let sourceBox: ICurve
    if (geomedge.sourcePort == null) {
      sourcePoint = geomedge.source.center
      sourceBox = geomedge.source.boundaryCurve
    } else {
      sourcePoint = geomedge.sourcePort.Location
      sourceBox = geomedge.sourcePort.Curve
    }

    let targetPoint: Point
    let targetBox: ICurve
    if (geomedge.targetPort == null) {
      targetPoint = geomedge.target.center
      targetBox = geomedge.target.boundaryCurve
    } else {
      targetPoint = geomedge.targetPort.Location
      targetBox = geomedge.targetPort.Curve
    }

    let line: LineSegment = LineSegment.mkPP(sourcePoint, targetPoint)
    let intersects = Curve.getAllIntersections(sourceBox, line, false)

    if (intersects.length > 0) {
      let c = line.trim(intersects[0].par1, 1)
      if (c instanceof LineSegment) {
        line = c
        intersects = Curve.getAllIntersections(targetBox, line, false)
        if (intersects.length > 0) {
          c = line.trim(0, intersects[0].par1)
          if (c instanceof LineSegment) {
            line = c
          }
        }
      }
    }

    return line
  }

  // creates an geomedge curve based only on the source and target geometry
  public static CreateSimpleEdgeCurveWithUnderlyingPolyline(ge: GeomEdge) {
    const a = ge.sourcePort ? ge.sourcePort.Location : ge.source.center
    const b = ge.targetPort ? ge.targetPort.Location : ge.target.center
    if (ge.source === ge.target) {
      const dx = 2 / (3 * ge.source.boundaryCurve.boundingBox.width)
      const dy = ge.source.boundingBox.height / 4
      ge.smoothedPolyline = StraightLineEdges.CreateUnderlyingPolylineForSelfEdge(a, dx, dy)
      ge.curve = ge.smoothedPolyline.createCurve()
    } else {
      ge.smoothedPolyline = SmoothedPolyline.mkFromPoints([a, b])
      ge.curve = ge.smoothedPolyline.createCurve()
    }

    Arrowhead.trimSplineAndCalculateArrowheadsII(ge, ge.source.boundaryCurve, ge.target.boundaryCurve, ge.curve, false)
  }

  private static CreateUnderlyingPolylineForSelfEdge(p0: Point, dx: number, dy: number): SmoothedPolyline {
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

  static SetStraightLineEdgesWithUnderlyingPolylines(graph: GeomGraph) {
    SplineRouter.CreatePortsIfNeeded(Array.from(graph.deepEdges))
    for (const geomedge of graph.deepEdges) {
      StraightLineEdges.CreateSimpleEdgeCurveWithUnderlyingPolyline(geomedge)
    }
  }
}
