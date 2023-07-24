import {GenericBinaryHeapPriorityQueue} from '../structs/genericBinaryHeapPriorityQueue'
import {compareNumbers} from '../utils/compare'
import {TollFreeVisibilityEdge} from './visibility/TollFreeVisibilityEdge'
import {VisibilityEdge} from './visibility/VisibilityEdge'
import {VisibilityGraph} from './visibility/VisibilityGraph'
import {VisibilityVertex} from './visibility/VisibilityVertex'

export class SingleSourceSingleTargetShortestPathOnVisibilityGraph {
  _source: VisibilityVertex

  _target: VisibilityVertex

  _visGraph: VisibilityGraph

  _lengthMultiplier = 1

  public get LengthMultiplier(): number {
    return this._lengthMultiplier
  }
  public set LengthMultiplier(value: number) {
    this._lengthMultiplier = value
  }

  _lengthMultiplierForAStar = 1

  public get LengthMultiplierForAStar(): number {
    return this._lengthMultiplierForAStar
  }
  public set LengthMultiplierForAStar(value: number) {
    this._lengthMultiplierForAStar = value
  }

  constructor(visGraph: VisibilityGraph, sourceVisVertex: VisibilityVertex, targetVisVertex: VisibilityVertex) {
    this._visGraph = visGraph
    this._source = sourceVisVertex
    this._target = targetVisVertex
    this._source.Distance = 0
  }

  // Returns  a  path
  GetPath(shrinkEdgeLength: boolean): Array<VisibilityVertex> {
    const pq = new GenericBinaryHeapPriorityQueue<VisibilityVertex>(compareNumbers)
    this._source.Distance = 0
    this._target.Distance = Number.POSITIVE_INFINITY
    pq.Enqueue(this._source, this.H(this._source))
    while (!pq.IsEmpty()) {
      const hu = {priority: 0}
      const u = pq.DequeueAndGetPriority(hu)
      if (hu.priority >= this._target.Distance) {
        break
      }
      for (const e of u.OutEdges) {
        if (this.PassableOutEdge(e)) {
          const v = e.Target
          this.ProcessNeighbor(pq, u, e, v)
        }
      }

      for (const e of u.InEdges) {
        if (this.PassableInEdge(e)) {
          const v = e.Source
          this.ProcessNeighbor(pq, u, e, v)
        }
      }
    }

    return this._visGraph.PreviosVertex(this._target) == null ? null : this.CalculatePath(shrinkEdgeLength)
  }

  // private AssertEdgesPassable(path: Array<VisibilityEdge>) {
  //  for (const edge of path) Assert.assert(this.PassableOutEdge(edge) || this.PassableInEdge(edge))
  // }

  private PassableOutEdge(e: VisibilityEdge): boolean {
    return e.Source === this._source || e.Target === this._target || !SingleSourceSingleTargetShortestPathOnVisibilityGraph.IsForbidden(e)
  }

  private PassableInEdge(e: VisibilityEdge): boolean {
    return e.Source === this._target || e.Target === this._source || !SingleSourceSingleTargetShortestPathOnVisibilityGraph.IsForbidden(e)
  }

  private static IsForbidden(e: VisibilityEdge): boolean {
    return (e.IsPassable != null && !e.IsPassable()) || e instanceof TollFreeVisibilityEdge
  }

  private ProcessNeighborN(
    pq: GenericBinaryHeapPriorityQueue<VisibilityVertex>,
    u: VisibilityVertex,
    l: VisibilityEdge,
    v: VisibilityVertex,
    penalty: number,
  ) {
    const len = l.Length + penalty
    const c = u.Distance + len
    if (v !== this._source && this._visGraph.PreviosVertex(v) == null) {
      v.Distance = c
      this._visGraph.SetPreviousEdge(v, l)
      if (v !== this._target) {
        pq.Enqueue(v, this.H(v))
      }
    } else if (v !== this._source && c < v.Distance) {
      // This condition should never hold for the dequeued nodes.
      // However because of a very rare case of an epsilon error it might!
      // In this case DecreasePriority will fail to find "v" and the algorithm will continue working.
      // Since v is not in the queue changing its .Distance will not influence other nodes.
      // Changing v.Prev is fine since we come up with the path with an insignificantly
      // smaller distance.
      v.Distance = c
      this._visGraph.SetPreviousEdge(v, l)
      if (v !== this._target) {
        pq.DecreasePriority(v, this.H(v))
      }
    }
  }

  private ProcessNeighbor(
    pq: GenericBinaryHeapPriorityQueue<VisibilityVertex>,
    u: VisibilityVertex,
    l: VisibilityEdge,
    v: VisibilityVertex,
  ) {
    const len = l.Length
    const c = u.Distance + len
    if (v !== this._source && this._visGraph.PreviosVertex(v) == null) {
      v.Distance = c
      this._visGraph.SetPreviousEdge(v, l)
      if (v !== this._target) {
        pq.Enqueue(v, this.H(v))
      }
    } else if (v !== this._source && c < v.Distance) {
      // This condition should never hold for the dequeued nodes.
      // However because of a very rare case of an epsilon error it might!
      // In this case DecreasePriority will fail to find "v" and the algorithm will continue working.
      // Since v is not in the queue changing its .Distance will not influence other nodes.
      // Changing v.Prev is fine since we come up with the path with an insignificantly
      // smaller distance.
      v.Distance = c
      this._visGraph.SetPreviousEdge(v, l)
      if (v !== this._target) {
        pq.DecreasePriority(v, this.H(v))
      }
    }
  }

  private H(visibilityVertex: VisibilityVertex): number {
    return visibilityVertex.Distance + visibilityVertex.point.sub(this._target.point).length * this.LengthMultiplierForAStar
  }

  private CalculatePath(shrinkEdgeLength: boolean): Array<VisibilityVertex> {
    const ret = new Array<VisibilityVertex>()
    let v = this._target
    do {
      ret.push(v)
      if (shrinkEdgeLength) {
        this._visGraph.ShrinkLengthOfPrevEdge(v, this.LengthMultiplier)
      }

      v = this._visGraph.PreviosVertex(v)
    } while (v !== this._source)

    ret.push(this._source)
    return ret.reverse()
  }
}
