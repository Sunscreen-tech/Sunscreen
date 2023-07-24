import {Point} from '../math/geometry/point'

export class PointSet implements Set<Point> {
  mapOfSets: Map<number, Set<number>>
  private size_ = 0
  delete(point: Point) {
    return this.deletexy(point.x, point.y)
  }
  clear() {
    this.mapOfSets.clear()
    this.size_ = 0
  }

  get size(): number {
    return this.size_
  }

  static mk(points: Iterable<Point>): PointSet {
    const ret = new PointSet()
    for (const p of points) {
      ret.add(p)
    }
    return ret
  }

  addxy(x: number, y: number) {
    let m = this.mapOfSets.get(x)
    if (m == null) this.mapOfSets.set(x, (m = new Set<number>()))

    if (!m.has(y)) {
      this.size_++
    }
    m.add(y)
  }
  add(p: Point) {
    this.addxy(p.x, p.y)
    return this
  }

  deletexy(x: number, y: number): boolean {
    const m = this.mapOfSets.get(x)
    if (m != null) {
      if (m.delete(y)) {
        this.size_--
        return true
      }
    }
    return false
  }

  hasxy(x: number, y: number): boolean {
    return this.mapOfSets.has(x) && this.mapOfSets.get(x).has(y)
  }
  has(p: Point) {
    return this.hasxy(p.x, p.y)
  }

  constructor() {
    this.mapOfSets = new Map<number, Set<number>>()
  }
  forEach(callbackfn: (value: Point, value2: Point, set: Set<Point>) => void, thisArg?: any): void {
    for (const p of this) {
      callbackfn(p, p, thisArg)
    }
  }
  *entries(): IterableIterator<[Point, Point]> {
    for (const p of this) {
      yield [p, p]
    }
  }
  keys(): IterableIterator<Point> {
    return this.values()
  }

  [Symbol.toStringTag]: string;

  *values(): IterableIterator<Point> {
    for (const p of this.mapOfSets) {
      for (const yV of p[1]) {
        yield new Point(p[0], yV)
      }
    }
  }
  [Symbol.iterator](): IterableIterator<Point> {
    return this.values()
  }
}
