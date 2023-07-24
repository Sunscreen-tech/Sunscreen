import {RBColor} from './rbColor'

export class RBNode<T> {
  item: T
  color: RBColor

  parent: RBNode<T>
  left: RBNode<T>
  right: RBNode<T>

  constructor(color: RBColor, item?: T, parent?: RBNode<T>, left?: RBNode<T>, right?: RBNode<T>) {
    this.color = color
    if (item !== undefined) this.item = item
    if (parent !== undefined) this.parent = parent
    if (left !== undefined) this.left = left
    if (right !== undefined) this.right = right
  }

  toString(): string {
    return this.item.toString()
  }
}
