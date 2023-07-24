import {ICurve, Point, parameterSpan} from '../../..'
import {GeomConstants} from '../../../math/geometry'
import {TriangleOrientation} from '../../../math/geometry/point'
// import {Assert} from '../../../utils/assert'
import {lessDistEps} from '../../../utils/compare'
import {BundleInfo} from './BundleInfo'
import {OrientedHubSegment} from './OrientedHubSegment'

export class BundleBase {
  isCorrectlyOrienected(): boolean {
    const orientation = Point.getTriangleOrientation(
      this.Curve.boundingBox.center,
      this.Curve.value(this.parEnd),
      this.Curve.value(this.parStart),
    )
    return orientation !== TriangleOrientation.Counterclockwise
  }
  // only one of those is not null
  OutgoingBundleInfo: BundleInfo
  IncomingBundleInfo: BundleInfo

  private points: Point[]

  private tangents: Point[]

  OrientedHubSegments: OrientedHubSegment[]

  // the boundary of a cluster or a hub containing this base
  Curve: ICurve

  // this bundle base sits on a cluster boundary and the opposite base sits on a child of the cluster
  IsParent: boolean

  // if true then the base sits on a real node or cluster, otherwise it belongs to an intermediate hub
  BelongsToRealNode: boolean

  // position of the station containing the base
  // (could be a center of a hub, or a point on the boundary of a cluster)
  Position: Point

  get Count() {
    return this.points.length
  }

  constructor(count: number, boundaryCurve: ICurve, position: Point, belongsToRealNode: boolean) {
    this.BelongsToRealNode = belongsToRealNode
    this.Curve = boundaryCurve
    this.Position = position
    this.points = new Array(count)
    this.tangents = new Array(count)
    this.OrientedHubSegments = new Array(count)
  }

  get CurveCenter(): Point {
    return this.Curve.boundingBox.center
  }

  get OppositeBase(): BundleBase {
    return this.OutgoingBundleInfo != null ? this.OutgoingBundleInfo.TargetBase : this.IncomingBundleInfo.SourceBase
  }

  get length(): number {
    return this.points.length
  }

  get Points(): Point[] {
    return this.points
  }

  get Tangents(): Point[] {
    return this.tangents
  }

  initialMidParameter: number

  get InitialMidParameter(): number {
    return this.initialMidParameter
  }
  set InitialMidParameter(value: number) {
    this.initialMidParameter = value
    this.InitialMidPoint = this.Curve.value(value)
  }

  InitialMidPoint: Point

  parStart: number

  /**
   * corresponds to the left point of the base: if looking from the center of
   * this.Curve.boundingBox.center
   */
  get ParStart(): number {
    return this.parStart
  }
  set ParStart(value: number) {
    this.parStart = value
    this.StartPoint = this.Curve.value(this.parStart)
  }

  parEnd: number

  /**
   * corresponds to the right point of the base: if looking from the center of
   * this.Curve.boundingBox.center */
  get ParEnd(): number {
    return this.parEnd
  }
  set ParEnd(value: number) {
    this.parEnd = value
    this.EndPoint = this.Curve.value(this.parEnd)
  }

  get ParMid(): number {
    return (this.parStart + this.parEnd) / 2
  }

  StartPoint: Point
  EndPoint: Point
  get MidPoint(): Point {
    return Point.middle(this.StartPoint, this.EndPoint)
  }

  // previous in ccw order
  Prev: BundleBase

  // next in ccw order
  Next: BundleBase

  get Span(): number {
    return this.SpanBetweenTwoParameters(this.parStart, this.parEnd)
  }

  SpanBetweenTwoParameters(start: number, end: number): number {
    return start <= end ? end - start : end - start + parameterSpan(this.Curve)
  }

  RotateLeftPoint(rotationOfSourceLeftPoint: number, parameterChange: number): Point {
    if (rotationOfSourceLeftPoint === 0) {
      return this.EndPoint
    }

    return this.RotatePoint(rotationOfSourceLeftPoint, this.parEnd, parameterChange)
  }

  RotateRigthPoint(rotationOfSourceRightPoint: number, parameterChange: number): Point {
    if (rotationOfSourceRightPoint === 0) {
      return this.StartPoint
    }

    return this.RotatePoint(rotationOfSourceRightPoint, this.parStart, parameterChange)
  }

  RotatePoint(rotation: number, t: number, parameterChange: number): Point {
    const change = parameterSpan(this.Curve) * parameterChange

    t += rotation * change
    t = this.AdjustParam(t)

    return this.Curve.value(t)
  }

  AdjustParam(t: number): number {
    if (t > this.Curve.parEnd) t = this.Curve.parStart + (t - this.Curve.parEnd)
    else if (t < this.Curve.parStart) t = this.Curve.parEnd - (this.Curve.parStart - t)
    return t
  }

  RotateBy(rotationOfRightPoint: number, rotationOfLeftPoint: number, parameterChange: number) {
    const change: number = parameterSpan(this.Curve) * parameterChange
    if (rotationOfRightPoint !== 0) {
      this.ParStart = this.AdjustParam(this.ParStart + rotationOfRightPoint * change)
    }

    if (rotationOfLeftPoint !== 0) {
      this.ParEnd = this.AdjustParam(this.ParEnd + rotationOfLeftPoint * change)
    }
  }

  RelativeOrderOfBasesIsPreserved(rotationOfRightPoint: number, rotationOfLeftPoint: number, parameterChange: number): boolean {
    const change = parameterSpan(this.Curve) * parameterChange

    //we do not swap parRight and parLeft
    const rnew = this.parStart + rotationOfRightPoint * change
    const lnew =
      this.parStart < this.parEnd
        ? this.parEnd + rotationOfLeftPoint * change
        : this.parEnd + parameterSpan(this.Curve) + rotationOfLeftPoint * change
    if (rnew > lnew) return false

    //span could not be greater than pi
    if (this.SpanBetweenTwoParameters(rnew, lnew) > parameterSpan(this.Curve) / 2.0) return false

    //the base is the only base in the hub
    if (this.Prev == null) return true

    //distance between mid points is larger than parameterChange => we can't change the order
    if (
      this.SpanBetweenTwoParameters(this.Prev.ParMid, this.ParMid) > change &&
      this.SpanBetweenTwoParameters(this.ParMid, this.Next.ParMid) > change
    )
      return true

    const rSoP = this.RotateLeftPoint(rotationOfLeftPoint, parameterChange)
    const lSoP = this.RotateRigthPoint(rotationOfRightPoint, parameterChange)
    const newMidPoint = Point.middle(rSoP, lSoP)
    const curMidPoint = this.MidPoint

    //check Prev
    if (
      Point.getTriangleOrientation(this.CurveCenter, this.Prev.MidPoint, curMidPoint) !=
      Point.getTriangleOrientation(this.CurveCenter, this.Prev.MidPoint, newMidPoint)
    )
      return false

    //Next
    if (
      Point.getTriangleOrientation(this.CurveCenter, this.Next.MidPoint, curMidPoint) !=
      Point.getTriangleOrientation(this.CurveCenter, this.Next.MidPoint, newMidPoint)
    )
      return false

    return true
  }
}
