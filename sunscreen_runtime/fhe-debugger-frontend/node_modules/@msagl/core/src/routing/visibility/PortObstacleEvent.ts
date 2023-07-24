import {Point} from '../../math/geometry/point'
import {SweepEvent} from '../spline/coneSpanner/SweepEvent'

export class PortObstacleEvent extends SweepEvent {
  site: Point

  constructor(site: Point) {
    super()
    this.site = site
  }

  get Site(): Point {
    return this.site
  }
}
