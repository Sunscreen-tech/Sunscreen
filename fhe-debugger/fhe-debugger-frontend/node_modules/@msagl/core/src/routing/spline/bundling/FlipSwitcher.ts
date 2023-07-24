import {Queue} from 'queue-typescript'
import {Point} from '../../..'
import {GeomEdge} from '../../..'
import {CurveFactory, Polyline} from '../../../math/geometry'
import {DebugCurve} from '../../../math/geometry/debugCurve'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'

import {PointMap} from '../../../utils/PointMap'
import {PointSet} from '../../../utils/PointSet'
import {setsAreEqual} from '../../../utils/setOperations'
import {getOrientationOf3Vectors, MetroGraphData} from './MetroGraphData'
import {PathFixer} from './PathFixer'

export class FlipSwitcher {
  metroGraphData: MetroGraphData

  polylineToEdgeGeom: Map<Polyline, GeomEdge> = new Map<Polyline, GeomEdge>()

  pathsThroughPoints: PointMap<Set<PolylinePoint>> = new PointMap<Set<PolylinePoint>>()

  interestingPoints = new PointSet()

  numberOfReducedCrossings: number

  get Polylines(): Array<Polyline> {
    return Array.from(this.polylineToEdgeGeom.keys())
  }

  constructor(metroGraphData: MetroGraphData) {
    this.metroGraphData = metroGraphData
  }

  Run() {
    // TimeMeasurer.DebugOutput("switching flips...");
    this.Init()
    this.SwitchFlips()
  }

  Init() {
    for (const e of this.metroGraphData.Edges) {
      this.polylineToEdgeGeom.set(<Polyline>e.curve, e)
    }
    for (const poly of this.Polylines) {
      this.RegisterPolylinePointInPathsThrough(poly.polylinePoints())
    }
  }

  RegisterPolylinePointInPathsThrough(points: IterableIterator<PolylinePoint>) {
    for (const pp of points) this.RegisterPolylinePointInPathsThroughP(pp)
  }

  RegisterPolylinePointInPathsThroughP(pp: PolylinePoint) {
    addToPointMap(this.pathsThroughPoints, pp.point, pp)
  }

  UnregisterPolylinePointsInPathsThrough(points: IterableIterator<PolylinePoint>) {
    for (const pp of points) this.UnregisterPolylinePointInPathsThrough(pp)
  }

  UnregisterPolylinePointInPathsThrough(pp: PolylinePoint) {
    removeFromPointMap(this.pathsThroughPoints, pp.point, pp)
  }

  SwitchFlips() {
    const queued = new Set<Polyline>(this.Polylines)
    const queue = new Queue<Polyline>()
    for (const e of this.Polylines) {
      queue.enqueue(e)
    }
    while (queue.length > 0) {
      const initialPolyline: Polyline = queue.dequeue()
      queued.delete(initialPolyline)
      const changedPolyline: Polyline = this.ProcessPolyline(initialPolyline)
      if (changedPolyline != null) {
        // we changed both polylines
        if (!queued.has(initialPolyline)) {
          queued.add(initialPolyline)
          queue.enqueue(initialPolyline)
        }

        if (!queued.has(changedPolyline)) {
          queued.add(changedPolyline)
          queue.enqueue(changedPolyline)
        }
      }
    }
  }

  ProcessPolyline(polyline: Polyline): Polyline {
    const departed = new Map<Polyline, PolylinePoint>()
    for (let pp: PolylinePoint = polyline.startPoint.next; pp != null; pp = pp.next) {
      this.FillDepartedPolylinePoints(pp, departed)
      // find returning
      for (const polyPoint of this.pathsThroughPoints.get(pp.point)) {
        const departingPP = departed.get(polyPoint.polyline)
        if (departingPP) {
          if (this.ProcessFlip(pp, departingPP)) {
            return polyPoint.polyline
          }

          departed.delete(polyPoint.polyline)
        }
      }
    }
    return null
  }

  FillDepartedPolylinePoints(pp: PolylinePoint, departed: Map<Polyline, PolylinePoint>) {
    const prevPoint: Point = pp.prev.point
    for (const polyPoint of this.pathsThroughPoints.get(prevPoint)) {
      if (!this.IsNeighborOnTheSamePolyline(polyPoint, pp)) {
        if (!departed.has(polyPoint.polyline)) {
          departed.set(polyPoint.polyline, polyPoint)
        }
      }
    }
  }
  ProcessFlip(flipStartPP: PolylinePoint, flipEndPP: PolylinePoint): boolean {
    // temporary switching polylines of the same width only
    // need to check capacities here
    const polyA = flipStartPP.polyline
    const polyB = flipEndPP.polyline
    const flipStart = flipStartPP.point
    const flipEnd = flipEndPP.point
    const ea: GeomEdge = this.polylineToEdgeGeom.get(polyA)
    const eb: GeomEdge = this.polylineToEdgeGeom.get(polyB)

    if (
      ea.lineWidth !== eb.lineWidth ||
      this.metroGraphData.EdgeLooseEnterable == null ||
      !setsAreEqual(this.metroGraphData.EdgeLooseEnterable.get(ea), this.metroGraphData.EdgeLooseEnterable.get(eb))
    ) {
      return false
    }
    //    polyA.init()
    // polyB.init()
    // FlipSwitcher.debugCount++

    // if (FlipSwitcher.debugCount === 3) {
    //  const da = DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Red', polyA)
    //  const aStart = DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Red', CurveFactory.mkCircle(10, polyA.start))
    //  const aEnd = DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Red', CurveFactory.mkCircle(5, polyA.end))
    //  const db = DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Blue', polyB)
    //  const bStart = DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Blue', CurveFactory.mkCircle(4, polyB.start))
    //  const bEnd = DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Blue', CurveFactory.mkCircle(2, polyB.end))
    //  SvgDebugWriter.dumpDebugCurves('./tmp/dadb_.svg', [da, db, aStart, aEnd, bStart, bEnd])
    //  //   throw new Error()
    // }

    let pts = this.FindPointsOnPolyline(polyA, flipStart, flipEnd)
    const aFirst = pts[0]
    const aLast = pts[1]
    const forwardOrderA = pts[2]
    pts = this.FindPointsOnPolyline(polyB, flipStart, flipEnd)
    const bFirst = pts[0]
    const bLast = pts[1]
    const forwardOrderB = pts[2]
    //Assert.assert(this.PolylinePointsAreInForwardOrder(aFirst, aLast) === forwardOrderA)
    //Assert.assert(this.PolylinePointsAreInForwardOrder(bFirst, bLast) === forwardOrderB)
    // 0 - the end
    // 1 - not intersect
    // 2 - intersect
    const rel1: number = this.FindRelationOnFirstPoint(aFirst, bFirst, forwardOrderA, forwardOrderB)
    const rel2: number = this.FindRelationOnLastPoint(aLast, bLast, forwardOrderA, forwardOrderB)
    // no intersection on both sides
    if (rel1 !== 2 && rel2 !== 2) {
      return false
    }

    // can't swap to reduce crossings
    if (rel1 === 1 || rel2 === 1) {
      return false
    }

    // unregister
    this.UnregisterPolylinePointsInPathsThrough(polyA.polylinePoints())
    this.UnregisterPolylinePointsInPathsThrough(polyB.polylinePoints())
    // switching
    this.Swap(aFirst, bFirst, aLast, bLast, forwardOrderA, forwardOrderB)
    // register back
    this.RegisterPolylinePointInPathsThrough(polyA.polylinePoints())
    this.RegisterPolylinePointInPathsThrough(polyB.polylinePoints())
    this.RegisterInterestingPoint(aFirst.point)
    this.RegisterInterestingPoint(aLast.point)
    this.numberOfReducedCrossings++
    return true
  }

  FindPointsOnPolyline(polyline: Polyline, first: Point, last: Point): [PolylinePoint, PolylinePoint, boolean] {
    let ppFirst: PolylinePoint
    let ppLast: PolylinePoint

    for (let pp: PolylinePoint = polyline.startPoint; pp != null; pp = pp.next) {
      if (ppFirst == null) {
        if (pp.point.equal(first)) {
          if (ppLast != null) {
            return [pp, ppLast, false]
          }
          ppFirst = pp
        } else {
          if (ppLast == null && pp.point.equal(last)) {
            ppLast = pp
          }
        }
      } else {
        // got ppFirst arleady
        if (pp.point.equal(last)) {
          return [ppFirst, pp, true]
        }
      }
    }
    //Assert.assert(false)
  }
  PolylinePointsAreInForwardOrder(u: PolylinePoint, v: PolylinePoint): boolean {
    //Assert.assert(u.polyline === v.polyline)
    for (let p: PolylinePoint = u; p != null; p = p.next) {
      if (p === v) {
        return true
      }
    }

    return false
  }

  Next(p: PolylinePoint, forwardOrder: boolean): PolylinePoint {
    return forwardOrder ? p.next : p.prev
  }

  Prev(p: PolylinePoint, forwardOrder: boolean): PolylinePoint {
    return forwardOrder ? p.prev : p.next
  }

  FindRelationOnFirstPoint(aFirst: PolylinePoint, bFirst: PolylinePoint, forwardOrderA: boolean, forwardOrderB: boolean): number {
    //Assert.assert(aFirst.point.equal(bFirst.point))
    const a0: PolylinePoint = aFirst
    const b0: PolylinePoint = bFirst
    while (true) {
      const prevA: PolylinePoint = this.Prev(aFirst, forwardOrderA)
      const prevB: PolylinePoint = this.Prev(bFirst, forwardOrderB)
      if (prevA == null || prevB == null) {
        //Assert.assert(prevA == null  && prevB == null )
        return 0
      }

      if (!prevA.point.equal(prevB.point)) {
        break
      }

      aFirst = prevA
      bFirst = prevB
    }

    return this.PolylinesIntersect(a0, b0, aFirst, bFirst, forwardOrderA, forwardOrderB)
  }

  FindRelationOnLastPoint(aLast: PolylinePoint, bLast: PolylinePoint, forwardOrderA: boolean, forwardOrderB: boolean): number {
    //Assert.assert(aLast.point.equal(bLast.point))
    const a0: PolylinePoint = aLast
    const b0: PolylinePoint = bLast
    while (true) {
      const nextA: PolylinePoint = this.Next(aLast, forwardOrderA)
      const nextB: PolylinePoint = this.Next(bLast, forwardOrderB)
      if (nextA == null || nextB == null) {
        //Assert.assert(nextA == null  && nextB == null )
        return 0
      }

      if (!nextA.point.equal(nextB.point)) {
        break
      }

      aLast = nextA
      bLast = nextB
    }

    while (this.Next(aLast, forwardOrderA).point.equal(this.Prev(bLast, forwardOrderB).point)) {
      aLast = this.Next(aLast, forwardOrderA)
      bLast = this.Prev(bLast, forwardOrderB)
    }

    return this.PolylinesIntersect(aLast, bLast, a0, b0, forwardOrderA, forwardOrderB)
  }

  PolylinesIntersect(
    a0: PolylinePoint,
    b0: PolylinePoint,
    a1: PolylinePoint,
    b1: PolylinePoint,
    forwardOrderA: boolean,
    forwardOrderB: boolean,
  ): number {
    const a0p: PolylinePoint = this.Prev(a0, forwardOrderA)
    const a0n: PolylinePoint = this.Next(a0, forwardOrderA)
    const a1n: PolylinePoint = this.Next(a1, forwardOrderA)
    const a1p: PolylinePoint = this.Prev(a1, forwardOrderA)
    const b0n: PolylinePoint = this.Next(b0, forwardOrderB)
    const b1p: PolylinePoint = this.Prev(b1, forwardOrderB)
    if (a0.point.equal(a1.point)) {
      const bs: Point = a0.point
      const left0: number = getOrientationOf3Vectors(a1p.point.sub(bs), b1p.point.sub(bs), a0n.point.sub(bs))
      const left1: number = getOrientationOf3Vectors(a1p.point.sub(bs), b0n.point.sub(bs), a0n.point.sub(bs))
      //Assert.assert(left0 !== 0 && left1 !== 0)
      return left0 === left1 ? 1 : 2
    } else {
      const left0: number = getOrientationOf3Vectors(a0p.point.sub(a0.point), a0n.point.sub(a0.point), b0n.point.sub(a0.point))
      const left1: number = getOrientationOf3Vectors(a1n.point.sub(a1.point), b1p.point.sub(a1.point), a1p.point.sub(a1.point))
      //Assert.assert(left0 !== 0 && left1 !== 0)
      return left0 === left1 ? 1 : 2
    }
  }

  Swap(
    aFirst: PolylinePoint,
    bFirst: PolylinePoint,
    aLast: PolylinePoint,
    bLast: PolylinePoint,
    forwardOrderA: boolean,
    forwardOrderB: boolean,
  ) {
    const intermediateAPoints: Array<PolylinePoint> = this.GetRangeOnPolyline(this.Next(aFirst, forwardOrderA), aLast, forwardOrderA)
    const intermediateBPoints: Array<PolylinePoint> = this.GetRangeOnPolyline(this.Next(bFirst, forwardOrderB), bLast, forwardOrderB)
    // changing a
    this.ChangePolylineSegment(aFirst, aLast, forwardOrderA, intermediateBPoints)
    // changing b
    this.ChangePolylineSegment(bFirst, bLast, forwardOrderB, intermediateAPoints)
    // resulting polylines might have cycles
    PathFixer.RemoveSelfCyclesFromPolyline(aFirst.polyline)
    //Assert.assert(this.PolylineIsOK(aFirst.polyline))
    PathFixer.RemoveSelfCyclesFromPolyline(bFirst.polyline)
    //Assert.assert(this.PolylineIsOK(bFirst.polyline))
  }

  ChangePolylineSegment(aFirst: PolylinePoint, aLast: PolylinePoint, forwardOrderA: boolean, intermediateBPoints: Array<PolylinePoint>) {
    let curA: PolylinePoint = aFirst
    for (const b of intermediateBPoints) {
      const newp = PolylinePoint.mkFromPoint(b.point)
      newp.polyline = curA.polyline
      if (forwardOrderA) {
        newp.prev = curA
        curA.next = newp
      } else {
        newp.next = curA
        curA.prev = newp
      }

      curA = newp
    }
    if (forwardOrderA) {
      curA.next = aLast
      aLast.prev = curA
    } else {
      curA.prev = aLast
      aLast.next = curA
    }
  }

  GetRangeOnPolyline(start: PolylinePoint, end: PolylinePoint, forwardOrder: boolean): Array<PolylinePoint> {
    const res: Array<PolylinePoint> = new Array<PolylinePoint>()
    for (let pp: PolylinePoint = start; pp !== end; pp = this.Next(pp, forwardOrder)) {
      res.push(pp)
    }

    return res
  }

  IsNeighborOnTheSamePolyline(a: PolylinePoint, b: PolylinePoint): boolean {
    return (a.prev != null && a.prev.point.equal(b.point)) || (a.next != null && a.next.point.equal(b.point))
  }

  RegisterInterestingPoint(p: Point) {
    if (!this.interestingPoints.has(p)) {
      this.interestingPoints.add(p)
    }
  }

  GetChangedHubs(): PointSet {
    return this.interestingPoints
  }

  NumberOfReducedCrossings(): number {
    return this.numberOfReducedCrossings
  }

  PolylineIsOK(poly: Polyline): boolean {
    const pointsToPP = new PointSet()
    for (let pp = poly.startPoint; pp != null; pp = pp.next) {
      if (pp === poly.startPoint) {
        if (pp.prev != null) {
          return false
        }
      } else if (pp.prev.next !== pp) {
        return false
      }

      if (pp === poly.endPoint) {
        if (pp.next != null) {
          return false
        }
      } else if (pp.next.prev !== pp) {
        return false
      }

      if (pointsToPP.has(pp.point)) {
        return false
      }

      pointsToPP.add(pp.point)
    }

    if (poly.startPoint.prev != null) {
      return false
    }

    if (poly.endPoint.next != null) {
      return false
    }

    return true
  }
}
function addToPointMap(pointMap: PointMap<Set<PolylinePoint>>, point: Point, pp: PolylinePoint) {
  let s = pointMap.get(point)
  if (!s) {
    s = new Set<PolylinePoint>()
    pointMap.set(point, s)
  }
  s.add(pp)
}
function removeFromPointMap(pathsThroughPoints: PointMap<Set<PolylinePoint>>, point: Point, pp: PolylinePoint) {
  const s = pathsThroughPoints.get(point)
  if (!s) return

  s.delete(pp)
  if (s.size === 0) {
    pathsThroughPoints.deleteP(point)
  }
}
