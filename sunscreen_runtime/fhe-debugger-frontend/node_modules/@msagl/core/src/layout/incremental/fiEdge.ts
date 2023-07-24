import {Point} from '../../math/geometry'
import {FiNode, getFiNode} from './fiNode'
import {IEdge} from '../../structs/iedge'
import {GeomEdge} from '../core'

export class FiEdge implements IEdge {
  mEdge: GeomEdge

  public sourceFiNode: FiNode

  public targetFiNode: FiNode

  public constructor(mEdge: GeomEdge) {
    this.mEdge = mEdge
    this.sourceFiNode = getFiNode(this.mEdge.source)
    this.targetFiNode = getFiNode(this.mEdge.target)
  }

  public get source(): number {
    return this.sourceFiNode.index
  }

  public get target(): number {
    return this.targetFiNode.index
  }
  private _length = 1
  public get length() {
    return this._length
  }
  public set length(value) {
    this._length = value
  }

  vector(): Point {
    return this.sourceFiNode.geomNode.center.sub(this.targetFiNode.geomNode.center)
  }
}
