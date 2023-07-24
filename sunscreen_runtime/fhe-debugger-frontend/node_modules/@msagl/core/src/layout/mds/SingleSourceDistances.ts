import {GenericBinaryHeapPriorityQueue} from '../../structs/genericBinaryHeapPriorityQueue'
import {Algorithm} from '../../utils/algorithm'
import {GeomEdge} from '../core/geomEdge'
import {GeomGraph} from '../core/geomGraph'
import {GeomNode} from '../core/geomNode'
import {IGeomGraph} from '../initialLayout/iGeomGraph'
// Provides functionality for computing distances in a graph.
export class SingleSourceDistances extends Algorithm {
  private graph: IGeomGraph

  private source: GeomNode
  private: number[]
  private length: (e: GeomEdge) => number
  private result: number[]

  // Dijkstra algorithm. Computes graph-theoretic distances from a node to
  // all other nodes in a graph with nonnegative edge lengths.
  // The distance between a node and itself is 0; the distance between a pair of
  // nodes for which no connecting path exists is Number.POSITIVE_INFINITY.
  constructor(graph: IGeomGraph, source: GeomNode, length: (e: GeomEdge) => number) {
    super(null) // todo: pass the canceltoken
    this.graph = graph
    this.source = source
    this.length = length
  }
  // An array of distances from the source node to all shallow nodes.
  // Nodes are indexed when iterating over them.
  public get Result(): number[] {
    return this.result
  }

  // Executes the algorithm.
  run() {
    const q = new GenericBinaryHeapPriorityQueue<GeomNode>((a, b) => a - b)
    const d: Map<GeomNode, number> = new Map<GeomNode, number>()
    for (const node of this.graph.shallowNodes) {
      const dist = node === this.source ? 0 : Number.POSITIVE_INFINITY
      q.Enqueue(node, dist)
      d.set(node, dist)
    }

    while (q.count > 0) {
      const t = {priority: 0}
      const u: GeomNode = q.DequeueAndGetPriority(t)
      d.set(u, t.priority)
      const distU = d.get(u)
      for (const vu of u.inEdges()) {
        const v = vu.source

        // relaxation step
        const nl = distU + this.length(vu)
        if (d.get(v) > nl) {
          d.set(v, nl)
          q.DecreasePriority(v, nl)
        }
      }
      for (const uv of u.outEdges()) {
        const v = uv.target
        // relaxation step
        const nl = distU + this.length(uv)
        if (d.get(v) > nl) {
          d.set(v, nl)
          q.DecreasePriority(v, nl)
        }
      }
    }
    this.result = new Array(this.graph.shallowNodeCount)
    let i = 0
    for (const v of this.graph.shallowNodes) {
      const dist = d.get(v)
      if (dist !== undefined) {
        this.result[i++] = dist
      } else {
        this.result[i++] = Number.POSITIVE_INFINITY
      }
    }
  }
}
