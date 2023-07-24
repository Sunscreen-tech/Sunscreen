import {GeomConstants} from '../../math/geometry/geomConstants'
import {IRectangle} from './IRectangle'

export class Interval implements IRectangle<number> {
  start: number
  end: number

  // constructor
  constructor(start: number, end: number) {
    this.start = start
    this.end = end
  }
  area: number
  add(n: number): void {
    this.add_d(n)
  }
  add_rect(rectangle: IRectangle<number>): IRectangle<number> {
    const r = rectangle as unknown as Interval
    const ret: Interval = this.clone()
    ret.add_d(r.start)
    ret.add_d(r.end)
    return ret
  }
  clone(): Interval {
    return new Interval(this.start, this.end)
  }
  contains_point(n: number): boolean {
    return this.contains_d(n)
  }
  contains_rect(rect: IRectangle<number>): boolean {
    const r = rect as unknown as Interval
    return this.contains_d(r.start) && this.contains_d(r.end)
  }

  intersection_rect(rectangle: IRectangle<number>): IRectangle<number> {
    const r = rectangle as Interval
    return new Interval(Math.max(this.start, r.start), Math.min(this.end, r.end))
  }
  intersects_rect(rectangle: IRectangle<number>): boolean {
    const r = rectangle as unknown as Interval
    return this.intersects(r)
  }

  contains_point_radius(p: number, radius: number): boolean {
    return this.contains_d(p - radius) && this.contains_d(p + radius)
  }

  //
  static mkInterval(a: Interval, b: Interval) {
    const i = new Interval(a.start, a.end)
    i.add_d(b.start)
    i.add_d(b.end)
    return i
  }

  // expanding the range to hold v
  add_d(v: number) {
    if (this.start > v) {
      this.start = v
    }

    if (this.end < v) {
      this.end = v
    }
  }

  get Start(): number {
    return this.start
  }
  set Start(value: number) {
    this.start = value
  }

  // the length
  get Length(): number {
    return this.end - this.start
  }

  // return true if the value is inside the range
  contains_d(v: number): boolean {
    return this.start <= v && v <= this.end
  }

  // bringe v into the range
  GetInRange(v: number): number {
    return v < this.start ? this.start : v > this.end ? this.end : v
  }

  // returns true if and only if two intervals are intersecting
  intersects(other: Interval): boolean {
    if (other.start > this.end + GeomConstants.distanceEpsilon) {
      return false
    }

    return !(other.end < this.start - GeomConstants.distanceEpsilon)
  }
}
