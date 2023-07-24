import {TextMeasurer} from '@msagl/renderer-common'
import {
  Edge,
  Ellipse,
  GeomEdge,
  GeomGraph,
  GeomNode,
  Graph,
  Label,
  ICurve,
  Point,
  Node,
  Curve,
  BezierSeg,
  LineSegment,
  Polyline,
  GeomObject,
  Arrowhead,
  Rectangle,
  Size,
  CurveFactory,
  AttributeRegistry,
  EventHandler,
  PlaneTransformation,
  Assert,
  Attribute,
  SmoothedPolyline,
  GeomLabel,
  Entity,
} from '@msagl/core'
import {
  DrawingEdge,
  DrawingObject,
  DrawingNode,
  Color,
  StyleEnum,
  ShapeEnum,
  IViewerGraph,
  IViewerNode,
  IViewerEdge,
  IViewerObject,
  viewerObj,
} from '@msagl/drawing'
import {String} from 'typescript-string-operations'

export class SvgViewerObject extends Attribute implements IViewerObject {
  clone(): Attribute {
    throw new Error('not implemented')
  }
  rebind(e: Entity): void {
    this.entity = e
    this.bind(AttributeRegistry.ViewerIndex)
  }
  /**  This is the field from the Graph. It is used to keep the connection with the underlying graph */

  constructor(attrCont: Entity, svgData: SVGElement) {
    super(attrCont, AttributeRegistry.ViewerIndex)
    this.svgData = svgData
  }

  svgData: SVGElement
  isVisible = true
  markedForDragging = false

  /**  raised when the entity is unmarked for dragging*/
  unmarkedForDraggingCallback: () => void
}

export class SvgViewerGraph extends SvgViewerObject implements IViewerGraph {
  get graph(): Graph {
    return this.entity as Graph
  }
}
export class SvgViewerNode extends SvgViewerObject implements IViewerNode {
  get node(): Node {
    return this.entity as Node
  }
  IsCollapsedChanged: EventHandler
}
class SvgViewerLabel extends SvgViewerObject implements IViewerObject {}
export class SvgViewerEdge extends SvgViewerObject implements IViewerEdge {
  radiusOfPolylineCorner: number
  selectedForEditing: boolean
  get edge(): Edge {
    return this.entity as Edge
  }
  IsCollapsedChanged: (node: IViewerNode) => void
}
/** this class creates SVG content for a given Graph */
export class SvgCreator {
  getShowRect(): DOMRect {
    const bb = this.geomGraph.boundingBox
    return new DOMRect(bb.left, -bb.top, bb.width, bb.height)
  }

  removeRubberEdge() {
    this.rubberEdge.remove()
    this.rubberEdge = null
  }
  rubberEdge: SVGElement
  drawRubberEdge(edgeGeometry: GeomEdge) {
    const path = (this.rubberEdge = this.createOrGetWithId(this.transformGroup, 'path', 'rubberEdge'))
    path.setAttribute('d', curveString(edgeGeometry.curve))
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'black')
    path.setAttribute('stroke-opacity', '1')
    path.setAttribute('stroke-width', '1')
    path.setAttribute('stroke-dasharray', '5')
  }
  /** changes color and shape depending on inside parameter */
  positionEdgeInsertionElement(cursorPosition: Point, inside: boolean) {
    const color = inside ? 'brown' : 'blue'
    const rad = this.getSmoothedPolylineRadius() / 2

    const pathValue = curveString(inside ? CurveFactory.mkCircle(rad, cursorPosition) : CurveFactory.mkDiamond(rad, rad, cursorPosition))

    this.edgeInsertionPortElem.setAttribute('d', pathValue)
    this.edgeInsertionPortElem.setAttribute('fill', color)
  }
  nodeInsertionCircle: SVGElement
  edgeInsertionPortElem: SVGElement
  prepareToEdgeInsertion(cursorPosition: Point, insideOfANode: boolean) {
    this.stopNodeInsertion()
    this.edgeInsertionPortElem = this.createOrGetWithId(this.transformGroup, 'path', 'edgeInsertCircle')
    this.positionEdgeInsertionElement(cursorPosition, insideOfANode) // thinking that at the b
  }
  positionNodeInsertionCircle(cursorPosition: Point) {
    const pathValue = curveString(CurveFactory.mkCircle(this.getSmoothedPolylineRadius() / 2, cursorPosition))
    this.nodeInsertionCircle.setAttribute('d', pathValue)
    this.nodeInsertionCircle.setAttribute('fill', 'red')
  }
  stopNodeInsertion() {
    if (this.nodeInsertionCircle) this.nodeInsertionCircle.remove()
  }
  stopEdgeInsertion() {
    if (this.edgeInsertionPortElem) this.edgeInsertionPortElem.remove()
  }

  prepareToNodeInsertion(cursorPosition: Point) {
    this.stopEdgeInsertion()
    this.nodeInsertionCircle = this.createOrGetWithId(this.transformGroup, 'path', 'nodeInsertCircle')
    const rad = this.getSmoothedPolylineRadius() / 2
    const pathValue = curveString(CurveFactory.mkCircle(rad, cursorPosition))
    this.nodeInsertionCircle.setAttribute('d', pathValue)
    this.nodeInsertionCircle.setAttribute('fill', 'red')
  }
  invalidate(objectToInvalidate: IViewerObject) {
    const entity = objectToInvalidate.entity
    if (entity instanceof Graph) {
      if (entity.parent) {
        // ignore the root graph
        this.drawNode(entity)
      }
    } else if (entity instanceof Node) {
      this.drawNode(entity)
    } else if (entity instanceof Edge) {
      this.drawEdge(entity)
    } else if (entity instanceof Label) {
      this.drawEdgeLabel(entity)
    } else {
      throw new Error('not implemented')
    }
  }

  getSvgString(): string {
    if (this.svg == null) return null
    return new XMLSerializer().serializeToString(this.svg)
  }
  static arrowAngle = 25
  svg: SVGElement
  superTransGroup: SVGElement
  transformGroup: SVGElement
  graph: Graph
  get geomGraph(): GeomGraph {
    return GeomGraph.getGeom(this.graph)
  }
  _textMeasurer = new TextMeasurer()

  private container: HTMLElement
  public constructor(container: HTMLElement) {
    this.container = container
  }

  private clearContainer() {
    while (this.container.childNodes.length > 0) this.container.removeChild(this.container.firstChild)
  }

  /** It cleans the current SVG content
   * and creates the new one corresponding to the graph
   * */
  setGraph(graph: Graph): void {
    this.clearContainer()
    this.graph = graph
    this.graph.setAttr(AttributeRegistry.ViewerIndex, null)
    this.svg = this.createAndBindWithGraph(graph, 'svg', this.container)

    this.superTransGroup = document.createElementNS(svgns, 'g')
    this.superTransGroup.setAttribute('transform', 'matrix(1,0,0,1, 0, 0)')
    this.svg.appendChild(this.superTransGroup)
    this.superTransGroup.appendChild((this.transformGroup = document.createElementNS(svgns, 'g')))

    // After the y flip the top has moved to -top : translating it to zero
    this.setTransformForTranformGroup()
    for (const node of this.graph.nodesBreadthFirst) {
      this.drawNode(node)
    }
    for (const edge of this.graph.deepEdges) {
      this.drawEdge(edge)
      this.drawEdgeLabel(edge.label)
    }
  }
  private setTransformForTranformGroup() {
    this.transformGroup.setAttribute('transform', String.Format('matrix(1,0,0,-1, {0},{1})', 0, 0))
  }

  /** gets transform from svg to the client window coordinates */
  getTransform(): PlaneTransformation {
    if (!this.svg) return PlaneTransformation.getIdentity()
    const tr = (this.superTransGroup as SVGGraphicsElement).getScreenCTM()
    const m = new PlaneTransformation(tr.a, tr.b, tr.e, tr.c, tr.d, tr.f)
    const flip = new PlaneTransformation(1, 0, 0, 0, -1, 0)
    // first we apply flip then m
    return m.multiply(flip)
  }

  getScale(): number {
    try {
      return (this.svg as SVGGraphicsElement).getScreenCTM().a
    } catch (error) {
      return 1
    }
  }

  drawEdge(edge: Edge): SVGElement {
    if ((GeomEdge.getGeom(edge) as GeomEdge).curve == null) return
    // it is a possible bug: could be that we need to create an edge under the lowest
    // common ancestor of the source and the target
    const edgeGroup = this.createAndBindWithGraph(edge, 'g', this.transformGroup)
    const path = this.createOrGetWithId(edgeGroup, 'path', 'curve')
    path.setAttribute('fill', 'none')
    this.setStroke(path, DrawingEdge.getDrawingObj(edge))
    const geometryEdge = <GeomEdge>GeomEdge.getGeom(edge)
    path.setAttribute('d', curveString(geometryEdge.curve))
    this.addArrows(edge, edgeGroup)
    this.drawSelectedForEdit(edge, edgeGroup)
    return edgeGroup
  }
  /** This method can create the SVG child for the smoothed polyline,
   * and also remove it*/
  private drawSelectedForEdit(edge: Edge, edgeGroup: SVGElement) {
    const vEdge = viewerObj(edge) as SvgViewerEdge
    const smoothPolyId = 'smoothPoly'
    const cornersGroupId = 'corners'
    if (vEdge.selectedForEditing) {
      // add editing fixtures
      this.drawSmoothPolyline(edge, edgeGroup, smoothPolyId)
      this.addCornerCirclesGroup(edge, edgeGroup, cornersGroupId)
    } else {
      // remove editing fixtures
      const svgSmoothPoly = edgeGroup.children.namedItem(smoothPolyId)
      if (svgSmoothPoly) edgeGroup.removeChild(svgSmoothPoly)
      const cornerGroup = edgeGroup.children.namedItem(cornersGroupId)
      if (cornerGroup) edgeGroup.removeChild(cornerGroup)
    }
  }
  addCornerCirclesGroup(edge: Edge, edgeGroup: SVGElement, cornersGroupId: string) {
    const cornerGroup = this.createOrGetWithId(edgeGroup, 'g', cornersGroupId)
    const sp = (GeomEdge.getGeom(edge) as GeomEdge).smoothedPolyline
    let i = 0
    for (const p of sp) {
      this.addCornerCircle(p, cornerGroup, i++, edge)
    }
  }
  addCornerCircle(p: Point, cornerGroup: SVGElement, i: number, edge: Edge) {
    const path = this.createOrGetWithId(cornerGroup, 'path', i.toString())
    const rad = this.getSmoothedPolylineRadius()
    const pathValue = curveString(CurveFactory.mkCircle(rad, p))
    path.setAttribute('d', pathValue)
    path.setAttribute('fill', 'none')
    this.setStroke(path, DrawingEdge.getDrawingObj(edge))
  }

  getSmoothedPolylineRadius: () => number

  drawSmoothPolyline(edge: Edge, edgeGroup: SVGElement, smoothPolyId: string) {
    const path = this.createOrGetWithId(edgeGroup, 'path', smoothPolyId)
    const sp = (edge.getAttr(AttributeRegistry.GeomObjectIndex) as GeomEdge).smoothedPolyline
    const pathValue = smoothedPolylineToString(sp)
    path.setAttribute('d', pathValue)
    path.setAttribute('fill', 'none')
    this.setStroke(path, DrawingEdge.getDrawingObj(edge))
  }

  private createOrGetWithId(group: SVGElement, tag: string, id: string): SVGElement {
    const ret = group.children.namedItem(id)
    if (ret) {
      return ret as SVGElement
    }
    const svgElem = document.createElementNS(svgns, tag)
    svgElem.id = id
    group.appendChild(svgElem)
    return svgElem
  }

  private drawEdgeLabel(edgeLabel: Label) {
    if (edgeLabel == null) return
    const labelSvgGroup = this.createAndBindWithGraph(edgeLabel, 'g', this.transformGroup)

    const geomLabel = edgeLabel.getAttr(AttributeRegistry.GeomObjectIndex)
    if (!geomLabel) return
    this.drawLabelAtXY(edgeLabel, DrawingEdge.getDrawingObj(edgeLabel.parent), geomLabel.boundingBox, labelSvgGroup, 'edgeLabel')
    const attachPromptId = 'attachPrompt'
    if (edgeLabel.getAttr(AttributeRegistry.ViewerIndex).markedForDragging) {
      this.addLabelAttachmentPrompt(edgeLabel, geomLabel, labelSvgGroup, attachPromptId)
    } else {
      this.removeLabelAttachmentPrompt(labelSvgGroup, attachPromptId)
    }
  }
  private removeLabelAttachmentPrompt(labelSvgGroup: SVGElement, attachPromptId: string) {
    const attachPrompt = labelSvgGroup.children.namedItem(attachPromptId)
    if (attachPrompt) {
      labelSvgGroup.removeChild(attachPrompt)
    }
  }
  private addLabelAttachmentPrompt(edgeLabel: Label, geomLabel: GeomLabel, labelSvgGroup: SVGElement, attachPromptId: string) {
    const ls = LineSegment.mkPP(geomLabel.attachmentSegmentStart, geomLabel.attachmentSegmentEnd)
    const path = this.createOrGetWithId(labelSvgGroup, 'path', attachPromptId)
    path.setAttribute('fill', 'none')
    const length = ls.length
    path.setAttribute('stroke-dasharray', [length * 0.4, length * 0.2, length * 0.4].toString())
    this.setStroke(path, DrawingEdge.getDrawingObj(edgeLabel.parent))
    path.setAttribute('d', curveString(ls))
  }

  private addArrows(edge: Edge, group: SVGElement) {
    const geomEdge = <GeomEdge>GeomEdge.getGeom(edge)
    const curve = geomEdge.curve
    this.AddArrowhead(edge, geomEdge.sourceArrowhead, curve.start, group, 'sourceArr')
    this.AddArrowhead(edge, geomEdge.targetArrowhead, curve.end, group, 'targetArr')
  }
  private AddArrowhead(edge: Edge, arrowhead: Arrowhead, base: Point, group: SVGElement, id: string): SVGElement | null {
    if (!arrowhead) return

    const path = this.createOrGetWithId(group, 'polygon', id)

    this.setStroke(path, DrawingEdge.getDrawingObj(edge))
    const points = getArrowheadPoints(base, arrowhead.tipPosition)
    path.setAttribute('points', pointsToString(points))
    return path
  }

  private setStroke(path: SVGElement, drObj: DrawingObject) {
    const msaglColor = msaglToSvgColor(drObj.color)
    path.setAttribute('stroke', msaglColor)
    path.setAttribute('stroke-opacity', (drObj.color ? drObj.color.A / 255 : 1).toString())
    path.setAttribute('stroke-width', drObj.penwidth.toString())
    if (drObj.styles && drObj.styles.length) {
      for (const style of drObj.styles) {
        this.attachStyleToPath(path, style)
      }
    }
  }
  private attachStyleToPath(path: SVGElement, style: StyleEnum) {
    switch (style) {
      case StyleEnum.dashed:
        path.setAttribute('stroke-dasharray', '5')
        break
      case StyleEnum.dotted:
        path.setAttribute('stroke-dasharray', '2')
        break
      default:
        //todo: support more styles
        break
    }
  }
  drawNode(node: Node) {
    const nodeGroupSvg = this.createAndBindWithGraph(node, 'g', this.transformGroup)
    const gn = GeomObject.getGeom(node) as GeomNode

    const boundaryCurve = gn.boundaryCurve
    if (!boundaryCurve) return
    this.drawNodeOnCurve(boundaryCurve, node, nodeGroupSvg)
  }
  private drawNodeOnCurve(boundaryCurve: ICurve, node: Node, nodeGroup: SVGElement) {
    const dn = DrawingObject.getDrawingObj(node) as DrawingNode
    if (dn.shape != ShapeEnum.plaintext) {
      this.makePathOnCurve(node, dn, boundaryCurve, nodeGroup, 'boundaryCurve')
      if (dn.shape == ShapeEnum.doublecircle) {
        let ellipse = boundaryCurve as Ellipse
        const r = ellipse.aAxis.length - 2 * dn.penwidth
        ellipse = CurveFactory.mkCircle(r, ellipse.center)
        this.makePathOnCurve(node, dn, ellipse, nodeGroup, 'doubleCircle')
      }
    }
    this.drawLabel(node, dn, nodeGroup)
  }
  private makePathOnCurve(node: Node, dn: DrawingNode, boundaryCurve: ICurve, nodeGroup: SVGElement, id: string) {
    const path = this.createOrGetWithId(nodeGroup, 'path', id)
    if (dn.styles.find((s) => s == StyleEnum.filled)) {
      const c = dn.fillColor ?? dn.color ?? DrawingNode.defaultFillColor
      path.setAttribute('fill', msaglToSvgColor(c))
    } else {
      path.setAttribute('fill', 'none')
    }
    path.setAttribute('d', curveString(boundaryCurve))
    path.setAttribute('stroke', msaglToSvgColor(dn.color))
    path.setAttribute('stroke-width', dn.penwidth.toString())
  }

  private drawLabel(node: Node, dn: DrawingObject, nodeGroup: SVGElement) {
    if (!dn) return
    if (!dn.labelText || dn.labelText.length == 0 || dn.measuredTextSize == null) return

    this.writeLabelText(node, dn.measuredTextSize, nodeGroup, 'nodeLabel')
  }

  private writeLabelText(node: Node, measuredTextSize: Size, nodeGroup: SVGElement, id: string) {
    const geomNode = <GeomNode>GeomNode.getGeom(node)
    const drawingNode = <DrawingNode>DrawingObject.getDrawingObj(node)
    const isGraph = node instanceof Graph
    const rect = isGraph
      ? Rectangle.creatRectangleWithSize(
          measuredTextSize,
          new Point(
            geomNode.boundaryCurve.boundingBox.center.x,
            geomNode.boundaryCurve.boundingBox.top - (measuredTextSize.height / 2 + drawingNode.LabelMargin),
          ),
        )
      : Rectangle.creatRectangleWithSize(measuredTextSize, geomNode.center)
    this.drawLabelAtXY(null, drawingNode, rect, nodeGroup, id)
  }

  private drawLabelAtXY(label: Label, drawingObject: DrawingObject, rect: Rectangle, group: SVGElement, id: string) {
    const fontSize = drawingObject.fontsize
    const textEl = this.createOrGetWithId(group, 'text', id) as SVGTextElement

    textEl.setAttribute('text-anchor', 'middle')
    textEl.setAttribute('x', rect.center.x.toString())
    textEl.setAttribute('fill', msaglToSvgColor(drawingObject.fontColor))
    textEl.setAttribute('font-family', drawingObject.fontname)
    textEl.setAttribute('font-size', fontSize.toString() + 'px')
    textEl.setAttribute('transform', 'scale(1,-1)')

    this.createTspans(drawingObject.labelText, textEl, fontSize, rect)
  }

  private createTspans(text: string, textEl: SVGTextElement, fontSize: number, rect: Rectangle) {
    const endOfLine = '\n'
    const textLines = text.split(endOfLine)
    while (textEl.children.length) {
      textEl.removeChild(textEl.children.item(0))
    }
    if (textLines.length == 1) {
      const tspan = this.createOrGetWithId(textEl, 'tspan', '0')
      tspan.textContent = text
      tspan.setAttribute('text-anchor', 'middle')
      tspan.setAttribute('x', rect.center.x.toString())
      tspan.setAttribute('alignment-baseline', 'middle')
      tspan.setAttribute('y', (-rect.center.y).toString())
    } else {
      let y = rect.top - 1
      for (let i = 0; i < textLines.length; i++) {
        const tspan = this.createOrGetWithId(textEl, 'tspan', i.toString())
        tspan.textContent = textLines[i]
        tspan.setAttribute('text-anchor', 'middle')
        tspan.setAttribute('x', rect.center.x.toString())
        tspan.setAttribute('alignment-baseline', 'hanging')
        tspan.setAttribute('y', (-y).toString())
        y -= 1.21 * fontSize
      }
    }
  }

  getViewBoxString(bbox: DOMRect): string {
    return String.Format('0 0 {0} {1}', bbox.width, bbox.height)
  }

  private createAndBindWithGraph(entity: Entity, name: string, group: any): SVGElement {
    const existingViewerObj = entity ? (viewerObj(entity) as SvgViewerObject) : null
    if (existingViewerObj) {
      const svgData = existingViewerObj.svgData
      Assert.assert(existingViewerObj.svgData != null)
      if (group !== svgData.parentNode) {
        if (svgData.parentNode) {
          svgData.parentNode.removeChild(svgData)
        }
        group.appendChild(svgData)
      }
      return svgData
    }
    const svgElement = document.createElementNS(svgns, name)
    group.appendChild(svgElement)
    if (entity instanceof Graph) {
      new SvgViewerGraph(entity, svgElement)
    } else if (entity instanceof Node) {
      new SvgViewerNode(entity, svgElement)
    } else if (entity instanceof Edge) {
      new SvgViewerEdge(entity, svgElement)
    } else if (entity instanceof Label) {
      new SvgViewerLabel(entity, svgElement)
    }

    return svgElement
  }
}
const svgns = 'http://www.w3.org/2000/svg'

function curveString(iCurve: ICurve): string {
  return String.Join(' ', Array.from(curveStringTokens(iCurve)))
}

function smoothedPolylineToString(sp: SmoothedPolyline): string {
  return String.Join(' ', Array.from(tokensOfSmoothedPolyline(sp)))
}
function* tokensOfSmoothedPolyline(sp: SmoothedPolyline): IterableIterator<string> {
  let first = true
  for (const p of sp) {
    if (first) {
      first = false
      yield 'M'
      yield pointToString(p)
    } else {
      yield 'L'
      yield pointToString(p)
    }
  }
}
function* curveStringTokens(iCurve: ICurve): IterableIterator<string> {
  yield 'M'
  yield pointToString(iCurve.start)
  const iscurve = iCurve instanceof Curve
  if (iscurve) for (const segment of iCurve.segs) yield segmentString(segment)
  else {
    const islineSeg = iCurve instanceof LineSegment
    if (islineSeg) {
      yield 'L'
      yield pointToString(iCurve.end)
    } else {
      const isbezier = iCurve instanceof BezierSeg
      if (isbezier) {
        yield bezierSegToString(iCurve as BezierSeg)
      } else {
        const ispoly = iCurve instanceof Polyline
        if (ispoly) {
          const poly = iCurve as Polyline
          for (const p of poly.skip(1)) {
            yield 'L'
            yield pointToString(p.point)
          }
          if (poly.closed) {
            yield 'L'
            yield pointToString(poly.start)
          }
        } else {
          const isellipse = iCurve instanceof Ellipse
          if (isellipse) {
            const ellipse = iCurve as Ellipse
            if (ellipse.isFullEllipse()) {
              yield ellipseToString(new Ellipse(0, Math.PI, ellipse.aAxis, ellipse.bAxis, ellipse.center))
              yield ellipseToString(new Ellipse(Math.PI, Math.PI * 2, ellipse.aAxis, ellipse.bAxis, ellipse.center))
            } else this.ellipseToString(ellipse)
          }
        }
      }
    }
  }
}

function pointToString(start: Point) {
  return doubleToString(start.x) + ' ' + doubleToString(start.y)
}

function doubleToString(d: number) {
  return Math.abs(d) < 1e-11 ? '0' : d.toString() //formatForDoubleString, CultureInfo.InvariantCulture);
}

function bezierSegToString(cubic: BezierSeg): string {
  return 'C' + pointsToString([cubic.B(1), cubic.B(2), cubic.B(3)])
}

function ellipseToString(ellipse: Ellipse): string {
  const largeArc = Math.abs(ellipse.parEnd - ellipse.parStart) >= Math.PI ? '1' : '0'
  const sweepFlag = ellipse.orientedCounterclockwise() ? '1' : '0'

  return String.Join(
    ' ',
    'A',
    ellipseRadiuses(ellipse),
    doubleToString(Point.angle(new Point(1, 0), ellipse.aAxis) / (Math.PI / 180.0)),
    largeArc,
    sweepFlag,
    pointToString(ellipse.end),
  )
}
function ellipseRadiuses(ellipse: Ellipse): string {
  return doubleToString(ellipse.aAxis.length) + ',' + doubleToString(ellipse.bAxis.length)
}
function pointsToString(points: Point[]) {
  return String.Join(
    ' ',
    points.map((p) => pointToString(p)),
  )
}
function segmentString(c: ICurve): string {
  const isls = c instanceof LineSegment
  if (isls) return lineSegmentString(c as LineSegment)

  const iscubic = c instanceof BezierSeg
  if (iscubic) return bezierSegToString(c as BezierSeg)

  const isell = c instanceof Ellipse
  if (isell) return ellipseToString(c as Ellipse)

  throw new Error('NotImplementedException')
}

function lineSegmentString(ls: LineSegment): string {
  return 'L ' + pointToString(ls.end)
}

function msaglToSvgColor(color: Color): string {
  if (!color) return 'Black'
  return 'rgba(' + color.R + ',' + color.G + ',' + color.B + ',' + color.A / 255.0 + ')'
}
function getArrowheadPoints(start: Point, end: Point): Point[] {
  let dir = end.sub(start)
  const h = dir
  dir = dir.normalize()
  let s = new Point(-dir.y, dir.x)
  const mul = h.length * Math.tan(SvgCreator.arrowAngle * 0.5 * (Math.PI / 180.0))
  s = s.mul(mul)
  return [start.add(s), end, start.sub(s)]
}
