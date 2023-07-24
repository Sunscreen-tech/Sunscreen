import {BasicGraph} from '../../../structs/BasicGraph'
import {BasicGraphOnEdges} from '../../../structs/basicGraphOnEdges'
import {CancelToken} from '../../../utils/cancelToken'
import {GeomNode} from '../../core/geomNode'
import {PolyIntEdge} from '../polyIntEdge'
import {LayerCalculator} from './layerCalculator'
import {NetworkSimplex} from './NetworkSimplex'
export class NetworkSimplexForGeneralGraph implements LayerCalculator {
  graph: BasicGraphOnEdges<PolyIntEdge>
  // a place holder for the cancel flag
  Cancel: CancelToken

  GetLayers(): number[] {
    return new NetworkSimplex(this.graph, this.Cancel).GetLayers()
  }

  ShrunkComponent(dictionary: Map<number, number>): BasicGraph<GeomNode, PolyIntEdge> {
    const edges: PolyIntEdge[] = []
    for (const p of dictionary) {
      const v = p[0]
      const newEdgeSource = p[1]
      for (const e of this.graph.outEdges[v]) {
        const pe = new PolyIntEdge(newEdgeSource, dictionary.get(e.target), e.edge)
        pe.separation = e.separation
        pe.weight = e.weight
        edges.push(pe)
      }
    }
    return new BasicGraph<GeomNode, PolyIntEdge>(edges, dictionary.size)
  }

  constructor(graph: BasicGraph<GeomNode, PolyIntEdge>, cancelObject: CancelToken) {
    this.graph = graph
    this.Cancel = cancelObject
  }
}
