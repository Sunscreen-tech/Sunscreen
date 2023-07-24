import {Node} from './node'
import {Edge} from './edge'
import {Graph} from './graph'

export class NodeCollection {
  remove(node: Node) {
    this.nodeMap.delete(node.id)
  }
  get size(): number {
    return this.nodeMap.size
  }
  private *nodes_(): IterableIterator<Node> {
    for (const p of this.nodeMap.values()) yield p
  }

  private *graphs_(): IterableIterator<Graph> {
    for (const n of this.nodes_()) {
      if (n instanceof Graph) {
        yield n as Graph
      }
    }
  }

  findShallow(id: string): Node {
    return this.nodeMap.get(id)
  }

  get nodesShallow(): IterableIterator<Node> {
    return this.nodes_()
  }

  get graphs(): IterableIterator<Graph> {
    return this.graphs_()
  }

  nodeMap: Map<string, Node> = new Map<string, Node>()

  private *_edges() {
    // if we go over node.inEdges too then not self edges will be reported twice
    for (const node of this.nodeMap.values()) {
      for (const e of node.outEdges) {
        yield e
      }
      for (const e of node.selfEdges) {
        yield e
      }
    }
  }

  interGraphEdges(): IterableIterator<Edge> {
    throw new Error('not implemented')
  }

  get nodeShallowCount(): number {
    return this.nodeMap.size
  }

  // caution: it is a linear by the number of nodes method
  get edgeCount(): number {
    let count = 0
    for (const p of this.nodeMap.values()) {
      count += p.outDegree + p.selfDegree
    }
    return count
  }

  /**  returns the edges of shallow nodes */
  get edges(): IterableIterator<Edge> {
    return this._edges()
  }

  addNode(node: Node) {
    this.nodeMap.set(node.id, node)
  }

  nodeIsConsistent(n: Node): boolean {
    for (const e of n.outEdges) {
      if (e.source !== n) {
        return false
      }
      if (e.source === e.target) {
        return false
      }
    }
    for (const e of n.inEdges) {
      if (e.target !== n) {
        return false
      }

      if (e.source === e.target) {
        return false
      }
    }

    for (const e of n.selfEdges) {
      if (e.target !== e.source) {
        return false
      }
      if (e.source !== n) {
        return false
      }
    }

    return true
  }

  isConsistent(): boolean {
    for (const node of this.nodeMap.values()) {
      if (!this.nodeIsConsistent(node)) {
        return false
      }
    }
    return true
  }
}
