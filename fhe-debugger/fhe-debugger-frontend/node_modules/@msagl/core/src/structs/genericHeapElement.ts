export class GenericHeapElement<T> {
  indexToA: number

  priority: number

  v: T

  // value
  constructor(index: number, priority: number, v: T) {
    this.indexToA = index
    this.priority = priority
    this.v = v
  }
}
