import {GeomNode} from './geomNode'
import {Edge, ToAncestorEnum} from './../../structs/edge'
import {GeomObject} from './geomObject'
import {Rectangle} from './../../math/geometry/rectangle'
import {ICurve} from './../../math/geometry/icurve'
import {SmoothedPolyline} from './../../math/geometry/smoothedPolyline'
import {GeomLabel} from './geomLabel'
import {PlaneTransformation} from '../../math/geometry/planeTransformation'
import {Port} from './port'
import {Point} from '../../math/geometry/point'
import {Arrowhead} from './arrowhead'
import {AttributeRegistry} from '../../structs/attributeRegistry'
import {Entity} from '../../structs/entity'

export class GeomEdge extends GeomObject {
  static getGeom(e: Entity): GeomEdge {
    return GeomObject.getGeom(e) as GeomEdge
  }
  curve: ICurve
  sourceArrowhead: Arrowhead

  targetArrowhead: Arrowhead

  lineWidth = 1
  sourcePort: Port
  targetPort: Port
  smoothedPolyline: SmoothedPolyline
  /** clones but does not bind to the entity */
  clone(): GeomObject {
    const geomEdge = new GeomEdge(null)
    if (this.smoothedPolyline) geomEdge.smoothedPolyline = this.smoothedPolyline.clone()
    geomEdge.curve = this.curve.clone()
    if (this.sourceArrowhead != null) {
      geomEdge.sourceArrowhead = this.sourceArrowhead.clone()
    }

    if (this.targetArrowhead != null) {
      geomEdge.targetArrowhead = this.targetArrowhead.clone()
    }

    return geomEdge
  }

  get label(): GeomLabel {
    return this.edge != null && this.edge.label != null ? (GeomObject.getGeom(this.edge.label) as GeomLabel) : null
  }
  set label(value: GeomLabel) {
    this.edge.label.setAttr(AttributeRegistry.GeomObjectIndex, value)
  }

  RaiseLayoutChangeEvent(delta: Point) {
    this.edge.raiseEvents(delta)
  }
  requireRouting() {
    this.curve = null
    this.smoothedPolyline = null
  }

  translate(delta: Point) {
    if (delta.x === 0 && delta.y === 0) return
    // RaiseLayoutChangeEvent(delta);
    if (this.curve != null) this.curve.translate(delta)

    if (this.smoothedPolyline != null)
      for (let s = this.smoothedPolyline.headSite, s0 = this.smoothedPolyline.headSite; s != null; s = s.next, s0 = s0.next)
        s.point = s0.point.add(delta)

    if (this.sourceArrowhead != null && this.sourceArrowhead.tipPosition)
      this.sourceArrowhead.tipPosition = this.sourceArrowhead.tipPosition.add(delta)
    if (this.targetArrowhead != null && this.targetArrowhead.tipPosition)
      this.targetArrowhead.tipPosition = this.targetArrowhead.tipPosition.add(delta)

    if (this.edge.label) {
      const geomLabel = GeomLabel.getGeom(this.edge.label)
      if (geomLabel) geomLabel.translate(delta)
    }
  }

  GetMaxArrowheadLength(): number {
    let l = 0
    if (this.sourceArrowhead != null) {
      l = this.sourceArrowhead.length
    }

    if (this.targetArrowhead != null && this.targetArrowhead.length > l) {
      return this.targetArrowhead.length
    }

    return l
  }

  transform(matrix: PlaneTransformation) {
    if (this.curve == null) return
    this.curve = this.curve.transform(matrix)
    if (this.smoothedPolyline != null)
      for (let s = this.smoothedPolyline.headSite, s0 = this.smoothedPolyline.headSite; s != null; s = s.next, s0 = s0.next)
        s.point = matrix.multiplyPoint(s.point)

    if (this.sourceArrowhead != null) {
      this.sourceArrowhead.tipPosition = matrix.multiplyPoint(this.sourceArrowhead.tipPosition)
    }
    if (this.targetArrowhead != null) {
      this.targetArrowhead.tipPosition = matrix.multiplyPoint(this.targetArrowhead.tipPosition)
    }
  }

  get edge(): Edge {
    return this.entity as Edge
  }
  get source(): GeomNode {
    return GeomObject.getGeom(this.edge.source) as GeomNode
  }
  /** iterates over the source arrowhead corner points */
  *sourceArrowheadPoints(angle: number): IterableIterator<Point> {
    if (this.sourceArrowhead == null) return
    yield this.sourceArrowhead.tipPosition
    let d = this.sourceArrowhead.tipPosition.sub(this.curve.start)
    // assume that the arrowhead angle is 25 degrees
    d = d.rotate90Cw().mul(Math.tan(angle * 0.5 * (Math.PI / 180.0)))
    yield d.add(this.curve.start)
    yield this.curve.start.sub(d)
  }

  /** iterates over the target arrowhead corner points */
  *targetArrowheadPoints(angle: number): IterableIterator<Point> {
    if (this.targetArrowhead == null) return
    yield this.targetArrowhead.tipPosition
    let d = this.targetArrowhead.tipPosition.sub(this.curve.end)
    // assume that the arrowhead angle is 25 degrees
    d = d.rotate90Cw().mul(Math.tan(angle * 0.5 * (Math.PI / 180.0)))
    yield d.add(this.curve.end)
    yield this.curve.end.sub(d)
  }

  get boundingBox(): Rectangle {
    const rect = Rectangle.mkEmpty()
    if (this.smoothedPolyline != null) for (const p of this.smoothedPolyline) rect.add(p)

    if (this.curve != null) rect.addRecSelf(this.curve.boundingBox)

    for (const p of this.sourceArrowheadPoints(25)) {
      rect.add(p)
    }
    for (const p of this.targetArrowheadPoints(25)) {
      rect.add(p)
    }

    if (this.label) {
      rect.addRecSelf(this.label.boundingBox)
    }

    const del = this.lineWidth
    rect.left -= del
    rect.top += del
    rect.right += del
    rect.bottom -= del
    return rect
  }

  isInterGraphEdge(): boolean {
    return this.edge.isInterGraphEdge()
  }

  get target(): GeomNode {
    return GeomObject.getGeom(this.edge.target) as GeomNode
  }

  constructor(edge: Edge) {
    super(edge)
  }
  toString() {
    return this.source.toString() + '->' + this.target
  }

  static RouteSelfEdge(boundaryCurve: ICurve, howMuchToStickOut: number, t: {smoothedPolyline: SmoothedPolyline}): ICurve {
    // we just need to find the box of the corresponding node
    const w = boundaryCurve.boundingBox.width
    const h = boundaryCurve.boundingBox.height
    const center = boundaryCurve.boundingBox.center
    const p0 = new Point(center.x - w / 4, center.y)
    const p1 = new Point(center.x - w / 4, center.y - h / 2 - howMuchToStickOut)
    const p2 = new Point(center.x + w / 4, center.y - h / 2 - howMuchToStickOut)
    const p3 = new Point(center.x + w / 4, center.y)
    t.smoothedPolyline = SmoothedPolyline.mkFromPoints([p0, p1, p2, p3])
    return t.smoothedPolyline.createCurve()
  }

  underCollapsedGraph(): boolean {
    return this.source.underCollapsedGraph() || this.target.underCollapsedGraph()
  }
  EdgeToAncestor(): ToAncestorEnum {
    return this.edge.EdgeToAncestor()
  }
  /** this field is used for editing */
  labelAttachmentParameter: number
}
