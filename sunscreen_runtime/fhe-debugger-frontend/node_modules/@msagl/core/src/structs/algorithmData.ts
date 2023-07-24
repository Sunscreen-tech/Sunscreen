import {Attribute} from './attribute'
import {AttributeRegistry} from './attributeRegistry'
import {Entity} from './entity'

export class AlgorithmData extends Attribute {
  clone(): Attribute {
    throw new Error('Method not implemented.')
  }
  rebind(e: Entity): void {
    this.entity = e
    this.bind(AttributeRegistry.AlgorithmDataIndex)
  }

  constructor(entity: Entity, data: any = null) {
    super(entity, AttributeRegistry.AlgorithmDataIndex)
    this.data = data
  }
  static getAlgData(attrCont: Entity): AlgorithmData {
    return attrCont.getAttr(AttributeRegistry.AlgorithmDataIndex)
  }
  data: any
}
