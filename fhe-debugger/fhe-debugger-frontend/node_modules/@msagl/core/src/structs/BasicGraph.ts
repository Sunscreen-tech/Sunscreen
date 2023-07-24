import {BasicGraphOnEdges} from './basicGraphOnEdges'
import {IEdge} from './iedge'

export class BasicGraph<TNode, TEdge extends IEdge> extends BasicGraphOnEdges<TEdge> {
  nodes: TNode[]
  constructor(edges: TEdge[], numberOfVerts: number) {
    super()
    this.SetEdges(edges, numberOfVerts)
  }
}
