import {Point} from '../../..'
import {PointPair} from '../../../math/geometry/pointPair'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {compareNumbers} from '../../../utils/compare'
import {PointPairMap} from '../../../utils/pointPairMap'
import {getOrientationOf3Vectors} from './MetroGraphData'
import {Metroline} from './MetroLine'
import {PointPairOrder} from './PointPairOrder'
import {Station} from './Station'

// greedy bundle map ordering based on path comparison
export class GeneralMetroMapOrdering {
  // bundle lines

  Metrolines: Array<Metroline>

  bundles: PointPairMap<PointPairOrder>

  // Initialize bundle graph and build the ordering

  constructor(Metrolines: Array<Metroline>) {
    this.Metrolines = Metrolines
    this.BuildOrder()
  }

  *GetOrder(u: Station, v: Station): IterableIterator<Metroline> {
    const pointPair = new PointPair(u.Position, v.Position)
    const orderedMetrolineListForUv = this.bundles.get(pointPair).Metrolines
    if (u.Position === pointPair.first) {
      for (let i = 0; i < orderedMetrolineListForUv.length; i++) {
        yield orderedMetrolineListForUv[i]
      }
    } else {
      for (let i: number = orderedMetrolineListForUv.length - 1; i >= 0; i--) {
        yield orderedMetrolineListForUv[i]
      }
    }
  }

  /**   Get the index of line on the edge (u->v) and node u */
  GetLineIndexInOrder(u: Station, v: Station, ml: Metroline): number {
    const pp = new PointPair(u.Position, v.Position)
    const reversed = u.Position !== pp.first // we can use the object comparison here because there is no cloning in PointPair
    const d = this.bundles.get(pp).LineIndexInOrder
    return !reversed ? d.get(ml) : d.size - 1 - d.get(ml)
  }

  /**   Do the main job */
  BuildOrder() {
    this.bundles = new PointPairMap<PointPairOrder>()
    // initialization
    for (const ml of this.Metrolines) {
      for (let p = ml.Polyline.startPoint; p.next != null; p = p.next) {
        const e = new PointPair(p.point, p.next.point)
        let li: PointPairOrder = this.bundles.get(e)
        if (!li) {
          this.bundles.set(e, (li = new PointPairOrder()))
        }

        li.Add(ml)
      }
    }

    for (const edge of this.bundles) {
      this.BuildOrderPP(edge[0], edge[1])
    }
  }

  /**   Build an order for edge (u->v) */
  BuildOrderPP(pair: PointPair, order: PointPairOrder) {
    if (order.orderFixed) {
      return
    }

    order.Metrolines.sort((line0, line1) => this.CompareLines(line0, line1, pair.first, pair.second))
    // save order
    order.orderFixed = true
    order.LineIndexInOrder = new Map<Metroline, number>()
    for (let i = 0; i < order.Metrolines.length; i++) {
      order.LineIndexInOrder.set(order.Metrolines[i], i)
    }
  }

  /**   Compare two lines on station u with respect to edge (u->v) */
  CompareLines(ml0: Metroline, ml1: Metroline, u: Point, v: Point): number {
    const t: {
      polyPoint: PolylinePoint
      next: (a: PolylinePoint) => PolylinePoint
      prev: (a: PolylinePoint) => PolylinePoint
    } = {polyPoint: null, next: null, prev: null}
    this.FindStationOnLine(u, v, ml0, t)
    const polylinePoint0 = t.polyPoint
    const next0 = t.next
    const prev0 = t.prev

    this.FindStationOnLine(u, v, ml1, t)
    const polylinePoint1 = t.polyPoint
    const next1 = t.next
    const prev1 = t.prev

    // go backward
    let p0 = polylinePoint0
    let p1 = polylinePoint1
    let p11: PolylinePoint
    let p00: PolylinePoint
    while ((p00 = prev0(p0)) != null && (p11 = prev1(p1)) != null && p00.point.equal(p11.point)) {
      const edge = new PointPair(p00.point, p0.point)
      if (this.bundles.get(edge).orderFixed) {
        return this.CompareOnFixedOrder(edge, ml0, ml1, !p00.point.equal(edge.first))
      }

      p0 = p00
      p1 = p11
    }

    if (p00 != null && p11 != null) {
      // we have a backward fork
      const forkBase = p0.point
      return -GeneralMetroMapOrdering.IsLeft(next0(p0).point.sub(forkBase), p00.point.sub(forkBase), p11.point.sub(forkBase))
    }

    // go forward
    p0 = polylinePoint0
    p1 = polylinePoint1
    while ((p00 = next0(p0)) != null && (p11 = next1(p1)) != null && p00.point.equal(p11.point)) {
      const edge = new PointPair(p00.point, p0.point)
      if (this.bundles.get(edge).orderFixed) {
        return this.CompareOnFixedOrder(edge, ml0, ml1, !p0.point.equal(edge.first))
      }

      p0 = p00
      p1 = p11
    }

    if (p00 != null && p11 != null) {
      // compare forward fork
      const forkBase = p0.point
      return GeneralMetroMapOrdering.IsLeft(prev0(p0).point.sub(forkBase), p00.point.sub(forkBase), p11.point.sub(forkBase))
    }

    // these are multiple edges
    return compareNumbers(ml0.Index, ml1.Index)
  }

  CompareOnFixedOrder(edge: PointPair, ml0: Metroline, ml1: Metroline, reverse: boolean): number {
    const mlToIndex = this.bundles.get(edge).LineIndexInOrder
    const r = reverse ? -1 : 1
    return r * compareNumbers(mlToIndex.get(ml0), mlToIndex.get(ml1))
  }

  /** Fills Next and Prev functions according to the direction of the metroline */
  // todo?  Reimplement it in more efficient way!!! (cache indexes)
  FindStationOnLine(
    u: Point,
    v: Point,
    ml: Metroline,
    t: {
      polyPoint: PolylinePoint
      next: (a: PolylinePoint) => PolylinePoint
      prev: (a: PolylinePoint) => PolylinePoint
    },
  ) {
    for (let p = ml.Polyline.startPoint; p.next != null; p = p.next) {
      if (p.point.equal(u) && p.next.point.equal(v)) {
        t.next = (k) => k.next
        t.prev = (k) => k.prev
        t.polyPoint = p
        return
      }

      if (p.point.equal(v) && p.next.point.equal(u)) {
        t.next = (k) => k.prev
        t.prev = (k) => k.next
        t.polyPoint = p.next
        return
      }
    }

    throw new Error()
  }

  /**  computes orientation of three vectors with a common source
     (compare the polar angles of v1 and v2 with respect to v0),
      return -1 if the orientation is v0 v1 v2,
               1 if the orientation is v0 v2 v1,
               0  if v1 and v2 are collinear and codirectinal, TODO: seems fishy */
  static IsLeft(v0: Point, v1: Point, v2: Point): number {
    return getOrientationOf3Vectors(v0, v1, v2)
  }
}
