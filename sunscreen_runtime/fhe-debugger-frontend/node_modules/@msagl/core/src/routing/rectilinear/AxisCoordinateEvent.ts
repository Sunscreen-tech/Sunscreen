import {Point} from '../../math/geometry/point'
import {SweepEvent} from '../spline/coneSpanner/SweepEvent'

export class AxisCoordinateEvent extends SweepEvent {
  private site: Point
  constructor(p: Point) {
    super()
    this.site = p
  }

  get Site(): Point {
    return this.site
  }
}
