import {BasicGraph} from '../../structs/BasicGraph'
import {BasicGraphOnEdges, mkGraphOnEdgesN} from '../../structs/basicGraphOnEdges'
import {IntPair} from '../../utils/IntPair'
import {GeomNode} from '../core/geomNode'
import {CycleRemoval} from './CycleRemoval'
import {PolyIntEdge} from './polyIntEdge'
import {IntPairSet} from '../../utils/IntPairSet'

import {IEdge} from '../../structs/iedge'
import {GetConnectedComponents} from '../../math/graphAlgorithms/ConnectedComponentCalculator'
export class VerticalConstraintsForSugiyama {
  getFeedbackSetExternal(intGraph: BasicGraph<GeomNode, PolyIntEdge>, nodeIdToIndex: Map<string, number>): IEdge[] {
    throw new Error('Method not implemented.')
  }
  /*  getFeedbackSet(
      intGraph: BasicGraph<Node, PolyIntEdge>,
      nodeIdToIndex: Map<string, number>,
    ): import('../../structs/iedge').IEdge[] {
      throw new Error('Method not implemented.')
    }
    */
  // nodes that are pinned to the max layer
  maxLayerOfGeomGraph = new Set<GeomNode>()

  // nodes that are pinned to the min layer
  minLayerOfGeomGraph = new Set<GeomNode>()

  // set of couple of nodes belonging to the same layer
  sameLayerConstraints = new Array<[GeomNode, GeomNode]>()

  upDownConstraints = new Array<[GeomNode, GeomNode]>()

  // pins a node to max layer
  pinNodeToMaxLayer(node: GeomNode) {
    this.maxLayerOfGeomGraph.add(node)
  }

  // pins a node to min layer
  pinNodeToMinLayer(node: GeomNode) {
    this.minLayerOfGeomGraph.add(node)
  }

  get isEmpty() {
    return (
      this.maxLayerOfGeomGraph.size === 0 &&
      this.minLayerOfGeomGraph.size === 0 &&
      this.sameLayerConstraints.length === 0 &&
      this.upDownConstraints.length === 0
    )
  }

  clear() {
    this.maxLayerOfGeomGraph.clear()
    this.minLayerOfGeomGraph.clear()
    this.sameLayerConstraints = []
    this.upDownConstraints = []
  }

  gluedUpDownIntConstraints = new IntPairSet()

  nodeIdToIndex: Map<string, number>
  intGraph: BasicGraph<GeomNode, PolyIntEdge>
  // this graph is obtained from intGraph by glueing together same layer vertices
  gluedIntGraph: BasicGraphOnEdges<IntPair>
  maxRepresentative: number
  minRepresentative: number
  // Maps each node participating in same layer relation to its representative on the layer.
  sameLayerDictionaryOfRepresentatives = new Map<number, number>()
  representativeToItsLayer = new Map<number, number[]>()
  maxLayerInt = new Array<number>()
  minLayerInt = new Array<number>()

  sameLayerInts = new Array<[number, number]>()

  // contains also pinned max and min pairs

  upDownInts = new Array<[number, number]>()

  getFeedbackSetImp(intGraph: BasicGraph<GeomNode, PolyIntEdge>, nodeIdToIndex: Map<string, number>) {
    this.nodeIdToIndex = nodeIdToIndex
    this.intGraph = intGraph
    this.maxRepresentative = -1
    this.minRepresentative = -1
    this.createIntegerConstraints()
    this.glueTogetherSameConstraintsMaxAndMin()
    this.addMaxMinConstraintsToGluedConstraints()
    this.removeCyclesFromGluedConstraints()
    return this.getFeedbackSet()
  }

  removeCyclesFromGluedConstraints() {
    const graph = mkGraphOnEdgesN<IntPair>(Array.from(this.gluedUpDownIntConstraints.values()), this.intGraph.nodeCount)
    const feedbackSet = CycleRemoval.getFeedbackSetWithConstraints(graph, null)
    //feedbackSet contains all glued constraints making constraints cyclic
    for (const p of feedbackSet) {
      this.gluedUpDownIntConstraints.remove(p)
    }
  }

  addMaxMinConstraintsToGluedConstraints() {
    if (this.maxRepresentative !== -1)
      for (let i = 0; i < this.intGraph.nodeCount; i++) {
        const j = this.nodeToRepr(i)
        if (j !== this.maxRepresentative) this.gluedUpDownIntConstraints.add(new IntPair(this.maxRepresentative, j))
      }

    if (this.minRepresentative !== -1)
      for (let i = 0; i < this.intGraph.nodeCount; i++) {
        const j = this.nodeToRepr(i)
        if (j !== this.minRepresentative) this.gluedUpDownIntConstraints.add(new IntPair(j, this.minRepresentative))
      }
  }

  glueTogetherSameConstraintsMaxAndMin() {
    this.createDictionaryOfSameLayerRepresentatives()
    const array = this.upDownInts.map(this.gluedIntPairNN)
    this.gluedUpDownIntConstraints = new IntPairSet()
  }

  gluedIntPairNN(p: [number, number]): IntPair {
    return new IntPair(this.nodeToRepr(p[0]), this.nodeToRepr(p[1]))
  }

  gluedIntPairI(p: PolyIntEdge): IntPair {
    return new IntPair(this.nodeToRepr(p.source), this.nodeToRepr(p.target))
  }

  gluedIntPair(p: IntPair) {
    return new IntPair(this.nodeToRepr(p.source), this.nodeToRepr(p.target))
  }

  gluedIntEdge(intEdge: PolyIntEdge) {
    const sourceRepr: number = this.nodeToRepr(intEdge.source)
    const targetRepr: number = this.nodeToRepr(intEdge.target)
    const ie = new PolyIntEdge(sourceRepr, targetRepr, intEdge.edge)
    ie.separation = intEdge.separation
    ie.weight = 0
    return ie
  }

  nodeToRepr(node: number): number {
    const repr = this.sameLayerDictionaryOfRepresentatives.get(node)
    return repr ? repr : node
  }

  createDictionaryOfSameLayerRepresentatives() {
    const graphOfSameLayers = this.createGraphOfSameLayers()
    for (const comp of GetConnectedComponents(graphOfSameLayers)) this.glueSameLayerNodesOfALayer(comp)
  }

  createGraphOfSameLayers(): BasicGraphOnEdges<IntPair> {
    return mkGraphOnEdgesN(this.createEdgesOfSameLayers(), this.intGraph.nodeCount)
  }

  createEdgesOfSameLayers(): IntPair[] {
    const ret = new Array<IntPair>()
    if (this.maxRepresentative !== -1) {
      this.maxLayerInt
        .filter((v) => v !== this.maxRepresentative)
        .map((v) => new IntPair(this.maxRepresentative, v))
        .forEach((p) => ret.push(p))
    }
    if (this.minRepresentative !== -1) {
      this.minLayerInt
        .filter((v) => v !== this.minRepresentative)
        .map((v) => new IntPair(this.minRepresentative, v))
        .forEach((p) => ret.push(p))
    }
    this.sameLayerInts.forEach((t) => ret.push(new IntPair(t[0], t[1])))
    return ret
  }
  // maps all nodes of the component to one random representative
  glueSameLayerNodesOfALayer(sameLayerNodes: number[]) {
    if (sameLayerNodes.length > 1) {
      let representative = -1
      if (this.componentsIsMaxLayer(sameLayerNodes)) {
        for (const v of sameLayerNodes) this.sameLayerDictionaryOfRepresentatives.set(v, (representative = this.maxRepresentative))
      } else if (this.componentIsMinLayer(sameLayerNodes)) {
        for (const v of sameLayerNodes) this.sameLayerDictionaryOfRepresentatives.set(v, (representative = this.minRepresentative))
      } else {
        for (const v of sameLayerNodes) {
          if (representative === -1) representative = v
          this.sameLayerDictionaryOfRepresentatives.set(v, representative)
        }
      }
      this.representativeToItsLayer.set(representative, sameLayerNodes)
    }
  }

  componentIsMinLayer(component: number[]): boolean {
    return component.findIndex((p) => this.minRepresentative === p) >= 0
  }

  componentsIsMaxLayer(component: number[]): boolean {
    return component.findIndex((p) => this.maxRepresentative === p) >= 0
  }

  createIntegerConstraints() {
    this.createMaxIntConstraints()
    this.createMinIntConstraints()
    this.createUpDownConstraints()
    this.createSameLayerConstraints()
  }

  createSameLayerConstraints() {
    this.sameLayerInts = this.createIntConstraintsFromStringCouples(this.sameLayerConstraints)
  }

  createUpDownConstraints() {
    this.upDownInts = this.createIntConstraintsFromStringCouples(this.upDownConstraints)
  }

  createIntConstraintsFromStringCouples(list: [GeomNode, GeomNode][]): [number, number][] {
    return list.map((couple) => [this.nodeIndex(couple[0]), this.nodeIndex(couple[1])]).filter((t) => t[0] !== -1 && t[1] !== -1) as [
      number,
      number,
    ][]
  }

  createMinIntConstraints() {
    this.minLayerInt = this.createIntConstraintsFromExtremeLayer(this.minLayerOfGeomGraph)
    if (this.minLayerInt.length > 0) this.minRepresentative = this.minLayerInt[0]
  }

  createMaxIntConstraints() {
    this.maxLayerInt = this.createIntConstraintsFromExtremeLayer(this.maxLayerOfGeomGraph)
    if (this.maxLayerInt.length > 0) this.maxRepresentative = this.maxLayerInt[0]
  }

  createIntConstraintsFromExtremeLayer(setOfNodes: Set<GeomNode>): number[] {
    //return new Array<number>(from node in setOfNodes let index = NodeIndex(node) where index !== -1 select index);
    return Array.from(setOfNodes)
      .map((n) => this.nodeIndex(n))
      .filter((i) => i !== -1)
  }

  nodeIndex(node: GeomNode) {
    const index = this.nodeIdToIndex.get(node.node.id)
    return index ? index : -1
  }

  getFeedbackSet(): IEdge[] {
    this.gluedIntGraph = this.createGluedGraph()
    return Array.from(this.unglueIntPairs(CycleRemoval.getFeedbackSetWithConstraints(this.gluedIntGraph, this.gluedUpDownIntConstraints)))
  }

  *unglueIntPairs(gluedEdges: IEdge[]): IterableIterator<IEdge> {
    for (const gluedEdge of gluedEdges) for (const ungluedEdge of this.unglueEdge(gluedEdge)) yield ungluedEdge
  }

  *unglueEdge(gluedEdge: IEdge): IterableIterator<IEdge> {
    for (const source of this.unglueNode(gluedEdge.source))
      for (const edge of this.intGraph.outEdges[source]) if (this.nodeToRepr(edge.target) === gluedEdge.target) yield edge
  }

  createGluedGraph(): BasicGraphOnEdges<IntPair> {
    const set = new IntPairSet()
    this.intGraph.edges.forEach((e) => set.add(this.gluedIntPairI(e)))

    return mkGraphOnEdgesN<IntPair>(Array.from(set.values()), this.intGraph.nodeCount)
    //return new BasicGraphOnEdges<IntPair>(new Set<IntPair>(from edge in this.intGraph.Edges select GluedIntPair(edge)), this.intGraph.NodeCount);
  }

  unglueNode(node: number): number[] {
    const layer = this.representativeToItsLayer.get(node)
    if (layer) return layer
    return [node]
  }

  getGluedNodeCounts(): number[] {
    const ret = new Array<number>(this.nodeIdToIndex.size).fill(0)
    for (let node = 0; node < ret.length; node++) ret[this.nodeToRepr(node)]++
    return ret
  }
}
