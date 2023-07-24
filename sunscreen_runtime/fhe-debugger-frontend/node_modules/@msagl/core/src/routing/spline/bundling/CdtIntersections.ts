import {HashSet} from '@esfx/collections'
import {Point} from '../../..'
import {Polyline, LineSegment, PointLocation, GeomConstants} from '../../../math/geometry'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {BundlingSettings} from '../../BundlingSettings'
import {Cdt} from '../../ConstrainedDelaunayTriangulation/Cdt'
import {CdtSite} from '../../ConstrainedDelaunayTriangulation/CdtSite'
import {CdtTriangle} from '../../ConstrainedDelaunayTriangulation/CdtTriangle'
import {CdtThreader} from './CdtThreader'
import {MetroGraphData} from './MetroGraphData'
import {Station} from './Station'

// Check intersections between edges and obstacles using triangulation (faster than kd-tree)
export class CdtIntersections {
  EdgeIsLegal_(start: Point, end: Point, currentTriangle: CdtTriangle, obstaclesToIgnore: Set<Polyline>): boolean {
    //Assert.assert(Cdt.PointIsInsideOfTriangle(start, currentTriangle))
    if (Cdt.PointIsInsideOfTriangle(end, currentTriangle)) {
      return true
    }

    const threader = new CdtThreader(currentTriangle, start, end)
    while (threader.MoveNext()) {
      const piercedEdge = threader.CurrentPiercedEdge
      if (piercedEdge.constrained) {
        //Assert.assert(piercedEdge.lowerSite.Owner === piercedEdge.upperSite.Owner)
        const poly = <Polyline>piercedEdge.lowerSite.Owner
        if (!obstaclesToIgnore.has(poly)) {
          return false
        }
      }
    }
    return true
  }
  metroGraphData: MetroGraphData

  bundlingSettings: BundlingSettings

  ComputeForcesForBundles = false

  public constructor(metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings) {
    this.metroGraphData = metroGraphData
    this.bundlingSettings = bundlingSettings
  }
  /**   returns false iff an edge overlap an obstacle,
 otherwise it calulates distances to the closest obstacles */
  BundleAvoidsObstacles(
    v: Station,
    u: Station,
    vPosition: Point,
    uPosition: Point,
    upperBound: number,
    t: {closestDist: Array<[Point, Point]>},
  ): boolean {
    t.closestDist = new Array<[Point, Point]>()
    const obstaclesToIgnore: Set<Polyline> = this.metroGraphData.looseIntersections.ObstaclesToIgnoreForBundle(v, u)
    const closeObstacles: Map<Polyline, [Point, Point]> = this.FindCloseObstaclesForBundle(
      u.cdtTriangle,
      uPosition,
      vPosition,
      obstaclesToIgnore,
      upperBound,
    )
    if (closeObstacles == null) {
      return false
    }

    for (const item of closeObstacles) {
      const dist = item[1]
      t.closestDist.push(dist)
    }

    return true
  }

  // returns null iff the edge overlap an obstacle
  FindCloseObstaclesForBundle(
    startTriangle: CdtTriangle,
    start: Point,
    end: Point,
    obstaclesToIgnore: Set<Polyline>,
    upperBound: number,
  ): Map<Polyline, [Point, Point]> {
    const obstacles = new Map<Polyline, [Point, Point]>()
    const list: Array<CdtTriangle> = []
    if (!this.ThreadLineSegmentThroughTriangles(startTriangle, start, end, obstaclesToIgnore, list)) {
      return null
    }

    if (!this.ComputeForcesForBundles && !this.bundlingSettings.HighestQuality) {
      return obstacles
    }

    const checkedSites = new HashSet<CdtSite>()

    for (const t of list) {
      for (const s of t.Sites) {
        if (checkedSites.has(s)) continue
        checkedSites.add(s)

        const poly = <Polyline>s.Owner
        if (obstaclesToIgnore.has(poly)) continue

        const pp = CdtIntersections.FindPolylinePoint(poly, s.point)
        const t1 = LineSegment.minDistBetweenLineSegments(pp.point, pp.nextOnPolyline.point, start, end)
        //out par11, out par12);
        const d12 = t1.dist
        const par11 = t1.parab
        const par12 = t1.parcd

        const t2 = LineSegment.minDistBetweenLineSegments(pp.point, pp.prevOnPolyline.point, start, end)
        //out par21, out par22);
        const d22 = t2.dist
        const par21 = t2.parab
        const par22 = t2.parcd

        let r1: Point, r2: Point
        let dist: number
        if (d12 < d22) {
          dist = d12
          if (dist > upperBound) continue
          r1 = pp.point.add(pp.nextOnPolyline.point.sub(pp.point).mul(par11))
          r2 = start.add(end.sub(start).mul(par12))
        } else {
          dist = d22
          if (dist > upperBound) continue
          r1 = pp.point.add(pp.prevOnPolyline.point.sub(pp.point).mul(par21))
          r2 = start.add(end.sub(start).mul(par22))
        }
        //if (dist > upperBound) continue;

        const currentValue = obstacles.get(poly)
        if (!currentValue) obstacles.set(poly, [r1, r2])
      }
    }

    return obstacles
  }

  /**   returns false iff the edge overlap an obstacle*/
  ThreadLineSegmentThroughTriangles(
    currentTriangle: CdtTriangle,
    start: Point,
    end: Point,
    obstaclesToIgnore: Set<Polyline>,
    triangles: Array<CdtTriangle>,
  ): boolean {
    if (Cdt.PointIsInsideOfTriangle(end, currentTriangle)) {
      triangles.push(currentTriangle)
      return true
    }

    const threader = new CdtThreader(currentTriangle, start, end)
    triangles.push(currentTriangle)
    while (threader.MoveNext()) {
      triangles.push(threader.CurrentTriangle)
      const piercedEdge = threader.CurrentPiercedEdge
      if (piercedEdge.constrained) {
        //Assert.assert(piercedEdge.lowerSite.Owner === piercedEdge.upperSite.Owner)
        const poly = <Polyline>piercedEdge.lowerSite.Owner
        if (!obstaclesToIgnore.has(poly)) {
          return false
        }
      }
    }

    if (threader.CurrentTriangle != null) {
      triangles.push(threader.CurrentTriangle)
    }

    //
    //            int positiveSign, negativeSign;
    //            CdtEdge piercedEdge = FindFirstPiercedEdge(currentTriangle, start, end, out negativeSign, out positiveSign,  null);
    //
    //            //Assert.assert(positiveSign > negativeSign);
    //
    //            //Assert.assert(piercedEdge != null);
    //
    //            do {
    //                triangles.Add(currentTriangle);
    //                if (piercedEdge.Constrained) {
    //                    //Assert.assert(piercedEdge.lowerSite.Owner === piercedEdge.upperSite.Owner);
    //                    Polyline poly = (Polyline)piercedEdge.lowerSite.Owner;
    //                    if (!obstaclesToIgnore.Contains(poly)) return false;
    //                }
    //            }
    //            while (FindNextPierced(start, end, ref currentTriangle, ref piercedEdge, ref negativeSign, ref positiveSign));
    //            if (currentTriangle != null)
    //                triangles.Add(currentTriangle);
    return true
  }

  static PointLocationInsideTriangle(p: Point, triangle: CdtTriangle): PointLocation {
    let seenBoundary = false
    for (let i = 0; i < 3; i++) {
      const area = Point.signedDoubledTriangleArea(p, triangle.Sites.getItem(i).point, triangle.Sites.getItem(i + 1).point)
      if (area < GeomConstants.distanceEpsilon * -1) {
        return PointLocation.Outside
      }

      if (area < GeomConstants.distanceEpsilon) {
        seenBoundary = true
      }
    }

    return seenBoundary ? PointLocation.Boundary : PointLocation.Inside
  }

  static FindPolylinePoint(poly: Polyline, point: Point): PolylinePoint {
    for (const ppp of poly.polylinePoints()) {
      if (ppp.point.equal(point)) {
        return ppp
      }
    }
    throw new Error('polyline point ' + point + ' not found')
  }

  // checks if an edge intersects obstacles
  // otherwise it calulates distances to the closest obstacles
  EdgeIsLegal(v: Station, u: Station, vPosition: Point, uPosition: Point): boolean {
    const list: Array<CdtTriangle> = []
    const obstaclesToIgnore: Set<Polyline> = this.metroGraphData.looseIntersections.ObstaclesToIgnoreForBundle(v, u)
    return this.ThreadLineSegmentThroughTriangles(v.cdtTriangle, vPosition, uPosition, obstaclesToIgnore, list)
  }

  // checks if an edge intersects obstacles
  // otherwise it calulates distances to the closest obstacles
  EdgeIsLegalSSPPS(v: Station, u: Station, obstaclesToIgnore: Set<Polyline>): boolean {
    // if (CdtIntersections.closedeb(u, v) || CdtIntersections.closedeb(v, u)) {
    //  console.log(this)
    // }
    const start = v.Position
    const currentTriangle: CdtTriangle = v.cdtTriangle
    //Assert.assert(Cdt.PointIsInsideOfTriangle(start, currentTriangle))
    const end: Point = u.Position
    if (Cdt.PointIsInsideOfTriangle(end, currentTriangle)) {
      return true
    }

    const threader = new CdtThreader(currentTriangle, start, end)
    while (threader.MoveNext()) {
      const piercedEdge = threader.CurrentPiercedEdge
      if (piercedEdge.constrained) {
        //Assert.assert(piercedEdge.lowerSite.Owner === piercedEdge.upperSite.Owner)
        const poly = <Polyline>piercedEdge.lowerSite.Owner
        if (!obstaclesToIgnore.has(poly)) {
          return false
        }
      }
    }

    return true
  }
}
