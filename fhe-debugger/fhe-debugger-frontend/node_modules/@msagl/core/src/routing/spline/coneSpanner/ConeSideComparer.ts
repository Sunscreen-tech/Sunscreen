import {Point} from '../../..'
import {TriangleOrientation} from '../../../math/geometry/point'
import {BrokenConeSide} from './BrokenConeSide'
import {ConeLeftSide} from './ConeLeftSide'
import {ConeSide} from './ConeSide'
import {IConeSweeper} from './IConeSweeper'

export class ConeSideComparer {
  x: Point

  SetOperand(activeElement: ConeSide) {
    this.x = this.IntersectionOfSegmentAndSweepLine(activeElement)
  }

  coneSweeper: IConeSweeper

  constructor(coneSweeper: IConeSweeper) {
    this.coneSweeper = coneSweeper
  }

  public Compare(a: ConeSide, b: ConeSide): number {
    const aIsBrokenConeSide = a instanceof BrokenConeSide
    const bIsBrokenConeSide = b instanceof BrokenConeSide
    if (aIsBrokenConeSide) {
      return bIsBrokenConeSide ? this.CompareBrokenSides(<BrokenConeSide>a, <BrokenConeSide>b) : this.CompareObstacleSideAndConeSide(b)
    } else {
      // a is ConeSide
      return bIsBrokenConeSide
        ? this.CompareConeSideAndObstacleSide(a, <BrokenConeSide>b)
        : ConeSideComparer.CompareNotIntersectingSegs(a, b)
    }
  }

  static CompareNotIntersectingSegs(a: ConeSide, b: ConeSide): number {
    const signedArea = Point.getTriangleOrientation(a.Start, b.Start, b.Start.add(b.Direction))
    switch (signedArea) {
      case TriangleOrientation.Counterclockwise:
        return -1
      case TriangleOrientation.Clockwise:
        return 1
      default:
        return 0
    }
  }

  CompareObstacleSideAndConeSide(coneSide: ConeSide): number {
    const orientation = Point.getTriangleOrientation(this.x, coneSide.Start, coneSide.Start.add(coneSide.Direction))
    if (orientation === TriangleOrientation.Counterclockwise) {
      return -1
    }

    if (orientation === TriangleOrientation.Clockwise) {
      return 1
    }

    // we have the case where x belongs to the cone side
    return coneSide instanceof ConeLeftSide ? -1 : 1
  }

  CompareConeSideAndObstacleSide(coneSide: ConeSide, brokenConeSide: BrokenConeSide): number {
    const orientation = Point.getTriangleOrientation(this.x, brokenConeSide.start, brokenConeSide.End)
    if (orientation === TriangleOrientation.Counterclockwise) {
      return -1
    }

    if (orientation === TriangleOrientation.Clockwise) {
      return 1
    }

    // we have the case where x belongs to the cone side
    //      lineSweeper.Show(CurveFactory.CreateDiamond(5,5, brokenConeSide.EndVertex.point));
    return coneSide instanceof ConeLeftSide ? 1 : -1
  }

  IntersectionOfSegmentAndSweepLine(obstacleSide: ConeSide): Point {
    const den = obstacleSide.Direction.dot(this.coneSweeper.SweepDirection)
    //Assert.assert(Math.abs(den) > 0)
    const t = (this.coneSweeper.Z - obstacleSide.Start.dot(this.coneSweeper.SweepDirection)) / den
    return obstacleSide.Start.add(obstacleSide.Direction.mul(t))
  }

  CompareBrokenSides(aObst: BrokenConeSide, bObst: BrokenConeSide): number {
    if (aObst.EndVertex === bObst.EndVertex) {
      return ConeSideComparer.CompareNotIntersectingSegs(aObst.ConeSide, bObst.ConeSide)
    }

    if (Point.getTriangleOrientation(this.x, bObst.start, bObst.EndVertex.point) === TriangleOrientation.Counterclockwise) {
      return -1
    }

    return 1
  }
}
