import {GenericBinaryHeapPriorityQueue} from '../structs/genericBinaryHeapPriorityQueue'
import {compareNumbers} from '../utils/compare'
import {TollFreeVisibilityEdge} from './visibility/TollFreeVisibilityEdge'
import {VisibilityEdge} from './visibility/VisibilityEdge'
import {VisibilityGraph} from './visibility/VisibilityGraph'
import {VisibilityVertex} from './visibility/VisibilityVertex'

export class SingleSourceMultipleTargetsShortestPathOnVisibilityGraph {
  // we are not using the A* algorithm since it does not make much sense for muliple targets
  // but we use the upper bound heuristic
  private source: VisibilityVertex

  private targets: Set<VisibilityVertex>

  private current: VisibilityVertex

  private closestTarget: VisibilityVertex

  private upperBound: number = Number.POSITIVE_INFINITY

  private _visGraph: VisibilityGraph

  constructor(sourceVisVertex: VisibilityVertex, targetVisVertices: Array<VisibilityVertex>, visibilityGraph: VisibilityGraph) {
    this._visGraph = visibilityGraph
    this._visGraph.ClearPrevEdgesTable()
    for (const v of visibilityGraph.Vertices()) v.Distance = Number.POSITIVE_INFINITY
    this.source = sourceVisVertex
    this.targets = new Set<VisibilityVertex>(targetVisVertices)
    this.source.Distance = 0
  }

  // Returns  a  path
  GetPath(): Array<VisibilityVertex> {
    const pq = new GenericBinaryHeapPriorityQueue<VisibilityVertex>(compareNumbers)
    this.source.Distance = 0
    pq.Enqueue(this.source, 0)
    while (!pq.IsEmpty()) {
      this.current = pq.Dequeue()
      if (this.targets.has(this.current)) {
        break
      }

      for (const e of this.current.OutEdges) if (this.PassableOutEdge(e)) this.ProcessNeighbor(pq, e, e.Target)
      for (const e of this.current.InEdges) if (this.PassableInEdge(e)) this.ProcessNeighbor(pq, e, e.Source)
    }
    return this._visGraph.PreviosVertex(this.current) == null ? null : this.CalculatePath()
  }

  private PassableOutEdge(e: VisibilityEdge): boolean {
    return (
      e.Source === this.source || this.targets.has(e.Target) || !SingleSourceMultipleTargetsShortestPathOnVisibilityGraph.IsForbidden(e)
    )
  }

  private PassableInEdge(e: VisibilityEdge): boolean {
    return (
      this.targets.has(e.Source) || e.Target === this.source || !SingleSourceMultipleTargetsShortestPathOnVisibilityGraph.IsForbidden(e)
    )
  }

  private static IsForbidden(e: VisibilityEdge): boolean {
    return (e.IsPassable != null && !e.IsPassable()) || e instanceof TollFreeVisibilityEdge
  }

  private ProcessNeighbor(pq: GenericBinaryHeapPriorityQueue<VisibilityVertex>, l: VisibilityEdge, v: VisibilityVertex) {
    const len = l.Length
    const c = this.current.Distance + len
    if (c >= this.upperBound) {
      return
    }

    if (this.targets.has(v)) {
      this.upperBound = c
      this.closestTarget = v
    }

    if (v !== this.source && this._visGraph.PreviosVertex(v) == null) {
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

  private CalculatePath(): Array<VisibilityVertex> {
    if (this.closestTarget == null) {
      return null
    }

    const ret = new Array<VisibilityVertex>()
    let v = this.closestTarget
    do {
      ret.push(v)
      v = this._visGraph.PreviosVertex(v)
    } while (v !== this.source)

    ret.push(this.source)
    return ret.reverse()
  }
}
