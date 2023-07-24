import {Point} from '..'
import {PointPair} from '../math/geometry/pointPair'
import {PointPairMap} from './pointPairMap'
import {PointSet} from './PointSet'

export function substractSets<T>(a: Set<T>, b: Set<T>): Set<T> {
  const ret = new Set<T>()
  for (const u of a) {
    if (!b.has(u)) ret.add(u)
  }
  return ret
}

export function substractPointSets(a: PointSet, b: PointSet): PointSet {
  const ret = new PointSet()
  for (const u of a) {
    if (!b.has(u)) ret.add(u)
  }
  return ret
}

export function uniteSets<T>(a: Set<T>, b: Set<T>): Set<T> {
  const ret = new Set<T>(a)
  for (const v of b) {
    ret.add(v)
  }

  return ret
}

export function addRange<T>(array: Array<T>, addedIterable: Iterable<T>) {
  for (const t of addedIterable) array.push(t)
}

export function setIntersection<T>(a: Set<T>, b: Set<T>): Set<T> {
  const ret = new Set<T>()
  if (a.size < b.size) {
    for (const t of a) {
      if (b.has(t)) ret.add(t)
    }
  } else {
    for (const t of b) {
      if (a.has(t)) ret.add(t)
    }
  }
  return ret
}

export function setIntersectionOfArray<T>(arr: Set<T>[]): Set<T> {
  if (arr.length === 0) return new Set<T>()
  let ret = arr[0]
  for (let i = 1; i < arr.length; i++) {
    ret = setIntersection(ret, arr[i])
  }
  return ret
}

export function insertRange<T>(collection: Set<T>, addedArray: Iterable<T>) {
  for (const t of addedArray) collection.add(t)
}

export function setsAreEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false
  for (const u of a) if (!b.has(u)) return false
  return true
}
/** return the concatenated array of items */
export function flattenArray<U, T>(arr: ReadonlyArray<T>, callback: (elem: T) => Iterable<U>): U[] {
  const ret = []
  for (const f of arr) {
    for (const u of callback(f)) ret.push(u)
  }
  return ret
}
/** adds val to map.get(key) if the key exists, otherwise creates the key pair and
 * executes the former instruction
 */
export function addToMapOfSets<K, V>(map: Map<K, Set<V>>, key: K, val: V) {
  let s = map.get(key)
  if (!s) {
    s = new Set<V>()
    map.set(key, s)
  }
  s.add(val)
}

export function addToMapOfArrays<K, V>(map: Map<K, Array<V>>, key: K, val: V) {
  let s = map.get(key)
  if (!s) {
    s = new Array<V>()
    map.set(key, s)
  }
  s.push(val)
}

export function addToPointPairMap<V>(map: PointPairMap<Set<V>>, key: PointPair, val: V) {
  let s = map.get(key)
  if (!s) {
    s = new Set<V>()
    map.set(key, s)
  }
  s.add(val)
}

export function addToPointMapTuple<V>(map: PointPairMap<Set<V>>, key: [Point, Point], val: V) {
  addToPointPairMap(map, new PointPair(key[0], key[1]), val)
}

export function removeFromPointPairMap<V>(map: PointPairMap<Set<V>>, key: PointPair, val: V) {
  const s = map.get(key)
  if (s) s.delete(val)
}
export function removeFromPointPairMapTuple<V>(map: PointPairMap<Set<V>>, key: [Point, Point], val: V) {
  removeFromPointPairMap(map, new PointPair(key[0], key[1]), val)
}
export function removeFromArray<T>(arr: T[], OverlapRemovalNode: T) {
  const i = arr.findIndex((a: T) => a === OverlapRemovalNode)
  if (i >= 0) {
    arr.splice(i, 1)
  }
}
