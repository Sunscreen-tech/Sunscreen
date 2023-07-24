// this event caused by the intersection of a ObstacleSideSegment and the other cone side of the same cone
// when this event happens the cone has to be removed

import {Point} from '../../..'
import {Cone} from './Cone'
import {SweepEvent} from './SweepEvent'

export class ConeClosureEvent extends SweepEvent {
  coneToClose: Cone

  get ConeToClose(): Cone {
    return this.coneToClose
  }

  site: Point

  get Site(): Point {
    return this.site
  }

  constructor(site: Point, cone: Cone) {
    super()
    this.site = site
    this.coneToClose = cone
  }

  toString(): string {
    return 'ConeClosureEvent ' + this.site
  }
}
