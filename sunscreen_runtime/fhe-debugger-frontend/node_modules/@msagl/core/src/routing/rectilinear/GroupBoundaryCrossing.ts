// A Group is a Shape that has children.
// This class defines a single crossing of a group boundary, from a point on the group boundary.
// It is intended as the Value of a GroupBoundaryCrossingMap entry, or as an element in a VisiblityEdge.GroupCrossings
import {String} from 'typescript-string-operations'
import {CompassVector} from '../../math/geometry/compassVector'
import {Direction} from '../../math/geometry/direction'
import {GeomConstants} from '../../math/geometry/geomConstants'
import {Point} from '../../math/geometry/point'

import {Obstacle} from './obstacle'

// array, so the actual crossing coordinates are not included.
export class GroupBoundaryCrossing {
  // The group to which this applies.
  Group: Obstacle
  // The direction from the vertex on the group boundary toward the inside of the group.
  DirectionToInside: Direction
  static BoundaryWidth = GeomConstants.distanceEpsilon

  constructor(group: Obstacle, dirToInside: Direction) {
    /*Assert.assert(
      CompassVector.IsPureDirection(dirToInside),
      'Impure direction',
    )*/
    this.Group = group
    this.DirectionToInside = dirToInside
  }

  BoundaryWidth = GeomConstants.distanceEpsilon

  GetInteriorVertexPoint(outerVertex: Point): Point {
    return Point.RoundPoint(outerVertex.add(CompassVector.toPoint(this.DirectionToInside).mul(this.BoundaryWidth)))
  }

  toString(): string {
    return String.Format('{0} {1}', this.DirectionToInside, this.Group)
  }
}
