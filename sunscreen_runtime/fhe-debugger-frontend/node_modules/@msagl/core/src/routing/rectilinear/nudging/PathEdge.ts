// A place holder for an edge in a path to keep it inside of a linked list representing a path.
// Each PathEdge belongs to only one path

// PathEdge passes through the AxisEdge that it points to but may go to the different direction.

import {Point} from '../../../math/geometry/point'
import {CompassVector} from '../../../math/geometry/compassVector'
import {Direction} from '../../../math/geometry/direction'
import {closeDistEps} from '../../../utils/compare'
import {AxisEdge} from './AxisEdge'
import {LongestNudgedSegment} from './LongestNudgedSegment'
import {Path} from './Path'

// In the last case the PathEdge is marked as Reversed. Several PathEdges can share the same AxisEdge.
export class PathEdge {
  AxisEdge: AxisEdge

  Next: PathEdge

  Prev: PathEdge

  Width: number

  Path: Path

  toString(): string {
    return this.Source + (' ' + this.Target)
  }

  constructor(edgeForNudging: AxisEdge, width: number) {
    this.AxisEdge = edgeForNudging
    this.Width = width
  }

  private longestNudgedSegment: LongestNudgedSegment

  // It is the offset of the edge from the underlying line segment
  // [VisibilityEdge.SourcePoint, VisibilityEdge.TargetPoint] in to the direction of the VisibilityEdge.Perpendicular.
  // Offset holder is the same for the maximal parallel sequence of connected PathEdges

  get LongestNudgedSegment(): LongestNudgedSegment {
    return this.longestNudgedSegment
  }
  set LongestNudgedSegment(value: LongestNudgedSegment) {
    this.longestNudgedSegment = value
    if (this.longestNudgedSegment != null) {
      this.longestNudgedSegment.AddEdge(this)
      this.AxisEdge.AddLongestNudgedSegment(this.longestNudgedSegment)
    }
  }

  // A fixed edge cannot be shifted from its visibility edge; offset is always 0.
  // Such an edge can be, for example, a terminal edge going to a port.

  IsFixed = false

  get Source(): Point {
    return !this.Reversed ? this.AxisEdge.SourcePoint : this.AxisEdge.TargetPoint
  }

  get Target(): Point {
    return this.Reversed ? this.AxisEdge.SourcePoint : this.AxisEdge.TargetPoint
  }

  static VectorsAreParallel(a: Point, b: Point): boolean {
    return closeDistEps(a.x * b.y - a.y * b.x, 0)
  }

  public static EdgesAreParallel(edge: PathEdge, pathEdge: PathEdge): boolean {
    return PathEdge.VectorsAreParallel(
      edge.AxisEdge.TargetPoint.sub(edge.AxisEdge.SourcePoint),
      pathEdge.AxisEdge.TargetPoint.sub(pathEdge.AxisEdge.SourcePoint),
    )
  }

  get Direction(): Direction {
    return this.Reversed ? CompassVector.OppositeDir(this.AxisEdge.Direction) : this.AxisEdge.Direction
  }

  // if set to true then in the path the edge is reversed

  Reversed = false
  index = -1

  // not set yet

  // the index of the edge in the order

  get Index(): number {
    return this.index
  }
  set Index(value: number) {
    this.index = value
  }
}
