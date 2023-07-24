import {Point} from '../../../math/geometry/point'
import {SweepEvent} from '../../spline/coneSpanner/SweepEvent'
import {AxisEdge} from './AxisEdge'

export class AxisEdgeLowPointEvent extends SweepEvent {
  site: Point

  AxisEdge: AxisEdge
  public constructor(edge: AxisEdge, point: Point) {
    super()
    this.site = point
    this.AxisEdge = edge
  }

  get Site(): Point {
    return this.site
  }
}
