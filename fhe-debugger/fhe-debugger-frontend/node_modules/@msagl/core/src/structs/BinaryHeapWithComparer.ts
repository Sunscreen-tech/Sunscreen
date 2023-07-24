// A priority queue based on the binary heap algorithm.
// This class needs a comparer object to compare elements of the queue.

export class BinaryHeapWithComparer<T> {
  A: T[];

  *[Symbol.iterator]() {
    for (let i = 1; i <= this.heapSize; i++) {
      yield this.A[i]
    }
  }
  // array of the heap elems starting at A[1]
  heapSize = 0

  Enqueue(element: T) {
    let i: number = this.heapSize + 1
    this.A[i] = element
    this.heapSize++
    let j: number = i >> 1
    let son: T
    let parent: T
    while (i > 1 && this.Less((son = this.A[i]), (parent = this.A[j]))) {
      this.A[j] = son
      this.A[i] = parent
      i = j
      j = i >> 1
    }
  }

  Dequeue(): T {
    if (this.heapSize < 1) {
      throw new Error()
    }

    const ret: T = this.A[1]
    const candidate: T = this.A[this.heapSize]
    this.heapSize--
    this.ChangeMinimum(candidate)
    return ret
  }

  ChangeMinimum(candidate: T) {
    this.A[1] = candidate
    let j = 1
    let i = 2
    let done = false
    while (i < this.heapSize && !done) {
      done = true
      // both sons exist
      const leftSon: T = this.A[i]
      const rigthSon: T = this.A[i + 1]
      const compareResult: number = this.compare(leftSon, rigthSon)
      if (compareResult < 0) {
        // left son is the smallest
        if (this.compare(leftSon, candidate) < 0) {
          this.A[j] = leftSon
          this.A[i] = candidate
          done = false
          j = i
          i = j << 1
        }
      } else {
        // right son in not the greatest
        if (this.compare(rigthSon, candidate) < 0) {
          this.A[j] = rigthSon
          this.A[i + 1] = candidate
          done = false
          j = i + 1
          i = j << 1
        }
      }
    }

    if (i === this.heapSize) {
      // can we do one more step:
      const leftSon: T = this.A[i]
      if (this.compare(leftSon, candidate) < 0) {
        this.A[j] = leftSon
        this.A[i] = candidate
      }
    }
  }

  get Count(): number {
    return this.heapSize
  }

  Less(a: T, b: T): boolean {
    return this.compare(a, b) < 0
  }

  compare: (a: T, b: T) => number

  constructor(compare: (a: T, b: T) => number) {
    this.A = []
    this.compare = compare
  }

  public GetMinimum(): T {
    return this.A[1]
  }
}
