import {String} from 'typescript-string-operations'
import {Point} from '../..'
import {RBNode} from '../../math/RBTree/rbNode'
import {Tangent} from './Tangent'
export class Diagonal {
  toString(): string {
    return String.Format('{0},{1}', this.Start, this.End)
  }

  get Start(): Point {
    return this.leftTangent.End.point
  }

  get End(): Point {
    return this.rightTangent.End.point
  }

  constructor(leftTangent: Tangent, rightTangent: Tangent) {
    this.LeftTangent = leftTangent
    this.RightTangent = rightTangent
  }

  private leftTangent: Tangent

  get LeftTangent(): Tangent {
    return this.leftTangent
  }
  set LeftTangent(value: Tangent) {
    this.leftTangent = value
  }

  private rightTangent: Tangent

  get RightTangent(): Tangent {
    return this.rightTangent
  }
  set RightTangent(value: Tangent) {
    this.rightTangent = value
  }

  rbNode: RBNode<Diagonal>

  get RbNode(): RBNode<Diagonal> {
    return this.rbNode
  }
  set RbNode(value: RBNode<Diagonal>) {
    this.rbNode = value
  }
}
