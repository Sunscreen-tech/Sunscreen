import {BasicGraphOnEdges} from '../../structs/basicGraphOnEdges'
import {BinaryHeapPriorityQueue} from '../../structs/BinaryHeapPriorityQueue'
import {IEdge} from '../../structs/iedge'

export class MinimumSpanningTreeByPrim {
  graph: BasicGraphOnEdges<IEdge>

  weight: (e: IEdge) => number

  root: number

  q: BinaryHeapPriorityQueue

  treeNodes: Set<number> = new Set<number>()

  // map of neighbors of the tree to the edges connected them to the tree
  hedgehog: Map<number, IEdge> = new Map<number, IEdge>()

  constructor(graph: BasicGraphOnEdges<IEdge>, weight: (e: IEdge) => number, root: number) {
    this.graph = graph
    this.weight = weight
    this.root = root
    this.q = new BinaryHeapPriorityQueue(this.graph.nodeCount)
  }

  NodeIsInTree(i: number): boolean {
    return this.treeNodes.has(i)
  }

  public GetTreeEdges(): IEdge[] {
    const ret = new Array<IEdge>()
    this.Init()
    while (ret.length < this.graph.nodeCount - 1 && this.q.Count > 0)
      //some nodes might have no edges
      this.AddEdgeToTree(ret)
    return ret
  }

  AddEdgeToTree(ret: Array<IEdge>) {
    const v = this.q.Dequeue()
    const e = this.hedgehog.get(v)
    this.treeNodes.add(v)
    ret.push(e)
    this.UpdateOutEdgesOfV(v)
    this.UpdateInEdgesOfV(v)
  }

  UpdateOutEdgesOfV(v: number) {
    for (const outEdge of this.graph.outEdges[v]) {
      const u = outEdge.target
      if (this.NodeIsInTree(u)) {
        continue
      }

      const oldEdge: IEdge = this.hedgehog.get(u)
      if (oldEdge) {
        const oldWeight = this.weight(oldEdge)
        const newWeight = this.weight(outEdge)
        if (newWeight < oldWeight) {
          this.q.DecreasePriority(u, newWeight)
          this.hedgehog.set(u, outEdge)
        }
      } else {
        this.q.Enqueue(u, this.weight(outEdge))
        this.hedgehog.set(u, outEdge)
      }
    }
  }
  UpdateInEdgesOfV(v: number) {
    for (const inEdge of this.graph.inEdges[v]) {
      const u = inEdge.source
      if (this.NodeIsInTree(u)) {
        continue
      }

      const oldEdge: IEdge = this.hedgehog.get(u)
      if (oldEdge) {
        const oldWeight = this.weight(oldEdge)
        const newWeight = this.weight(inEdge)
        if (newWeight < oldWeight) {
          this.q.DecreasePriority(u, newWeight)
          this.hedgehog.set(u, inEdge)
        }
      } else {
        this.q.Enqueue(u, this.weight(inEdge))
        this.hedgehog.set(u, inEdge)
      }
    }
  }

  Init() {
    this.treeNodes.add(this.root)
    for (const outEdge of this.graph.outEdges[this.root]) {
      const w = this.weight(outEdge)
      this.q.Enqueue(outEdge.target, w)
      this.hedgehog.set(outEdge.target, outEdge)
    }

    for (const inEdge of this.graph.inEdges[this.root]) {
      const w = this.weight(inEdge)
      this.q.Enqueue(inEdge.source, w)
      this.hedgehog.set(inEdge.source, inEdge)
    }
  }
}
