import {Point} from '../../math/geometry/point'
import {Attribute} from '../../structs/attribute'
import {AttributeRegistry} from '../../structs/attributeRegistry'
import {Entity} from '../../structs/entity'
import {Rectangle} from './../../math/geometry/rectangle'
/** represents a set of functions to handle an event */
export class EventHandler {
  forEach(action: (a: any) => any) {
    this.actions.forEach((a) => a(action, null))
  }
  private actions = new Set<(a: any, b: any) => void>()
  subscribe(f: (a: any, b: any) => void) {
    this.actions.add(f)
  }
  unsubscribe(f: (a: any, b: any) => void) {
    this.actions.delete(f)
  }
  raise(a: any, b: any) {
    this.actions.forEach((f) => f(a, b))
  }
}

export abstract class GeomObject extends Attribute {
  abstract translate(delta: Point): void
  abstract boundingBox: Rectangle
  isCollapsed: boolean
  constructor(entity: Entity) {
    super(entity, AttributeRegistry.GeomObjectIndex)
  }
  static getGeom(attrCont: Entity): GeomObject {
    return attrCont.getAttr(AttributeRegistry.GeomObjectIndex)
  }
  get parent(): GeomObject {
    const p = this.entity.parent
    return p ? GeomObject.getGeom(p) : null
  }
  rebind(e: Entity): void {
    this.entity = e
    this.bind(AttributeRegistry.GeomObjectIndex)
  }
  *getAncestors(): IterableIterator<GeomObject> {
    let p = this.parent
    while (p != null) {
      yield p
      p = p.parent
    }
  }
}
