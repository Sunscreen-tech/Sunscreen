import {Point} from '../../..'
import {Cone} from './Cone'
import {ConeSide} from './ConeSide'

export class ConeRightSide extends ConeSide {
  constructor(cone: Cone) {
    super()
    this.Cone = cone
  }

  get Start(): Point {
    return this.Cone.Apex
  }

  get Direction(): Point {
    return this.Cone.RightSideDirection
  }

  toString(): string {
    return 'ConeRightSide ' + this.Start + ' ' + this.Direction
  }
}
