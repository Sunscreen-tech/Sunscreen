import {CompassVector} from '../../math/geometry/compassVector'
import {Direction} from '../../math/geometry/direction'
import {Point} from '../../math/geometry/point'

import {SegmentBase} from '../visibility/SegmentBase'
import {PointComparer} from './PointComparer'
import {StaticGraphUtility} from './StaticGraphUtility'

export class ScanDirection {
  // The direction of primary interest, either the direction of the sweep (the
  // coordinate the scanline sweeps "up" in) or along the scan line ("sideways"
  // to the sweep direction, scanning for obstacles).
  dir: Direction
  get Dir(): Direction {
    return this.dir
  }
  set Dir(value: Direction) {
    this.dir = value
  }

  DirectionAsPoint: Point

  // The perpendicular direction - opposite of comments for Direction.
  PerpDirection: Direction

  PerpDirectionAsPoint: Point

  // The oppposite direction of the primary direction.
  OppositeDirection: Direction

  // Use the internal static xxxInstance properties to get an instance.
  constructor(directionAlongScanLine: Direction) {
    /*Assert.assert(
      StaticGraphUtility.IsAscending(directionAlongScanLine),
      'directionAlongScanLine must be ascending',
    )*/
    this.Dir = directionAlongScanLine
    this.DirectionAsPoint = CompassVector.toPoint(this.Dir)
    this.PerpDirection = Direction.North === directionAlongScanLine ? Direction.East : Direction.North
    this.PerpDirectionAsPoint = CompassVector.toPoint(this.PerpDirection)
    this.OppositeDirection = CompassVector.OppositeDir(directionAlongScanLine)
  }

  get IsHorizontal(): boolean {
    return Direction.East === this.Dir
  }

  get IsVertical(): boolean {
    return Direction.North === this.Dir
  }

  // Compare in perpendicular direction first, then parallel direction.
  Compare(lhs: Point, rhs: Point): number {
    const cmp = this.ComparePerpCoord(lhs, rhs)
    return 0 !== cmp ? cmp : this.CompareScanCoord(lhs, rhs)
  }

  CompareScanCoord(lhs: Point, rhs: Point): number {
    return PointComparer.Compare(lhs.sub(rhs).dot(this.DirectionAsPoint), 0)
  }

  ComparePerpCoord(lhs: Point, rhs: Point): number {
    return PointComparer.Compare(lhs.sub(rhs).dot(this.PerpDirectionAsPoint), 0)
  }

  IsFlatS(seg: SegmentBase): boolean {
    return this.IsFlatPP(seg.Start, seg.End)
  }

  IsFlatPP(start: Point, end: Point): boolean {
    // Return true if there is no change in the perpendicular direction.
    return PointComparer.Equal(end.sub(start).dot(this.PerpDirectionAsPoint), 0)
  }

  IsPerpendicularS(seg: SegmentBase): boolean {
    return this.IsPerpendicularPP(seg.Start, seg.End)
  }

  IsPerpendicularPP(start: Point, end: Point): boolean {
    // Return true if there is no change in the primary direction.
    return PointComparer.Equal(end.sub(start).dot(this.DirectionAsPoint), 0)
  }

  Coord(point: Point): number {
    return point.dot(this.DirectionAsPoint)
  }

  Min(first: Point, second: Point): Point {
    return this.Compare(first, second) <= 0 ? first : second
  }

  Max(first: Point, second: Point): Point {
    return this.Compare(first, second) >= 0 ? first : second
  }

  static HorizontalInstance: ScanDirection = new ScanDirection(Direction.East)

  static VerticalInstance: ScanDirection = new ScanDirection(Direction.North)

  get PerpendicularInstance(): ScanDirection {
    return this.IsHorizontal ? ScanDirection.VerticalInstance : ScanDirection.HorizontalInstance
  }

  static GetInstance(dir: Direction): ScanDirection {
    return StaticGraphUtility.IsVerticalD(dir) ? ScanDirection.VerticalInstance : ScanDirection.HorizontalInstance
  }

  ToString(): string {
    return this.Dir.toString()
  }
}
