import {Point} from '../../../math/geometry/point'

export class SegWithIndex {
  Points: Point[]

  I: number

  // offset
  constructor(pts: Point[], i: number) {
    /*Assert.assert(i < pts.length && i >= 0)*/
    this.Points = pts
    this.I = i
  }
  static equal(a: SegWithIndex, b: SegWithIndex) {
    return a.I === b.I && a.Points === b.Points
  }
  get Start(): Point {
    return this.Points[this.I]
  }

  get End(): Point {
    return this.Points[this.I + 1]
  }
}
