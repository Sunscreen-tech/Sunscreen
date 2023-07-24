import {Point} from '../../../math/geometry/point'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {ObstacleSide} from './ObstacleSide'

export class RightObstacleSide extends ObstacleSide {
  end: Point

  constructor(startVertex: PolylinePoint) {
    super(startVertex)
    this.end = startVertex.prevOnPolyline.point
  }

  get End(): Point {
    return this.end
  }

  get EndVertex(): PolylinePoint {
    return this.StartVertex.prevOnPolyline
  }
}
