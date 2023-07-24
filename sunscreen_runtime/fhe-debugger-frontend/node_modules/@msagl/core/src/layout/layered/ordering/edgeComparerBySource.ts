import {LayerEdge} from '../layerEdge'

export class EdgeComparerBySource {
  x: number[]
  constructor(X: number[]) {
    this.x = X
  }

  Compare(a: LayerEdge, b: LayerEdge) {
    const r = this.x[a.Source] - this.x[b.Source]
    if (r !== 0) return r

    return this.x[a.Target] - this.x[b.Target]
  }
}
