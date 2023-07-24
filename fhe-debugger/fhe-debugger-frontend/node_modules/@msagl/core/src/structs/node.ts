import {Entity} from './entity'
import {Edge} from './edge'
/** Represent a node of a graph: has id, which is a string, and sets of in/out/self edges */
export class Node extends Entity {
  removeOutEdge(edge: Edge) {
    this.outEdges.delete(edge)
  }
  removeInEdge(edge: Edge) {
    this.inEdges.delete(edge)
  }
  private _id: string
  /** the unique, in the parent graph, id of the node */
  public get id(): string {
    return this._id
  }
  public set id(value: string) {
    /*Assert.assert(value != null)*/
    this._id = value
  }
  inEdges: Set<Edge> = new Set<Edge>()
  outEdges: Set<Edge> = new Set<Edge>()
  selfEdges: Set<Edge> = new Set<Edge>()

  toString(): string {
    return this.id
  }
  constructor(id: string) {
    super()
    // Assert.assert(id != null && id.toString() === id)

    this.id = id
  }

  private *_edges(): IterableIterator<Edge> {
    for (const e of this.inEdges) yield e
    for (const e of this.outEdges) yield e
    for (const e of this.selfEdges) yield e
  }

  get edges(): IterableIterator<Edge> {
    return this._edges()
  }

  get outDegree(): number {
    return this.outEdges.size
  }
  get inDegree(): number {
    return this.inEdges.size
  }
  get selfDegree(): number {
    return this.selfEdges.size
  }

  get degree(): number {
    return this.outDegree + this.inDegree + this.selfDegree
  }
}
