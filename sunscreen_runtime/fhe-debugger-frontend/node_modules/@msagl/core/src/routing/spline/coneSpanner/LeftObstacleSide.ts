import {Point} from '../../../math/geometry/point'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {ObstacleSide} from './ObstacleSide'

export class LeftObstacleSide extends ObstacleSide {
  end: Point

  constructor(startVertex: PolylinePoint) {
    super(startVertex)
    this.end = startVertex.nextOnPolyline.point
  }

  get End(): Point {
    return this.end
  }

  get EndVertex(): PolylinePoint {
    return this.StartVertex.nextOnPolyline
  }
}
