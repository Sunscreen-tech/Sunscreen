// Generic version priority queue based on the binary heap algorithm where

import {StringBuilder} from 'typescript-string-operations'
import {compareNumbers} from '../utils/compare'
import {GenericHeapElement} from './genericHeapElement'

// the priority of each element is passed as a parameter.
export class GenericBinaryHeapPriorityQueue<T> {
  compare: (a: number, b: number) => number
  heapSize = 0

  A: GenericHeapElement<T>[]

  // array of heap elements
  // it is a mapping from queue elements and their correspondent HeapElements
  cache: Map<T, GenericHeapElement<T>>

  get count(): number {
    return this.heapSize
  }

  ContainsElement(key: T): boolean {
    return this.cache.has(key)
  }

  constructor(compare: (a: number, b: number) => number = compareNumbers) {
    this.compare = compare
    this.cache = new Map<T, GenericHeapElement<T>>()
    this.A = []
  }

  SwapWithParent(i: number) {
    const parent = this.A[i >> 1]
    this.PutAtI(i >> 1, this.A[i])
    this.PutAtI(i, parent)
  }

  Enqueue(element: T, priority: number) {
    let i: number = ++this.heapSize
    const h = new GenericHeapElement<T>(i, priority, element)
    this.cache.set(element, h)
    this.A[i] = h

    while (i > 1 && this.compare(this.A[i >> 1].priority, priority) > 0) {
      this.SwapWithParent(i)
      i >>= 1
    }
  }
  IsEmpty() {
    return this.heapSize === 0
  }

  PutAtI(i: number, h: GenericHeapElement<T>) {
    this.A[i] = h
    h.indexToA = i
  }
  Dequeue(): T {
    if (this.heapSize === 0) {
      throw new Error('dequeue on an empty queue')
    }

    const ret = this.A[1].v
    this.MoveQueueOneStepForward(ret)
    return ret
  }

  DequeueAndGetPriority(t: {priority: number}): T {
    if (this.heapSize === 0) {
      throw new Error('dequeue on an empty queue')
    }

    const ret = this.A[1].v
    t.priority = this.A[1].priority
    this.MoveQueueOneStepForward(ret)
    return ret
  }

  MoveQueueOneStepForward(ret: T) {
    this.cache.delete(ret)
    this.PutAtI(1, this.A[this.heapSize])
    let i = 1
    while (true) {
      let smallest: number = i
      const l: number = i << 1
      if (l <= this.heapSize && this.compare(this.A[l].priority, this.A[i].priority) < 0) {
        smallest = l
      }

      const r: number = l + 1
      if (r <= this.heapSize && this.compare(this.A[r].priority, this.A[smallest].priority) < 0) {
        smallest = r
      }

      if (smallest !== i) {
        this.SwapWithParent(smallest)
      } else {
        break
      }

      i = smallest
    }

    this.heapSize--
  }

  DecreasePriority(element: T, newPriority: number) {
    const h: GenericHeapElement<T> = this.cache.get(element)
    // ignore the element if it is not in the queue
    if (!h) {
      return
    }

    // var h = cache[element];
    h.priority = newPriority
    let i: number = h.indexToA
    while (i > 1) {
      if (this.compare(this.A[i].priority, this.A[i >> 1].priority) < 0) {
        this.SwapWithParent(i)
      } else {
        break
      }

      i >>= 1
    }
  }

  *GetEnumerator(): IterableIterator<T> {
    for (let i = 1; i <= this.heapSize; i++) {
      yield this.A[i].v
    }
  }

  //

  public Peek(t: {priority: number}): T {
    if (this.count === 0) {
      t.priority = 0
      return
    }

    t.priority = this.A[1].priority
    return this.A[1].v
  }

  toString(): string {
    const sb: StringBuilder = new StringBuilder()
    for (const i of this.A) {
      sb.Append(i + ',')
    }

    return sb.ToString()
  }
}
