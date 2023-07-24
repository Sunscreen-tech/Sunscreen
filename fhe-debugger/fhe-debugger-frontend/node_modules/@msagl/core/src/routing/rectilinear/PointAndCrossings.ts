import {Point} from '../../math/geometry/point'
import {GroupBoundaryCrossing} from './GroupBoundaryCrossing'

// MSAGL class for a Point and any Group boundary crossings at that Point, for Rectilinear Edge Routing.
export class PointAndCrossings {
  Location: Point
  Crossings: Array<GroupBoundaryCrossing> = []

  constructor(loc: Point, crossings: Array<GroupBoundaryCrossing>) {
    this.Location = loc
    this.Crossings = crossings
  }
}
