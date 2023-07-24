import {Point} from '../math/geometry/point'

export class PointMap<T> {
  mapOfMaps: Map<number, Map<number, T>>
  private size_ = 0
  deleteP(point: Point): boolean {
    return this.delete(point.x, point.y)
  }
  clear() {
    this.mapOfMaps.clear()
    this.size_ = 0
  }

  get size(): number {
    return this.size_
  }
  setxy(x: number, y: number, v: T) {
    let m = this.mapOfMaps.get(x)
    if (m == null) this.mapOfMaps.set(x, (m = new Map<number, T>()))

    if (!m.has(y)) {
      this.size_++
    }
    m.set(y, v)
  }
  set(p: Point, v: T) {
    this.setxy(p.x, p.y, v)
  }

  delete(x: number, y: number) {
    const m = this.mapOfMaps.get(x)
    if (m != null) {
      if (m.delete(y)) this.size_--
      return true
    }
    return false
  }

  hasxy(x: number, y: number): boolean {
    const m = this.mapOfMaps.get(x)
    return m != null && m.has(y)
  }
  has(p: Point) {
    return this.hasxy(p.x, p.y)
  }
  getxy(x: number, y: number) {
    const m = this.mapOfMaps.get(x)
    if (m == null) return

    return m.get(y)
  }
  get(p: Point) {
    return this.getxy(p.x, p.y)
  }
  constructor() {
    this.mapOfMaps = new Map<number, Map<number, T>>()
  }

  *keys(): IterableIterator<Point> {
    for (const p of this.mapOfMaps) {
      for (const yp of p[1]) {
        yield new Point(p[0], yp[0])
      }
    }
  }

  *[Symbol.iterator](): IterableIterator<[Point, T]> {
    for (const p of this.mapOfMaps) {
      for (const yV of p[1]) {
        yield [new Point(p[0], yV[0]), yV[1]]
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
