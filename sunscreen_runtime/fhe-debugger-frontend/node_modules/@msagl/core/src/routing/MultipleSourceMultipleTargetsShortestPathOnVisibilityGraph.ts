import {GenericBinaryHeapPriorityQueue} from '../structs/genericBinaryHeapPriorityQueue'
import {TollFreeVisibilityEdge} from './visibility/TollFreeVisibilityEdge'
import {VisibilityEdge} from './visibility/VisibilityEdge'
import {VisibilityGraph} from './visibility/VisibilityGraph'
import {VisibilityVertex} from './visibility/VisibilityVertex'

export class MultipleSourceMultipleTargetsShortestPathOnVisibilityGraph {
  // we are not using the A* algorithm since it does not make much sense for muliple targets
  // but we use the upper bound heuristic
  sources: Array<VisibilityVertex>

  targets: Set<VisibilityVertex>

  _current: VisibilityVertex

  closestTarget: VisibilityVertex

  upperBound: number = Number.POSITIVE_INFINITY

  _visGraph: VisibilityGraph

  constructor(sourceVisVertices: Array<VisibilityVertex>, targetVisVertices: Array<VisibilityVertex>, visibilityGraph: VisibilityGraph) {
    this._visGraph = visibilityGraph
    visibilityGraph.ClearPrevEdgesTable()
    for (const v of visibilityGraph.Vertices()) v.Distance = Number.POSITIVE_INFINITY
    this.sources = sourceVisVertices
    this.targets = new Set<VisibilityVertex>(targetVisVertices)
  }

  // Returns  a  path
  GetPath(): Array<VisibilityVertex> {
    const pq = new GenericBinaryHeapPriorityQueue<VisibilityVertex>()
    for (const v of this.sources) {
      v.Distance = 0
      pq.Enqueue(v, 0)
    }
    while (!pq.IsEmpty()) {
      this._current = pq.Dequeue()
      if (this.targets.has(this._current)) break

      for (const e of this._current.OutEdges) if (this.PassableOutEdge(e)) this.ProcessNeighbor(pq, e, e.Target)

      for (const e of this._current.InEdges.filter(this.PassableInEdge.bind)) this.ProcessNeighbor(pq, e, e.Source)
    }

    return this._visGraph.PreviosVertex(this._current) == null ? null : this.CalculatePath()
  }

  PassableOutEdge(e: VisibilityEdge): boolean {
    return this.targets.has(e.Target) || !MultipleSourceMultipleTargetsShortestPathOnVisibilityGraph.IsForbidden(e)
  }

  PassableInEdge(e: VisibilityEdge): boolean {
    return this.targets.has(e.Source) || !MultipleSourceMultipleTargetsShortestPathOnVisibilityGraph.IsForbidden(e)
  }

  static IsForbidden(e: VisibilityEdge): boolean {
    return ((e.IsPassable != null && !e.IsPassable()) || e) instanceof TollFreeVisibilityEdge
  }

  ProcessNeighbor(pq: GenericBinaryHeapPriorityQueue<VisibilityVertex>, l: VisibilityEdge, v: VisibilityVertex) {
    const len = l.Length
    const c = this._current.Distance + len
    if (c >= this.upperBound) {
      return
    }

    if (this.targets.has(v)) {
      this.upperBound = c
      this.closestTarget = v
    }

    if (this._visGraph.PreviosVertex(v) == null) {
      v.Distance = c
      this._visGraph.SetPreviousEdge(v, l)
      pq.Enqueue(v, c)
    } else if (c < v.Distance) {
      // This condition should never hold for the dequeued nodes.
      // However because of a very rare case of an epsilon error it might!
      // In this case DecreasePriority will fail to find "v" and the algorithm will continue working.
      // Since v is not in the queue changing its .Distance will not mess up the queue.
      // Changing v.Prev is fine since we come up with a path with an insignificantly
      // smaller distance.
      v.Distance = c
      this._visGraph.SetPreviousEdge(v, l)
      pq.DecreasePriority(v, c)
    }
  }

  CalculatePath(): Array<VisibilityVertex> {
    if (this.closestTarget == null) {
      return null
    }

    const ret = new Array<VisibilityVertex>()
    let v = this.closestTarget
    do {
      ret.push(v)
      v = this._visGraph.PreviosVertex(v)
    } while (v.Distance > 0)
    ret.push(v)

    return ret.reverse()
  }
}
