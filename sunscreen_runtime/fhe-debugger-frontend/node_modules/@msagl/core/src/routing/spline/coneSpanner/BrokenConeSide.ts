import {Point} from '../../..'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {ConeSide} from './ConeSide'

// represents a cone side that is broken by the obstacle
export class BrokenConeSide extends ConeSide {
  // point where it starts
  start: Point

  get Start(): Point {
    return this.start
  }

  // it is the side of the cone that intersects the obstacle side
  ConeSide: ConeSide
  EndVertex: PolylinePoint

  get End(): Point {
    return this.EndVertex.point
  }

  constructor(start: Point, end: PolylinePoint, coneSide: ConeSide) {
    super()
    this.start = start
    this.EndVertex = end
    this.ConeSide = coneSide
  }

  get Direction(): Point {
    return this.End.sub(this.Start)
  }

  public toString(): string {
    return 'BrokenConeSide: ' + (this.Start + (',' + this.End))
  }
}
