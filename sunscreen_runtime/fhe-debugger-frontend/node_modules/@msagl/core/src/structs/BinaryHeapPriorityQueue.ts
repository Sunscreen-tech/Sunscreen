// A priority queue based on the binary heap algorithm
export class BinaryHeapPriorityQueue {
  // indexing for A starts from 1
  _heap: number[]

  // array of heap elements
  _reverse_heap: number[]

  // the map from [0,..., n-1] to their places of heap
  // the array of priorities
  _priors: number[]

  get Count(): number {
    return this.heapSize
  }

  heapSize = 0

  // the constructor
  // we assume that all integers inserted into the queue will be non-negative and less then n
  constructor(n: number) {
    this._priors = new Array(n)
    this._heap = new Array(n + 1)
    // because indexing for A starts from 1
    this._reverse_heap = new Array(n)
  }

  SwapWithParent(i: number) {
    const parent: number = this._heap[i >> 1]
    this.PutAtI(i >> 1, this._heap[i])
    this.PutAtI(i, parent)
  }

  Enqueue(o: number, priority: number) {
    this.heapSize++
    let i: number = this.heapSize
    this._priors[o] = priority
    this.PutAtI(i, o)
    while (i > 1 && this._priors[this._heap[i >> 1]] > priority) {
      this.SwapWithParent(i)
      i >>= 1
    }
  }

  PutAtI(i: number, h: number) {
    this._heap[i] = h
    this._reverse_heap[h] = i
  }

  // return the first element of the queue and removes it from the queue
  Dequeue(): number {
    if (this.heapSize === 0) {
      throw new Error()
    }

    const ret: number = this._heap[1]
    if (this.heapSize > 1) {
      this.PutAtI(1, this._heap[this.heapSize])
      let i = 1
      while (true) {
        let smallest: number = i
        const l: number = i << 1
        if (l <= this.heapSize && this._priors[this._heap[l]] < this._priors[this._heap[i]]) {
          smallest = l
        }

        const r: number = l + 1
        if (r <= this.heapSize && this._priors[this._heap[r]] < this._priors[this._heap[smallest]]) {
          smallest = r
        }

        if (smallest !== i) {
          this.SwapWithParent(smallest)
        } else {
          break
        }

        i = smallest
      }
    }

    this.heapSize--
    return ret
  }

  IsEmpty(): boolean {
    return this.heapSize === 0
  }

  DecreasePriority(o: number, newPriority: number) {
    // System.Diagnostics.Debug.WriteLine("delcrease "+ o.ToString()+" to "+ newPriority.ToString());
    this._priors[o] = newPriority
    let i: number = this._reverse_heap[o]
    while (i > 1) {
      if (this._priors[this._heap[i]] < this._priors[this._heap[i >> 1]]) {
        this.SwapWithParent(i)
      } else {
        break
      }

      i >>= 1
    }
  }
}
