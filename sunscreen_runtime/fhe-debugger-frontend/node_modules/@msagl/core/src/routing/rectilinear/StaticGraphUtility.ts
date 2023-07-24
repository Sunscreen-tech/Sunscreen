// import {CompassVector} from '../../math/geometry/compassVector'
import {Direction} from '../../math/geometry/direction'
import {LineSegment} from '../../math/geometry/lineSegment'
import {Point} from '../../math/geometry/point'
import {Rectangle} from '../../math/geometry/rectangle'

import {SegmentBase} from '../visibility/SegmentBase'
import {VisibilityEdge} from '../visibility/VisibilityEdge'
import {VisibilityVertex} from '../visibility/VisibilityVertex'
import {PointComparer} from './PointComparer'
import {ScanDirection} from './ScanDirection'

export class StaticGraphUtility {
  // Determine the direction of an edge.
  static EdgeDirectionVE(edge: VisibilityEdge): Direction {
    return StaticGraphUtility.EdgeDirectionVV(edge.Source, edge.Target)
  }

  static EdgeDirectionVV(source: VisibilityVertex, target: VisibilityVertex): Direction {
    return PointComparer.GetDirections(source.point, target.point)
  }

  static GetEdgeEnd(edge: VisibilityEdge, dir: Direction): VisibilityVertex {
    const edgeDir: Direction = StaticGraphUtility.EdgeDirectionVE(edge)
    /*Assert.assert(
      0 !== (dir & (edgeDir | CompassVector.OppositeDir(edgeDir))),
      'dir is orthogonal to edge',
    )*/
    return dir === edgeDir ? edge.Target : edge.Source
  }

  static FindAdjacentVertex(vertex: VisibilityVertex, dir: Direction): VisibilityVertex {
    // This function finds the next vertex in the desired direction relative to the
    // current vertex, not necessarily the edge orientation, hence it does not use
    // EdgeDirection().  This is so the caller can operate on a desired movement
    // direction without having to track whether we're going forward or backward
    // through the In/OutEdge chain.
    for (const edge of vertex.InEdges) {
      if (PointComparer.GetDirections(vertex.point, edge.SourcePoint) === dir) {
        return edge.Source
      }
    }

    // Avoid GetEnumerator overhead.
    for (const edge of vertex.OutEdges) {
      if (PointComparer.GetDirections(vertex.point, edge.TargetPoint) === dir) {
        return edge.Target
      }
    }

    return null
  }

  static FindAdjacentEdge(a: VisibilityVertex, dir: Direction): VisibilityEdge {
    for (const edge of a.InEdges) {
      if (PointComparer.GetDirections(edge.SourcePoint, a.point) === dir) {
        return edge
      }
    }

    for (const edge of a.OutEdges) {
      if (PointComparer.GetDirections(a.point, edge.TargetPoint) === dir) {
        return edge
      }
    }
    return null
  }

  static FindBendPointBetween(sourcePoint: Point, targetPoint: Point, finalEdgeDir: Direction): Point {
    return !StaticGraphUtility.IsVerticalD(finalEdgeDir) ? new Point(sourcePoint.x, targetPoint.y) : new Point(targetPoint.x, sourcePoint.y)
  }

  static SegmentIntersectionPPP(first: Point, second: Point, from: Point): Point {
    const dir = PointComparer.GetDirections(first, second)
    return StaticGraphUtility.IsVerticalD(dir) ? new Point(first.x, from.y) : new Point(from.x, first.y)
  }

  static SegmentIntersectionSP(seg: SegmentBase, from: Point): Point {
    return StaticGraphUtility.SegmentIntersectionPPP(seg.Start, seg.End, from)
  }

  static SegmentsIntersection(first: SegmentBase, second: SegmentBase): Point {
    return StaticGraphUtility.IntervalsIntersect(first.Start, first.End, second.Start, second.End)
  }

  static SegmentsIntersectLL(first: LineSegment, second: LineSegment): Point {
    return StaticGraphUtility.IntervalsIntersect(first.start, first.end, second.start, second.end)
  }

  static IntervalsOverlapSS(first: SegmentBase, second: SegmentBase): boolean {
    return StaticGraphUtility.IntervalsOverlapPPPP(first.Start, first.End, second.Start, second.End)
  }

  static IntervalsOverlapPPPP(start1: Point, end1: Point, start2: Point, end2: Point): boolean {
    return (
      StaticGraphUtility.IntervalsAreCollinear(start1, end1, start2, end2) &&
      PointComparer.ComparePP(start1, end2) !== PointComparer.ComparePP(end1, start2)
    )
  }

  static IntervalsAreCollinear(start1: Point, end1: Point, start2: Point, end2: Point): boolean {
    /*Assert.assert(
      StaticGraphUtility.IsVerticalPP(start1, end1) ==
        StaticGraphUtility.IsVerticalPP(start2, end2),
      'segments are not in the same orientation',
    )*/
    const vertical: boolean = StaticGraphUtility.IsVerticalPP(start1, end1)
    if (StaticGraphUtility.IsVerticalPP(start2, end2) === vertical) {
      // This handles touching endpoints as well.
      return vertical ? PointComparer.Equal(start1.x, start2.x) : PointComparer.Equal(start1.y, start2.y)
    }

    return false
  }

  static IntervalsAreSame(start1: Point, end1: Point, start2: Point, end2: Point): boolean {
    return PointComparer.EqualPP(start1, start2) && PointComparer.EqualPP(end1, end2)
  }

  static IntervalsIntersect(firstStart: Point, firstEnd: Point, secondStart: Point, secondEnd: Point): Point {
    /*Assert.assert(
      StaticGraphUtility.IsVerticalPP(firstStart, firstEnd) !=
        StaticGraphUtility.IsVerticalPP(secondStart, secondEnd),
      'cannot intersect two parallel segments',
    )*/
    const intersect = StaticGraphUtility.SegmentIntersectionPPP(firstStart, firstEnd, secondStart)
    return StaticGraphUtility.PointIsOnSegmentPPP(firstStart, firstEnd, intersect) &&
      StaticGraphUtility.PointIsOnSegmentPPP(secondStart, secondEnd, intersect)
      ? intersect
      : undefined
  }

  static SegmentIntersectionEP(edge: VisibilityEdge, from: Point): Point {
    return StaticGraphUtility.SegmentIntersectionPPP(edge.SourcePoint, edge.TargetPoint, from)
  }

  static PointIsOnSegmentPPP(first: Point, second: Point, test: Point): boolean {
    return (
      PointComparer.EqualPP(first, test) ||
      PointComparer.EqualPP(second, test) ||
      PointComparer.GetDirections(first, test) === PointComparer.GetDirections(test, second)
    )
  }

  static PointIsOnSegmentSP(seg: SegmentBase, test: Point): boolean {
    return StaticGraphUtility.PointIsOnSegmentPPP(seg.Start, seg.End, test)
  }

  static IsVerticalD(dir: Direction): boolean {
    return 0 !== (dir & (Direction.North | Direction.South))
  }

  static IsVerticalE(edge: VisibilityEdge): boolean {
    return StaticGraphUtility.IsVerticalD(PointComparer.GetDirections(edge.SourcePoint, edge.TargetPoint))
  }

  static IsVerticalPP(first: Point, second: Point): boolean {
    return StaticGraphUtility.IsVerticalD(PointComparer.GetDirections(first, second))
  }

  static IsVertical(seg: LineSegment): boolean {
    return StaticGraphUtility.IsVerticalD(PointComparer.GetDirections(seg.start, seg.end))
  }

  static IsAscending(dir: Direction): boolean {
    return (dir & (Direction.North | Direction.East)) !== 0
  }

  static Slope(start: Point, end: Point, scanDir: ScanDirection): number {
    // Find the slope relative to scanline - how much scan coord changes per sweep change.
    const lineDir = end.sub(start)
    return lineDir.dot(scanDir.PerpDirectionAsPoint) / lineDir.dot(scanDir.DirectionAsPoint)
  }

  static SortAscending(a: Point, b: Point): [Point, Point] {
    const dir: Direction = PointComparer.GetDirections(a, b)
    /*Assert.assert(
      Direction.None === dir || PointComparer.IsPureDirectionD(dir),
      'SortAscending with impure direction',
    )*/
    return Direction.None === dir || StaticGraphUtility.IsAscending(dir) ? [a, b] : [b, a]
  }

  static RectangleBorderIntersect(boundingBox: Rectangle, point: Point, dir: Direction): Point {
    switch (dir) {
      case Direction.North:
      case Direction.South:
        return new Point(point.x, StaticGraphUtility.GetRectangleBound(boundingBox, dir))
        break
      case Direction.East:
      case Direction.West:
        return new Point(StaticGraphUtility.GetRectangleBound(boundingBox, dir), point.y)
        break
      default:
        throw new Error()
        break
    }
  }

  static GetRectangleBound(rect: Rectangle, dir: Direction): number {
    switch (dir) {
      case Direction.North:
        return rect.top
        break
      case Direction.South:
        return rect.bottom
        break
      case Direction.East:
        return rect.right
        break
      case Direction.West:
        return rect.left
        break
      default:
        throw new Error()
        break
    }
  }

  static RectangleInteriorsIntersect(a: Rectangle, b: Rectangle): boolean {
    return (
      PointComparer.Compare(a.bottom, b.top) < 0 &&
      PointComparer.Compare(b.bottom, a.top) < 0 &&
      PointComparer.Compare(a.left, b.right) < 0 &&
      PointComparer.Compare(b.left, a.right) < 0
    )
  }

  static PointIsInRectangleInterior(point: Point, rect: Rectangle): boolean {
    return (
      PointComparer.Compare(point.y, rect.top) < 0 &&
      PointComparer.Compare(rect.bottom, point.y) < 0 &&
      PointComparer.Compare(point.x, rect.right) < 0 &&
      PointComparer.Compare(rect.left, point.x) < 0
    )
  }
}
