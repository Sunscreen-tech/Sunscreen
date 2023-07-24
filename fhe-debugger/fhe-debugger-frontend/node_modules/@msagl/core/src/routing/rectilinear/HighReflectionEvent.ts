import {Point} from '../../math/geometry/point'
import {HighObstacleSide} from './BasicObstacleSide'
import {BasicReflectionEvent} from './basicReflectionEvent'

export class HighReflectionEvent extends BasicReflectionEvent {
  Side: HighObstacleSide

  constructor(previousSite: BasicReflectionEvent, targetSide: HighObstacleSide, site: Point) {
    super(previousSite.ReflectingObstacle, targetSide.Obstacle, site)
    this.Side = targetSide
  }
}
