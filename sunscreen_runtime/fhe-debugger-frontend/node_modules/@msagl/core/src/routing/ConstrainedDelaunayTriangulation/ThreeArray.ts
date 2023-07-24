export class ThreeArray<T> {
  item0: T

  item1: T

  item2: T

  has(t: T): boolean {
    return t === this.item0 || t === this.item1 || t === this.item2
  }

  index(t: T): number {
    if (t === this.item0) {
      return 0
    }

    if (t === this.item1) {
      return 1
    }

    if (t === this.item2) {
      return 2
    }

    return -1
  }

  public getItem(i: number): T {
    switch (i) {
      case 0:
      case 3:
      case -3:
        return this.item0
        break
      case 1:
      case 4:
      case -2:
        return this.item1
        break
      case 2:
      case 5:
      case -1:
        return this.item2
        break
      default:
        throw new Error()
        break
    }
  }
  public setItem(i: number, value: T) {
    switch (i) {
      case 0:
      case 3:
      case -3:
        this.item0 = value
        break
      case 1:
      case 4:
      case -2:
        this.item1 = value
        break
      case 2:
      case 5:
      case -1:
        this.item2 = value
        break
      default:
        throw new Error()
        break
    }
  }
  [Symbol.iterator]() {
    return this.GetEnumerator()
  }
  // Returns an enumerator that iterates through the collection.
  public *GetEnumerator(): IterableIterator<T> {
    yield this.item0
    yield this.item1
    yield this.item2
  }
}

export function constructor<T>(item0: T, item1: T, item2: T) {
  const r = new ThreeArray()
  r.item0 = item0
  r.item1 = item1
  r.item2 = item2
  return r
}
