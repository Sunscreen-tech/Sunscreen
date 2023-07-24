/**
 * Entity is an attribute container with a parent.
 * It also keeps an array of event functions.
 */

export abstract class Entity {
  /** keeps entity attributes: for example, drawing attributes, geometry attributes, etc */
  private attrs: any[] = []
  /** the mechanism to propagate changes in the layout */
  private events: ((data: any) => void)[]

  /** adds an event function */
  addEvent(event: (data: any) => void) {
    this.events.push(event)
  }
  /** trying to remove an event function */
  removeEvent(event: (data: any) => void) {
    const index = this.events.indexOf(event)
    if (index >= 0) {
      this.events = this.events.splice(index, 1)
    }
  }

  /** raises all available events on the given data */
  raiseEvents(data: any) {
    this.events.forEach((event) => event(data))
  }
  /** removes all the attributes form the entity */
  clearAttr() {
    this.attrs = []
  }
  /** sets the attribute at the given position */
  setAttr(position: number, val: any) {
    this.attrs[position] = val
  }
  /** gets the attribute at the given position */
  getAttr(position: number): any {
    return this.attrs[position]
  }

  private _parent: Entity = null
  public get parent(): Entity {
    return this._parent
  }
  public set parent(value: Entity) {
    this._parent = value
  }

  abstract toString(): string

  *getAncestors(): IterableIterator<Entity> {
    let p = this.parent
    while (p != null) {
      yield p
      p = p.parent
    }
  }

  /**  Determines if this node is a descendant of the given graph.*/
  isDescendantOf(graph: Entity): boolean {
    for (const p of this.getAncestors()) {
      if (p === graph) return true
    }
    return false
  }
}
