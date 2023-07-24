import {Point} from '.'
import {comparePointsYFirst as comparePointsYX} from '../../utils/compare'
import {distPP} from './point'

/** An unordered pair of points */
export class PointPair {
  _first: Point

  _second: Point

  public constructor(first: Point, second: Point) {
    if (comparePointsYX(first, second) < 0) {
      this._first = first
      this._second = second
    } else {
      this._first = second
      this._second = first
    }
  }

  public get first(): Point {
    return this._first
  }

  public get second(): Point {
    return this._second
  }

  public get Length(): number {
    return distPP(this._first, this._second)
  }

  public CompareTo(other: PointPair): number {
    const cr: number = comparePointsYX(this._first, other._first)
    if (cr !== 0) {
      return cr
    }

    return comparePointsYX(this._second, other._second)
  }

  public static equal(pair0: PointPair, pair1: PointPair): boolean {
    return pair0._first.equal(pair1._first) && pair0._second.equal(pair1._second)
  }

  public toString(): string {
    return this._first + (' ' + this._second)
  }
}
