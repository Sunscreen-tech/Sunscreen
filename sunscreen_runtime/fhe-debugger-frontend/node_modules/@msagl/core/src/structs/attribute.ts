import {Entity} from './entity'

/** The class to support attributes of Entity */
export abstract class Attribute {
  entity: Entity
  /** this in the index of where the attribute is positioned in the attribute array of the entity */
  bind(index: number) {
    if (this.entity) this.entity.setAttr(index, this)
  }

  abstract rebind(e: Entity): void

  /** The arguments are the underlying entity and the attribute index in the attribute array */
  constructor(entity: Entity, index: number) {
    this.entity = entity
    this.bind(index)
  }
  abstract clone(): Attribute
}
