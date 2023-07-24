// based on map of maps
export class CoupleSet {
  mapOfSets = new Map<number, Set<number>>()
  insert(x: number, y: number) {
    let m = this.mapOfSets.get(x)
    if (m == null) this.mapOfSets.set(x, (m = new Set<number>()))
    m.add(y)
  }

  delete(x: number, y: number) {
    const m = this.mapOfSets.get(x)
    if (m != null) m.delete(y)
  }

  has(x: number, y: number): boolean {
    const m = this.mapOfSets.get(x)
    return m != null && m.has(y)
  }

  constructor() {
    this.mapOfSets = new Map<number, Set<number>>()
  }

  *elems(): IterableIterator<[number, number]> {
    for (const [k, v] of this.mapOfSets) {
      for (const yp of v) {
        yield [k, yp]
      }
    }
  }
}
