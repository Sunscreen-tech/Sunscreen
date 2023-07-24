import {PolylinePoint} from '../../math/geometry/polylinePoint'
import {VertexEvent} from '../spline/coneSpanner/VertexEvent'
import {Obstacle} from './obstacle'

export class BasicVertexEvent extends VertexEvent {
  // This is just a subclass to carry the Obstacle object in addition to the Polyline.
  Obstacle: Obstacle
  constructor(obstacle: Obstacle, p: PolylinePoint) {
    super(p)
    this.Obstacle = obstacle
  }
}
