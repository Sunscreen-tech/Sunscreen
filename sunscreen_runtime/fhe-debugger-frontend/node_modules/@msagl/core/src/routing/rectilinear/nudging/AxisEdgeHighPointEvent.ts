import {Point} from '../../../math/geometry/point'
import {SweepEvent} from '../../spline/coneSpanner/SweepEvent'
import {AxisEdge} from './AxisEdge'

export class AxisEdgeHighPointEvent extends SweepEvent {
  site: Point

  AxisEdge: AxisEdge

  constructor(edge: AxisEdge, point: Point) {
    super()
    this.site = point
    this.AxisEdge = edge
  }

  get Site(): Point {
    return this.site
  }
}
