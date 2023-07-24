import {Point} from '../../math/geometry/point'

export abstract class SegmentBase {
  abstract get Start(): Point

  abstract get End(): Point

  get Direction(): Point {
    return this.End.sub(this.Start)
  }
  toString(): string {
    return this.Start + ' ' + this.End
  }
}
