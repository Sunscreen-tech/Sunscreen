import {PolylinePoint} from '../../math/geometry/polylinePoint'
import {BasicVertexEvent} from './BasicVertexEvent'
import {Obstacle} from './obstacle'

export class OpenVertexEvent extends BasicVertexEvent {
  constructor(obstacle: Obstacle, p: PolylinePoint) {
    super(obstacle, p)
  }
}
