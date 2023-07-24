import {PlaneTransformation} from './planeTransformation'
import {Point} from './point'
import {PN} from './parallelogramNode'
import {Rectangle} from './rectangle'
import {Ellipse, EllipseJSON} from './ellipse'
import {Curve, CurveJSON} from './curve'
import {LineSegment, LineSegmentJSON} from './lineSegment'
import {BezierJSON, BezierSeg} from './bezierSeg'
import {Polyline, PolylineJSON} from './polyline'

export function parameterSpan(curve: ICurve) {
  return curve.parEnd - curve.parStart
}

export type ICurveJSON = LineSegmentJSON | CurveJSON | BezierJSON | PolylineJSON | EllipseJSON
export type CurveTag = 'bezier' | 'ellipse' | 'curve' | 'polyline' | 'curve' | 'lineSegment'
export type ICurveJSONTyped = {type: CurveTag; data: ICurveJSON}

export function JSONToICurve(json: ICurveJSONTyped): ICurve {
  switch (json.type) {
    case 'ellipse':
      return Ellipse.fromJSON(json.data as EllipseJSON)
    case 'curve':
      return Curve.fromJSON(json.data as CurveJSON)
    case 'lineSegment':
      return LineSegment.fromJSON(json.data as LineSegmentJSON)
    case 'bezier':
      return BezierSeg.fromJSON(json.data as BezierJSON)
    case 'polyline':
      return Polyline.fromJSON(json.data as PolylineJSON)
  }
}

function getICurveType(bc: ICurve): CurveTag {
  if (bc instanceof Ellipse) {
    return 'ellipse'
  } else if (bc instanceof Curve) {
    return 'curve'
  } else if (bc instanceof LineSegment) {
    return 'lineSegment'
  } else if (bc instanceof BezierSeg) {
    return 'bezier'
  } else if (bc instanceof Polyline) {
    return 'polyline'
  } else {
    throw new Error('not implemented')
  }
}

export function iCurveToJSON(bc: ICurve): ICurveJSONTyped {
  return {type: getICurveType(bc), data: bc.toJSON()}
}

/**  The interface for curves */
export interface ICurve {
  toJSON(): ICurveJSON
  /**  Returns the point on the curve corresponding to parameter t */
  value(t: number): Point
  // first derivative at t
  derivative(t: number): Point
  // second derivative
  secondDerivative(t: number): Point
  // third derivative
  thirdDerivative(t: number): Point

  // A tree of ParallelogramNodes covering the curve.
  // This tree is used in curve intersections routines.
  pNodeOverICurve(): PN

  /**  XY bounding box of the curve */
  boundingBox: Rectangle

  /**  the start of the parameter domain */
  parStart: number

  /**  the end of the parameter domain */
  parEnd: number

  /** Returns the trim curve between start and end, without wrap */
  trim(start: number, end: number): ICurve

  /** Returns the trim curve between start and end, with wrap, if supported by the implementing class. */
  trimWithWrap(start: number, end: number): ICurve

  /** Moves the curve by the delta. */
  translate(delta: Point): void

  /** Returns the curved with all points scaled from the original by x and y */
  scaleFromOrigin(xScale: number, yScale: number): ICurve

  /** the curve start,  this.value(ParStart)  */
  start: Point

  /** the curve end,  this.value(ParEnd) */
  end: Point

  /** this[Reverse[t]]=this[ParEnd+ParStart-t] */
  reverse(): ICurve

  /** Offsets the curve in the direction of dir */
  offsetCurve(offset: number, dir: Point): ICurve

  /** return length of the curve segment [start,end] */
  lengthPartial(start: number, end: number): number

  /** Get the length of the curve */
  length: number

  getParameterAtLength(length: number): number

  /** Return the transformed curve */
  transform(transformation: PlaneTransformation): ICurve

  /** and t belongs to the closed segment [low,high] */
  closestParameterWithinBounds(targetPoint: Point, low: number, high: number): number

  closestParameter(targetPoint: Point): number
  /** clones the curve. */
  clone(): ICurve

  /** The left derivative at t. */
  leftDerivative(t: number): Point

  /** the right derivative at t */
  rightDerivative(t: number): Point

  /** the signed curvature of the segment at t */
  curvature(t: number): number
  /** the derivative of the curvature at t */
  curvatureDerivative(t: number): number

  /** the derivative of CurvatureDerivative */
  curvatureSecondDerivative(t: number): number
}
