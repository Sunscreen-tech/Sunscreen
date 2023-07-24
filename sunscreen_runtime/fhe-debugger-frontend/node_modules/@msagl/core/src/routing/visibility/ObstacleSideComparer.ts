import {Point} from '../../math/geometry/point'
// import {GeomConstants} from '../../math/geometry/geomConstants'
import {TriangleOrientation} from '../../math/geometry/point'

import {LineSweeperBase} from './LineSweeperBase'
import {SegmentBase} from './SegmentBase'

export class ObstacleSideComparer {
  lineSweeper: LineSweeperBase

  constructor(lineSweeper: LineSweeperBase) {
    this.lineSweeper = lineSweeper
  }

  // the intersection of the sweepline and the active segment
  x: Point

  public Compare(a: SegmentBase, b: SegmentBase): number {
    const orient = Point.getTriangleOrientation(b.Start, b.End, this.x)
    switch (orient) {
      case TriangleOrientation.Collinear:
        return 0
        break
      case TriangleOrientation.Clockwise:
        return 1
        break
      default:
        return -1
        break
    }
  }

  SetOperand(side: SegmentBase) {
    this.x = this.IntersectionOfSideAndSweepLine(side)
  }

  IntersectionOfSideAndSweepLine(obstacleSide: SegmentBase): Point {
    const den = obstacleSide.Direction.dot(this.lineSweeper.SweepDirection)
    /*Assert.assert(Math.abs(den) > GeomConstants.distanceEpsilon)*/
    const t = (this.lineSweeper.Z - obstacleSide.Start.dot(this.lineSweeper.SweepDirection)) / den
    return obstacleSide.Start.add(obstacleSide.Direction.mul(t))
  }
}
