import {String} from 'typescript-string-operations'
import {Direction} from '../../math/geometry/direction'
import {Point} from '../../math/geometry/point'

import {PointMap} from '../../utils/PointMap'
import {GroupBoundaryCrossing} from './GroupBoundaryCrossing'
import {Obstacle} from './obstacle'
import {PointAndCrossingsList} from './PointAndCrossingsList'
import {PointComparer} from './PointComparer'

// A Group is a Shape that has children.
// This class maps between intersection points on Group boundaries and the groups and crossing
// directions at those intersection points.
export class GroupBoundaryCrossingMap {
  // Note:  Like VisibilityGraph, this does not use PointComparer but assumes already-rounded key values.
  pointCrossingMap: PointMap<Array<GroupBoundaryCrossing>> = new PointMap<Array<GroupBoundaryCrossing>>()

  AddIntersection(intersection: Point, group: Obstacle, dirToInside: Direction): GroupBoundaryCrossing {
    let crossings = this.pointCrossingMap.get(intersection)
    if (!crossings) {
      crossings = new Array<GroupBoundaryCrossing>()
      this.pointCrossingMap.set(intersection, crossings)
    }

    // We may hit the same point on neighbor traversal in multiple directions.  We will have more than one item
    // in this list only if there are multiple group boundaries at this point, which should be unusual.
    const crossingsCount = crossings.length
    // cache for perf
    for (let ii = 0; ii < crossingsCount; ii++) {
      const crossing = crossings[ii]
      if (crossing.Group === group) {
        // At a given location for a given group, there is only one valid dirToInside.
        /*Assert.assert(
          dirToInside === crossing.DirectionToInside,
          'Mismatched dirToInside',
        )*/
        return crossing
      }
    }

    const newCrossing = new GroupBoundaryCrossing(group, dirToInside)
    crossings.push(newCrossing)
    return newCrossing
  }

  Clear() {
    this.pointCrossingMap.clear()
  }

  pointList: Array<Point> = new Array<Point>()

  GetOrderedListBetween(start: Point, end: Point): PointAndCrossingsList {
    if (this.pointCrossingMap.size === 0) {
      return null
    }

    if (PointComparer.ComparePP(start, end) > 0) {
      const temp: Point = start
      start = end
      end = temp
    }

    // Start and end are inclusive.
    this.pointList = []
    for (const intersection of this.pointCrossingMap.keys()) {
      if (PointComparer.ComparePP(intersection, start) >= 0 && PointComparer.ComparePP(intersection, end) <= 0) {
        this.pointList.push(intersection)
      }
    }

    this.pointList.sort((a, b) => a.compareTo(b))
    const pointAndCrossingList = new PointAndCrossingsList()
    const numCrossings = this.pointList.length
    for (let ii = 0; ii < numCrossings; ii++) {
      const intersect: Point = this.pointList[ii]
      pointAndCrossingList.Add(intersect, this.pointCrossingMap.get(intersect))
    }

    return pointAndCrossingList
  }

  toString(): string {
    return String.Format('{0}', this.pointCrossingMap.size)
  }
}
