import {Point} from '../../../math/geometry/point'
import {compareNumbers} from '../../../utils/compare'
import {Comparer} from '@esfx/equatable'
export class PointByDelegateComparer implements Comparer<Point> {
  projection: (p: Point) => number

  public constructor(projection: (p: Point) => number) {
    this.projection = projection
  }

  public compare(x: Point, y: Point): number {
    return compareNumbers(this.projection(x), this.projection(y))
  }
}
