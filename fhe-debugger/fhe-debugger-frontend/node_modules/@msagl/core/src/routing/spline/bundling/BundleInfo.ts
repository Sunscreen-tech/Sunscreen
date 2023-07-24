//
import {Curve, GeomConstants, LineSegment, Point, Polyline} from '../../../math/geometry'
import {IntersectionInfo} from '../../../math/geometry/intersectionInfo'
import {RectangleNode} from '../../../math/geometry/RTree/rectangleNode'
// import {Assert} from '../../../utils/assert'

import {BundleBase} from './BundleBase'
import {Intersections} from './Intersections'
export class BundleInfo {
  static FeasibleWidthEpsilon = 0.1

  SourceBase: BundleBase

  TargetBase: BundleBase

  obstaclesToIgnore: Set<Polyline>

  HalfWidthArray: number[]

  longEnoughSideLength: number

  tightObstaclesInTheBoundingBox: Array<Polyline>

  TotalRequiredWidth: number

  constructor(sourceBase: BundleBase, targetBase: BundleBase, obstaclesToIgnore: Set<Polyline>, halfWidthArray: number[]) {
    this.SourceBase = sourceBase
    this.TargetBase = targetBase
    this.obstaclesToIgnore = obstaclesToIgnore
    this.HalfWidthArray = halfWidthArray
    this.TotalRequiredWidth = this.HalfWidthArray.reduce((a, b) => a + b, 0) * 2
    this.longEnoughSideLength = sourceBase.Curve.boundingBox.addRec(targetBase.Curve.boundingBox).diagonal
    // sometimes TotalRequiredWidth is too large to fit into the circle, so we evenly scale everything
    const mn: number = Math.max(sourceBase.Curve.boundingBox.diagonal, targetBase.Curve.boundingBox.diagonal)
    if (this.TotalRequiredWidth > mn) {
      const scale: number = this.TotalRequiredWidth / mn
      for (let i = 0; i < this.HalfWidthArray.length; i++) this.HalfWidthArray[i] /= scale
      this.TotalRequiredWidth /= scale
    }
  }

  SetParamsFeasiblySymmetrically(tightTree: RectangleNode<Polyline, Point>) {
    this.CalculateTightObstaclesForBundle(tightTree, this.obstaclesToIgnore)
    this.SetEndParamsSymmetrically()
  }

  CalculateTightObstaclesForBundle(tightTree: RectangleNode<Polyline, Point>, obstaclesToIgnore: Set<Polyline>) {
    const sRadius: number = this.SourceBase.Curve.boundingBox.diagonal / 2
    const tRadius: number = this.TargetBase.Curve.boundingBox.diagonal / 2
    const bundle: Polyline = Intersections.Create4gon(this.SourceBase.Position, this.TargetBase.Position, sRadius * 2, tRadius * 2)

    this.tightObstaclesInTheBoundingBox = Array.from(
      tightTree.AllHitItems(bundle.boundingBox, (p) => !obstaclesToIgnore.has(p) && Curve.ClosedCurveInteriorsIntersect(bundle, p)),
    )
  }

  SetEndParamsSymmetrically() {
    const targetPos: Point = this.TargetBase.Position
    const sourcePos: Point = this.SourceBase.Position
    const dir = targetPos.sub(sourcePos).normalize()
    const perp = dir.rotate90Ccw()
    const middle = Point.middle(targetPos, sourcePos)
    const mdir = dir.mul(this.longEnoughSideLength)
    const a = middle.add(mdir)
    const b = middle.sub(mdir)
    // [a,b] is a long enough segment
    // we are already fine

    if (this.SetRLParamsIfWidthIsFeasible(perp.mul(this.TotalRequiredWidth / 2), a, b)) {
      this.SetInitialMidParams()
      return
    }

    // find the segment using binary search
    let uw = this.TotalRequiredWidth
    let lw = 0
    let mw = uw / 2
    while (uw - lw > BundleInfo.FeasibleWidthEpsilon) {
      if (this.SetRLParamsIfWidthIsFeasible(perp.mul(mw / 2), a, b)) {
        lw = mw
      } else {
        uw = mw
      }

      mw = 0.5 * (uw + lw)
    }

    if (mw <= BundleInfo.FeasibleWidthEpsilon) {
      // try one side
      if (
        this.SetRLParamsIfWidthIsFeasible_(perp.mul(BundleInfo.FeasibleWidthEpsilon), new Point(0, 0), a, b) ||
        this.SetRLParamsIfWidthIsFeasible_(new Point(0, 0), perp.mul(-BundleInfo.FeasibleWidthEpsilon), a, b)
      ) {
        mw = 2 * BundleInfo.FeasibleWidthEpsilon
      }
    }

    //Assert.assert(mw > BundleInfo.FeasibleWidthEpsilon)
    this.SourceBase.InitialMidParameter = this.SourceBase.AdjustParam(this.SourceBase.ParStart + this.SourceBase.Span / 2)
    this.TargetBase.InitialMidParameter = this.TargetBase.AdjustParam(this.TargetBase.ParStart + this.TargetBase.Span / 2)
  }

  mkNameFromLRST(): string {
    return './tmp/leftRight' + this.SourceBase.Position.toString() + '_' + this.TargetBase.Position.toString() + '.svg'
  }

  SetRLParamsIfWidthIsFeasible(perp: Point, a: Point, b: Point): boolean {
    return this.SetRLParamsIfWidthIsFeasible_(perp, perp.neg(), a, b)
  }
  SetRLParamsIfWidthIsFeasible_(perpL: Point, perpR: Point, a: Point, b: Point): boolean {
    const targetLParam = {par: 0}
    const sourceLParam = {par: 0}
    const targetRParam = {par: 0}
    const sourceRParam = {par: 0}
    let ls = this.TrimSegWithBoundaryCurves(LineSegment.mkPP(a.add(perpL), b.add(perpL)), sourceLParam, targetRParam)
    if (ls == null) {
      return false
    }

    const intersected = this.tightObstaclesInTheBoundingBox.find((t) => Curve.intersectionOne(ls, t, false) != null)
    if (intersected) {
      return false
    }

    ls = this.TrimSegWithBoundaryCurves(LineSegment.mkPP(a.add(perpR), b.add(perpR)), sourceRParam, targetLParam)
    if (ls == null) {
      return false
    }

    if (this.tightObstaclesInTheBoundingBox.find((t) => Curve.intersectionOne(ls, t, false) != null)) {
      return false
    }

    if (this.SourceBase.IsParent) {
      this.SourceBase.ParStart = sourceLParam.par
      this.SourceBase.ParEnd = sourceRParam.par
    } else {
      this.SourceBase.ParStart = sourceRParam.par
      this.SourceBase.ParEnd = sourceLParam.par
    }

    // SourceBase.InitialMidParameter = SourceBase.AdjustParam(SourceBase.ParRight + SourceBase.Span / 2);
    if (this.TargetBase.IsParent) {
      this.TargetBase.ParStart = targetLParam.par
      this.TargetBase.ParEnd = targetRParam.par
    } else {
      this.TargetBase.ParStart = targetRParam.par
      this.TargetBase.ParEnd = targetLParam.par
    }
    //  SvgDebugWriter.dumpDebugCurves(this.mkNameFromLRST(), [
    //    DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Red', this.SourceBase.Curve),
    //    DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Blue', this.TargetBase.Curve),
    //    DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Green', LineSegment.mkPP(this.TargetBase.LeftPoint, this.SourceBase.LeftPoint)),
    //    DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Yellow', LineSegment.mkPP(this.TargetBase.RightPoint, this.SourceBase.RightPoint)),
    //    DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Black', LineSegment.mkPP(a, b)),
    //  ])
    // }
    // //Assert.assert(this.SourceBase.LeftPoint.sub(this.SourceBase.Position).dot(perpL) > 0)
    // //Assert.assert(this.TargetBase.LeftPoint.sub(this.SourceBase.Position).dot(perpL) < 0)
    // Assert.assert(this.SourceBase.isCorrectlyOrienected() && this.TargetBase.isCorrectlyOrienected())

    return true
  }

  SetInitialMidParams() {
    const t = {par: 0}
    const s = {par: 0}
    const ls = this.TrimSegWithBoundaryCurves(LineSegment.mkPP(this.TargetBase.CurveCenter, this.TargetBase.CurveCenter), s, t)
    if (ls != null) {
      this.SourceBase.InitialMidParameter = s.par
      this.TargetBase.InitialMidParameter = t.par
    } else {
      this.SourceBase.InitialMidParameter = this.SourceBase.AdjustParam(this.SourceBase.ParStart + this.SourceBase.Span / 2)
      this.TargetBase.InitialMidParameter = this.TargetBase.AdjustParam(this.TargetBase.ParStart + this.TargetBase.Span / 2)
    }
    // SvgDebugWriter.dumpDebugCurves(this.mkNameFromST(), [
    //  DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Red', this.SourceBase.Curve),
    //  DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Blue', this.TargetBase.Curve),
    //  DebugCurve.mkDebugCurveTWCI(
    //    100,
    //    0.2,
    //    'Red',
    //    CurveFactory.mkCircle(2, this.SourceBase.Curve.value(this.SourceBase.InitialMidParameter)),
    //  ),
    //  DebugCurve.mkDebugCurveTWCI(
    //    100,
    //    0.2,
    //    'Blue',
    //    CurveFactory.mkCircle(2, this.TargetBase.Curve.value(this.TargetBase.InitialMidParameter)),
    //  ),
    // ])
  }
  mkNameFromST(): string {
    return './tmp/mparam' + this.SourceBase.Position.toString() + '_' + this.TargetBase.Position.toString() + '.svg'
  }

  TrimSegWithBoundaryCurves(ls: LineSegment, s: {par: number}, t: {par: number}): LineSegment {
    // ls goes from target to source
    let inters = Curve.getAllIntersections(ls, this.SourceBase.Curve, true)
    if (inters.length === 0) {
      t.par = 0
      s.par = 0
      return null
    }

    let sourceX: IntersectionInfo
    if (inters.length === 1) sourceX = inters[0]
    else {
      if (!this.SourceBase.IsParent) sourceX = inters[0].par0 < inters[1].par0 ? inters[0] : inters[1]
      else sourceX = inters[0].par0 < inters[1].par0 ? inters[1] : inters[0]
    }

    inters = Curve.getAllIntersections(ls, this.TargetBase.Curve, true)
    if (inters.length === 0) {
      t.par = 0
      s.par = 0
      return null
    }

    let targetX: IntersectionInfo
    if (inters.length === 1) targetX = inters[0]
    else {
      if (!this.TargetBase.IsParent) targetX = inters[0].par0 > inters[1].par0 ? inters[0] : inters[1]
      else targetX = inters[0].par0 > inters[1].par0 ? inters[1] : inters[0]
    }

    s.par = sourceX.par1
    t.par = targetX.par1
    //   //Assert.assert(Point.closeDistEps(sourceX.x, this.SourceBase.Curve.value(sourceX.par1)))
    // //Assert.assert(Point.closeDistEps(targetX.x, this.TargetBase.Curve.value(targetX.par1)))

    // SvgDebugWriter.dumpDebugCurves('./tmp/trim_result' + ls.start.toString() + ls.end.toString() + '.svg', [
    //  DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Red', this.SourceBase.Curve),
    //  DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Blue', this.TargetBase.Curve),
    //  DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Black', ls),
    //  DebugCurve.mkDebugCurveTWCI(100, 0.5, 'Brown', LineSegment.mkPP(sourceX.x, targetX.x)),
    // ])
    return LineSegment.mkPP(sourceX.x, targetX.x)
  }

  RotateBy(
    rotationOfSourceRightPoint: number,
    rotationOfSourceLeftPoint: number,
    rotationOfTargetRightPoint: number,
    rotationOfTargetLeftPoint: number,
    parameterChange: number,
  ) {
    const needToUpdateSource: boolean = rotationOfSourceRightPoint !== 0 || rotationOfSourceLeftPoint !== 0
    const needToUpdateTarget: boolean = rotationOfTargetRightPoint !== 0 || rotationOfTargetLeftPoint !== 0
    if (needToUpdateSource) {
      this.SourceBase.RotateBy(rotationOfSourceRightPoint, rotationOfSourceLeftPoint, parameterChange)
    }

    if (needToUpdateTarget) {
      this.TargetBase.RotateBy(rotationOfTargetRightPoint, rotationOfTargetLeftPoint, parameterChange)
    }

    this.UpdateSourceAndTargetBases(needToUpdateSource, needToUpdateTarget)
  }

  UpdateSourceAndTargetBases(sourceChanged: boolean, targetChanged: boolean) {
    if (sourceChanged) {
      this.UpdatePointsOnBundleBase(this.SourceBase)
    }

    if (targetChanged) {
      this.UpdatePointsOnBundleBase(this.TargetBase)
    }

    this.UpdateTangentsOnBases()
  }

  private UpdateTangentsOnBases() {
    const count: number = this.TargetBase.length
    // updating tangents
    for (let i = 0; i < count; i++) {
      let d: Point = this.TargetBase.Points[i].sub(this.SourceBase.Points[count - 1 - i])
      const len: number = d.length
      if (len >= GeomConstants.tolerance) {
        d = d.div(len)
        this.TargetBase.Tangents[i] = d
        this.SourceBase.Tangents[count - 1 - i] = d.neg()
      } else {
        // Assert.assert(false)
      }
    }
  }

  UpdatePointsOnBundleBase(bb: BundleBase) {
    const count: number = bb.length
    const pns: Point[] = bb.Points
    const ls = LineSegment.mkPP(bb.EndPoint, bb.StartPoint)
    const scale = 1.0 / this.TotalRequiredWidth
    let t = this.HalfWidthArray[0]
    pns[0] = ls.value(t * scale)
    for (let i = 1; i < count; i++) {
      t += this.HalfWidthArray[i - 1] + this.HalfWidthArray[i]
      pns[i] = ls.value(t * scale)
    }
  }

  RotationIsLegal(
    rotationOfSourceRightPoint: number,
    rotationOfSourceLeftPoint: number,
    rotationOfTargetRightPoint: number,
    rotationOfTargetLeftPoint: number,
    parameterChange: number,
  ): boolean {
    // 1. we can't have intersections with obstacles
    // (we check borderlines of the bundle only)
    if (!this.SourceBase.IsParent && !this.TargetBase.IsParent) {
      if (rotationOfSourceLeftPoint !== 0 || rotationOfTargetRightPoint !== 0) {
        const rSoP: Point = this.SourceBase.RotateLeftPoint(rotationOfSourceLeftPoint, parameterChange)
        const lTarP: Point = this.TargetBase.RotateRigthPoint(rotationOfTargetRightPoint, parameterChange)
        if (!this.LineIsLegal(rSoP, lTarP)) {
          return false
        }
      }

      if (rotationOfSourceRightPoint !== 0 || rotationOfTargetLeftPoint !== 0) {
        const lSoP: Point = this.SourceBase.RotateRigthPoint(rotationOfSourceRightPoint, parameterChange)
        const rTarP: Point = this.TargetBase.RotateLeftPoint(rotationOfTargetLeftPoint, parameterChange)
        if (!this.LineIsLegal(lSoP, rTarP)) {
          return false
        }
      }
    } else {
      if (rotationOfSourceLeftPoint !== 0 || rotationOfTargetLeftPoint !== 0) {
        const lSoP: Point = this.SourceBase.RotateLeftPoint(rotationOfSourceLeftPoint, parameterChange)
        const lTarP: Point = this.TargetBase.RotateLeftPoint(rotationOfTargetLeftPoint, parameterChange)
        if (!this.LineIsLegal(lSoP, lTarP)) {
          return false
        }
      }

      if (rotationOfSourceRightPoint !== 0 || rotationOfTargetRightPoint !== 0) {
        const rSoP: Point = this.SourceBase.RotateRigthPoint(rotationOfSourceRightPoint, parameterChange)
        const rTarP: Point = this.TargetBase.RotateRigthPoint(rotationOfTargetRightPoint, parameterChange)
        if (!this.LineIsLegal(rSoP, rTarP)) {
          return false
        }
      }
    }

    // 2. we are also not allowed to change the order of bundles around a hub
    if (rotationOfSourceRightPoint !== 0 || rotationOfSourceLeftPoint !== 0) {
      if (!this.SourceBase.RelativeOrderOfBasesIsPreserved(rotationOfSourceRightPoint, rotationOfSourceLeftPoint, parameterChange)) {
        return false
      }
    }

    if (rotationOfTargetRightPoint !== 0 || rotationOfTargetLeftPoint !== 0) {
      if (!this.TargetBase.RelativeOrderOfBasesIsPreserved(rotationOfTargetRightPoint, rotationOfTargetLeftPoint, parameterChange)) {
        return false
      }
    }

    return true
  }

  LineIsLegal(a: Point, b: Point): boolean {
    return this.tightObstaclesInTheBoundingBox.find((t) => Curve.intersectionOne(LineSegment.mkPP(a, b), t, false) != null) == null
  }
}
