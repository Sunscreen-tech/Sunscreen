import {ICurve, ICurveJSON} from './icurve'
import {Curve} from './curve'
import {Rectangle} from './rectangle'
import {PN, ParallelogramNode} from './parallelogramNode'
import {Point, PointJSON} from './point'
import {GeomConstants} from './geomConstants'
import {PlaneTransformation} from './planeTransformation'
import {ClosestPointOnCurve} from './closestPointOnCurve'
import {closeDistEps} from '../../utils/compare'

/** ellipse: also represents a circle and an arc.
 * The point on the ellipse corresponding to the parameter t is calculated by
 * the formula center + cos(t)*aAxis + sin(t) * bAxis.
 * To get an ellipse rotating clockwise use, for example,
 * aAxis = (-1,0) and bAxis=(0,1) */

export type EllipseJSON = {parStart: number; parEnd: number; axis0: PointJSON; axis1: PointJSON; center: PointJSON}

export class Ellipse implements ICurve {
  isFullEllipse(): boolean {
    return this.parEnd === Math.PI * 2 && this.parStart === 0
  }

  static fromJSON(eData: EllipseJSON): Ellipse {
    return new Ellipse(eData.parStart, eData.parEnd, Point.fromJSON(eData.axis0), Point.fromJSON(eData.axis1), Point.fromJSON(eData.center))
  }
  toJSON(): ICurveJSON {
    return {
      parStart: this.parStart,
      parEnd: this.parEnd,
      axis0: this.aAxis.toJSON(),
      axis1: this.bAxis.toJSON(),
      center: this.center.toJSON(),
    }
  }
  box: Rectangle

  pNode: PN
  /** the aAxis of the ellips*/
  aAxis: Point
  /** the bAxis of the ellipse */
  bAxis: Point
  center: Point

  parStart: number
  parEnd: number

  /** offsets the curve in the given direction */
  offsetCurve(offset: number, dir: Point): ICurve {
    /**is dir inside or outside of the ellipse */
    const d = dir.sub(this.center)
    const angle = Point.angle(this.aAxis, d)
    const s = this.aAxis.mul(Math.cos(angle)).add(this.bAxis.mul(Math.sin(angle)))
    if (s.length < d.length) {
      const al = this.aAxis.length
      const bl = this.bAxis.length
      return Ellipse.mkEllipsePPP(this.aAxis.normalize().mul(al + offset), this.bAxis.normalize().mul(bl + offset), this.center)
    }
    {
      const al = this.aAxis.length
      const bl = this.bAxis.length
      return Ellipse.mkEllipsePPP(this.aAxis.normalize().mul(al - offset), this.bAxis.normalize().mul(bl - offset), this.center)
    }
  }

  /** Reverse the ellipe: not implemented. */
  reverse(): ICurve {
    return null // throw new Exception("not implemented");
  }

  static mkEllipsePPP(a: Point, b: Point, center: Point) {
    return new Ellipse(0, Math.PI * 2, a, b, center)
  }
  constructor(parStart: number, parEnd: number, axis0: Point, axis1: Point, center: Point) {
    //   assert(parStart <= parEnd);
    this.parStart = parStart
    this.parEnd = parEnd
    this.aAxis = axis0
    this.bAxis = axis1
    this.center = center
    this.pNode = null
    this.setBoundingBox()
    // this.parStart has to be nonnegative because of the way curve searches for the segment of a parameter
    while (this.parStart < 0) {
      this.parStart += Math.PI * 2
      this.parEnd += Math.PI * 2
    }
  }

  get start() {
    return this.value(this.parStart)
  }
  get end() {
    return this.value(this.parEnd)
  }

  /** Trims the curve */
  trim(start: number, end: number): ICurve {
    // Assert.assert(start <= end);
    // Assert.assert(start >= ParStart - GeomConstants.tolerance);
    // Assert.assert(end <= ParEnd + GeomConstants.tolerance);
    return new Ellipse(Math.max(start, this.parStart), Math.min(end, this.parEnd), this.aAxis, this.bAxis, this.center)
  }

  // Not Implemented: Returns the trimmed curve, wrapping around the end if start is greater than end.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  trimWithWrap(start: number, end: number): ICurve {
    return null
  }

  /** The bounding box of the ellipse */
  get boundingBox() {
    return this.box
  }

  /** Returns the point on the curve corresponding to parameter t */
  value(t: number) {
    return this.center.add(Point.mkPoint(Math.cos(t), this.aAxis, Math.sin(t), this.bAxis))
  }

  /** first derivative */
  derivative(t: number) {
    return Point.mkPoint(-Math.sin(t), this.aAxis, Math.cos(t), this.bAxis)
  }

  /** second derivative */
  secondDerivative(t: number) {
    return Point.mkPoint(-Math.cos(t), this.aAxis, -Math.sin(t), this.bAxis)
  }

  /** third derivative */
  thirdDerivative(t: number) {
    return Point.mkPoint(Math.sin(t), this.aAxis, -Math.cos(t), this.bAxis)
  }

  /** a tree of ParallelogramNodes covering the edge */
  pNodeOverICurve(): PN {
    if (this.pNode != null) return this.pNode
    return (this.pNode = ParallelogramNode.createParallelogramNodeForCurveSegDefaultOffset(this))
  }

  private setBoundingBox() {
    if (closeDistEps(this.parStart, 0) && closeDistEps(this.parEnd, Math.PI * 2)) this.box = this.fullBox()
    else {
      // the idea is that the box of an arc staying in one quadrant is just the box of the start and the end point of the arc
      this.box = Rectangle.mkPP(this.start, this.end)
      //now Start and End are in the box, we need just add all k*P/2 that are in between
      let t: number
      for (let i = Math.ceil(this.parStart / (Math.PI / 2)); (t = (i * Math.PI) / 2) < this.parEnd; i++)
        if (t > this.parStart) this.box.add(this.value(t))
    }
  }

  static mkEllipse(parStart: number, parEnd: number, axis0: Point, axis1: Point, centerX: number, centerY: number) {
    return new Ellipse(parStart, parEnd, axis0, axis1, new Point(centerX, centerY))
  }

  /** Construct a full ellipse by two axes */
  static mkFullEllipsePPP(axis0: Point, axis1: Point, center: Point) {
    return new Ellipse(0, Math.PI * 2, axis0, axis1, center)
  }

  /** Constructs a full ellipse with axes aligned to X and Y directions */
  static mkFullEllipseNNP(axisA: number, axisB: number, center: Point) {
    return new Ellipse(0, Math.PI * 2, new Point(axisA, 0), new Point(0, axisB), center)
  }
  /** creates a circle by a given radius and the center */
  static mkCircle(radius: number, center: Point) {
    return Ellipse.mkFullEllipseNNP(radius, radius, center)
  }

  /** Moves the ellipse to the delta vector */
  translate(delta: Point) {
    this.center = this.center.add(delta)
    this.box.center = this.box.center.add(delta)
    this.pNode = null
  }

  /** Scales the ellipse by x and by y */
  scaleFromOrigin(xScale: number, yScale: number) {
    return new Ellipse(this.parStart, this.parEnd, this.aAxis.mul(xScale), this.bAxis.mul(yScale), this.center.scale(xScale, yScale))
  }

  //
  getParameterAtLength(length: number) {
    //todo: slow version!
    const eps = 0.001

    let l = this.parStart
    let u = this.parEnd
    const lenplus = length + eps
    const lenminsu = length - eps
    while (u - l > GeomConstants.distanceEpsilon) {
      const m = 0.5 * (u + l)
      const len = this.lengthPartial(this.parStart, m)
      if (len > lenplus) u = m
      else if (len < lenminsu) l = m
      else return m
    }
    return (u + l) / 2
  }

  /** Transforms the ellipse */
  transform(transformation: PlaneTransformation): ICurve {
    if (transformation != null) {
      const ap = transformation.multiplyPoint(this.aAxis).sub(transformation.offset())
      const bp = transformation.multiplyPoint(this.bAxis).sub(transformation.offset())
      return new Ellipse(this.parStart, this.parEnd, ap, bp, transformation.multiplyPoint(this.center))
    }
    return this.clone()
  }

  /** returns a parameter t such that the distance between curve[t] and targetPoint is minimal
   * and t belongs to the closed segment [low,high] */
  closestParameterWithinBounds(targetPoint: Point, low: number, high: number): number {
    const numberOfTestPoints = 8
    const t = (high - low) / (numberOfTestPoints + 1)
    let closest = low
    let minDist = Number.MAX_VALUE
    for (let i = 0; i <= numberOfTestPoints; i++) {
      const par = low + i * t
      const p = targetPoint.sub(this.value(par))
      const d = p.dot(p)
      if (d < minDist) {
        minDist = d
        closest = par
      }
    }
    if (closest === 0 && high === Math.PI * 2) low = -Math.PI
    let ret = ClosestPointOnCurve.closestPoint(this, targetPoint, closest, low, high)
    if (ret < 0) ret += 2 * Math.PI
    return ret
  }

  // return length of the curve segment [start,end] : not implemented
  lengthPartial(start: number, end: number) {
    return Curve.lengthWithInterpolationAndThreshold(this.trim(start, end), GeomConstants.lineSegmentThreshold / 100)
  }

  get length(): number {
    return ((this.aAxis.length + this.bAxis.length) * Math.abs(this.parEnd - this.parStart)) / 2
  }

  /** clones the ellipse . */
  clone() {
    return new Ellipse(this.parStart, this.parEnd, this.aAxis.clone(), this.bAxis.clone(), this.center.clone())
  }

  /** returns a parameter t such that the distance between curve[t] and a is minimal */
  closestParameter(targetPoint: Point) {
    let savedParStart = 0
    const numberOfTestPoints = 8
    const t = (this.parEnd - this.parStart) / (numberOfTestPoints + 1)
    let closest = this.parStart
    let minDist = Number.MAX_VALUE
    for (let i = 0; i <= numberOfTestPoints; i++) {
      const par = this.parStart + i * t
      const p = targetPoint.sub(this.value(par))
      const d = p.dot(p)
      if (d < minDist) {
        minDist = d
        closest = par
      }
    }
    let parStartWasChanged = false
    if (closest === 0 && this.parEnd === Math.PI * 2) {
      parStartWasChanged = true
      savedParStart = this.parStart
      this.parStart = -Math.PI
    }
    let ret = ClosestPointOnCurve.closestPoint(this, targetPoint, closest, this.parStart, this.parEnd)
    if (ret < 0) ret += 2 * Math.PI
    if (parStartWasChanged) this.parStart = savedParStart
    return ret
  }

  // left derivative at t
  leftDerivative(t: number) {
    return this.derivative(t)
  }

  // right derivative at t
  rightDerivative(t: number) {
    return this.derivative(t)
  }

  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  curvature(t: number) {
    throw 'NotImplementedException()'
    return 0
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  curvatureDerivative(t: number) {
    throw 'NotImplementedException();'
    return 0
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  curvatureSecondDerivative(t: number) {
    throw 'NotImplementedException()'
    return 0
  }

  // returns true if the ellipse goes counterclockwise
  orientedCounterclockwise() {
    return Point.crossProduct(this.aAxis, this.bAxis) > 0
  }

  //returns the box of the ellipse that this ellipse is a part of
  fullBox(): Rectangle {
    const del = this.aAxis.add(this.bAxis)
    return Rectangle.mkPP(this.center.add(del), this.center.sub(del))
  }

  /**is it a proper arc? meaning that it just a part of a circle */
  isArc() {
    return (
      Math.abs(this.aAxis.dot(this.bAxis)) < GeomConstants.tolerance &&
      Math.abs(this.aAxis.length - this.bAxis.length) < GeomConstants.tolerance &&
      Point.closeDistEps(this.aAxis.rotate90Ccw(), this.bAxis)
    )
  }
}
