// a wrapper arownd VisibilityEdge representing the same edge

import {CompassVector} from '../../../math/geometry/compassVector'
import {Direction} from '../../../math/geometry/direction'

import {VisibilityEdge} from '../../visibility/VisibilityEdge'
import {VisibilityVertex} from '../../visibility/VisibilityVertex'
import {LongestNudgedSegment} from './LongestNudgedSegment'

// but oriented along the X or the Y axis
export class AxisEdge extends VisibilityEdge {
  Direction: Direction

  constructor(source: VisibilityVertex, target: VisibilityVertex) {
    super(source, target)
    this.RightBound = Number.POSITIVE_INFINITY
    this.LeftBound = Number.NEGATIVE_INFINITY
    this.Direction = CompassVector.DirectionFromPointToPoint(source.point, target.point)
    /*Assert.assert(
      this.Direction === Direction.East || this.Direction === Direction.North,
    )*/
  }

  RightNeighbors = new Set<AxisEdge>()

  AddRightNeighbor(edge: AxisEdge) {
    this.RightNeighbors.add(edge)
  }

  LeftBound: number

  RightBound: number

  setOfLongestSegs: Set<LongestNudgedSegment> = new Set<LongestNudgedSegment>()

  get LongestNudgedSegments(): Iterable<LongestNudgedSegment> {
    return this.setOfLongestSegs
  }

  AddLongestNudgedSegment(segment: LongestNudgedSegment) {
    this.setOfLongestSegs.add(segment)
  }

  BoundFromRight(rightbound: number) {
    rightbound = Math.max(rightbound, this.LeftBound)
    this.RightBound = Math.min(rightbound, this.RightBound)
  }

  BoundFromLeft(leftbound: number) {
    leftbound = Math.min(leftbound, this.RightBound)
    this.LeftBound = Math.max(leftbound, this.LeftBound)
  }
}
