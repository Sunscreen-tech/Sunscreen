import {CornerSite} from './cornerSite'
import {Point} from './../../math/geometry/point'
import {LineSegment} from './../../math/geometry/lineSegment'
import {Curve} from './../../math/geometry/curve'
import {BezierSeg} from './../../math/geometry/bezierSeg'

export class SmoothedPolyline {
  // creates the polyline from corner points
  static mkFromPoints(points: Iterable<Point>) {
    let ret: SmoothedPolyline = null
    let site: CornerSite = null
    for (const p of points) {
      if (site == null) {
        site = CornerSite.mkSiteP(p)
        ret = new SmoothedPolyline(site)
      } else {
        const s = CornerSite.mkSiteP(p)
        s.prev = site
        site.next = s
        site = s
      }
    }
    return ret
  }

  readonly headSite: CornerSite
  clone(): SmoothedPolyline {
    let s: CornerSite = this.headSite //the old site
    let prev: CornerSite = null
    let h: CornerSite
    let headOfTheClone: CornerSite = null
    while (s != null) {
      h = s.clone()
      h.prev = prev
      if (prev != null) prev.next = h
      else headOfTheClone = h
      s = s.next
      prev = h
    }
    return new SmoothedPolyline(headOfTheClone)
  }

  constructor(head: CornerSite) {
    this.headSite = head
  }

  // the last site of the polyline
  // <
  get lastSite(): CornerSite {
    let ret = this.headSite
    while (ret.next != null) ret = ret.next
    return ret
  }

  *[Symbol.iterator](): IterableIterator<Point> {
    let s0 = this.headSite
    while (s0 != null) {
      yield s0.point
      s0 = s0.next
    }
  }

  /** Creates a curve by using the underlying polyline*/
  createCurve(): Curve {
    const curve = new Curve()
    let a = this.headSite //the corner start
    let b: CornerSite //the corner origin

    do {
      const corner = Curve.findCorner(a)
      if (corner == null) break
      const bezierSeg = SmoothedPolyline.createBezierSegOnSite(corner.b)
      if (curve.segs.length === 0) {
        if (!Point.closeDistEps(a.point, bezierSeg.start)) Curve.addLineSegment(curve, a.point, bezierSeg.start)
      } else if (!Point.closeDistEps(curve.end, bezierSeg.start)) Curve.continueWithLineSegmentP(curve, bezierSeg.start)
      curve.addSegment(bezierSeg)
      a = corner.b
    } while (true)

    /*Assert.assert(a.next.next == null )*/

    if (curve.segs.length === 0) {
      if (!Point.closeDistEps(a.point, a.next.point)) {
        Curve.addLineSegment(curve, a.point, a.next.point)
      } else {
        const w = 5
        curve.segs.push(new BezierSeg(a.point, a.point.add(new Point(w, w)), a.point.add(new Point(-w, w)), b.point))
      }
    } else if (!Point.closeDistEps(curve.end, a.next.point)) Curve.continueWithLineSegmentP(curve, a.next.point)
    return curve
  }

  static createBezierSegOnSite(b: CornerSite): BezierSeg {
    const kPrev = b.previouisBezierCoefficient
    const kNext = b.nextBezierCoefficient
    const a = b.prev
    const c = b.next
    //   s = kPrev*a.point + (1 - kPrev)*b.point;
    const s = a.point.mul(kPrev).add(b.point.mul(1 - kPrev))
    //   const e = kNext * c.point + (1 - kNext) * b.point;
    const e = c.point.mul(kNext).add(b.point.mul(1 - kNext))
    //  u = s*b.PreviousTangentCoefficient + (1 - b.PreviousTangentCoefficient)*b.point;

    const u = s.mul(b.previousTangentCoefficient).add(b.point.mul(1 - b.previousTangentCoefficient))
    //const v = e * b.nextTangentCoefficient + (1 - b.nextTangentCoefficient) * b.point;
    const v = e.mul(b.nextTangentCoefficient).add(b.point.mul(1 - b.nextTangentCoefficient))
    return BezierSeg.mkBezier([s, u, v, e])
  }
}
