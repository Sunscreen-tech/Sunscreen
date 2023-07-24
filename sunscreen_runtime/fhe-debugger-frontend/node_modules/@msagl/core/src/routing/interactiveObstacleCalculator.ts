import {Assert, Rectangle} from '..'
import {LineSegment} from '../math/geometry'
import {ConvexHull} from '../math/geometry/convexHull'
import {Curve, PointLocation} from '../math/geometry/curve'
import {GeomConstants} from '../math/geometry/geomConstants'
import {ICurve} from '../math/geometry/icurve'
import {Point, TriangleOrientation} from '../math/geometry/point'
import {Polyline} from '../math/geometry/polyline'
import {PolylinePoint} from '../math/geometry/polylinePoint'
import {CreateRectNodeOnArrayOfRectNodes, mkRectangleNode, RectangleNode} from '../math/geometry/RTree/rectangleNode'
import {CrossRectangleNodesSameType} from '../math/geometry/RTree/rectangleNodeUtils'
import {GetConnectedComponents} from '../math/graphAlgorithms/ConnectedComponentCalculator'
import {mkGraphOnEdgesArray} from '../structs/basicGraphOnEdges'
import {IntPair} from '../utils/IntPair'
import {random} from '../utils/random'
import {flattenArray} from '../utils/setOperations'
import {Polygon} from './visibility/Polygon'

export class InteractiveObstacleCalculator {
  IgnoreTightPadding: boolean
  /** if set to true the vertices of the loose polylines would be randomly shifted by a small amont */
  randomizationShift = 0.01
  ObstaclesIntersectLine(a: Point, b: Point) {
    return this.ObstaclesIntersectICurve(LineSegment.mkPP(a, b))
  }
  LoosePadding: number
  tightPolylinesToLooseDistances: Map<Polyline, number>
  LooseObstacles: Polyline[]
  TightObstacles = new Set<Polyline>()
  OverlapsDetected: boolean
  private static PadCorner(localpoly: Polyline, p0: PolylinePoint, p1: PolylinePoint, p2: PolylinePoint, padding: number): boolean {
    const padInfo = InteractiveObstacleCalculator.GetPaddedCorner(p0, p1, p2, padding)
    if (padInfo.numberOfPoints === -1) {
      return false
    }

    localpoly.addPoint(padInfo.a)
    if (padInfo.numberOfPoints === 2) {
      localpoly.addPoint(padInfo.b)
    }

    return true
  }

  static CurveIsClockwise(iCurve: ICurve, pointInside: Point): boolean {
    return (
      Point.getTriangleOrientation(pointInside, iCurve.start, iCurve.start.add(iCurve.derivative(iCurve.parStart))) ==
      TriangleOrientation.Clockwise
    )
  }
  static PaddedPolylineBoundaryOfNode(curve: ICurve, padding: number, randomizePoints = false): Polyline {
    return InteractiveObstacleCalculator.CreatePaddedPolyline(Curve.polylineAroundClosedCurve(curve), padding, randomizePoints)
  }

  /** surrounds the given polyline with the given offset, optionally randomizes the output */
  static LoosePolylineWithFewCorners(tightPolyline: Polyline, p: number, randomizationShift: number): Polyline {
    if (p < GeomConstants.distanceEpsilon) {
      return tightPolyline
    }

    return InteractiveObstacleCalculator.CreateLoosePolylineOnBisectors(tightPolyline, p, randomizationShift)
  }

  static CreateLoosePolylineOnBisectors(tightPolyline: Polyline, offset: number, randomizationShift: number): Polyline {
    const ps = Array.from(InteractiveObstacleCalculator.BisectorPoints(tightPolyline, offset))
    if (randomizationShift) randomizePoints()
    const convHull = ConvexHull.CalculateConvexHull(ps)
    return Polyline.mkClosedFromPoints(convHull)

    function randomizePoints() {
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        ps[i] = new Point(p.x + (2 * random() - 1) * randomizationShift, p.y + (2 * random() - 1) * randomizationShift)
      }
    }
  }
  static CreateRectNodeOfPolyline(polyline: Polyline): RectangleNode<Polyline, Point> {
    return mkRectangleNode<Polyline, Point>(polyline, (<ICurve>polyline).boundingBox)
  }

  CreateLooseObstacles() {
    this.tightPolylinesToLooseDistances = new Map<Polyline, number>()
    this.LooseObstacles = new Array<Polyline>()
    for (const tightPolyline of this.TightObstacles) {
      const distance = InteractiveObstacleCalculator.FindMaxPaddingForTightPolyline(
        this.RootOfTightHierarchy,
        tightPolyline,
        this.LoosePadding,
      )
      this.tightPolylinesToLooseDistances.set(tightPolyline, distance)
      this.LooseObstacles.push(InteractiveObstacleCalculator.LoosePolylineWithFewCorners(tightPolyline, distance, this.randomizationShift))
    }

    this.RootOfLooseHierarchy = InteractiveObstacleCalculator.CalculateHierarchy(this.LooseObstacles)
    // Assert.assert(
    //  InteractiveObstacleCalculator.GetOverlappedPairSet(this.RootOfLooseHierarchy).size === 0,
    //  'Overlaps are found in LooseObstacles',
    // )
  }

  Obstacles: Array<ICurve>
  TightPadding: number
  CreateTightObstacles() {
    this.RootOfTightHierarchy = this.CreateTightObstacles_()
    this.OverlapsDetected = this.TightObstacles.size < this.Obstacles.length
  }

  Calculate() {
    if (this.IgnoreTightPadding) this.CreateTightObstaclesIgnoringTightPadding()
    else this.CreateTightObstacles()
    if (!this.IsEmpty()) this.CreateLooseObstacles()
  }
  IsEmpty(): boolean {
    return this.TightObstacles == null || this.TightObstacles.size === 0
  }
  constructor(obstacles: Array<ICurve>, tightPadding: number, loosePadding: number, ignoreTightPadding: boolean) {
    this.Obstacles = obstacles
    this.TightPadding = tightPadding
    this.LoosePadding = loosePadding
    this.IgnoreTightPadding = ignoreTightPadding
  }

  ObstaclesIntersectICurve(curve: ICurve): boolean {
    const rect: Rectangle = curve.boundingBox
    return InteractiveObstacleCalculator.CurveIntersectsRectangleNode(curve, rect, this.RootOfTightHierarchy)
  }
  static CurveIntersectsRectangleNode(curve: ICurve, curveBox: Rectangle, rectNode: RectangleNode<Polyline, Point>): boolean {
    if (!(<Rectangle>rectNode.irect).intersects(curveBox)) {
      return false
    }

    if (rectNode.UserData != null) {
      const curveUnderTest = rectNode.UserData
      return (
        Curve.intersectionOne(curveUnderTest, curve, false) != null ||
        InteractiveObstacleCalculator.PointIsInside(curveUnderTest.start, curve)
      )
    }

    // Assert.assert(rectNode.Left != null && rectNode.Right != null)
    return (
      InteractiveObstacleCalculator.CurveIntersectsRectangleNode(curve, curveBox, rectNode.Left) ||
      InteractiveObstacleCalculator.CurveIntersectsRectangleNode(curve, curveBox, rectNode.Right)
    )
  }

  static PointIsInside(point: Point, curve: ICurve): boolean {
    return Curve.PointRelativeToCurveLocation(point, curve) === PointLocation.Inside
  }

  CreateTightObstaclesIgnoringTightPadding() {
    const polysWithoutPadding = this.Obstacles.map((o) => Curve.polylineAroundClosedCurve(o))
    const polylineHierarchy = InteractiveObstacleCalculator.CalculateHierarchy(polysWithoutPadding)
    const overlappingPairSet = InteractiveObstacleCalculator.GetOverlappedPairSet(polylineHierarchy)
    this.TightObstacles = new Set<Polyline>()
    if (overlappingPairSet.size === 0) {
      for (const polyline of polysWithoutPadding) {
        const distance = InteractiveObstacleCalculator.FindMaxPaddingForTightPolyline(polylineHierarchy, polyline, this.TightPadding)
        this.TightObstacles.add(InteractiveObstacleCalculator.LoosePolylineWithFewCorners(polyline, distance, this.randomizationShift))
      }

      this.RootOfTightHierarchy = InteractiveObstacleCalculator.CalculateHierarchy(Array.from(this.TightObstacles))
    } else {
      for (const localpoly of polysWithoutPadding) {
        this.TightObstacles.add(InteractiveObstacleCalculator.CreatePaddedPolyline(localpoly, this.TightPadding))
      }

      if (!this.IsEmpty()) {
        this.RootOfTightHierarchy = InteractiveObstacleCalculator.CalculateHierarchy(Array.from(this.TightObstacles))
        this.OverlapsDetected = false
        while (InteractiveObstacleCalculator.GetOverlappedPairSet(this.RootOfTightHierarchy).size > 0) {
          this.RootOfTightHierarchy = InteractiveObstacleCalculator.ReplaceTightObstaclesWithConvexHulls(
            this.TightObstacles,
            Array.from(overlappingPairSet),
          )
          this.OverlapsDetected = true
        }
      }
    }
  }

  CreateTightObstacles_(): RectangleNode<Polyline, Point> {
    if (this.Obstacles.length === 0) {
      return null
    }

    for (const curve of this.Obstacles) {
      InteractiveObstacleCalculator.CalculateTightPolyline(this.TightObstacles, this.TightPadding, curve)
    }

    return InteractiveObstacleCalculator.RemovePossibleOverlapsInTightPolylinesAndCalculateHierarchy(this.TightObstacles)
  }
  static CalculateTightPolyline(tightObstacles: Set<Polyline>, tightPadding: number, curve: ICurve) {
    const tightPoly = InteractiveObstacleCalculator.PaddedPolylineBoundaryOfNode(curve, tightPadding)
    tightObstacles.add(tightPoly)
  }
  static CalculateHierarchy(polylines: Array<Polyline>): RectangleNode<Polyline, Point> {
    const rectNodes = polylines.map((polyline) => InteractiveObstacleCalculator.CreateRectNodeOfPolyline(polyline))

    return CreateRectNodeOnArrayOfRectNodes(rectNodes)
  }
  static RemovePossibleOverlapsInTightPolylinesAndCalculateHierarchy(tightObstacleSet: Set<Polyline>): RectangleNode<Polyline, Point> {
    let hierarchy = InteractiveObstacleCalculator.CalculateHierarchy(Array.from(tightObstacleSet))
    let overlappingPairSet: Set<[Polyline, Polyline]>
    while ((overlappingPairSet = InteractiveObstacleCalculator.GetOverlappedPairSet(hierarchy)).size > 0) {
      hierarchy = InteractiveObstacleCalculator.ReplaceTightObstaclesWithConvexHulls(tightObstacleSet, Array.from(overlappingPairSet))
    }

    return hierarchy
  }

  static MapToInt<T>(objects: T[]): Map<T, number> {
    const ret = new Map<T, number>()
    for (let i = 0; i < objects.length; i++) {
      ret.set(objects[i], i)
    }

    return ret
  }

  static ReplaceTightObstaclesWithConvexHulls(
    tightObsts: Set<Polyline>,
    overlappingPairSet: Array<[Polyline, Polyline]>,
  ): RectangleNode<Polyline, Point> {
    const overlapping = new Set<Polyline>()
    for (const pair of overlappingPairSet) {
      overlapping.add(pair[0])
      overlapping.add(pair[1])
    }

    const intToPoly = Array.from(overlapping)
    const polyToInt = InteractiveObstacleCalculator.MapToInt(intToPoly)
    const graph = mkGraphOnEdgesArray(
      Array.from(overlappingPairSet).map((pair) => new IntPair(polyToInt.get(pair[0]), polyToInt.get(pair[1]))),
    )
    const connectedComponents = GetConnectedComponents(graph)
    for (const component of connectedComponents) {
      const polys = component.map((i) => intToPoly[i])
      const points = flattenArray(polys, (p) => p)
      const convexHull = ConvexHull.createConvexHullAsClosedPolyline(points)
      for (const localpoly of polys) {
        tightObsts.delete(localpoly)
      }

      tightObsts.add(convexHull)
    }

    return InteractiveObstacleCalculator.CalculateHierarchy(Array.from(tightObsts))
  }
  RootOfTightHierarchy: RectangleNode<Polyline, Point>
  RootOfLooseHierarchy: RectangleNode<Polyline, Point>

  static OneCurveLiesInsideOfOther(polyA: ICurve, polyB: ICurve): boolean {
    // Assert.assert(!Curve.CurvesIntersect(polyA, polyB), 'The curves should not intersect')
    return (
      Curve.PointRelativeToCurveLocation(polyA.start, polyB) !== PointLocation.Outside ||
      Curve.PointRelativeToCurveLocation(polyB.start, polyA) !== PointLocation.Outside
    )
  }

  static PolylinesIntersect(a: Polyline, b: Polyline): boolean {
    const ret = Curve.CurvesIntersect(a, b) || InteractiveObstacleCalculator.OneCurveLiesInsideOfOther(a, b)
    return ret
  }
  static GetOverlappedPairSet(rootOfObstacleHierarchy: RectangleNode<Polyline, Point>): Set<[Polyline, Polyline]> {
    const overlappingPairSet = new Set<[Polyline, Polyline]>()
    CrossRectangleNodesSameType(rootOfObstacleHierarchy, rootOfObstacleHierarchy, (a, b) => {
      if (InteractiveObstacleCalculator.PolylinesIntersect(a, b)) {
        overlappingPairSet.add([a, b])
      }
    })
    return overlappingPairSet
  }
  static *BisectorPoints(tightPolyline: Polyline, offset: number): IterableIterator<Point> {
    for (let pp: PolylinePoint = tightPolyline.startPoint; pp != null; pp = pp.next) {
      const t = {skip: false}
      const currentSticking: Point = InteractiveObstacleCalculator.GetStickingVertexOnBisector(pp, offset, t)
      if (!t.skip) {
        yield currentSticking
      }
    }
  }

  static GetStickingVertexOnBisector(pp: PolylinePoint, p: number, t: {skip: boolean}): Point {
    const u: Point = pp.polyline.prev(pp).point
    const v: Point = pp.point
    const w: Point = pp.polyline.next(pp).point
    let z = v.sub(u).normalize().add(v.sub(w).normalize())
    const zLen = z.length
    if (zLen < GeomConstants.tolerance) {
      t.skip = true
    } else {
      t.skip = false
      z = z.div(zLen)
    }

    return z.mul(p).add(v)
  }
  static LooseDistCoefficient = 2.1
  static FindMaxPaddingForTightPolyline(hierarchy: RectangleNode<Polyline, Point>, polyline: Polyline, desiredPadding: number): number {
    let dist = desiredPadding
    const polygon = new Polygon(polyline)
    const boundingBox = polyline.boundingBox.clone()
    boundingBox.pad(2 * desiredPadding)
    for (const localpoly of Array.from(hierarchy.GetNodeItemsIntersectingRectangle(boundingBox)).filter((p) => p !== polyline)) {
      const separation = Polygon.Distance(polygon, new Polygon(localpoly)).dist
      dist = Math.min(dist, separation / InteractiveObstacleCalculator.LooseDistCoefficient)
    }

    return dist
  }

  static GetPaddedCorner(
    first: PolylinePoint,
    second: PolylinePoint,
    third: PolylinePoint,
    padding: number,
  ): {a: Point; b: Point; numberOfPoints: number} {
    const u: Point = first.point
    const v: Point = second.point
    const w: Point = third.point
    if (Point.getTriangleOrientation(u, v, w) === TriangleOrientation.Counterclockwise) {
      return {a: undefined, b: undefined, numberOfPoints: -1}
    }
    let uvPerp: Point = v
      .sub(u)
      .rotate(Math.PI / 2)
      .normalize()
    if (InteractiveObstacleCalculator.CornerIsNotTooSharp(u, v, w)) {
      // the angle is not too sharp: just continue the offset lines of the sides and return their intersection
      uvPerp = uvPerp.mul(padding)
      const vwPerp: Point = w
        .sub(v)
        .normalize()
        .mul(padding)
        .rotate(Math.PI / 2)
      const a = Point.lineLineIntersection(u.add(uvPerp), v.add(uvPerp), v.add(vwPerp), w.add(vwPerp))
      /*Assert.assert(a !== undefined)*/
      return {a: a, b: a, numberOfPoints: 1}
    }

    const l: Point = v.sub(u).normalize().add(v.sub(w).normalize())
    if (l.length < GeomConstants.intersectionEpsilon) {
      const a = v.add(uvPerp.mul(padding))
      return {a: a, b: a, numberOfPoints: 1}
    }

    const d: Point = l.normalize().mul(padding)
    const dp: Point = d.rotate(Math.PI / 2)
    // look for a in the form d+x*dp
    // we have:  Padding=(d+x*dp)*uvPerp
    const xp: number = (padding - d.dot(uvPerp)) / dp.dot(uvPerp)
    const dpxp = dp.mul(xp)
    return {a: d.add(dpxp).add(v), b: d.sub(dpxp).add(v), numberOfPoints: 2}
  }

  static CornerIsNotTooSharp(u: Point, v: Point, w: Point): boolean {
    const a: Point = u
      .sub(v)
      .rotate(Math.PI / 4)
      .add(v)
    return Point.getTriangleOrientation(v, a, w) === TriangleOrientation.Counterclockwise
    //   return Point.Angle(u, v, w) > Math.PI / 4;
  }
  static CreatePaddedPolyline(poly: Polyline, padding: number, randomizePoints = false): Polyline {
    /*Assert.assert(
      Point.getTriangleOrientation(
        localpoly.start,
        localpoly.startPoint.next.point,
        localpoly.startPoint.next.next.point,
      ) === TriangleOrientation.Clockwise,
      'Unpadded polyline is not clockwise',
    )*/
    const ret = new Polyline()
    const localPoly = randomizePoints ? getPolyRandom(poly) : poly
    if (!InteractiveObstacleCalculator.PadCorner(ret, localPoly.endPoint.prev, localPoly.endPoint, localPoly.startPoint, padding)) {
      return InteractiveObstacleCalculator.CreatePaddedPolyline(
        Polyline.mkClosedFromPoints(Array.from(ConvexHull.CalculateConvexHull(localPoly))),
        padding,
      )
    }

    if (!InteractiveObstacleCalculator.PadCorner(ret, localPoly.endPoint, localPoly.startPoint, localPoly.startPoint.next, padding)) {
      return InteractiveObstacleCalculator.CreatePaddedPolyline(
        Polyline.mkClosedFromPoints(Array.from(ConvexHull.CalculateConvexHull(localPoly))),
        padding,
      )
    }

    for (let pp = localPoly.startPoint; pp.next.next != null; pp = pp.next) {
      if (!InteractiveObstacleCalculator.PadCorner(ret, pp, pp.next, pp.next.next, padding)) {
        return InteractiveObstacleCalculator.CreatePaddedPolyline(
          Polyline.mkClosedFromPoints(Array.from(ConvexHull.CalculateConvexHull(localPoly))),
          padding,
        )
      }
    }

    /*Assert.assert(
      Point.getTriangleOrientation(
        ret.start,
        ret.startPoint.next.point,
        ret.startPoint.next.next.point,
      ) !== TriangleOrientation.Counterclockwise,
      'Padded polyline is counterclockwise',
    )*/
    ret.closed = true
    return ret
  }
}
function getPolyRandom(poly: Polyline): Polyline {
  const ret = new Polyline()
  const eps = 0.01
  for (let p = poly.startPoint; p; p = p.next) {
    const x = p.point.x + eps * random()
    const y = p.point.y + eps * random()
    ret.addPointXY(x, y)
  }
  ret.closed = poly.closed
  return ret
}
