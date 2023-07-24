import {BasicGraph} from '../../structs/BasicGraph'

import {GeomNode} from '../core/geomNode'
import {LayerEdge} from './layerEdge'
import {PolyIntEdge} from './polyIntEdge'

// a class representing a graph where every edge goes down only one layer
export class ProperLayeredGraph {
  // the underlying basic graph
  BaseGraph: BasicGraph<GeomNode, PolyIntEdge>
  virtualNodesToInEdges: LayerEdge[]
  virtualNodesToOutEdges: LayerEdge[]
  totalNumberOfNodes: number
  firstVirtualNode: number

  constructor(intGraph: BasicGraph<GeomNode, PolyIntEdge>) {
    this.Initialize(intGraph)
  }

  Initialize(intGraph: BasicGraph<GeomNode, PolyIntEdge>) {
    this.BaseGraph = intGraph

    this.totalNumberOfNodes = intGraph.nodeCount

    for (const edge of this.BaseGraph.edges) {
      if (edge.LayerEdges == null) continue

      for (const layerEdge of edge.LayerEdges) {
        const m = Math.max(layerEdge.Source, layerEdge.Target) + 1
        if (m > this.totalNumberOfNodes) this.totalNumberOfNodes = m
      }
    }
    this.firstVirtualNode = Number.POSITIVE_INFINITY
    for (const e of this.BaseGraph.edges) {
      if (e.LayerEdges == null) {
        continue
      }
      for (let i = 1; i < e.LayerEdges.length; i++) {
        const le = e.LayerEdges[i]
        // Assert.assert(le.Source !== e.source)
        this.firstVirtualNode = Math.min(this.firstVirtualNode, le.Source)
      }
    }
    if (this.firstVirtualNode === Number.POSITIVE_INFINITY) {
      this.firstVirtualNode = this.BaseGraph.nodeCount
      this.totalNumberOfNodes = this.BaseGraph.nodeCount
    }

    this.virtualNodesToInEdges = new Array<LayerEdge>(this.totalNumberOfNodes - this.firstVirtualNode)
    this.virtualNodesToOutEdges = new Array<LayerEdge>(this.totalNumberOfNodes - this.firstVirtualNode)
    for (const e of this.BaseGraph.edges)
      if (e.LayerSpan > 0)
        for (const le of e.LayerEdges) {
          if (le.Target !== e.target) this.virtualNodesToInEdges[le.Target - this.firstVirtualNode] = le
          if (le.Source !== e.source) this.virtualNodesToOutEdges[le.Source - this.firstVirtualNode] = le
        }
  }

  // enumerates over the graph edges
  *edges_(): IterableIterator<LayerEdge> {
    for (const ie of this.BaseGraph.edges) {
      if (ie.LayerSpan > 0) for (const le of ie.LayerEdges) yield le
    }
  }
  get Edges(): IterableIterator<LayerEdge> {
    return this.edges_()
  }

  // enumerates over edges of a node
  *InEdges(node: number): IterableIterator<LayerEdge> {
    if (node < this.BaseGraph.nodeCount)
      //original node
      for (const e of this.BaseGraph.inEdges[node]) {
        if (e.source !== e.target && e.LayerEdges != null) yield ProperLayeredGraph.LastEdge(e)
      }
    else if (node >= this.firstVirtualNode) yield this.InEdgeOfVirtualNode(node)
  }

  static LastEdge(e: PolyIntEdge): LayerEdge {
    return e.LayerEdges[e.LayerEdges.length - 1]
  }

  InEdgeOfVirtualNode(node: number): LayerEdge {
    return this.virtualNodesToInEdges[node - this.firstVirtualNode]
  }
  // enumerates over the node outcoming edges
  *OutEdges(node: number): IterableIterator<LayerEdge> {
    if (node < this.BaseGraph.nodeCount)
      //original node
      for (const e of this.BaseGraph.outEdges[node]) {
        if (e.source !== e.target && e.LayerEdges != null) yield ProperLayeredGraph.FirstEdge(e)
      }
    else if (node >= this.firstVirtualNode) yield this.OutEdgeOfVirtualNode(node)
  }
  OutDegreeIsMoreThanOne(node: number) {
    if (node < this.BaseGraph.nodeCount)
      //original node
      return this.BaseGraph.outEdges[node].length > 1
    else return false
  }
  InDegreeIsMoreThanOne(node: number) {
    if (node < this.BaseGraph.nodeCount)
      //original node
      return this.BaseGraph.inEdges[node].length > 1
    else return false
  }
  OutEdgeOfVirtualNode(node: number): LayerEdge {
    return this.virtualNodesToOutEdges[node - this.firstVirtualNode]
  }

  static FirstEdge(e: PolyIntEdge): LayerEdge {
    return e.LayerEdges[0]
  }
  // returns the number of incoming edges for an edge
  InEdgesCount(node: number) {
    return this.RealInEdgesCount(node)
  }

  RealInEdgesCount(node: number) {
    return node < this.BaseGraph.nodeCount ? this.BaseGraph.inEdges[node].filter((e) => e.LayerEdges != null).length : 1
  }

  // returns the number of outcoming edges for an edge
  OutEdgesCount(node: number) {
    return this.RealOutEdgesCount(node)
  }

  RealOutEdgesCount(node: number) {
    return node < this.BaseGraph.nodeCount ? this.BaseGraph.outEdges[node].filter((l) => l.LayerEdges != null).length : 1
  }

  // returns the node count
  get NodeCount() {
    return this.totalNumberOfNodes
  }

  IsRealNode(node: number) {
    return node < this.BaseGraph.nodeCount
  }

  IsVirtualNode(node: number) {
    return !this.IsRealNode(node)
  }

  ReversedClone(): ProperLayeredGraph {
    const reversedEdges = this.CreateReversedEdges()
    return new ProperLayeredGraph(new BasicGraph<GeomNode, PolyIntEdge>(reversedEdges, this.BaseGraph.nodeCount))
  }

  CreateReversedEdges(): PolyIntEdge[] {
    const ret = new Array<PolyIntEdge>()
    for (const e of this.BaseGraph.edges) if (!e.isSelfEdge()) ret.push(e.reversedClone())
    return ret
  }

  *Succ(node: number): IterableIterator<number> {
    for (const le of this.OutEdges(node)) yield le.Target
  }

  *Pred(node: number): IterableIterator<number> {
    for (const le of this.InEdges(node)) yield le.Source
  }
}
