export class OrderingMeasure {
  numberOfCrossings: number
  la: number[][]
  virtVertexStart: number

  constructor(layerArraysPar: number[][], numOfCrossings: number, virtualVertexStart: number) {
    this.numberOfCrossings = numOfCrossings
    this.la = layerArraysPar
    this.virtVertexStart = virtualVertexStart
  }

  LayerGroupDisbalance(l: number[], origGroupOptSize: number, virtGroupOptSize: number) {
    if (origGroupOptSize === 1) return this.LayerGroupDisbalanceWithOrigSeparators(l, virtGroupOptSize)
    else return this.LayerGroupDisbalanceWithVirtSeparators(l, origGroupOptSize)
  }

  LayerGroupDisbalanceWithVirtSeparators(l: number[], origGroupOptSize: number) {
    let ret = 0
    for (let i = 0; i < l.length; ) {
      const r = this.CurrentOrigGroupDelta(i, l, origGroupOptSize)
      i = r.i
      ret += r.ret
    }
    return ret
  }

  CurrentOrigGroupDelta(i: number, l: number[], origGroupOptSize: number): {ret: number; i: number} {
    let groupSize = 0
    let j = i
    for (; j < l.length && l[j] < this.virtVertexStart; j++) groupSize++
    i = j + 1
    return {ret: Math.abs(origGroupOptSize - groupSize), i}
  }

  LayerGroupDisbalanceWithOrigSeparators(l: number[], virtGroupOptSize: number) {
    let ret = 0
    for (let i = 0; i < l.length; ) {
      const r = this.CurrentVirtGroupDelta(i, l, virtGroupOptSize)
      ret += r.ret
      i = r.i
    }
    return ret
  }

  CurrentVirtGroupDelta(i: number, l: number[], virtGroupOptSize: number): {ret: number; i: number} {
    let groupSize = 0
    let j = i
    for (; j < l.length && l[j] >= this.virtVertexStart; j++) groupSize++
    i = j + 1
    return {ret: Math.abs(virtGroupOptSize - groupSize), i: i}
  }

  static less(a: OrderingMeasure, b: OrderingMeasure) {
    return a.numberOfCrossings < b.numberOfCrossings
  }

  static greater(a: OrderingMeasure, b: OrderingMeasure) {
    return a.numberOfCrossings > b.numberOfCrossings
  }

  IsPerfect() {
    return this.numberOfCrossings === 0
  }
}
