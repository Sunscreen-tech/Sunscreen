import {Point} from '../../../math/geometry/point'
import {ConeSide} from './ConeSide'
import {IConeSweeper} from './IConeSweeper'

export class Cone {
  removed: boolean

  get Removed(): boolean {
    return this.removed
  }
  set Removed(value: boolean) {
    this.removed = value
  }

  apex: Point

  coneSweeper: IConeSweeper

  constructor(apex: Point, coneSweeper: IConeSweeper) {
    this.apex = apex
    this.coneSweeper = coneSweeper
  }

  get Apex(): Point {
    return this.apex
  }
  set Apex(value: Point) {
    this.apex = value
  }

  get RightSideDirection(): Point {
    return this.coneSweeper.ConeRightSideDirection
  }

  get LeftSideDirection(): Point {
    return this.coneSweeper.ConeLeftSideDirection
  }

  private rightSide: ConeSide

  get RightSide(): ConeSide {
    return this.rightSide
  }
  set RightSide(value: ConeSide) {
    this.rightSide = value
    this.rightSide.Cone = this
  }

  private leftSide: ConeSide

  get LeftSide(): ConeSide {
    return this.leftSide
  }
  set LeftSide(value: ConeSide) {
    this.leftSide = value
    this.leftSide.Cone = this
  }
}
