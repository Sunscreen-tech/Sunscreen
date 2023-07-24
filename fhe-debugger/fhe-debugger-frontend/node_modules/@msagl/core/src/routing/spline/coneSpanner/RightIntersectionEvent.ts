import {Point} from '../../..'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {ConeRightSide} from './ConeRightSide'
import {SweepEvent} from './SweepEvent'

// right here means an intersection of a right cone side with an obstacle edge
export class RightIntersectionEvent extends SweepEvent {
  coneRightSide: ConeRightSide

  intersectionPoint: Point

  endVertex: PolylinePoint

  get EndVertex(): PolylinePoint {
    return this.endVertex
  }
  set EndVertex(value: PolylinePoint) {
    this.endVertex = value
  }

  constructor(coneRightSide: ConeRightSide, intersectionPoint: Point, endVertex: PolylinePoint) {
    super()
    this.coneRightSide = coneRightSide
    this.intersectionPoint = intersectionPoint
    this.endVertex = endVertex
  }

  get Site(): Point {
    return this.intersectionPoint
  }

  toString(): string {
    return 'RightIntersectionEvent ' + this.intersectionPoint
  }
}
