import {Point} from '../../..'
import {Cone} from './Cone'
import {ConeSide} from './ConeSide'

export class ConeLeftSide extends ConeSide {
  constructor(cone: Cone) {
    super()
    this.Cone = cone
  }

  get Start(): Point {
    return this.Cone.Apex
  }

  get Direction(): Point {
    return this.Cone.LeftSideDirection
  }

  toString(): string {
    return 'ConeLeftSide ' + this.Start + (' ' + this.Direction)
  }
}
