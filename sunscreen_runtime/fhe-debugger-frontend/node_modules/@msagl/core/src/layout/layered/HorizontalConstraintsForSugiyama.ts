import {BasicGraphOnEdges, mkGraphOnEdges} from '../../structs/basicGraphOnEdges'
import {IntPair} from '../../utils/IntPair'
import {IntPairSet} from '../../utils/IntPairSet'
import {GeomNode} from '../core/geomNode'
import {CycleRemoval} from './CycleRemoval'

function mktuple<T>(a: T, b: T): [T, T] {
  return [a, b]
}

export class HorizontalConstraintsForSugiyama {
  readonly leftRightConstraints = new Array<[GeomNode, GeomNode]>()
  readonly leftRightNeighbors = new Array<[GeomNode, GeomNode]>()

  // node is mapped to the block root
  readonly nodeToBlockRoot = new Map<number, number>()

  readonly upDownVerticalConstraints = new Array<[GeomNode, GeomNode]>()

  // The right most node to the left of the  block is called a block root. The root does not belong to its block.
  BlockRootToBlock = new Map<number, Array<number>>()

  LeftRighInts: IntPairSet

  // the set of integer pairs (i,j) such that i is a left neighbor of j
  LeftRightIntNeibs: IntPairSet

  VerticalInts: IntPairSet
  nodeIdToIndex: Map<string, number>

  get IsEmpty() {
    return this.leftRightNeighbors.length === 0 && this.upDownVerticalConstraints.length === 0 && this.leftRightConstraints.length === 0
  }

  AddSameLayerNeighbors(neighbors: Array<GeomNode>) {
    for (let i = 0; i < neighbors.length - 1; i++) this.AddSameLayerNeighborsPair(neighbors[i], neighbors[i + 1])
  }

  AddSameLayerNeighborsPair(leftNode: GeomNode, rightNode: GeomNode) {
    this.leftRightNeighbors.push([leftNode, rightNode])
  }

  NodeToBlockRootSoft(i: number) {
    const blockRoot = this.nodeToBlockRoot.get(i)
    return blockRoot ? blockRoot : i
  }

  CreateMappingOfNeibBlocks() {
    const graph = this.BasicGraphFromLeftRightIntNeibs()
    for (let root = 0; root < graph.nodeCount; root++)
      if (graph.inEdges[root].length === 0 && !this.nodeToBlockRoot.has(root)) {
        const block = new Array<number>()
        let current = root
        for (let outEdges = graph.outEdges[current]; outEdges.length > 0; outEdges = graph.outEdges[current]) {
          current = outEdges[0].y
          block.push(current)
          this.nodeToBlockRoot.set(current, root)
        }
        if (block.length > 0) this.BlockRootToBlock.set(root, block)
      }
  }

  BasicGraphFromLeftRightIntNeibs(): BasicGraphOnEdges<IntPair> {
    return mkGraphOnEdges(Array.from(this.LeftRightIntNeibs.values()).map((p) => new IntPair(p.x, p.y)))
  }

  NodeIndex(node: GeomNode): number {
    const index = this.nodeIdToIndex.get(node.id)
    return index ? index : -1
  }

  PrepareForOrdering(nodeToIndexParameter: Map<string, number>, yLayers: number[]) {
    this.nodeIdToIndex = nodeToIndexParameter
    this.MapNodesToToIntegers(yLayers)

    this.CreateMappingOfNeibBlocks()
    this.LiftLeftRightRelationsToNeibBlocks()
    //MakeUpDownRelationsMonotone(yLayers);
  }

  //see UpDownMonotone.png
  //       void MakeUpDownRelationsMonotone(number[] yLayers) {
  //           BasicGraph<IntPair> upDownGraph = new BasicGraph<IntPair>(from c in this.verticalInts select new IntPair(c.First,c.Second));
  //           Array<Tuple<number, number>> upDownToRemove = new Array<Tuple<number, number>>();
  //           foreach (Array<number> componentNodes of ConnectedComponentCalculator<IntPair>.GetComponents(GraphOfLeftRightRelations())) {
  //               ResolveConflictsUboveComponent(upDownGraph, componentNodes, upDownToRemove, yLayers);
  //               ResolveConflictsBelowComponent(upDownGraph, componentNodes, upDownToRemove, yLayers);
  //           }
  //
  //           foreach (var v of upDownToRemove)
  //               this.verticalInts.Remove(v);
  //       }
  //makes left-right relations to be between neighb blocks and removes cycles in these relations

  LiftLeftRightRelationsToNeibBlocks() {
    this.LeftRighInts = IntPairSet.mk(
      this.leftRightConstraints
        .map((p) => mktuple(this.NodeIndex(p[0]), this.NodeIndex(p[1])))
        .filter((p) => p[0] !== -1 && p[1] !== -1)
        .map((ip) => new IntPair(this.NodeToBlockRootSoft(ip[0]), this.NodeToBlockRootSoft(ip[1])))
        .filter((ip) => ip.x !== ip.x),
    )
    const feedbackSet = CycleRemoval.getFeedbackSet(mkGraphOnEdges(Array.from(this.LeftRighInts.values())))
    for (const ip of feedbackSet) this.LeftRighInts.remove(new IntPair(ip.source, ip.target))
  }

  MapNodesToToIntegers(yLayers: number[]) {
    this.LeftRightIntNeibs = IntPairSet.mk(
      Array.from(this.leftRightNeighbors.values())
        .map((p) => [this.NodeIndex(p[0]), this.NodeIndex(p[1])])
        .filter((t) => t[0] !== -1 && t[1] !== -1)
        .map((t) => new IntPair(t[0], t[1])),
    )

    //as we follow yLayers there will not be cycles in verticalIntConstraints
    this.VerticalInts = IntPairSet.mk(
      this.upDownVerticalConstraints
        .map((p) => [this.NodeIndex(p[0]), this.NodeIndex(p[1])])
        .filter((p) => p[0] !== -1 && p[1] !== -1 && yLayers[p[0]] > yLayers[p[1]])
        .map((p) => new IntPair(p[0], p[1])),
    )
  }
}
