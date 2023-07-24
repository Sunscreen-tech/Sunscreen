import {Point} from '../../../math/geometry/point'
import {Polyline} from '../../../math/geometry/polyline'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {SweepEvent} from './SweepEvent'

export class VertexEvent extends SweepEvent {
  Vertex: PolylinePoint

  get Site(): Point {
    return this.Vertex.point
  }

  constructor(p: PolylinePoint) {
    super()
    this.Vertex = p
  }

  get Polyline(): Polyline {
    return this.Vertex.polyline
  }
}
