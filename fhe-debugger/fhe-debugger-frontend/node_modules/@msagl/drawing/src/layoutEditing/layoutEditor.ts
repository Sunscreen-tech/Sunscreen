import {
  Node,
  Arrowhead,
  Assert,
  AttributeRegistry,
  Curve,
  Edge,
  EdgeLabelPlacement,
  EdgeRoutingMode,
  Entity,
  GeomEdge,
  GeomGraph,
  GeomLabel,
  GeomNode,
  GeomObject,
  Graph,
  ICurve,
  Label,
  LineSegment,
  Point,
  Polyline,
  Rectangle,
  RectilinearInteractiveEditor,
  Size,
  SmoothedPolyline,
  StraightLineEdges,
  layoutGeomGraph,
  InteractiveEdgeRouter,
  FloatingPort,
  Port,
  PointLocation,
  CornerSite,
  CurvePort,
} from '@msagl/core'
import {IViewerObject} from './iViewerObject'

import {DraggingMode, GeometryGraphEditor} from './geomGraphEditor'
import {ObjectUnderMouseCursorChangedEventArgs} from './objectUnderMouseCursorChangedEventArgs'
import {PolylineCornerType} from './polylineCornerType'
import {IViewer, InsertionMode} from './iViewer'
import {ArrowTypeEnum} from '../arrowTypeEnum'
import {DrawingEdge} from '../drawingEdge'
import {DrawingNode} from '../drawingNode'
import {DrawingObject} from '../drawingObject'
import {IViewerEdge} from './iViewerEdge'
import {IViewerNode} from './iViewerNode'
import {ModifierKeysEnum} from './modifierKeys'

type DelegateForIViewerObject = (o: IViewerObject) => void
type DelegateForEdge = (e: IViewerEdge) => void

export function viewerObj(entity: Entity): IViewerObject {
  return entity.getAttr(AttributeRegistry.ViewerIndex) as IViewerObject
}

function geomObjFromIViewerObj(obj: IViewerObject): GeomObject {
  return GeomObject.getGeom(obj.entity)
}

function isIViewerNode(obj: IViewerObject): boolean {
  return obj && obj.entity instanceof Node
}

type MouseAndKeysAnalyzer = (mouseEvent: PointerEvent) => boolean

export class LayoutEditor {
  resizeLabel(innerText: string, objectWithEditedLabel: Entity) {
    const dro = objectWithEditedLabel.getAttr(AttributeRegistry.DrawingObjectIndex) as DrawingObject
    dro.labelText = innerText
    this.viewer.invalidate(objectWithEditedLabel.getAttr(AttributeRegistry.ViewerIndex))
  }
  get hasEdgeInsertionPort(): boolean {
    return this.SourcePort != null || this.TargetPort != null
  }
  get insertingEdge(): boolean {
    return this.insertionMode == InsertionMode.Edge
  }
  createUndoPoint() {
    this.geomGraphEditor.createUndoPoint()
  }
  registerDelete(entity: Entity) {
    this.geomGraphEditor.registerDelete(entity)
  }
  registerAdd(entity: Entity) {
    this.geomGraphEditor.registerAdd(entity)
  }
  /** unregister the element from everywhere */
  forget(ent: IViewerObject) {
    this.dragGroup.delete(ent)
    if (this.edgeWithSmoothedPolylineExposed === ent) {
      this.edgeWithSmoothedPolylineExposed = null
    }
  }
  RadiusOfPolylineCorner = 10

  aActiveDraggedObject: IViewerObject
  activeCornerSite: CornerSite
  geomEdge: GeomEdge = new GeomEdge(null) // keep it to hold the geometry only
  private _interactiveEdgeRouter: InteractiveEdgeRouter
  private _edgeWithSmoothedPolylineExposed: IViewerEdge
  public get edgeWithSmoothedPolylineExposed(): IViewerEdge {
    return this._edgeWithSmoothedPolylineExposed
  }
  public set edgeWithSmoothedPolylineExposed(value: IViewerEdge) {
    if (this._edgeWithSmoothedPolylineExposed !== value) {
      if (this._edgeWithSmoothedPolylineExposed) {
        this._edgeWithSmoothedPolylineExposed.selectedForEditing = false
      }
    }
    this._edgeWithSmoothedPolylineExposed = value
    if (value) {
      value.selectedForEditing = true
      this.geomGraphEditor.geomEdgeWithSmoothedPolylineExposed = GeomEdge.getGeom(value.edge)
    } else {
      this.geomGraphEditor.geomEdgeWithSmoothedPolylineExposed = null
    }
  }
  mouseDownScreenPoint: Point
  EdgeAttr = new DrawingEdge(null, true)
  arrowheadLength = Arrowhead.defaultArrowheadLength
  get ActiveDraggedObject(): IViewerObject {
    return this.aActiveDraggedObject
  }
  set ActiveDraggedObject(value: IViewerObject) {
    this.aActiveDraggedObject = value
  }

  cornerInfo: [CornerSite, PolylineCornerType]

  dragGroup: Set<IViewerObject> = new Set<IViewerObject>()

  geomGraphEditor: GeometryGraphEditor = new GeometryGraphEditor()

  private _graph: Graph

  looseObstaclesToTheirViewerNodes: Map<Polyline, Array<IViewerNode>>

  mouseDownGraphPoint: Point

  mouseMoveThreshold = 0.05

  mouseRightButtonDownPoint: Point

  removeEdgeDraggingDecorations: DelegateForEdge

  sourceLoosePolylineWrap: {loosePolyline: Polyline} = {loosePolyline: null}

  sourceOfInsertedEdgeWrap: {node: IViewerNode} = {node: null}

  sourcePortWrap: {port: Port} = {port: null}

  targetOfInsertedEdgeWrap: {node: IViewerNode} = {node: null}

  targetPortWrap: {port: Port} = {port: null}

  viewer: IViewer

  get interactiveEdgeRouter(): InteractiveEdgeRouter {
    return this._interactiveEdgeRouter
  }
  set interactiveEdgeRouter(value: InteractiveEdgeRouter) {
    this._interactiveEdgeRouter = value
  }

  //  Constructor

  constructor(viewerPar: IViewer) {
    this.viewer = viewerPar

    this.decorateObjectForDragging = this.defaultObjectDecorator
    this.removeObjDraggingDecorations = this.defaultObjectDecoratorRemover
    this.DecorateEdgeForDragging = LayoutEditor.TheDefaultEdgeDecoratorStub
    this.decorateEdgeLabelForDragging = this.defaultEdgeLabelDecorator
    this.RemoveEdgeDraggingDecorations = LayoutEditor.TheDefaultEdgeDecoratorStub
    this.geomGraphEditor.graph = () => GeomGraph.getGeom(this._graph)
  }

  ViewerObjectUnderMouseCursorChanged(sender: any, e: ObjectUnderMouseCursorChangedEventArgs) {
    if (this.TargetPort != null) {
      this.viewer.RemoveTargetPortEdgeRouting()
      this.TargetPort = null
    }
  }

  ViewChangeEventHandler(sender: any, e: any) {
    if (this._graph == null) {
      return
    }
  }

  /**  current graph under editing */
  get graph(): Graph {
    return this._graph
  }
  set graph(value: Graph) {
    this._graph = value
    this.geomGraphEditor.clear()
  }

  //  If the distance between the mouse down point and the mouse up point is greater than the threshold
  //  then we have a mouse move. Otherwise we have a click.

  get MouseMoveThreshold(): number {
    return this.mouseMoveThreshold
  }
  set MouseMoveThreshold(value: number) {
    this.mouseMoveThreshold = value
  }

  dragging = false

  //  a delegate to decorate a node for dragging
  decorateObjectForDragging: DelegateForIViewerObject

  //  a delegate decorate an edge for editing

  private decorateEdgeForDragging: DelegateForEdge
  public get DecorateEdgeForDragging(): DelegateForEdge {
    return this.decorateEdgeForDragging
  }
  public set DecorateEdgeForDragging(value: DelegateForEdge) {
    this.decorateEdgeForDragging = value
  }

  //  a delegate decorate a label for editing

  decorateEdgeLabelForDragging: DelegateForIViewerObject

  //  a delegate to remove node decorations

  removeObjDraggingDecorations: DelegateForIViewerObject

  //  a delegate to remove edge decorations

  get RemoveEdgeDraggingDecorations(): DelegateForEdge {
    return this.removeEdgeDraggingDecorations
  }
  set RemoveEdgeDraggingDecorations(value: DelegateForEdge) {
    this.removeEdgeDraggingDecorations = value
  }

  //  The method analysing keys and mouse buttons to decide if we are inserting a node

  private nodeInsertPredicate: MouseAndKeysAnalyzer
  public get NodeInsertPredicate(): MouseAndKeysAnalyzer {
    return this.nodeInsertPredicate
  }
  public set NodeInsertPredicate(value: MouseAndKeysAnalyzer) {
    this.nodeInsertPredicate = value
  }

  leftMouseButtonWasPressed: boolean

  get SourceOfInsertedEdge(): IViewerNode {
    return this.sourceOfInsertedEdgeWrap.node
  }
  set SourceOfInsertedEdge(value: IViewerNode) {
    this.sourceOfInsertedEdgeWrap.node = value
  }

  get TargetOfInsertedEdge(): IViewerNode {
    return this.targetOfInsertedEdgeWrap.node
  }
  set TargetOfInsertedEdge(value: IViewerNode) {
    this.targetOfInsertedEdgeWrap.node = value
  }
  /** gets the port from the wrapper */
  get SourcePort(): Port {
    return this.sourcePortWrap.port
  }
  /** set the port for the wrapper */
  set SourcePort(value: Port) {
    this.sourcePortWrap.port = value
  }

  /** gets the port from the wrapper */
  get TargetPort(): Port {
    return this.targetPortWrap.port
  }
  /** sets the port for the wrapper */
  set TargetPort(value: Port) {
    this.targetPortWrap.port = value
  }

  //  returns true if Undo is available

  get CanUndo(): boolean {
    return this.geomGraphEditor.canUndo
  }

  //  return true if Redo is available

  get CanRedo(): boolean {
    return this.geomGraphEditor.canRedo
  }

  private _insertionMode: InsertionMode
  private get insertionMode(): InsertionMode {
    if (this.viewer == null) return InsertionMode.Default
    return this.viewer.insertionMode
  }
  private set insertionMode(value: InsertionMode) {
    if (this.viewer == null) return
    this.viewer.insertionMode = value
  }

  viewerGraphChanged() {
    this._graph = this.viewer.graph
    this.geomGraphEditor.clear()
    if (this._graph != null && GeomGraph.getGeom(this._graph) != null) {
      this.geomGraphEditor.clear()
    }

    this.ActiveDraggedObject = null
    this.dragGroup.clear()
    this.cleanObstacles()
  }

  cleanObstacles() {
    this.interactiveEdgeRouter = null
    this.looseObstaclesToTheirViewerNodes = null
    this.SourceOfInsertedEdge = null
    this.TargetOfInsertedEdge = null
    this.SourcePort = null
    this.TargetPort = null
    this.viewer.RemoveSourcePortEdgeRouting()
    this.viewer.RemoveTargetPortEdgeRouting()
  }

  RelayoutOnIsCollapsedChanged(iCluster: IViewerNode) {
    this.geomGraphEditor.PrepareForClusterCollapseChange([iCluster])
    const geomGraph = GeomGraph.getGeom(iCluster.node as Graph)
    if (geomGraph.isCollapsed) {
      this.CollapseCluster(iCluster.node as Graph)
    } else {
      this.ExpandCluster(geomGraph)
    }

    // LayoutAlgorithmSettings.ShowGraph(viewer.Graph.GeometryGraph);
    for (const o of this.geomGraphEditor.entitiesToBeChangedByUndo()) {
      this.invalidate(o)
    }
  }

  relayout(cluster: GeomGraph) {
    let parent = cluster
    while (parent.parent != null) {
      parent = parent.parent as GeomGraph
    }
    layoutGeomGraph(parent) // TODO: this call relayouts everything. Try to optimize.
    this.MakeExpandedNodesVisible(cluster.entity as Graph)
  }

  ExpandCluster(cluster: GeomGraph) {
    if (cluster == null) return
    this.relayout(cluster)
  }

  MakeExpandedNodesVisible(cluster: Graph) {
    for (const node of cluster.shallowNodes) {
      const iviewerNode = viewerObj(node) as IViewerNode
      LayoutEditor.UnhideNodeEdges(node)
      iviewerNode.isVisible = true
      if (node instanceof Graph) {
        const geomGraph = node.getAttr(AttributeRegistry.GeomObjectIndex) as GeomGraph
        if (geomGraph.isCollapsed == false) this.MakeExpandedNodesVisible(node)
      }
    }
  }

  static UnhideNodeEdges(drn: Node) {
    for (const e of drn.selfEdges) {
      const viewerObject = viewerObj(e) as IViewerObject
      viewerObject.isVisible = true
    }

    for (const e of drn.outEdges) {
      if (viewerObj(e.target).isVisible) viewerObj(e).isVisible = true
    }

    for (const e of drn.inEdges) {
      if (viewerObj(e.source).isVisible) viewerObj(e).isVisible = true
    }
  }

  CollapseCluster(graph: Graph) {
    LayoutEditor.HideCollapsed(graph)
    const geomCluster = GeomGraph.getGeom(graph)
    const center = geomCluster.center
    geomCluster.boundingBox = Rectangle.mkSizeCenter(geomCluster.labelSize, center)
    this.relayout(geomCluster)
  }

  static HideCollapsed(cluster: Graph) {
    for (const n of cluster.shallowNodes) {
      viewerObj(n).isVisible = false
      if (n instanceof Graph) {
        if (GeomGraph.getGeom(n).isCollapsed == false) LayoutEditor.HideCollapsed(n)
      }
    }
  }

  defaultObjectDecorator(obj: IViewerObject) {
    if (obj.entity instanceof Label) {
      this.decorateEdgeLabelForDragging(obj)
      return
    }
    const drawingObj = DrawingNode.getDrawingObj(obj.entity)
    const w = drawingObj.penwidth
    if (!obj.unmarkedForDraggingCallback) {
      obj.unmarkedForDraggingCallback = () => (DrawingObject.getDrawingObj(obj.entity).penwidth = w)
    }
    drawingObj.penwidth = Math.max(this.viewer.LineThicknessForEditing, w * 2)
    this.invalidate(obj.entity)
  }

  defaultObjectDecoratorRemover(obj: IViewerObject) {
    const decoratorRemover = obj.unmarkedForDraggingCallback
    if (decoratorRemover) {
      decoratorRemover()
      obj.unmarkedForDraggingCallback = null
      this.invalidate(obj.entity)
    }

    const ent = obj.entity
    if (ent instanceof Node) {
      for (const edge of ent.edges) {
        this.removeObjDraggingDecorations(viewerObj(edge))
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  static TheDefaultEdgeDecoratorStub(edge: IViewerEdge) {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  defaultEdgeLabelDecorator(label: IViewerObject) {
    const geomLabel = label.entity.getAttr(AttributeRegistry.GeomObjectIndex) as GeomLabel
    if (label.markedForDragging) {
      GeometryGraphEditor.calculateAttachmentSegment(geomLabel)
      label.unmarkedForDraggingCallback = () => {
        this.invalidate(label.entity)
      }
    }

    this.invalidate(label.entity)
  }

  static LeftButtonIsPressed(e: PointerEvent): boolean {
    return (e.buttons & 1) == 1
  }

  static MiddleButtonIsPressed(e: PointerEvent): boolean {
    return (e.buttons & 4) == 4
  }
  static RightButtonIsPressed(e: PointerEvent): boolean {
    return (e.buttons & 2) == 2
  }

  MouseDownPointAndMouseUpPointsAreFarEnoughOnScreen(e: PointerEvent): boolean {
    if (this.mouseDownScreenPoint == null) return false
    const x: number = e.clientX
    const y: number = e.clientY
    const dx: number = (this.mouseDownScreenPoint.x - x) / this.viewer.DpiX
    const dy: number = (this.mouseDownScreenPoint.y - y) / this.viewer.DpiY
    return Math.sqrt(dx * dx + dy * dy) > this.MouseMoveThreshold / 3
  }

  analyzeLeftMouseButtonClick(e: PointerEvent) {
    if (this.edgeWithSmoothedPolylineExposed) {
      this.toggleCornerForSelectedEdge()
    } else if (this.viewer.objectUnderMouseCursor) {
      this.analyzeLeftMouseButtonClickOnObjectUnderCursor(e)
    }
  }

  private analyzeLeftMouseButtonClickOnObjectUnderCursor(e: PointerEvent) {
    const obj = this.viewer.objectUnderMouseCursor
    const modifierKeyIsPressed: boolean = e.ctrlKey || e.shiftKey

    const editableObj = obj.entity
    if (editableObj instanceof Edge) {
      const geomEdge = editableObj.getAttr(AttributeRegistry.GeomObjectIndex) as GeomEdge
      if (geomEdge != null && this.viewer.layoutEditingEnabled) {
        if (geomEdge.smoothedPolyline == null) {
          geomEdge.smoothedPolyline = LayoutEditor.CreateUnderlyingPolyline(geomEdge)
        }
        if (this.edgeWithSmoothedPolylineExposed !== obj) this.switchToEdgeEditing(obj as IViewerEdge)
      }
    } else {
      if (obj.markedForDragging) {
        this.unselectForDragging(obj)
      } else {
        if (!modifierKeyIsPressed) {
          this.unselectEverything()
        }

        this.selectObjectForDragging(obj)
      }

      this.unselectEdge()
    }
  }

  toggleCornerForSelectedEdge() {
    const corner = GeometryGraphEditor.findClosestCornerForEdit(
      GeomEdge.getGeom(this.edgeWithSmoothedPolylineExposed.edge).smoothedPolyline,
      this.mouseDownGraphPoint,
      this.edgeWithSmoothedPolylineExposed.radiusOfPolylineCorner,
    )
    if (corner == null) {
      this.tryInsertCorner()
    } else {
      if (corner.prev == null || corner.next == null) {
        return // ignore the source and the target corners
      }
      this.geomGraphEditor.createUndoPoint()
      this.geomGraphEditor.registerForUndo(this.edgeWithSmoothedPolylineExposed.edge)
      this.geomGraphEditor.deleteSite(GeomEdge.getGeom(this.edgeWithSmoothedPolylineExposed.edge), corner)
      this.invalidate(this.edgeWithSmoothedPolylineExposed.entity)
    }
  }
  tryInsertCorner() {
    // we have to be close enough to the curve
    if (!this.closeEnoughToSelectedEdge()) {
      this.unselectEdge()
    } else {
      const a = GeometryGraphEditor.getPreviousCornerSite(
        GeomEdge.getGeom(this.edgeWithSmoothedPolylineExposed.edge),
        this.mouseDownGraphPoint,
      )
      if (a == null) return
      const b = a.next
      if (b == null) return
      this.geomGraphEditor.insertSite(GeomEdge.getGeom(this.edgeWithSmoothedPolylineExposed.edge), this.mouseDownGraphPoint, a)
      this.invalidate(this.edgeWithSmoothedPolylineExposed.edge)
    }
  }

  closeEnoughToSelectedEdge(): boolean {
    const curve = GeomEdge.getGeom(this.edgeWithSmoothedPolylineExposed.edge).curve
    const t = curve.closestParameter(this.mouseDownGraphPoint)
    return curve.value(t).sub(this.mouseDownGraphPoint).length < this.edgeWithSmoothedPolylineExposed.radiusOfPolylineCorner
  }

  static CreateUnderlyingPolyline(geomEdge: GeomEdge): SmoothedPolyline {
    const ret = SmoothedPolyline.mkFromPoints(LayoutEditor.CurvePoints(geomEdge))
    return ret
  }

  static *CurvePoints(geomEdge: GeomEdge): IterableIterator<Point> {
    yield geomEdge.source.center
    const isCurve = geomEdge.curve instanceof Curve
    if (isCurve) {
      const curve = geomEdge.curve as Curve
      if (curve.segs.length > 0) yield curve.start
      for (let i = 0; i < curve.segs.length; i++) yield curve.segs[i].end
    }
    yield geomEdge.target.center
  }

  //         static void SetCoefficientsCorrecty(SmoothedPolyline ret, ICurve curve) {
  //            //  throw new NotImplementedException();
  //         }
  ModifierKeyIsPressed(): boolean {
    const modifierKeyWasUsed: boolean =
      (this.viewer.modifierKeys & ModifierKeysEnum.Control) == ModifierKeysEnum.Control ||
      (this.viewer.modifierKeys & ModifierKeysEnum.Shift) == ModifierKeysEnum.Shift
    return modifierKeyWasUsed
  }

  switchToEdgeEditing(edge: IViewerEdge) {
    this.unselectEverything()
    this.edgeWithSmoothedPolylineExposed = edge
    edge.radiusOfPolylineCorner = this.viewer.smoothedPolylineCircleRadius
    this.DecorateEdgeForDragging(edge)
    this.invalidate(edge.entity)
  }

  *ViewerNodes(): IterableIterator<IViewerNode> {
    for (const o of this.viewer.entities) {
      if (o.entity instanceof Node) yield o.entity.getAttr(AttributeRegistry.ViewerIndex)
    }
  }

  selectObjectForDragging(obj: IViewerObject) {
    if (obj.markedForDragging == false) {
      obj.markedForDragging = true
      this.dragGroup.add(obj)
      this.decorateObjectForDragging(obj)
    }
  }

  prepareToRemoveFromDragGroup(obj: IViewerObject) {
    obj.markedForDragging = false
    this.removeObjDraggingDecorations(obj)
  }

  unselectForDragging(obj: IViewerObject) {
    this.prepareToRemoveFromDragGroup(obj)
    this.dragGroup.delete(obj)
  }

  unselectEverything() {
    for (const obj of this.dragGroup) {
      this.prepareToRemoveFromDragGroup(obj)
    }

    this.dragGroup.clear()
    this.unselectEdge()
  }

  unselectEdge() {
    if (this.edgeWithSmoothedPolylineExposed != null) {
      this.edgeWithSmoothedPolylineExposed.selectedForEditing = false
      this.removeEdgeDraggingDecorations(this.edgeWithSmoothedPolylineExposed)
      this.invalidate(this.edgeWithSmoothedPolylineExposed.edge)
      this.edgeWithSmoothedPolylineExposed = null
    }
  }

  static *Edges(node: IViewerNode): IterableIterator<IViewerEdge> {
    for (const edge of (node.entity as Node).edges) {
      yield viewerObj(edge) as IViewerEdge
    }
  }

  // returns true if the editor needs own the events
  viewerMouseDown(sender: any, e: PointerEvent): boolean {
    if (!this.viewer.layoutEditingEnabled || this.viewer.graph == null) {
      return false
    }
    this.viewer.setObjectUnderCursorFromEvent(e)

    this.mouseDownGraphPoint = this.viewer.screenToSource(e)
    this.mouseDownScreenPoint = new Point(e.clientX, e.clientY)
    if (!LayoutEditor.LeftButtonIsPressed(e)) return false
    this.leftMouseButtonWasPressed = true
    if (this.insertingEdge) {
      // if (this.SourceOfInsertedEdge != null && this.SourcePort != null && this.DraggingStraightLine()) {
      //   this.viewer.StartDrawingRubberLine(this.sourcePort.port.Location)
      // }
      return true
    }
    if (this.insertionMode == InsertionMode.Node) {
      this.insertNode()
      return true
    }

    if (this.edgeWithSmoothedPolylineExposed != null) {
      if (this.mouseIsInsideOfCornerSite(e)) {
        e.preventDefault()
      }
      return true
    }
    const obj = this.viewer.objectUnderMouseCursor
    if (obj && !this.viewer.objectUnderMouseCursor.hasOwnProperty('edge')) {
      this.ActiveDraggedObject = obj
      return true
    }
    if (this.ActiveDraggedObject != null) {
      e.preventDefault()
      return true
    }
    return false
  }

  private insertNode() {
    const id = this.findNodeID()
    const node = new Node(id)
    this._graph.addNode(node)
    new DrawingNode(node) // it would create the default drawing attribute: TODO: keep a customizable attribute here
    const vn = this.viewer.createIViewerNodeN(node, this.mouseDownGraphPoint)
    this.viewer.addNode(vn, true)
  }

  findNodeID(): string {
    let i = 0
    let id = 'node' + i.toString()
    while (this._graph.findNode(id)) {
      id = 'node' + ++i
    }
    return id
  }

  viewerMouseMove(sender: any, e: PointerEvent) {
    if (!this.viewer.layoutEditingEnabled) {
      return
    }

    if (LayoutEditor.LeftButtonIsPressed(e)) {
      if (this.ActiveDraggedObject != null || this.activeCornerSite != null) {
        this.drag(e)
      } else if (this.insertingEdge) {
        //e.preventDefault()
        //e.stopImmediatePropagation()
        this.mouseMoveInsertEdgeLeftButtonOn(e)
      } else {
        this.MouseMoveLiveSelectObjectsForDragging(e)
      }
    } else if (this.insertingEdge) {
      this.mouseMoveInsertEdgeNoButtons(e)
    }
  }

  setDraggingFlag(e: PointerEvent) {
    if (!this.dragging && this.MouseDownPointAndMouseUpPointsAreFarEnoughOnScreen(e)) {
      this.dragging = true
    }
  }

  TrySetNodePort(
    e: PointerEvent,
    nodeWrapper: {node: IViewerNode},
    portWr: {port: Port},
    loosePolylineWrapper: {loosePolyline: Polyline},
  ): boolean {
    if (this.graph == null) return
    Assert.assert(this.insertingEdge)
    const mousePos = this.viewer.screenToSource(e)
    loosePolylineWrapper.loosePolyline = null
    if (this.DraggingStraightLine()) {
      nodeWrapper.node = this.setPortWhenDraggingStraightLine(portWr, mousePos)
    } else {
      if (this.interactiveEdgeRouter == null) {
        this.PrepareForEdgeDragging()
      }

      loosePolylineWrapper.loosePolyline = this.interactiveEdgeRouter.GetHitLoosePolyline(mousePos)
      if (loosePolylineWrapper.loosePolyline != null) {
        this.SetPortUnderLoosePolyline(mousePos, loosePolylineWrapper.loosePolyline, nodeWrapper, portWr)
      } else {
        nodeWrapper.node = null
        portWr.port = null
      }
    }

    return portWr.port != null
  }

  setPortWhenDraggingStraightLine(portWr: {port: Port}, mousePos: Point): IViewerNode {
    if (isIViewerNode(this.viewer.objectUnderMouseCursor)) {
      const viewerNode = this.viewer.objectUnderMouseCursor as IViewerNode
      const t = {portParameter: 0}
      const geomNode = geomObjFromIViewerObj(viewerNode) as GeomNode
      if (this.NeedToCreateBoundaryPort(mousePos, viewerNode, t)) {
        portWr.port = this.CreateOrUpdateCurvePort(t.portParameter, geomNode, portWr.port)
      } else if (LayoutEditor.PointIsInside(mousePos, geomNode.boundaryCurve)) {
        portWr.port = this.CreateFloatingPort(geomNode, mousePos)
      } else {
        portWr.port = null
      }
      return viewerNode
    }
    portWr.port = null
    return null
  }

  CreateOrUpdateCurvePort(t: number, geomNode: GeomNode, port: Port): Port {
    const isCp = port instanceof CurvePort
    if (!isCp) {
      return CurvePort.mk(geomNode.boundaryCurve, t)
    }
    const cp = port as CurvePort
    cp.parameter = t
    cp.curve = geomNode.boundaryCurve
    return port
  }

  CreateFloatingPort(geomNode: GeomNode, location: Point): FloatingPort {
    return new FloatingPort(geomNode.boundaryCurve, location)
  }

  SetPortUnderLoosePolyline(mousePos: Point, loosePoly: Polyline, nodeWr: {node: IViewerNode}, portWrap: {port: Port}) {
    let dist: number = Number.POSITIVE_INFINITY
    let par = 0
    for (const viewerNode of this.GetViewerNodesInsideOfLooseObstacle(loosePoly)) {
      const curve: ICurve = viewerNode.entity.getAttr(AttributeRegistry.GeomObjectIndex).boundaryCurve
      if (LayoutEditor.PointIsInside(mousePos, curve)) {
        nodeWr.node = viewerNode
        this.SetPortForMousePositionInsideOfNode(mousePos, nodeWr.node, portWrap)
        return
      }

      const p: number = curve.closestParameter(mousePos)
      const d: number = curve.value(p).sub(mousePos).length
      if (d < dist) {
        par = p
        dist = d
        nodeWr.node = viewerNode
      }
    }

    portWrap.port = this.CreateOrUpdateCurvePort(par, geomObjFromIViewerObj(nodeWr.node) as GeomNode, portWrap.port)
  }

  GetViewerNodesInsideOfLooseObstacle(loosePoly: Polyline): Array<IViewerNode> {
    if (this.looseObstaclesToTheirViewerNodes == null) {
      this.InitLooseObstaclesToViewerNodeMap()
    }

    const ret = this.looseObstaclesToTheirViewerNodes.get(loosePoly)
    return ret
  }

  InitLooseObstaclesToViewerNodeMap() {
    this.looseObstaclesToTheirViewerNodes = new Map<Polyline, Array<IViewerNode>>()
    for (const viewerNode of this.ViewerNodes()) {
      const loosePoly: Polyline = this.interactiveEdgeRouter.GetHitLoosePolyline((geomObjFromIViewerObj(viewerNode) as GeomNode).center)
      let loosePolyNodes: Array<IViewerNode> = this.looseObstaclesToTheirViewerNodes.get(loosePoly)
      if (loosePolyNodes == undefined) {
        this.looseObstaclesToTheirViewerNodes.set(loosePoly, (loosePolyNodes = new Array<IViewerNode>()))
      }

      loosePolyNodes.push(viewerNode)
    }
  }

  SetPortForMousePositionInsideOfNode(mousePosition: Point, node: IViewerNode, port: {port: Port}) {
    const geomNode: GeomNode = geomObjFromIViewerObj(node) as GeomNode
    const t = {portParameter: 0}
    if (this.NeedToCreateBoundaryPort(mousePosition, node, t)) {
      port.port = this.CreateOrUpdateCurvePort(t.portParameter, geomNode, port.port)
    } else {
      port.port = this.CreateFloatingPort(geomNode, mousePosition)
    }
  }

  static PointIsInside(point: Point, iCurve: ICurve): boolean {
    return Curve.PointRelativeToCurveLocation(point, iCurve) == PointLocation.Inside
  }

  NeedToCreateBoundaryPort(mousePoint: Point, node: IViewerNode, t: {portParameter: number}): boolean {
    const drawingNode = node.entity.getAttr(AttributeRegistry.DrawingObjectIndex) as DrawingNode
    const curve: ICurve = (geomObjFromIViewerObj(node) as GeomNode).boundaryCurve
    t.portParameter = curve.closestParameter(mousePoint)
    const pointOnCurve: Point = curve.value(t.portParameter)
    const length: number = mousePoint.sub(pointOnCurve).length
    if (length <= this.viewer.smoothedPolylineCircleRadius * 2 + drawingNode.penwidth / 2) {
      this.TryToSnapToTheSegmentEnd(t, curve, pointOnCurve)
      return true
    }

    return false
  }

  TryToSnapToTheSegmentEnd(t: {portParameter: number}, c: ICurve, pointOnCurve: Point) {
    if (c instanceof Curve) {
      const sipar = c.getSegIndexParam(t.portParameter)
      const segPar = sipar.par
      const seg = c.segs[sipar.segIndex]
      if (segPar - seg.parStart < seg.parEnd - segPar) {
        if (seg.start.sub(pointOnCurve).length < this.viewer.smoothedPolylineCircleRadius * 2) {
          t.portParameter -= segPar - seg.parStart
        } else if (seg.end.sub(pointOnCurve).length < this.viewer.smoothedPolylineCircleRadius * 2) {
          t.portParameter += +(seg.parEnd - segPar)
        }
      }
    }
  }

  _lastDragPoint: Point

  drag(e: PointerEvent) {
    if (!this.dragging) {
      if (this.MouseDownPointAndMouseUpPointsAreFarEnoughOnScreen(e)) {
        this.prepareFirstTimeDragging()
      } else {
        // the mouse has not moved enough
        return
      }
    }

    const currentDragPoint = this.viewer.screenToSource(e)
    this.handleTheMouseCursorOutOfTheBoundingBox(currentDragPoint)
    this.geomGraphEditor.drag(currentDragPoint.sub(this._lastDragPoint), this.GetDraggingMode(), this._lastDragPoint)
    for (const affectedObject of this.geomGraphEditor.entitiesToBeChangedByUndo()) {
      this.invalidate(affectedObject)
    }
    e.stopPropagation()
    this._lastDragPoint = currentDragPoint
  }

  private prepareFirstTimeDragging() {
    this.dragging = true
    // first time we are in dragging
    if (this.activeCornerSite != null) {
      this.geomGraphEditor.prepareForGeomEdgeChange(this.edgeWithSmoothedPolylineExposed.edge.getAttr(AttributeRegistry.GeomObjectIndex))
    } else if (this.ActiveDraggedObject != null) {
      this.unselectEdge()
      if (!this.ActiveDraggedObject.markedForDragging) {
        this.unselectEverything()
      }
      this.prepareForDragging()
    }
    this._lastDragPoint = this.mouseDownGraphPoint
  }

  private handleTheMouseCursorOutOfTheBoundingBox(currentDragPoint: Point) {
    const w = this.viewer.smoothedPolylineCircleRadius // some rather small but still visible distance on the screen
    const mousePointerBox = Rectangle.mkSizeCenter(new Size(w, w), currentDragPoint)
    const g = GeomGraph.getGeom(this._graph)
    if (!g.boundingBox.containsRect(mousePointerBox)) {
      this.geomGraphEditor.registerForUndo(this._graph)
      g.boundingBox = g.boundingBox.addRec(mousePointerBox)
      this.invalidate(this._graph)
    }
  }

  private prepareForDragging() {
    this.selectObjectForDragging(this.ActiveDraggedObject)
    this.geomGraphEditor.prepareForObjectDragging(this.DraggedGeomObjects(), this.GetDraggingMode())
    //  const currentUndoRedo = this.undoAction
    // for (const g of this.geomGraphEditor.objectsToDrag) {
    //   currentUndoRedo.AddAffectedObject(g.entity.getAttr(AttributeRegistry.ViewerIndex))
    //   currentUndoRedo.AddRestoreData(g.entity, getRestoreData(g.entity))
    // }
  }

  GetDraggingMode(): DraggingMode {
    const incremental: boolean =
      (this.viewer.modifierKeys & ModifierKeysEnum.Shift) == ModifierKeysEnum.Shift || this.viewer.IncrementalDraggingModeAlways
    return incremental ? DraggingMode.Incremental : DraggingMode.Default
  }

  static RouteEdgesRectilinearly(viewer: IViewer) {
    const geomGraph = viewer.graph.getAttr(AttributeRegistry.GeomObjectIndex) as GeomGraph
    const settings = geomGraph.layoutSettings
    RectilinearInteractiveEditor.CreatePortsAndRouteEdges(
      settings.commonSettings.NodeSeparation / 3,
      1,
      geomGraph.nodesBreadthFirst,
      geomGraph.deepEdges,
      settings.commonSettings.edgeRoutingSettings.EdgeRoutingMode,
    )

    const labelPlacer = EdgeLabelPlacement.constructorG(geomGraph)
    labelPlacer.run()
  }

  *DraggedGeomObjects(): IterableIterator<GeomObject> {
    // restrict the dragged elements to be under the same cluster
    const activeObjCluster: Graph = LayoutEditor.GetActiveObjectCluster(this.ActiveDraggedObject)
    for (const draggObj of this.dragGroup) {
      if (LayoutEditor.GetActiveObjectCluster(draggObj) == activeObjCluster) {
        yield GeomObject.getGeom(draggObj.entity)
      }
    }
  }

  static GetActiveObjectCluster(viewerObject: IViewerObject): Graph {
    return viewerObject.entity.parent as Graph
  }

  viewerMouseUp(sender: any, args: PointerEvent) {
    if (args.defaultPrevented) {
      return
    }

    if (!this.viewer.layoutEditingEnabled) {
      return
    }
    this.handleMouseUpOnLayoutEnabled(args)
  }

  handleMouseUpOnLayoutEnabled(args: PointerEvent) {
    const click = !this.MouseDownPointAndMouseUpPointsAreFarEnoughOnScreen(args)
    if (click && this.leftMouseButtonWasPressed) {
      if (this.viewer.objectUnderMouseCursor != null || this.edgeWithSmoothedPolylineExposed != null) {
        this.analyzeLeftMouseButtonClick(args)
        args.preventDefault()
      } else {
        this.unselectEverything()
      }
    } else if (this.dragging) {
      if (!this.insertingEdge) {
        this.geomGraphEditor.updateDeltaForDragUndo(this.mouseDownGraphPoint.sub(this._lastDragPoint))
        this.interactiveEdgeRouter = null
        this.looseObstaclesToTheirViewerNodes = null
      } else {
        this.InsertEdgeOnMouseUp()
      }

      const gg = GeomGraph.getGeom(this._graph)
      const newBox = gg.getPumpedGraphWithMarginsBox()
      if (!newBox.equal(gg.boundingBox)) {
        this.geomGraphEditor.registerForUndo(this._graph)
        gg.boundingBox = newBox
        this.invalidate(this._graph)
        args.preventDefault()
      }
    }

    this.dragging = false
    this.geomGraphEditor.ForgetDragging()
    this.activeCornerSite = null
    this.ActiveDraggedObject = null
    this.leftMouseButtonWasPressed = false
    if (this.TargetPort != null) {
      this.viewer.RemoveTargetPortEdgeRouting()
    }

    if (this.SourcePort != null) {
      this.viewer.RemoveSourcePortEdgeRouting()
    }

    this.TargetOfInsertedEdge = null
    this.SourceOfInsertedEdge = null
    this.TargetPort = null
    this.SourcePort = null
  }

  edgeAttr: DrawingEdge = new DrawingEdge(null, true)

  InsertEdgeOnMouseUp() {
    this.viewer.stopDrawingRubberEdge()
    if (this.TargetPort != null) {
      const e = this.FinishRoutingEdge()
      this.addEdgeToTheViewer(e)
    }

    this.interactiveEdgeRouter.Clean()
  }

  addEdgeToTheViewer(e: Edge) {
    const vEdge = this.viewer.createEdgeWithGivenGeometry(e)
    this.viewer.addEdge(vEdge, true)
  }

  mkArrowhead(): Arrowhead {
    const arr = new Arrowhead()
    arr.length = this.arrowheadLength
    return arr
  }

  FinishRoutingEdge(): Edge {
    const e = new Edge(this.sourceOfInsertedEdgeWrap.node.entity as Node, this.targetOfInsertedEdgeWrap.node.entity as Node)
    e.add()
    const edgeAttr = this.EdgeAttr.clone() as DrawingEdge
    edgeAttr.rebind(e)

    this.geomEdge.rebind(e)
    this.geomEdge.sourceArrowhead = edgeAttr.arrowtail == ArrowTypeEnum.none ? null : this.mkArrowhead()
    this.geomEdge.targetArrowhead = edgeAttr.arrowhead == ArrowTypeEnum.none ? null : this.mkArrowhead()
    if (this.TargetOfInsertedEdge != this.SourceOfInsertedEdge) {
      if (!(this.geomEdge.curve instanceof LineSegment)) {
        this.interactiveEdgeRouter.TryToRemoveInflectionsAndCollinearSegments(this.geomEdge.smoothedPolyline)
        this.interactiveEdgeRouter.SmoothenCorners(this.geomEdge.smoothedPolyline)
        this.geomEdge.curve = this.geomEdge.smoothedPolyline.createCurve()
      }
      Arrowhead.trimSplineAndCalculateArrowheads(this.geomEdge, this.geomEdge.curve, true)
    } else {
      this.geomEdge = LayoutEditor.CreateEdgeGeometryForSelfEdge(this.SourceOfInsertedEdge.entity as Node)
    }

    this.viewer.RemoveSourcePortEdgeRouting()
    this.viewer.RemoveTargetPortEdgeRouting()
    return e
  }

  static CreateEdgeGeometryForSelfEdge(node: Node): GeomEdge {
    const edge = new Edge(node, node)
    const geomEdge = new GeomEdge(edge)
    StraightLineEdges.CreateSimpleEdgeCurveWithUnderlyingPolyline(geomEdge)
    return geomEdge
  }

  SelectEntitiesForDraggingWithRectangle(args: PointerEvent) {
    /*
    const rect = Rectangle.mkPP(this.mouseDownGraphPoint, this.viewer.ScreenToSource(args))
    for (const node of this.ViewerNodes()) {
      if (rect.intersects(geomNodeOfIViewerNode(node).boundingBox)) {
        this.selectObjectForDragging(node)
      }
    }
    if (rect.width > 0) {
      args.stopImmediatePropagation()
    }*/
  }

  /** it also sets this.activeCornerSite */
  mouseIsInsideOfCornerSite(e: PointerEvent): boolean {
    const p = this.viewer.screenToSource(e)
    const lw = this.edgeWithSmoothedPolylineExposed.edge.getAttr(AttributeRegistry.DrawingObjectIndex).penwidth

    this.activeCornerSite = GeometryGraphEditor.findClosestCornerForEdit(
      GeomEdge.getGeom(this.edgeWithSmoothedPolylineExposed.edge).smoothedPolyline,
      p,
      this.edgeWithSmoothedPolylineExposed.radiusOfPolylineCorner + lw,
    )
    return this.activeCornerSite !== null
  }

  MouseScreenPointIsCloseEnoughToVertex(point: Point, radius: number): boolean {
    return point.sub(this.mouseDownGraphPoint).length < radius
  }

  invalidate(ent: Entity) {
    const vo = viewerObj(ent) as IViewerObject
    if (!vo) return
    if (vo.entity instanceof Label) {
      if (vo.markedForDragging) {
        const geomLabel = GeomObject.getGeom(vo.entity) as GeomLabel
        GeometryGraphEditor.calculateAttachmentSegment(geomLabel)
      }
    } else {
      if (vo.entity instanceof Edge) {
        if (vo.entity.label) {
          this.viewer.invalidate(viewerObj(vo.entity.label))
        }
      }
    }
    this.viewer.invalidate(vo)
    if (ent instanceof Graph) {
      for (const n of ent.nodesBreadthFirst) {
        this.viewer.invalidate(viewerObj(n))
      }
      for (const e of ent.deepEdges) {
        this.viewer.invalidate(viewerObj(e))
        if (e.label) this.viewer.invalidate(viewerObj(e.label))
      }
    }
  }

  /**   Undoes the editing*/
  undo() {
    if (this.geomGraphEditor.canUndo) {
      const objectsToInvalidate = new Set<Entity>(this.geomGraphEditor.entitiesToBeChangedByUndo())

      this.geomGraphEditor.undo()
      for (const o of objectsToInvalidate) {
        const vo = viewerObj(o)
        if (vo.markedForDragging) {
          this.dragGroup.add(vo)
        } else {
          this.dragGroup.delete(vo)
        }
        this.invalidate(o)
      }
    }
  }

  /**   Redo the editing*/
  redo() {
    if (this.geomGraphEditor.canRedo) {
      const objectsToInvalidate = new Set<Entity>(this.geomGraphEditor.entitiesToBeChangedByRedo())
      this.geomGraphEditor.redo()
      for (const o of objectsToInvalidate) {
        const vo = viewerObj(o)
        if (vo.markedForDragging) {
          this.dragGroup.add(vo)
        } else {
          this.dragGroup.delete(vo)
        }
        this.invalidate(o)
      }
    }
  }

  // //  Clear the editor

  //  Clear() {
  //     this.UnselectEverything();
  // }

  // //  Finds a corner to delete or insert

  // //  <returns>null if a corner is not found</returns>

  // // //  create a tight bounding box for the graph

  // //  FitGraphBoundingBox(graphToFit: IViewerObject) {
  // //     if ((graphToFit != null)) {
  // //         this.geomGraphEditor.FitGraphBoundingBox(graphToFit, (<GeometryGraph>(graphToFit.DrawingObject.GeomObject)));
  // //         this.invalidate();
  // //     }

  // // }

  // // //

  // //  RegisterNodeAdditionForUndo(node: IViewerNode) {
  // //     let undoAction = new AddNodeUndoAction(this.graph, this.viewer, node);
  // //     this.geomGraphEditor.InsertToListAndSetTheBoxBefore(undoAction);
  // // }

  // // //  registers the edge addition for undo

  // //  RegisterEdgeAdditionForUndo(edge: IViewerEdge) {
  // //     this.geomGraphEditor.InsertToListAndSetTheBoxBefore(new AddEdgeUndoAction(this.viewer, edge));
  // // }

  // // //

  // //  RegisterEdgeRemovalForUndo(edge: IViewerEdge) {
  // //     this.geomGraphEditor.InsertToListAndSetTheBoxBefore(new RemoveEdgeUndoAction(this.graph, this.viewer, edge));
  // // }

  // // //

  // //  RegisterNodeForRemoval(node: IViewerNode) {
  // //     this.geomGraphEditor.InsertToListAndSetTheBoxBefore(new RemoveNodeUndoAction(this.viewer, node));
  // // }

  static RectRouting(mode: EdgeRoutingMode): boolean {
    return mode == EdgeRoutingMode.Rectilinear || mode == EdgeRoutingMode.RectilinearToCenter
  }

  // // EnumerateNodeBoundaryCurves(): IterableIterator<ICurve> {
  // //     return from;
  // //     vn;
  // //     this.ViewerNodes();
  // //     let GeomNode: select;
  // //     vn.BoundaryCurve;
  // // }

  // //  ForgetEdgeDragging() {
  // //     if ((this.viewer.Graph == null)) {
  // //         return;
  // //     }

  // //     if (this.DraggingStraightLine()) {
  // //         return;
  // //     }

  // //     if (!LayoutEditor.RectRouting(this.viewer.Graph.LayoutAlgorithmSettings.EdgeRoutingSettings.EdgeRoutingMode)) {
  // //         InteractiveEdgeRouter = null;
  // //         this.looseObstaclesToTheirViewerNodes = null;
  // //     }

  // // }

  //  prepares for edge dragging

  PrepareForEdgeDragging() {
    if (this.viewer.graph == null) {
      return
    }

    if (this.DraggingStraightLine()) {
      return
    }

    const settings = GeomGraph.getGeom(this.viewer.graph).layoutSettings
    if (!LayoutEditor.RectRouting(settings.commonSettings.edgeRoutingSettings.EdgeRoutingMode)) {
      if (this.interactiveEdgeRouter == null) {
        const padding = settings.commonSettings.NodeSeparation / 3
        const loosePadding = 0.65 * padding

        this.interactiveEdgeRouter = InteractiveEdgeRouter.constructorANNN(
          Array.from(this._graph.nodesBreadthFirst).map((n) => (GeomNode.getGeom(n) as GeomNode).boundaryCurve),
          padding,
          loosePadding,
          0,
        )
      }
    }
  }

  // // //  insert a polyline corner at the point befor the prevCorner

  // //  InsertPolylineCorner(point: Point, previousCorner: CornerSite) {
  // //     this.geomGraphEditor.InsertSite(this.SelectedEdge.edge.GeometryEdge, point, previousCorner, this.SelectedEdge);
  // //     this.invalidate(this.SelectedEdge);
  // // }

  // // InsertPolylineCorner() {
  // //     this.geomGraphEditor.InsertSite(this.SelectedEdge.edge.GeometryEdge, this.mouseRightButtonDownPoint, this.cornerInfo.Item1, this.SelectedEdge);
  // //     this.invalidate(this.SelectedEdge);
  // // }

  // // //  delete the polyline corner, shortcut it.

  // //  DeleteCorner(corner: CornerSite) {
  // //     this.geomGraphEditor.DeleteSite(this.SelectedEdge.edge.GeometryEdge, corner, this.SelectedEdge);
  // //     this.invalidate(this.SelectedEdge);
  // //     this.viewer.OnDragEnd([
  // //                 this.SelectedEdge]);
  // // }

  // // DeleteCorner() {
  // //     this.geomGraphEditor.DeleteSite(this.SelectedEdge.edge.GeometryEdge, this.cornerInfo.Item1, this.SelectedEdge);
  // //     this.invalidate(this.SelectedEdge);
  // //     this.viewer.OnDragEnd([
  // //                 this.SelectedEdge]);
  // // }

  mouseMoveInsertEdgeNoButtons(e: PointerEvent) {
    const oldNode: IViewerNode = this.SourceOfInsertedEdge
    if (this.TrySetNodePort(e, this.sourceOfInsertedEdgeWrap, this.sourcePortWrap, this.sourceLoosePolylineWrap)) {
      this.viewer.SetSourcePortForEdgeRouting(this.sourcePortWrap.port.Location)
    } else if (oldNode != null) {
      this.viewer.RemoveSourcePortEdgeRouting()
    }
  }

  mouseMoveInsertEdgeLeftButtonOn(e: PointerEvent) {
    if (this.SourcePort != null) {
      this.setDraggingFlag(e)
      if (this.dragging) {
        const loosePolylineWr: {loosePolyline: Polyline} = {loosePolyline: null}
        if (this.TrySetNodePort(e, this.targetOfInsertedEdgeWrap, this.targetPortWrap, loosePolylineWr)) {
          this.viewer.setTargetPortForEdgeRouting(this.targetPortWrap.port.Location)
          this.drawEdgeInteractivelyToPort(loosePolylineWr.loosePolyline, this.DraggingStraightLine())
        } else {
          this.viewer.RemoveTargetPortEdgeRouting()
          this.DrawEdgeInteractivelyToLocation(e, this.DraggingStraightLine())
        }
      }

      e.preventDefault()
    }
  }

  MouseMoveLiveSelectObjectsForDragging(e: PointerEvent) {
    this.unselectEverything()
    if (LeftMouseIsPressed(e) && (this.viewer.modifierKeys & ModifierKeysEnum.Shift) != ModifierKeysEnum.Shift) {
      this.SelectEntitiesForDraggingWithRectangle(e)
    }
  }

  DrawEdgeInteractivelyToLocation(e: PointerEvent, straightLine: boolean) {
    this.DrawEdgeInteractivelyToLocationP(this.viewer.screenToSource(e), straightLine)
  }

  DrawEdgeInteractivelyToLocationP(point: Point, straightLine: boolean) {
    this.geomEdge = straightLine ? this.getStraightLineEdge(point) : this.CalculateEdgeInteractivelyToLocation(point)
    this.viewer.drawRubberEdge(this.geomEdge)
  }
  getStraightLineEdge(point: Point): GeomEdge {
    const g = new GeomEdge(null)
    g.curve = LineSegment.mkPP(this.SourcePort.Location, point)
    return g
  }

  CalculateEdgeInteractivelyToLocation(location: Point): GeomEdge {
    if (this.interactiveEdgeRouter.SourcePort == null) {
      this.interactiveEdgeRouter.SetSourcePortAndSourceLoosePolyline(this.SourcePort, this.sourceLoosePolylineWrap.loosePolyline)
    }

    return this.interactiveEdgeRouter.RouteEdgeToLocation(location)
  }

  drawEdgeInteractivelyToPort(portLoosePolyline: Polyline, straightLine: boolean) {
    this.geomEdge = straightLine
      ? this.getStraightLineEdge(this.TargetPort.Location)
      : this.CalculateEdgeInteractively(this.TargetPort, portLoosePolyline)
    this.viewer.drawRubberEdge(this.geomEdge)
  }

  DraggingStraightLine(): boolean {
    if (this.viewer.graph == null) {
      return true
    }

    return this.interactiveEdgeRouter != null && this.interactiveEdgeRouter.OverlapsDetected
  }

  CalculateEdgeInteractively(targetPortParameter: Port, portLoosePolyline: Polyline): GeomEdge {
    if (this.interactiveEdgeRouter.SourcePort == null) {
      this.interactiveEdgeRouter.SetSourcePortAndSourceLoosePolyline(this.SourcePort, this.sourceLoosePolylineWrap.loosePolyline)
    }

    let curve: ICurve
    let smoothedPolyline: SmoothedPolyline = null
    if (this.SourceOfInsertedEdge == this.TargetOfInsertedEdge) {
      curve = LineSegment.mkPP(this.SourcePort.Location, this.TargetPort.Location)
    } else {
      const boxedPolyline: {smoothedPolyline: SmoothedPolyline} = {smoothedPolyline: null}
      curve = this.interactiveEdgeRouter.RouteEdgeToPort(targetPortParameter, portLoosePolyline, false, boxedPolyline)
      smoothedPolyline = boxedPolyline.smoothedPolyline
    }

    const ret = new GeomEdge(null)
    ret.curve = curve
    ret.smoothedPolyline = smoothedPolyline
    return ret
  }
}

// //  ScaleNodeAroundCenter(viewerNode: IViewerNode, scale: number) {
// //     let nodePosition = viewerNode.node.BoundingBox.Center;
// //     let scaleMatrix = new PlaneTransformation(scale, 0, 0, 0, scale, 0);
// //     let translateToOrigin = new PlaneTransformation(1, 0, (nodePosition.X * -1), 0, 1, (nodePosition.Y * -1));
// //     let translateToNode = new PlaneTransformation(1, 0, nodePosition.X, 0, 1, nodePosition.Y);
// //     let matrix = (translateToNode
// //                 * (scaleMatrix * translateToOrigin));
// //     viewerNode.node.GeomNode.BoundaryCurve = viewerNode.node.GeomNode.BoundaryCurve.Transform(matrix);
// //     this.invalidate(viewerNode);
// //     for (let edge of viewerNode.OutEdges.Concat(viewerNode.InEdges).Concat(viewerNode.SelfEdges)) {
// //         this.RecoverEdge(edge);
// //     }

// // }

// // RecoverEdge(edge: IViewerEdge) {
// //     let curve = edge.edge.GeometryEdge.UnderlyingPolyline.CreateCurve();
// //     Arrowheads.TrimSplineAndCalculateArrowheads(edge.edge.GeometryEdge, curve, true, this.Graph.LayoutAlgorithmSettings.EdgeRoutingSettings.KeepOriginalSpline);
// //     this.invalidate(edge);
// // }

// // //

// //  DetachNode(node: IViewerNode) {
// //     if ((node == null)) {
// //         return;
// //     }

// //     this.decoratorRemovalsDict.Remove(node);
// //     for (let edge of LayoutEditor.Edges(node)) {
// //         this.RemoveObjDraggingDecorations(edge);
// //     }

// // }
// }
function LeftMouseIsPressed(e: PointerEvent): boolean {
  return (e.buttons & 1) == 1
}
