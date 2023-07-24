import {PolyIntEdge} from './polyIntEdge'
import {IEdge} from '../../structs/iedge'
import {IntPairMap} from '../../utils/IntPairMap'
import {IntPair} from '../../utils/IntPair'
import {Anchor} from './anchor'

export class Database {
  Anchors: Anchor[]
  MultipleMiddles = new Set<number>()
  Multiedges: IntPairMap<PolyIntEdge[]>;
  *RegularMultiedges(): IterableIterator<PolyIntEdge[]> {
    for (const [k, v] of this.Multiedges.keyValues()) if (k.x !== k.y) yield v
  }

  *AllIntEdges(): IterableIterator<PolyIntEdge> {
    for (const l of this.Multiedges.values()) for (const e of l) yield e
  }

  addFeedbackSet(feedbackSet: IEdge[]) {
    for (const e of feedbackSet) {
      const ip = new IntPair(e.source, e.target)
      const ipr = new IntPair(e.target, e.source)

      //we shuffle reversed edges into the other multiedge
      const listToShuffle = this.Multiedges.get(ip.x, ip.y)
      for (const er of listToShuffle) er.reverse()

      if (this.Multiedges.has(ipr.x, ipr.y)) {
        const m = this.Multiedges.get(ipr.x, ipr.y)
        for (const e of listToShuffle) m.push(e)
      } else {
        this.Multiedges.set(ipr.x, ipr.y, listToShuffle)
      }

      this.Multiedges.delete(ip.x, ip.y)
    }
  }
  constructor(n: number) {
    this.Multiedges = new IntPairMap(n)
  }
  registerOriginalEdgeInMultiedges(edge: PolyIntEdge) {
    let o = this.Multiedges.get(edge.source, edge.target)
    if (o == null) {
      this.Multiedges.set(edge.source, edge.target, (o = []))
    }
    o.push(edge)
  }

  *SkeletonEdges(): IterableIterator<PolyIntEdge> {
    for (const [k, v] of this.Multiedges.keyValues()) {
      if (k.x !== k.y) yield v[0]
    }
  }

  GetMultiedge(source: number, target: number) {
    return this.GetMultiedgeI(new IntPair(source, target))
  }

  GetMultiedgeI(ip: IntPair): Array<PolyIntEdge> {
    if (this.Multiedges.has(ip.x, ip.y)) return this.Multiedges.get(ip.x, ip.y)

    return new Array<PolyIntEdge>()
  }
}
