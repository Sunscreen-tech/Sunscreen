import {Point} from '..'
import {PointPair} from '../math/geometry/pointPair'
import {PointMap} from './PointMap'

export class PointPairMap<T> {
  mapOfMaps: PointMap<PointMap<T>>
  private size_ = 0
  clear() {
    this.mapOfMaps.clear()
    this.size_ = 0
  }

  get size(): number {
    return this.size_
  }
  set(pp: PointPair, v: T) {
    const x = pp._first
    const y = pp._second
    let m = this.mapOfMaps.get(x)
    if (m == null) this.mapOfMaps.set(x, (m = new PointMap<T>()))

    if (!m.has(y)) {
      this.size_++
    }
    m.set(y, v)
  }

  delete(pp: PointPair) {
    const x = pp._first
    const y = pp._second

    const m = this.mapOfMaps.get(x)
    if (m != null) {
      if (m.deleteP(y)) this.size_--
    }
  }

  has(pp: PointPair): boolean {
    const m = this.mapOfMaps.get(pp._first)
    return m != null && m.has(pp._second)
  }

  getPP(p: Point, q: Point) {
    return this.get(new PointPair(p, q))
  }
  get(pp: PointPair): T {
    const m = this.mapOfMaps.get(pp._first)
    if (m == null) return

    return m.get(pp._second)
  }
  constructor() {
    this.mapOfMaps = new PointMap<PointMap<T>>()
  }

  *keys(): IterableIterator<PointPair> {
    for (const p of this.mapOfMaps) {
      for (const yp of p[1]) {
        yield new PointPair(p[0], yp[0])
      }
    }
  }

  *[Symbol.iterator](): IterableIterator<[PointPair, T]> {
    for (const [x, m] of this.mapOfMaps) {
      for (const [y, t] of m) {
        yield [new PointPair(x, y), t]
      }
    }
  }

  *values(): IterableIterator<T> {
    for (const p of this.mapOfMaps) {
      for (const yV of p[1]) {
        yield yV[1]
      }
    }
  }
}
