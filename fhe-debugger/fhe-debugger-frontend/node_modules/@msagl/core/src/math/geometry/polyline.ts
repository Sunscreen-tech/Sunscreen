/* eslint-disable @typescript-eslint/no-unused-vars */
import {ICurve} from './icurve'
import {PN} from './parallelogramNode'
import {PlaneTransformation} from './planeTransformation'
import {Point, PointJSON, TriangleOrientation} from './point'
import {Rectangle} from './rectangle'
import {PolylinePoint} from './polylinePoint'

import {Parallelogram} from './parallelogram'
import {LineSegment} from './lineSegment'
import {Curve} from './curve'
import {random} from '../../utils/random'

type AdjustedPar = {
  a: Point
  b: Point
  t: number
}

export type PolylineJSON = {points: PointJSON[]}
/** the curve corresponding to the sequence of lines, could be closed when the start coincides with the end */
export class Polyline implements ICurve {
  toJSON(): PolylineJSON {
    return {points: Array.from(this).map((p) => p.toJSON())}
  }
  static fromJSON(data: PolylineJSON): Polyline {
    return Polyline.mkFromPoints(data.points.map((p) => Point.fromJSON(p)))
  }
  RemoveStartPoint() {
    const p = this.startPoint.next
    p.prev = null
    this.startPoint = p
    this.setInitIsRequired()
  }
  RemoveEndPoint() {
    const p = this.endPoint.prev
    p.next = null
    this.endPoint = p
    this.setInitIsRequired()
  }
  startPoint: PolylinePoint
  endPoint: PolylinePoint
  private initIsRequired = true
  private isClosed_ = false
  pBNode: PN
  private bBox: Rectangle
  private count_: number
  setInitIsRequired() {
    this.initIsRequired = true
  }

  addPointXY(x: number, y: number) {
    this.addPoint(new Point(x, y))
  }

  /** should true, by internal assumptions,  in general for convex polylines */
  isClockwise() {
    return (
      Point.getTriangleOrientation(this.startPoint.point, this.startPoint.next.point, this.startPoint.next.next.point) ==
      TriangleOrientation.Clockwise
    )
  }
  /**  adds a point to the polyline */
  addPoint(p: Point) {
    // Assert.assert(
    //  this.endPoint == null  || !Point.closeDistEps(p, this.endPoint.point),
    // )
    const pp = new PolylinePoint()
    pp.polyline = this
    pp.point = p.clone()
    if (this.endPoint != null) {
      // if (!ApproximateComparer.Close(point, this.endPoint.Point)) {
      this.endPoint.next = pp
      pp.prev = this.endPoint
      this.endPoint = pp
      // }
    } else {
      this.startPoint = this.endPoint = pp
    }
    this.setInitIsRequired()
  }

  PrependPoint(p: Point) {
    // Assert.assert(this.endPoint == null  || !Point.closeDistEps(p, this.endPoint.point))
    const pp = PolylinePoint.mkFromPoint(p)
    pp.polyline = this
    if (this.startPoint != null) {
      if (!Point.closeDistEps(p, this.startPoint.point)) {
        this.startPoint.prev = pp
        pp.next = this.startPoint
        this.startPoint = pp
      }
    } else {
      this.endPoint = pp
      this.startPoint = pp
    }

    this.setInitIsRequired()
  }
  *[Symbol.iterator](): IterableIterator<Point> {
    for (let s = this.startPoint; s != null; s = s.next) yield s.point
  }

  *polylinePoints(): IterableIterator<PolylinePoint> {
    for (let s = this.startPoint; s != null; s = s.next) yield s
  }

  *skip(skipCount: number): IterableIterator<PolylinePoint> {
    for (let s = this.startPoint; s != null; s = s.next) {
      if (skipCount > 0) skipCount--
      else yield s
    }
  }

  static parallelogramOfLineSeg(a: Point, b: Point) {
    const side = b.sub(a).div(2)
    return Parallelogram.parallelogramByCornerSideSide(a, side, side)
  }

  static mkFromPoints(ps: Iterable<Point>): Polyline {
    const r = new Polyline()
    for (const p of ps) {
      r.addPoint(p)
    }
    return r
  }

  static mkClosedFromPoints(ps: Iterable<Point>): Polyline {
    const r = Polyline.mkFromPoints(ps)
    r.closed = true
    return r
  }

  calculatePbNode() {
    const parallelograms: Parallelogram[] = []
    const children: PN[] = []
    let pp = this.startPoint

    let offset = 0
    while (pp.next != null) {
      const parallelogram = Polyline.parallelogramOfLineSeg(pp.point, pp.next.point)
      parallelograms.push(parallelogram)
      children.push({
        parallelogram: parallelogram,
        seg: this,
        leafBoxesOffset: 0,
        node: {
          low: offset,
          high: offset + 1,
          chord: LineSegment.mkPP(pp.point, pp.next.point),
        },
      })

      pp = pp.next
      offset++
    }

    if (this.isClosed_) {
      const parallelogram = Polyline.parallelogramOfLineSeg(this.endPoint.point, this.startPoint.point)
      parallelograms.push(parallelogram)
      children.push({
        parallelogram: parallelogram,
        seg: this,
        leafBoxesOffset: 0,
        node: {
          low: offset,
          high: offset + 1,
          chord: LineSegment.mkPP(this.endPoint.point, this.startPoint.point),
        },
      })
    }

    this.pBNode = {
      parallelogram: Parallelogram.getParallelogramOfAGroup(parallelograms),
      seg: this,
      leafBoxesOffset: 0,
      node: {
        children: children,
      },
    }
  }

  init() {
    this.bBox = Rectangle.rectangleOnPoint(this.startPoint.point)
    for (const p of this.skip(1)) {
      this.bBox.add(p.point)
    }

    this.updateCount()

    this.calculatePbNode()

    this.initIsRequired = false
  }

  updateCount(): void {
    this.count_ = 0
    for (let pp = this.startPoint; pp != null; pp = pp.next) {
      this.count_++
    }
  }

  get count() {
    if (this.initIsRequired) this.init()
    return this.count_
  }

  get closed() {
    return this.isClosed_
  }
  set closed(value: boolean) {
    this.isClosed_ = value
  }

  value(t: number): Point {
    if (this.initIsRequired) this.init()
    const p = this.getAdjustedParamAndStartEndPoints(t)
    return Point.convSum(p.t, p.a, p.b)
  }

  getAdjustedParamAndStartEndPoints(t: number): AdjustedPar {
    /*Assert.assert(t >= -GeomConstants.tolerance)*/
    /*Assert.assert(this.startPoint != null)*/
    let s = this.startPoint

    while (s.next != null) {
      if (t <= 1) {
        return {
          a: s.point,
          b: s.next.point,
          t: t,
        }
      }
      s = s.next
      t -= 1
    }

    if (this.closed) {
      if (t <= 1) {
        return {
          a: this.endPoint.point,
          b: this.startPoint.point,
          t: t,
        }
      }
    }
    throw new Error('out of the parameter domain')
  }

  derivative(t: number): Point {
    const ap = this.getAdjustedParamAndStartEndPoints(t)
    return ap.b.sub(ap.a)
  }

  secondDerivative(t: number): Point {
    return new Point(0, 0)
  }
  thirdDerivative(t: number): Point {
    return new Point(0, 0)
  }
  pNodeOverICurve(): PN {
    if (this.initIsRequired) this.init()
    return this.pBNode
  }
  get boundingBox(): Rectangle {
    if (this.initIsRequired) this.init()
    return this.bBox
  }
  get parStart(): number {
    return 0
  }
  get parEnd(): number {
    if (this.initIsRequired) this.init()
    return this.closed ? this.count_ : this.count_ - 1
  }

  static polylineFromCurve(curve: Curve): Polyline {
    const ret = new Polyline()
    ret.addPoint(curve.start)
    for (const ls of curve.segs) ret.addPoint(ls.end)
    ret.closed = curve.start === curve.end
    return ret
  }
  trim(start: number, end: number): ICurve {
    //this is a very lazy version!
    let curve: ICurve = this.toCurve()
    curve = curve.trim(start, end)
    /* always convert to Polyline */
    if (curve instanceof Curve) return Polyline.polylineFromCurve(curve)
    else return Polyline.mkFromPoints([curve.start, curve.end])
  }
  trimWithWrap(start: number, end: number): ICurve {
    throw new Error('Method not implemented.')
  }
  translate(delta: Point): void {
    let p = this.startPoint
    do {
      p.point = p.point.add(delta)
      if (p === this.endPoint) break
      p = p.getNext()
    } while (true)
    this.setInitIsRequired()
  }
  scaleFromOrigin(xScale: number, yScale: number): ICurve {
    throw new Error('Method not implemented.')
  }
  get start(): Point {
    return this.startPoint.point
  }
  get end(): Point {
    return this.endPoint.point
  }
  reverse(): ICurve {
    const r = new Polyline()
    r.closed = this.closed

    let p = this.endPoint
    do {
      r.addPoint(p.point)
      if (p === this.startPoint) break
      p = p.getPrev()
    } while (true)
    return r
  }
  offsetCurve(offset: number, dir: Point): ICurve {
    throw new Error('Method not implemented.')
  }
  lengthPartial(start: number, end: number): number {
    throw new Error('Method not implemented.')
  }
  get length(): number {
    throw new Error('Method not implemented.')
  }
  getParameterAtLength(length: number): number {
    throw new Error('Method not implemented.')
  }
  transform(transformation: PlaneTransformation): ICurve {
    const ret = new Polyline()
    for (const p of this.polylinePoints()) {
      ret.addPoint(transformation.multiplyPoint(p.point))
    }
    ret.closed = this.closed
    return ret
  }
  closestParameterWithinBounds(targetPoint: Point, low: number, high: number): number {
    throw new Error('Method not implemented.')
  }
  closestParameter(targetPoint: Point): number {
    let ret = 0
    let dist: number = Number.MAX_VALUE
    let offset = 0
    let pp: PolylinePoint = this.startPoint
    while (pp.next != null) {
      const ls = LineSegment.mkPP(pp.point, pp.next.point)
      const t: number = ls.closestParameter(targetPoint)
      const delta: Point = ls.value(t).sub(targetPoint)
      const newDist: number = delta.dot(delta)
      if (newDist < dist) {
        dist = newDist
        ret = t + offset
      }

      pp = pp.next
      offset++
    }

    if (this.closed) {
      const ls = LineSegment.mkPP(this.endPoint.point, this.startPoint.point)
      const t: number = ls.closestParameter(targetPoint)
      const delta: Point = ls.value(t).sub(targetPoint)
      const newDist: number = delta.dot(delta)
      if (newDist < dist) {
        ret = t + offset
      }
    }

    return ret
  }

  clone(): Polyline {
    const r = new Polyline()
    r.closed = this.closed
    let p = this.startPoint
    do {
      r.addPoint(p.point)
      if (p === this.endPoint) break
      p = p.getNext()
    } while (true)
    return r
  }
  leftDerivative(t: number): Point {
    throw new Error('Method not implemented.')
  }
  rightDerivative(t: number): Point {
    throw new Error('Method not implemented.')
  }
  curvature(t: number): number {
    throw new Error('Method not implemented.')
  }
  curvatureDerivative(t: number): number {
    throw new Error('Method not implemented.')
  }
  curvatureSecondDerivative(t: number): number {
    throw new Error('Method not implemented.')
  }
  next(a: PolylinePoint): PolylinePoint {
    return a.next ?? (this.closed ? this.startPoint : null)
  }
  prev(a: PolylinePoint): PolylinePoint {
    return a.prev ?? (this.closed ? this.endPoint : null)
  }
  toCurve(): Curve {
    const c = new Curve()
    Curve.addLineSegment(c, this.startPoint.point, this.startPoint.next.point)
    let p = this.startPoint.next
    while ((p = p.next) != null) Curve.continueWithLineSegmentP(c, p.point)
    if (this.closed) Curve.continueWithLineSegmentP(c, this.startPoint.point)
    return c
  }
  RemoveCollinearVertices(): Polyline {
    for (let pp: PolylinePoint = this.startPoint.next; pp.next != null; pp = pp.next) {
      if (Point.getTriangleOrientation(pp.prev.point, pp.point, pp.next.point) === TriangleOrientation.Collinear) {
        pp.prev.next = pp.next
        pp.next.prev = pp.prev
      }
    }

    this.setInitIsRequired()

    return this
  }
}
