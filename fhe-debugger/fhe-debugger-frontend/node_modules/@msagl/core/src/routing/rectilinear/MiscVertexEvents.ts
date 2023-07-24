import {PolylinePoint} from '../../math/geometry/polylinePoint'
import {BasicVertexEvent} from './BasicVertexEvent'
import {Obstacle} from './obstacle'

export class LowBendVertexEvent extends BasicVertexEvent {
  constructor(obstacle: Obstacle, p: PolylinePoint) {
    super(obstacle, p)
  }
}
export class HighBendVertexEvent extends BasicVertexEvent {
  constructor(obstacle: Obstacle, p: PolylinePoint) {
    super(obstacle, p)
  }
}

export class CloseVertexEvent extends BasicVertexEvent {
  constructor(obstacle: Obstacle, p: PolylinePoint) {
    super(obstacle, p)
  }
}
