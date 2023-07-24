import {Entity, Attribute, Point, Assert, Graph, Node, Edge, GeomObject, Label, AttributeRegistry} from '@msagl/core'
import {DrawingObject} from '../drawingObject'

type UndoChangeData = Map<Entity, {old: Attribute; new: Attribute}[]>
type UndoDeleteData = {deletedEnts: Set<Entity>}
type UndoInsertData = {insertedEnts: Set<Entity>}
type UndoDragData = {draggedEnts: Set<Entity>; delta: Point; changeData: UndoChangeData}
type UndoData = UndoChangeData | UndoDeleteData | UndoInsertData | UndoDragData
/** support for undo/redo functionality */
export class UndoRedoAction {
  updateDeltaForDragUndo(delta: Point) {
    const data = this.data as UndoDragData
    data.delta = delta
  }
  registerUndoDrag(entity: Entity) {
    if (this.data == null) {
      this.data = {draggedEnts: new Set<Entity>(), delta: null, changeData: new Map<Entity, {old: Attribute; new: Attribute}[]>()}
    }
    if ('draggedEnts' in this.data) {
      this.data.draggedEnts.add(entity)
    }
  }
  undo() {
    Assert.assert(this.canUndo)
    if (this.data instanceof Map) {
      for (const [e, v] of this.data) {
        for (const pair of v) {
          // prepare for redo as well
          pair.new = e.getAttr(registryIndexOfAttribue(pair.old)).clone()
          pair.old.rebind(e)
        }
      }
    } else if (this.data && 'deletedEnts' in this.data) {
      for (const e of this.data.deletedEnts) {
        restoreDeletedEntity(e)
      }
    } else if ('insertedEnts' in this.data) {
      for (const ent of this.data.insertedEnts) {
        const graph = ent.parent as Graph
        if (ent instanceof Node) {
          graph.removeNode(ent)
        } else if (ent instanceof Edge) {
          ent.remove()
        } else {
          throw new Error('not implemented')
        }
      }
    } else if ('draggedEnts' in this.data) {
      for (const e of this.data.draggedEnts) {
        const geom = GeomObject.getGeom(e)
        geom.translate(this.data.delta)
      }
      for (const [e, v] of this.data.changeData) {
        for (const pair of v) {
          // prepare for redo as well
          pair.new = e.getAttr(registryIndexOfAttribue(pair.old)).clone()
          pair.old.rebind(e)
        }
      }
    } else {
      throw new Error('not implemented')
    }

    this.canUndo = false
  }
  redo() {
    Assert.assert(this.canRedo)
    if (this.data instanceof Map) {
      for (const [e, v] of this.data) {
        for (const pair of v) {
          const attr = pair.new
          attr.rebind(e)
        }
      }
    } else if ('deletedEnts' in this.data) {
      for (const ent of this.data.deletedEnts) {
        if (ent instanceof Graph) {
          ent.removeSubgraph()
        } else if (ent instanceof Node) {
          const graph = ent.parent as Graph
          graph.removeNode(ent)
        } else if (ent instanceof Edge) {
          ent.remove()
        } else if (ent instanceof Label) {
          const edge = ent.parent as Edge
          edge.label = null
        } else {
          throw new Error('unexpected type in redo')
        }
      }
    } else if ('draggedEnts' in this.data) {
      const del = this.data.delta.neg()
      for (const e of this.data.draggedEnts) {
        const geom = GeomObject.getGeom(e)
        geom.translate(del)
      }
      for (const [e, v] of this.data.changeData) {
        for (const pair of v) {
          const attr = pair.new
          attr.rebind(e)
        }
      }
    } else if ('insertedEnts' in this.data) {
      for (const ent of this.data.insertedEnts) {
        restoreDeletedEntity(ent)
      }
    } else {
      throw new Error('not implemented')
    }
    this.canUndo = true
  }
  /** It adds an entry for the entity if the changes does not contain the entity as a key
   *  Also, only one pair is added for each index.
   *  'old' will be restored by undo  */

  addOldNewPair(entity: Entity, old: Attribute) {
    if (!this.data) {
      this.data = new Map<Entity, {old: Attribute; new: Attribute}[]>()
    }
    const changesInAttributes = 'draggedEnts' in this.data ? this.data.changeData : (this.data as UndoChangeData)
    if (!changesInAttributes.has(entity)) {
      changesInAttributes.set(entity, [])
    }

    const index: number = registryIndexOfAttribue(old)
    const pairs = changesInAttributes.get(entity)
    if (pairs[index] != null) return
    pairs[index] = {old: old.clone(), new: null}
  }

  registerDelete(entity: Entity) {
    if (!this.data) this.data = {deletedEnts: new Set<Entity>()}

    const dd = this.data as UndoDeleteData
    dd.deletedEnts.add(entity)
  }

  registerAdd(entity: Entity) {
    if (!this.data) this.data = {insertedEnts: new Set<Entity>()}

    const dd = this.data as UndoInsertData
    dd.insertedEnts.add(entity)
  }
  private _canUndo = true // initially

  get canRedo(): boolean {
    return !this._canUndo
  }
  /** canUndo = true means that the relevant objects, the keys of restoreDataDictionary, have 'old' attributes set up: ready for undo
   *  canUndo = false means that the undo has been done already:
   */
  get canUndo() {
    return this._canUndo
  }
  set canUndo(v) {
    this._canUndo = v
  }

  private data: UndoData;

  /** iterates over the affected objects */
  *entities(): IterableIterator<Entity> {
    if (!this.data) return
    if (this.data instanceof Map) yield* this.data.keys()
    else if ('draggedEnts' in this.data) {
      yield* this.data.changeData.keys()
      yield* this.data.draggedEnts
    } else if ('deletedEnts' in this.data) yield* this.data.deletedEnts
    else if ('insertedEnts' in this.data) yield* this.data.insertedEnts
    else {
      throw new Error('not implemented')
    }
  }

  next: UndoRedoAction

  prev: UndoRedoAction
}
function registryIndexOfAttribue(old: Attribute) {
  let index: number
  if (old instanceof GeomObject) index = AttributeRegistry.GeomObjectIndex
  else if (old instanceof DrawingObject) index = AttributeRegistry.DrawingObjectIndex
  else {
    // todo: enforce type here
    index = AttributeRegistry.ViewerIndex
  }
  return index
}
function restoreDeletedEntity(ent: Entity) {
  if (ent instanceof Label) {
    const edge = <Edge>ent.parent
    edge.label = ent
  } else if (ent instanceof Graph) {
    const graph = ent.parent as Graph
    graph.addNode(ent)
    /** reattach all the edges, that might be removed.
     * attaching twice does not have an effect
     */
    for (const edge of ent.edges) {
      edge.add()
    }
    for (const n of ent.nodesBreadthFirst) {
      for (const e of n.outEdges) e.add()
      for (const e of n.inEdges) e.add()
    }
  } else if (ent instanceof Node) {
    const graph = ent.parent as Graph
    graph.addNode(ent)
  } else if (ent instanceof Edge) ent.add()
}
