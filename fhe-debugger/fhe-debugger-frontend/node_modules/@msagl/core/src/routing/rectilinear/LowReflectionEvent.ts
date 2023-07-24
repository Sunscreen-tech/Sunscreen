import {Point} from '../../math/geometry/point'
import {LowObstacleSide} from './BasicObstacleSide'
import {BasicReflectionEvent} from './basicReflectionEvent'

export class LowReflectionEvent extends BasicReflectionEvent {
  Side: LowObstacleSide

  constructor(previousSite: BasicReflectionEvent, targetSide: LowObstacleSide, site: Point) {
    super(previousSite.ReflectingObstacle, targetSide.obstacle, site)
    this.Side = targetSide
  }
}
