// A node of a GeomGraph

import {ICurve, ICurveJSON} from './../../math/geometry/icurve'
import {Rectangle} from './../../math/geometry/rectangle'
import {Point} from './../../math/geometry/point'
import {CurveFactory} from './../../math/geometry/curveFactory'
import {PlaneTransformation} from './../../math/geometry/planeTransformation'
import {Node} from './../../structs/node'
import {GeomObject} from './geomObject'
import {GeomEdge} from './geomEdge'
import {AttributeRegistry} from '../../structs/attributeRegistry'
import {Entity} from '../../structs/entity'

export type GeomNodeJSON = {
  boundaryCurve: ICurveJSON
  padding: number
}
export class GeomNode extends GeomObject {
  /** clones but does not bind to the entity */
  clone(): GeomObject {
    const ret = new GeomNode(null)
    if (this.boundaryCurve) ret.boundaryCurve = this.boundaryCurve.clone()
    return ret
  }
  translate(delta: Point) {
    if (delta.x === 0 && delta.y === 0) return
    this.boundaryCurve.translate(delta)
  }
  toJSON(): GeomNodeJSON {
    return {boundaryCurve: this.boundaryCurve, padding: this.padding}
  }
  static minHeight = 2
  static minWidth = 3

  get node(): Node {
    return this.entity as Node
  }
  padding = 1

  private _boundaryCurve: ICurve
  public get boundaryCurve(): ICurve {
    return this._boundaryCurve
  }
  public set boundaryCurve(value: ICurve) {
    if (
      value != null &&
      value.boundingBox &&
      (value.boundingBox.height < GeomNode.minHeight || value.boundingBox.width < GeomNode.minWidth)
    ) {
      value = CurveFactory.mkCircle(GeomNode.minWidth, value.boundingBox.center)
    }

    this._boundaryCurve = value
  }

  get id(): string {
    return this.node.id
  }

  toString(): string {
    return this.id
  }

  // Creates a Node instance
  static mkNode(curve: ICurve, node: Node) {
    const n = new GeomNode(node)
    n.boundaryCurve = curve
    return n
  }

  // Fields which are set by Msagl
  // return the center of the curve bounding box
  get center() {
    return this.boundaryCurve.boundingBox.center
  }
  set center(value: Point) {
    const del = value.sub(this.center)
    this.boundaryCurve.translate(del)
  }

  // sets the bounding curve scaled to fit the targetBounds
  private fitBoundaryCurveToTarget(targetBounds: Rectangle) {
    if (this.boundaryCurve != null) {
      // RoundedRect is special, rather then simply scaling the geometry we want to keep the corner radii constant
      const radii = CurveFactory.isRoundedRect(this.boundaryCurve)
      if (radii == null) {
        /*Assert.assert(this.boundaryCurve.boundingBox.width > 0)*/
        /*Assert.assert(this.boundaryCurve.boundingBox.height > 0)*/
        const scaleX = targetBounds.width / this.boundaryCurve.boundingBox.width
        const scaleY = targetBounds.height / this.boundaryCurve.boundingBox.height

        this.boundaryCurve = this.boundaryCurve.scaleFromOrigin(scaleX, scaleY)
        this.boundaryCurve.translate(targetBounds.center.sub(this.boundaryCurve.boundingBox.center))
      } else {
        this.boundaryCurve = CurveFactory.mkRectangleWithRoundedCorners(
          targetBounds.width,
          targetBounds.height,
          radii.radX,
          radii.radY,
          targetBounds.center,
        )
      }
    }
  }

  static getGeom(attrCont: Entity): GeomNode {
    return attrCont.getAttr(AttributeRegistry.GeomObjectIndex)
  }

  *inEdges(): IterableIterator<GeomEdge> {
    for (const e of this.node.inEdges) {
      yield <GeomEdge>GeomObject.getGeom(e)
    }
  }
  *outEdges(): IterableIterator<GeomEdge> {
    for (const e of this.node.outEdges) {
      yield <GeomEdge>GeomObject.getGeom(e)
    }
  }
  *selfEdges(): IterableIterator<GeomEdge> {
    for (const e of this.node.selfEdges) {
      yield <GeomEdge>GeomObject.getGeom(e)
    }
  }

  /** creates a new rectangle equal to the padded  */
  get boundingBoxWithPadding() {
    const ret = this.boundingBox.clone()
    ret.pad(this.padding)
    return ret
  }
  // the bounding box of the node
  get boundingBox() {
    return this.boundaryCurve ? this.boundaryCurve.boundingBox : null
  }

  set boundingBox(value: Rectangle) {
    if (!this.boundaryCurve) {
      return
    }
    if (Math.abs(value.width - this.width) < 0.0001 && Math.abs(value.height - this.height) < 0.0001) {
      this.center = value.center
    } else {
      this.fitBoundaryCurveToTarget(value)
    }
  }

  // width of the node does not include the padding
  get width() {
    return this.boundaryCurve.boundingBox.width
  }
  // height of the node does not including the padding
  get height() {
    return this.boundaryCurve.boundingBox.height
  }

  transform(t: PlaneTransformation) {
    if (this.boundaryCurve != null) {
      this.boundaryCurve = this.boundaryCurve.transform(t)
    }
  }

  underCollapsedGraph(): boolean {
    const graph = this.node.parent
    if (graph == null) return false
    const gGraph = GeomObject.getGeom(graph) as GeomNode
    if (gGraph == null) return false
    if (gGraph.isCollapsed) {
      return true
    }
    return gGraph.underCollapsedGraph()
  }
  *getAncestors(): IterableIterator<GeomNode> {
    for (const g of this.node.getAncestors()) {
      yield GeomObject.getGeom(g) as GeomNode
    }
  }
}
