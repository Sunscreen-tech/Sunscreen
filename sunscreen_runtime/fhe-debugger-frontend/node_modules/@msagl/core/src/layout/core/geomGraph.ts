import {Graph} from '../../structs/graph'
import {Rectangle, Size} from '../../math/geometry/rectangle'
import {GeomObject} from './geomObject'
import {GeomNode} from './geomNode'
import {GeomEdge} from './geomEdge'
import {PlaneTransformation} from '../../math/geometry/planeTransformation'
import {Point} from '../../math/geometry/point'
import {OptimalRectanglePacking} from '../../math/geometry/rectanglePacking/OptimalRectanglePacking'
import {mkRTree, RTree} from '../../math/geometry/RTree/rTree'
import {Curve, ICurve, interpolateICurve, PointLocation} from '../../math/geometry'
import {RRect} from './RRect'
import {IGeomGraph} from '../initialLayout/iGeomGraph'
import {ILayoutSettings} from '../iLayoutSettings'
import {Entity} from '../../structs/entity'
import {AttributeRegistry} from '../../structs/attributeRegistry'
import {Edge} from '../../structs/edge'
import {Node} from '../../structs/node'
import {PointPair} from '../../math/geometry/pointPair'
import {Arrowhead} from './arrowhead'
import {GeomLabel} from './geomLabel'
import {Assert} from '../../utils/assert'
// packs the subgraphs and set the bounding box of the parent graph
export function optimalPackingRunner(geomGraph: GeomGraph, subGraphs: GeomGraph[]) {
  const subgraphsRects = subGraphs.map((g) => [g, g.boundingBox] as [GeomGraph, Rectangle]) // g.boundingBox is a clone of the graph rectangle

  const rectangles = subgraphsRects.map((t) => t[1]) as Array<Rectangle>
  const packing = new OptimalRectanglePacking(
    rectangles,
    1.5, // TODO - pass as a parameter: PackingAspectRatio,
  )
  packing.run()
  for (const [g, rect] of subgraphsRects) {
    const delta = rect.leftBottom.sub(g.boundingBox.leftBottom)
    g.translate(delta)
  }
  geomGraph.boundingBox = new Rectangle({
    left: 0,
    bottom: 0,
    right: packing.PackedWidth,
    top: packing.PackedHeight,
  })
}

/** GeomGraph is an attribute on a Graph. The underlying Graph keeps all structural information but GeomGraph holds the geometry data, and the layout settings */
export class GeomGraph extends GeomNode {
  beautifyEdges: (activeNodes: Set<Node>) => void
  isAncestor(source: GeomNode): boolean {
    return this.graph.isAncestor(source.node)
  }
  deepTranslate(delta: Point) {
    for (const n of this.nodesBreadthFirst) {
      if (n instanceof GeomGraph) {
        n.boundingBox = n.boundingBox.translate(delta)
      } else {
        n.translate(delta)
      }
      for (const e of n.selfEdges()) {
        e.translate(delta)
      }
      for (const e of n.outEdges()) {
        if (this.graph.isAncestor(e.target.node)) e.translate(delta)
      }
    }
    this.boundingBox = this.boundingBox.translate(delta)
  }
  /** The empty space between the graph inner entities and its boundary */
  margins = {left: 10, top: 10, bottom: 10, right: 10}
  private rrect: RRect
  private _layoutSettings: ILayoutSettings
  private _labelSize: Size
  /** The X radius of the rounded rectangle border */
  radX = 10
  /** The Y radius of the rounded rectangle border */
  radY = 10
  /** it is a rather shallow clone */
  clone(): GeomGraph {
    const gg = new GeomGraph(null)
    gg.boundingBox = this.boundingBox.clone()
    gg.layoutSettings = this.layoutSettings
    gg.margins = this.margins
    gg.radX = this.radX
    gg.radY = this.radY
    return gg
  }

  /** Calculate bounding box from children, not updating the bounding boxes recursively. */
  calculateBoundsFromChildren() {
    const bb = Rectangle.mkEmpty()
    for (const n of this.shallowNodes) {
      bb.addRecSelf(n.boundingBoxWithPadding)
    }
    bb.padEverywhere(this.margins)
    return bb
  }
  *allSuccessorsWidthFirst(): IterableIterator<GeomNode> {
    for (const n of this.graph.allSuccessorsWidthFirst()) {
      yield GeomNode.getGeom(n) as GeomNode
    }
  }

  static getGeom(attrCont: Graph): GeomGraph {
    return <GeomGraph>GeomObject.getGeom(attrCont)
  }

  edgeCurveOrArrowheadsIntersectRect(geomEdge: GeomEdge, rect: Rectangle): boolean {
    for (const p of geomEdge.sourceArrowheadPoints(25)) {
      if (rect.contains(p)) return true
    }
    for (const p of geomEdge.targetArrowheadPoints(25)) {
      if (rect.contains(p)) return true
    }
    const curveUnderTest = geomEdge.curve
    const perimeter = rect.perimeter()
    return (
      Curve.intersectionOne(curveUnderTest, perimeter, false) != null ||
      Curve.PointRelativeToCurveLocation(curveUnderTest.start, perimeter) === PointLocation.Inside
    )
  }

  isEmpty(): boolean {
    return this.graph.isEmpty()
  }
  setSettingsRecursively(ls: ILayoutSettings) {
    this.layoutSettings = ls
    for (const n of this.nodesBreadthFirst) {
      const gg = <GeomGraph>n
      gg.layoutSettings = ls
    }
  }
  get layoutSettings(): ILayoutSettings {
    return this._layoutSettings
  }

  // recursively sets the same settings for subgraphs
  set layoutSettings(value: ILayoutSettings) {
    this._layoutSettings = value
  }

  get labelSize() {
    return this._labelSize
  }
  set labelSize(value: Size) {
    this._labelSize = value
  }
  get boundingBox(): Rectangle {
    if (this.rrect) return this.rrect.clone()
    else return null
  }

  set boundingBox(value: Rectangle) {
    if (value) {
      this.rrect.setRect(value)
    } else {
      this.rrect.roundedRect_ = null
    }
    // Assert.assert(this.bbIsCorrect())
  }
  transform(matrix: PlaneTransformation) {
    if (matrix.isIdentity()) return

    for (const n of this.shallowNodes) {
      n.transform(matrix)
    }
    for (const e of this.shallowEdges) {
      e.transform(matrix)
      if (e.label) e.label.transform(matrix)
    }

    this.boundingBox =
      this.rrect == null || this.rrect.isEmpty() ? this.pumpTheBoxToTheGraphWithMargins() : this.boundingBox.transform(matrix)
  }

  /** Contrary to the deepTranslate() it also translates edges leading out of the graph */
  translate(delta: Point) {
    if (delta.x === 0 && delta.y === 0) return
    this.deepTranslate(delta)
  }
  get nodesBreadthFirst(): IterableIterator<GeomNode> {
    return this.nodesBreadthFirstIter()
  }
  private *nodesBreadthFirstIter(): IterableIterator<GeomNode> {
    for (const n of this.graph.nodesBreadthFirst) {
      yield GeomObject.getGeom(n) as unknown as GeomNode
    }
  }
  setEdge(s: string, t: string): GeomEdge {
    const structEdge = this.graph.setEdge(s, t)
    return new GeomEdge(structEdge)
  }
  /** this does not change the graph bounding box */
  getPumpedGraphWithMarginsBox(): Rectangle {
    const t = {b: Rectangle.mkEmpty()}
    pumpTheBoxToTheGraph(this, t)
    t.b.padEverywhere(this.margins)
    return t.b
  }
  /** sets the bounding box and the boundary curve as well */
  pumpTheBoxToTheGraphWithMargins(): Rectangle {
    return (this.boundingBox = this.getPumpedGraphWithMarginsBox())
  }

  // Fields which are set by Msagl
  // return the center of the curve bounding box
  get center() {
    return this.boundingBox || this.boundingBox.isEmpty ? this.boundingBox.center : new Point(0, 0)
  }

  set center(value: Point) {
    // Assert.assert(this.bbIsCorrect())
    const del = value.sub(this.center)
    const t = new PlaneTransformation(1, 0, del.x, 0, 1, del.y)
    this.transform(t)
  }

  get left() {
    return this.boundingBox.left
  }
  get right() {
    return this.boundingBox.right
  }
  get top() {
    return this.boundingBox.top
  }
  get bottom() {
    return this.boundingBox.bottom
  }
  CheckClusterConsistency(): boolean {
    throw new Error('Method not implemented.')
  }
  get edgeCount() {
    return this.graph.edgeCount
  }

  get boundaryCurve(): ICurve {
    // Assert.assert(this.rrect.isOk())
    return this.rrect.roundedRect_
  }

  set boundaryCurve(value: ICurve) {
    throw new Error()
  }

  get shallowNodes(): IterableIterator<GeomNode> {
    return this.shallowNodes_()
  }

  *shallowNodes_(): IterableIterator<GeomNode> {
    for (const n of this.graph.shallowNodes) yield GeomObject.getGeom(n) as GeomNode
  }

  /** iterates over the edges of the graph which adjacent to the nodes of the graph:
   * not iterating over the subgraphs
   */
  /** iterates over the edges of the graph including subgraphs */
  get deepEdges() {
    return this.deepEdgesIt()
  }
  private *deepEdgesIt(): IterableIterator<GeomEdge> {
    for (const e of this.graph.deepEdges) {
      yield <GeomEdge>GeomObject.getGeom(e)
    }
  }
  get shallowEdges() {
    return this.shallowEdgesIt()
  }
  private *shallowEdgesIt(): IterableIterator<GeomEdge> {
    for (const e of this.graph.shallowEdges) {
      yield <GeomEdge>GeomObject.getGeom(e)
    }
  }
  static mk(id: string, labelSize: Size = new Size(0, 0)): GeomGraph {
    const g = new GeomGraph(new Graph(id))
    g.labelSize = labelSize
    return g
  }

  get Clusters(): IterableIterator<IGeomGraph> {
    return this.subgraphs()
  }
  /** iterates over all subgraphs  */
  *subgraphs(): IterableIterator<GeomGraph> {
    for (const g of this.graph.subgraphsBreadthFirst()) {
      yield <GeomGraph>GeomObject.getGeom(g)
    }
  }

  static mkWithGraphAndLabel(graph: Graph, labelSize: Size): GeomGraph {
    const g = new GeomGraph(graph)
    g.labelSize = labelSize
    return g
  }

  constructor(graph: Graph) {
    super(graph)
    this.rrect = new RRect({left: 0, right: -1, top: 20, bottom: 0, radX: this.radX, radY: this.radY})
  }
  get deepNodeCount(): number {
    let n = 0
    for (const v of this.graph.nodesBreadthFirst) n++
    return n
  }
  get subgraphsDepthFirst(): IterableIterator<IGeomGraph> {
    return this.getSubgraphsDepthFirst()
  }
  *getSubgraphsDepthFirst(): IterableIterator<IGeomGraph> {
    for (const n of this.graph.allSuccessorsDepthFirst()) {
      if (n instanceof Graph) yield GeomGraph.getGeom(n)
    }
  }
  get uniformMargins() {
    return Math.max(this.margins.left, this.margins.right, this.margins.right, this.margins.bottom)
  }
  set uniformMargins(value: number) {
    this.margins.left = this.margins.right = this.margins.right = this.margins.bottom = value
  }

  get height() {
    return this.boundingBox.height
  }

  get width() {
    return this.boundingBox.width
  }

  get shallowNodeCount() {
    return this.graph.shallowNodeCount
  }

  get graph() {
    return this.entity as Graph
  }

  liftNode(n: GeomNode): GeomNode {
    const liftedNode = this.graph.liftNode(n.node)
    return liftedNode ? <GeomNode>GeomObject.getGeom(liftedNode) : null
  }

  findNode(id: string): GeomNode {
    const n = this.graph.findNode(id)
    if (!n) return null
    return <GeomNode>GeomObject.getGeom(n)
  }

  addNode(gn: GeomNode): GeomNode {
    this.graph.addNode(gn.node)
    return gn
  }

  addLabelToGraphBB(rect: Rectangle) {
    if (this.labelSize) {
      rect.top += this.labelSize.height + 2 // 2 for label margin
      if (rect.width < this.labelSize.width) {
        rect.width = this.labelSize.width
      }
    }
  }
}

export function pumpTheBoxToTheGraph(igraph: IGeomGraph, t: {b: Rectangle}) {
  for (const e of igraph.shallowEdges) {
    if (!isProperEdge(e)) continue

    const cb = e.curve.boundingBox
    // cb.pad(e.lineWidth)
    t.b.addRecSelf(cb)
    if (e.edge.label != null) {
      const labelGeom = GeomObject.getGeom(e.edge.label)
      if (labelGeom) {
        t.b.addRecSelf(labelGeom.boundingBox)
      }
    }
  }

  for (const n of igraph.shallowNodes) {
    if ('shallowEdges' in n) {
      pumpTheBoxToTheGraph(n as unknown as IGeomGraph, t)
    }
    if (n.underCollapsedGraph() || !n.boundingBox) continue
    t.b.addRecSelf(n.boundingBox)
  }
  if (igraph instanceof GeomGraph) {
    igraph.addLabelToGraphBB(t.b)
  }
  function isProperEdge(geomEdge: GeomEdge): boolean {
    if (geomEdge == null) return false
    if (geomEdge.curve == null) return false
    if (geomEdge.underCollapsedGraph()) return false
    if (igraph instanceof GeomGraph) {
      const graph = igraph.entity as Graph
      return graph.isAncestor(geomEdge.source.entity) && graph.isAncestor(geomEdge.target.entity)
    } else {
      return true
    }
  }
}

/** iterate over the graph objects intersected by a rectangle: by default, return only the intersected nodes */
export function* intersectedObjects(rtree: RTree<Entity, Point>, rect: Rectangle, onlyNodes = true): IterableIterator<Entity> {
  const result = rtree.GetAllIntersecting(rect)
  if (onlyNodes) {
    for (const r of result) {
      if (r instanceof Node) yield r
    }
  } else {
    // nodes and edges
    for (const r of result) {
      if (r instanceof Node || r instanceof Edge) yield r
    }
  }
}

export function buildRTree(graph: Graph): RTree<Entity, Point> {
  const data: Array<[Rectangle, Entity]> = (Array.from(graph.nodesBreadthFirst) as Array<Entity>)
    .concat(Array.from(graph.deepEdges) as Array<Entity>)
    .map((o) => [GeomObject.getGeom(o).boundingBox, o])
  return mkRTree(data)
}

type PpEdge = {edge: Edge; pp: PointPair}
export type HitTreeNodeType = Entity | PpEdge

export function* getGeomIntersectedObjects(tree: RTree<HitTreeNodeType, Point>, slack: number, point: Point): IterableIterator<GeomObject> {
  if (!tree) return
  const rect = Rectangle.mkSizeCenter(new Size(slack * 2), point)
  for (const t of tree.RootNode.AllHitItems(rect, null)) {
    if ('edge' in t) {
      if (dist(point, t.pp._first, t.pp._second) < slack) {
        yield GeomObject.getGeom(t.edge)
      }
    } else {
      yield GeomObject.getGeom(t)
    }
  }

  function dist(p: Point, s: Point, e: Point): number {
    const l = e.sub(s)
    const len = l.length
    if (len < 1.0 / 10) {
      return p.sub(Point.middle(s, e)).length
    }

    const perp = l.rotate90Cw()
    return Math.abs(p.sub(s).dot(perp)) / len
  }
}

export function buildRTreeWithInterpolatedEdges(graph: Graph, slack: number): RTree<HitTreeNodeType, Point> {
  if (graph == null) return null
  const nodes: Array<[Rectangle, HitTreeNodeType]> = Array.from(graph.nodesBreadthFirst).map((n) => [GeomNode.getGeom(n).boundingBox, n])

  const edgesPlusEdgeLabels: Array<[Rectangle, HitTreeNodeType]> = []
  for (const e of graph.deepEdges) {
    const ge = e.getAttr(AttributeRegistry.GeomObjectIndex) as GeomEdge
    if (!ge) continue
    if (ge.label) {
      edgesPlusEdgeLabels.push([ge.label.boundingBox, e.label])
    }
    if (!ge.curve) continue
    const poly = interpolateICurve(ge.curve, slack / 2)
    if (ge.sourceArrowhead) {
      edgesPlusEdgeLabels.push([
        Rectangle.mkPP(ge.sourceArrowhead.tipPosition, ge.curve.start),
        {edge: e, pp: new PointPair(ge.sourceArrowhead.tipPosition, ge.curve.start)},
      ])
    }
    for (let i = 0; i < poly.length - 1; i++) {
      edgesPlusEdgeLabels.push([Rectangle.mkPP(poly[i], poly[i + 1]), {edge: e, pp: new PointPair(poly[i], poly[i + 1])}])
    }
    if (ge.targetArrowhead) {
      edgesPlusEdgeLabels.push([
        Rectangle.mkPP(ge.curve.end, ge.targetArrowhead.tipPosition),
        {edge: e, pp: new PointPair(ge.curve.end, ge.targetArrowhead.tipPosition)},
      ])
    }
  }
  const t = nodes.concat(edgesPlusEdgeLabels)
  return mkRTree(t)
}
