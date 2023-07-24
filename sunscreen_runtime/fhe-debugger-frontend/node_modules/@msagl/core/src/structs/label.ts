import {Entity} from './entity'

export class Label extends Entity {
  /** parent is the entity having this label */
  toString(): string {
    return 'label of ' + (this.parent ? this.parent.toString() : 'null')
  }
  constructor(labelledParent: Entity) {
    super()
    this.parent = labelledParent
  }
}
