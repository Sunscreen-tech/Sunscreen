import {GeomConstants} from '../math/geometry/geomConstants'

// this class behaves like one dimensional bounding box
export class RealNumberSpan {
  isEmpty = true
  max: number
  min: number
  AddValue(x: number) {
    if (this.isEmpty) {
      this.max = x
      this.min = x
      this.isEmpty = false
    } else if (x < this.min) {
      this.min = x
    } else if (x > this.max) {
      this.max = x
    }
  }

  get length(): number {
    return this.max - this.min
  }

  // 0  if value is close to zero;
  // 1  if value is strictly greater than zero;
  // -1 if value is strictly lower than zero;
  static sign(value: number): number {
    return value > GeomConstants.distanceEpsilon ? 1 : value < -GeomConstants.distanceEpsilon ? -1 : 0
  }
}
