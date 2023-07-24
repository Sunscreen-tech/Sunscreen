import {GeomConstants} from '../math/geometry/geomConstants'
import {Point} from '../math/geometry/point'

export function compareBooleans(a: boolean, b: boolean): number {
  // return a - b
  return (a ? 1 : 0) - (b ? 1 : 0)
}
export function compareNumbers(a: number, b: number): number {
  const t = a - b
  return t < 0 ? -1 : t === 0 ? 0 : 1
}

export function comparePointsYFirst(a: Point, b: Point) {
  const cmp = compareNumbers(a.y, b.y)
  return cmp ? cmp : compareNumbers(a.x, b.x)
}

export function comparePointsXY(a: Point, b: Point) {
  const cmp = compareNumbers(a.x, b.x)
  return cmp ? cmp : compareNumbers(a.y, b.y)
}

export function closeDistEps(a: number, b: number): boolean {
  const d = a - b
  return -GeomConstants.distanceEpsilon <= d && d <= GeomConstants.distanceEpsilon
}

/** return true iff a >= b + GeomConstants.distanceEpsilon */
export function greaterDistEps(a: number, b: number): boolean {
  return compareNumbersDistEps(a, b) > 0
}
/** return true iff a <= b - GeomConstants.distanceEpsilon */
export function lessDistEps(a: number, b: number): boolean {
  return compareNumbersDistEps(a, b) < 0
}

/** returns -1 when a-b <= - GeomConstants.distanceEpsilon
 * returns 1 when a-b >=  GeomConstants.distanceEpsilon
 * return 0 otherwise
 */
export function compareNumbersDistEps(a: number, b: number): number {
  const c: number = a - b
  // The <= and >= here complement the < and > in Close(double, double).
  if (c <= -GeomConstants.distanceEpsilon) {
    return -1
  }

  if (c >= GeomConstants.distanceEpsilon) {
    return 1
  }

  return 0
}
