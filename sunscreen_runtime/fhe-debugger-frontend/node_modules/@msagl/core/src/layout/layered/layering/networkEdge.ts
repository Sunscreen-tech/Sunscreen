// Differs from IntEdge in containing a flag indicating belonging to the tree
// and containing the cut value
import {IIntEdge} from './../iIntEdge'

export class NetworkEdge {
  iedge: IIntEdge
  static infinity = Number.MAX_SAFE_INTEGER
  inTree = false
  cut = NetworkEdge.infinity

  constructor(e: IIntEdge) {
    this.iedge = e
  }

  get source() {
    return this.iedge.source
  }
  get target() {
    return this.iedge.target
  }

  get separation() {
    return this.iedge.separation
  }
  get crossingWeight() {
    return this.iedge.CrossingWeight
  }
  get weight() {
    return this.iedge.weight
  }
}
