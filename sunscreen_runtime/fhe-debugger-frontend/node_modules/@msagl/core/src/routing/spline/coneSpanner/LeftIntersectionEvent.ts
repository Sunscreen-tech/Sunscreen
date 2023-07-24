// left here means an intersection of a left cone side with an obstacle edge

import {Point} from '../../..'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {ConeLeftSide} from './ConeLeftSide'
import {SweepEvent} from './SweepEvent'

export class LeftIntersectionEvent extends SweepEvent {
  coneLeftSide: ConeLeftSide

  intersectionPoint: Point

  endVertex: PolylinePoint

  get EndVertex(): PolylinePoint {
    return this.endVertex
  }

  constructor(coneLeftSide: ConeLeftSide, intersectionPoint: Point, endVertex: PolylinePoint) {
    super()
    this.coneLeftSide = coneLeftSide
    this.intersectionPoint = intersectionPoint
    this.endVertex = endVertex
  }

  get Site(): Point {
    return this.intersectionPoint
  }

  toString(): string {
    return 'LeftIntersectionEvent ' + this.intersectionPoint
  }
}
