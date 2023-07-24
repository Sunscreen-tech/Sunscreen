export class TupleMap<A, B, C> {
  mainMap = new Map<A, Map<B, C>>()
  get isEmpty(): boolean {
    return this.mainMap.size === 0 || this.everyMapIsEmpty()
  }
  everyMapIsEmpty(): boolean {
    for (const b of this.mainMap.values()) {
      if (b.size) return false
    }
    return true
  }
  get(a: A, b: B): C {
    const m = this.mainMap.get(a)
    if (m) return m.get(b)
  }

  has(a: A, b: B): boolean {
    const m = this.mainMap.get(a)
    if (!m) return false
    return m.has(b)
  }

  set(a: A, b: B, c: C) {
    let m = this.mainMap.get(a)
    if (!m) {
      m = new Map<B, C>()
      this.mainMap.set(a, m)
    }

    m.set(b, c)
  }
  *[Symbol.iterator](): IterableIterator<[A, B, C]> {
    for (const [a, m] of this.mainMap) {
      for (const [b, c] of m) {
        yield [a, b, c]
      }
    }
  }
  *keys(): IterableIterator<[A, B]> {
    for (const [a, m] of this.mainMap) {
      for (const [b] of m) {
        yield [a, b]
      }
    }
  }
}
