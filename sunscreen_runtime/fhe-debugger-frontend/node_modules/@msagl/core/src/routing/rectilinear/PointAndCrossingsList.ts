// A Group is a Shape that has children.
// This class maps between intersection points on Group boundaries and the groups and crossing
import {String} from 'typescript-string-operations'
import {Direction} from '../../math/geometry/direction'
import {Point} from '../../math/geometry/point'

import {GroupBoundaryCrossing} from './GroupBoundaryCrossing'
import {PointAndCrossings} from './PointAndCrossings'
import {PointComparer} from './PointComparer'

// directions at those intersection points.
export class PointAndCrossingsList {
  // Internal to allow testing.
  ListOfPointsAndCrossings: Array<PointAndCrossings> = []

  index = 0

  Count(): number {
    return this.ListOfPointsAndCrossings.length
  }

  constructor() {
    this.ListOfPointsAndCrossings = new Array<PointAndCrossings>()
  }

  Add(intersect: Point, crossings: Array<GroupBoundaryCrossing>) {
    this.ListOfPointsAndCrossings.push(new PointAndCrossings(intersect, crossings))
  }

  Pop(): PointAndCrossings {
    // Next should only be called after CurrentIsBeforeOrAt returns true.
    /*Assert.assert(
      this.index < this.ListOfPointsAndCrossings.length,
      'Unexpected call to Next()',
    )*/
    return this.ListOfPointsAndCrossings[this.index++]
  }

  CurrentIsBeforeOrAt(comparand: Point): boolean {
    if (this.index >= this.ListOfPointsAndCrossings.length) {
      return false
    }

    return PointComparer.ComparePP(this.ListOfPointsAndCrossings[this.index].Location, comparand) <= 0
  }

  get First(): PointAndCrossings {
    return this.ListOfPointsAndCrossings[0]
  }

  get Last(): PointAndCrossings {
    return this.ListOfPointsAndCrossings[this.ListOfPointsAndCrossings.length - 1]
  }

  Reset() {
    this.index = 0
  }

  MergeFrom(other: PointAndCrossingsList) {
    this.Reset()
    if (other == null) {
      return
    }

    // Do the usual sorted-list merge.
    const thisMax: number = this.ListOfPointsAndCrossings.length
    let thisIndex = 0
    const otherMax: number = other.ListOfPointsAndCrossings.length
    let otherIndex = 0
    const newCrossingsList = new Array<PointAndCrossings>(this.ListOfPointsAndCrossings.length)
    while (thisIndex < thisMax || otherIndex < otherMax) {
      if (thisIndex >= thisMax) {
        newCrossingsList.push(other.ListOfPointsAndCrossings[otherIndex++])
        continue
      }
      if (otherIndex >= otherMax) {
        newCrossingsList.push(this.ListOfPointsAndCrossings[thisIndex++])
        continue
      }

      const thisPac = this.ListOfPointsAndCrossings[thisIndex]
      const otherPac = other.ListOfPointsAndCrossings[otherIndex]
      const cmp = PointComparer.ComparePP(thisPac.Location, otherPac.Location)
      if (0 === cmp) {
        // No duplicates
        newCrossingsList.push(thisPac)
        ++thisIndex
        ++otherIndex
      } else if (-1 === cmp) {
        newCrossingsList.push(thisPac)
        ++thisIndex
      } else {
        newCrossingsList.push(otherPac)
        ++otherIndex
      }
    }
    this.ListOfPointsAndCrossings = newCrossingsList
  }

  Trim(start: Point, end: Point) {
    this.Reset()
    if (this.ListOfPointsAndCrossings == null || 0 === this.ListOfPointsAndCrossings.length) {
      return
    }

    this.ListOfPointsAndCrossings = this.ListOfPointsAndCrossings.filter(
      (pair) => PointComparer.ComparePP(pair.Location, start) >= 0 && PointComparer.ComparePP(pair.Location, end) <= 0,
    )
  }

  // For a single vertex point, split its Array of crossings in both directions into an array in each (opposite)
  // direction.  CLR Array iteration is much faster than Array.
  static ToCrossingArray(crossings: Array<GroupBoundaryCrossing>, dirToInside: Direction): GroupBoundaryCrossing[] {
    // First find the number in each (opposite) direction, then create the arrays.
    // We expect a very small number of groups to share a boundary point so this is not optimized.
    let numInDir = 0
    const crossingsCount = crossings.length
    // cache for perf
    for (let ii = 0; ii < crossingsCount; ii++) {
      if (crossings[ii].DirectionToInside === dirToInside) {
        numInDir++
      }
    }

    if (0 === numInDir) {
      return null
    }

    const vector = new Array(numInDir)
    let jj = 0
    for (let ii = 0; ii < crossingsCount; ii++) {
      if (crossings[ii].DirectionToInside === dirToInside) {
        vector[jj++] = crossings[ii]
      }
    }

    return vector
  }

  ToString(): string {
    return String.Format('{0} [{1}]', this.ListOfPointsAndCrossings.length, this.index)
  }
}
