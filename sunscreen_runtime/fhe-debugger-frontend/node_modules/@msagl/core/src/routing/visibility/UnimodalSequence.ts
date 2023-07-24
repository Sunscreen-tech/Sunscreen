// following https://dl.acm.org/doi/pdf/10.1145/7531.24036?casa_token=eU7GWug-Y98AAAAA%3A4GZQqc2mZBx14I_lLJyQrp6JLhxvxyn9pDaVCAisU2KozgOCW5HbSVYviPBxgN0RWf8GCUshDaW5
// 'Intersection of Convex Objects in Two and Three Dimensions' by Chazelle, and Dobkin
enum Behavior {
  Increasing,
  Decreasing,
  Extremum,
}

// A real valued function f defined on
// the integers 0, 1, . . . , n-1 is said to be unimodal if there exists an integer m such that
// f is strictly increasing (respectively, decreasing) on [ 0, m] and
// decreasing (respectively, increasing) on [m + 1, n-1]
// No three sequential elements have the same value
export class UnimodalSequence {
  f: (m: number) => number // int -> double

  // the sequence values
  get Sequence() {
    return this.f
  }
  set Sequence(value: (m: number) => number) {
    this.f = value
  }

  length: number

  // the length of the sequence: the sequence starts from 0
  get Length(): number {
    return this.length
  }
  set Length(value: number) {
    this.length = value
  }

  constructor(sequenceDelegate: (m: number) => number, length: number) {
    this.f = sequenceDelegate
    this.length = length
  }

  FindMinimum(): number {
    // find out first that the minimum is inside of the domain
    let a = 0
    let b: number = this.length - 1
    let m: number = a + Math.floor((b - a) / 2)
    const valAtM: number = this.f(m)
    if (valAtM >= this.f(0) && valAtM >= this.f(this.length - 1)) return this.f(0) < this.f(this.length - 1) ? 0 : this.length - 1
    while (b - a > 1) {
      m = a + Math.floor((b - a) / 2)
      switch (this.BehaviourAtIndex(m)) {
        case Behavior.Decreasing:
          a = m
          break
        case Behavior.Increasing:
          b = m
          break
        case Behavior.Extremum:
          return m
      }
    }
    return a === b ? a : this.f(a) <= this.f(b) ? a : b
  }

  private BehaviourAtIndex(m: number): Behavior {
    const seqAtM: number = this.f(m)
    if (m === 0) {
      const seqAt1: number = this.f(1)
      if (seqAt1 === seqAtM) {
        return Behavior.Extremum
      }

      return seqAt1 > seqAtM ? Behavior.Increasing : Behavior.Decreasing
    }

    if (m === this.length - 1) {
      const seqAt1: number = this.f(this.length - 2)
      if (seqAt1 === seqAtM) {
        return Behavior.Extremum
      }
      return seqAt1 > seqAtM ? Behavior.Decreasing : Behavior.Increasing
    }

    const delLeft: number = seqAtM - this.f(m - 1)
    const delRight: number = this.f(m + 1) - seqAtM
    if (delLeft * delRight <= 0) {
      return Behavior.Extremum
    }
    return delLeft > 0 ? Behavior.Increasing : Behavior.Decreasing
  }

  FindMaximum(): number {
    // find out first that the maximum is inside of the domain
    let a = 0
    let b: number = this.length - 1
    let m: number = a + Math.floor((b - a) / 2)
    const valAtM: number = this.f(m)
    if (valAtM <= this.f(0) && valAtM <= this.f(this.length - 1)) {
      return this.f(0) > this.f(this.length - 1) ? 0 : this.length - 1
    }

    while (b - a > 1) {
      m = a + Math.floor((b - a) / 2)
      switch (this.BehaviourAtIndex(m)) {
        case Behavior.Decreasing:
          b = m
          break
        case Behavior.Increasing:
          a = m
          break
        case Behavior.Extremum:
          return m
      }
    }
    return a === b ? a : this.f(a) >= this.f(b) ? a : b
  }
}
