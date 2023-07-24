import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {VertexEvent} from './VertexEvent'

export class LowestVertexEvent extends VertexEvent {
  constructor(p: PolylinePoint) {
    super(p)
  }
}
