import {GeomGraph} from '../core/geomGraph'
import {Algorithm} from '../../utils/algorithm'
import {SingleSourceDistances} from './SingleSourceDistances'

import {GeomEdge} from '../core/geomEdge'
import {IGeomGraph} from '../initialLayout/iGeomGraph'
// Algorithm for computing the distance between every pair of nodes in a graph.
export class AllPairsDistances extends Algorithm {
  private graph: IGeomGraph
  length: (e: GeomEdge) => number

  result: Array<number[]>
  // The resulting distances between every pair of nodes in the graph.
  get Result(): Array<number[]> {
    return this.result
  }
  set Result(value: Array<number[]>) {
    this.result = value
  }

  // Computes distances between every pair of nodes in a graph.
  // Distances are symmetric if the graph is undirected.
  constructor(graph: IGeomGraph, length: (e: GeomEdge) => number) {
    super(null)
    this.graph = graph
    this.length = length
  }

  // Executes the algorithm.
  run() {
    this.result = new Array<number[]>(this.graph.shallowNodeCount)
    let i = 0
    for (const source of this.graph.shallowNodes) {
      const distances: SingleSourceDistances = new SingleSourceDistances(this.graph, source, this.length)
      distances.run()
      this.Result[i++] = distances.Result
    }
  }

  // Computes the "stress" of the current layout of the given graph:
  //
  //   stress = sum_{(u,v) in V}  (d(u,v) - D(u,v))^2/(D(u,v)^2)
  //
  // where:
  //   V is the set of nodes
  //   d(u,v) is the euclidean distance between the centers of nodes u and v
  //   D(u,v) is the graph-theoretic path length between u and v - scaled by average edge length.
  //
  // Small stress in graph layout correlated with immediate neighbors to be closer
  // together than nodes that are a few hops apart (i.e. that have path length>1).  More generally
  // the distance between nodes in the drawing should be proportional to the path length between them.
  // The lower the stress of a particular graph layout the better it conforms to this ideal.
  //
  static Stress(graph: GeomGraph, length: (e: GeomEdge) => number): number {
    let stress = 0
    if (graph.edgeCount === 0) {
      return stress
    }

    const apd = new AllPairsDistances(graph, length)
    apd.run()
    const D = apd.Result
    let l = 0
    for (const e of graph.shallowEdges) {
      l += length(e)
    }
    l /= graph.edgeCount // average of lengths
    let i = 0
    for (const u of graph.shallowNodes) {
      let j = 0
      for (const v of graph.shallowNodes) {
        if (i !== j) {
          const duv: number = u.center.sub(v.center).length
          const Duv: number = l * D[i][j]
          const d: number = Duv - duv
          stress += (d * d) / (Duv * Duv)
        }

        j++
      }

      i++
    }

    return stress
  }
}
