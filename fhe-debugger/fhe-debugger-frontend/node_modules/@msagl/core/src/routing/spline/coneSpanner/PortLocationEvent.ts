import {Point} from '../../..'
import {SweepEvent} from './SweepEvent'

export class PortLocationEvent extends SweepEvent {
  public constructor(portLocation: Point) {
    super()
    this.PortLocation = portLocation
  }

  get Site(): Point {
    return this.PortLocation
  }

  PortLocation: Point
}
