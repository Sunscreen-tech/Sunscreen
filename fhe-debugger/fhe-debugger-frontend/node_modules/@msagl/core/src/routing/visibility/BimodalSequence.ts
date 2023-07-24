import {UnimodalSequence} from './UnimodalSequence'
// following https://dl.acm.org/doi/pdf/10.1145/7531.24036?casa_token=eU7GWug-Y98AAAAA%3A4GZQqc2mZBx14I_lLJyQrp6JLhxvxyn9pDaVCAisU2KozgOCW5HbSVYviPBxgN0RWf8GCUshDaW5
// 'Intersection of Convex Objects in Two and Three Dimensions' by Chazelle, and Dobkin

// For our purposes, it suffices to define a bimodal function as
// one for which there is an r in [0, n-1] such that
// [f(r), f(r + 1), . . . , f(n), f( 1), . . . ,  f(r - 1)] is unimodal. In our case no three sequential elements have the same value
export class BimodalSequence {
  f: (m: number) => number
  length: number

  toArray() {
    const r = []
    for (let i = 0; i < this.length; i++) r.push(this.f(i))
    return r
  }
  constructor(sequence: (m: number) => number, length: number) {
    this.f = sequence
    this.length = length
  }

  GetAdjustedSequenceForMinimum(): (i: number) => number {
    const leftVal = this.f(0)
    const rightVal = this.f(this.length - 1)
    const k = (rightVal - leftVal) / (this.length - 1)
    return (i: number) => Math.min(this.f(i), leftVal + k * i)
  }

  GetAdjustedSequenceForMaximum(): (i: number) => number {
    const leftVal = this.f(0)
    const rightVal = this.f(this.length - 1)
    const k = (rightVal - leftVal) / (this.length - 1)
    return (i: number) => Math.max(this.f(i), leftVal + k * i)
  }
  // following Chazelle, Dobkin
  FindMinimum(): number {
    if (this.f(0) === this.f(this.length - 1)) {
      //we have an unimodal function
      return new UnimodalSequence(this.f, this.length).FindMinimum()
    }
    return new UnimodalSequence(this.GetAdjustedSequenceForMinimum(), this.length).FindMinimum()
  }

  FindMaximum(): number {
    if (this.f(0) === this.f(this.length - 1)) {
      //we have an unimodal function
      return new UnimodalSequence(this.f, this.length).FindMaximum()
    }
    return new UnimodalSequence(this.GetAdjustedSequenceForMaximum(), this.length).FindMaximum()
  }
}
