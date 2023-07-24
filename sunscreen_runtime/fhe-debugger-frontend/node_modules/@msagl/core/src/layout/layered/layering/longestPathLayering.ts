import {LayerCalculator} from './layerCalculator'
import {NetworkEdge} from './networkEdge'
import {BasicGraphOnEdges} from './../../../structs/basicGraphOnEdges'
import {TopologicalSort} from './../../../math/graphAlgorithms/topologicalSort'

// Layering the DAG by longest path
export class LongestPathLayering implements LayerCalculator {
  graph: BasicGraphOnEdges<NetworkEdge>

  GetLayers() {
    //sort the vertices in topological order
    const topoOrder = TopologicalSort.getOrderOnGraph(this.graph)
    // Assert.assert(this.checkTopoOrder(topoOrder))
    // initially all nodes belong to the same layer 0
    const layering = new Array<number>(this.graph.nodeCount).fill(0)

    //going backward from leaves
    let k = this.graph.nodeCount
    while (k-- > 0) {
      const v = topoOrder[k]
      for (const e of this.graph.inEdges[v]) {
        const u = e.source
        const l = layering[v] + e.separation
        if (layering[u] < l) layering[u] = l
      }
    }
    return layering
  }

  checkTopoOrder(topoOrder: number[]): boolean {
    for (const e of this.graph.edges) {
      if (edgeIsOff(e, topoOrder)) {
        return false
      }
    }
    return true
  }

  constructor(graph: BasicGraphOnEdges<NetworkEdge>) {
    this.graph = graph
  }
}
function edgeIsOff(e: NetworkEdge, topoOrder: number[]): boolean {
  const i = topoOrder.findIndex((x) => x === e.source)
  const j = topoOrder.findIndex((x) => x === e.target)
  if (i === -1 || j === -1 || i >= j) {
    return true
  }
  return false
}
