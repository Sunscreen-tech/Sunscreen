// compares couples only by looking at the couple first point

import {Point} from '../..'
import {GeomConstants} from '../../math/geometry'
import {Stem} from './Stem'

// we need the couple to hold the stem
export class StemStartPointComparer {
  pivot: Point

  constructor(p: Point) {
    this.pivot = p
  }

  IComparer(i: Stem, j: Stem): number {
    if (i === j) return 0
    if (i == null) return -1
    if (j == null) return 1

    const a = i.Start.point.sub(this.pivot)
    const b = j.Start.point.sub(this.pivot)

    return StemStartPointComparer.CompareVectorsByAngleToXAxis(a, b)
  }

  static CompareVectorsByAngleToXAxis(a: Point, b: Point): number {
    if (a.y >= 0) {
      if (b.y < 0) {
        return -1
      }

      return StemStartPointComparer.CompareVectorsPointingToTheSameYHalfPlane(a, b)
    } else {
      // a.y <0
      if (b.y >= 0) {
        return 1
      }

      return StemStartPointComparer.CompareVectorsPointingToTheSameYHalfPlane(a, b)
    }
  }

  private static CompareVectorsPointingToTheSameYHalfPlane(a: Point, b: Point): number {
    // now we know that a and b do not point to different Y half planes
    const sign: number = a.x * b.y - a.y * b.x
    if (sign > GeomConstants.tolerance) {
      return -1
    }

    if (sign < -GeomConstants.tolerance) {
      return 1
    }

    // are they on the opposite sides of the pivot by X?
    if (a.x >= 0) {
      if (b.x < 0) {
        return -1
      }
    } else if (b.x >= 0) {
      return 1
    }

    let del: number = Math.abs(a.x) - Math.abs(b.x)
    if (del < 0) {
      return -1
    }

    if (del > 0) {
      return 1
    }

    del = Math.abs(a.y) - Math.abs(b.y)
    if (del < 0) {
      return -1
    }

    if (del > 0) {
      return 1
    }

    return 0
    // points are equal
  }
}
