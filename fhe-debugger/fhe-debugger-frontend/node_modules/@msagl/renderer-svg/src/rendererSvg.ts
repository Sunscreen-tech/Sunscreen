import {DrawingGraph, IViewerEdge, IViewerGraph, IViewerNode, IViewerObject, ModifierKeysEnum} from '@msagl/drawing'
import {
  AttributeRegistry,
  buildRTreeWithInterpolatedEdges,
  Edge,
  EventHandler,
  GeomEdge,
  GeomGraph,
  GeomHitTreeNodeType,
  GeomLabel,
  GeomNode,
  GeomObject,
  getGeomIntersectedObjects,
  Graph,
  PlaneTransformation,
  Point,
  RTree,
  Node,
  Label,
  Entity,
} from '@msagl/core'
import {SvgCreator, SvgViewerObject} from './svgCreator'
import {graphToJSON} from '@msagl/parser'
import {IViewer, LayoutEditor, viewerObj, InsertionMode} from '@msagl/drawing'
import {default as panZoom, PanZoom} from 'panzoom'
import {LayoutOptions, TextMeasurer, layoutGraph, deepEqual} from '@msagl/renderer-common'

function svgViewerObj(ent: Entity): SvgViewerObject {
  return viewerObj(ent) as SvgViewerObject
}
/**
 * This class renders an MSAGL graph with SVG and enables the graph editing.
 */
export class RendererSvg implements IViewer {
  /** debug feature : TODO - redesign */
  rubberEdgeStart: Point
  sourcePortLocatiton: Point
  targetPortLocatiton: Point
  keyDownListener: (e: KeyboardEvent) => void
  container: HTMLElement
  addKeyDownListener(callback: (e: KeyboardEvent) => void): void {
    this.keyDownListener = callback
  }
  mousePosition: Point;
  *entitiesIter(): Iterable<IViewerObject> {
    for (const n of this.graph.nodesBreadthFirst) yield svgViewerObj(n)
    for (const e of this.graph.deepEdges) {
      yield svgViewerObj(e)
      if (e.label) {
        yield svgViewerObj(e.label)
      }
    }
  }
  panZoom: PanZoom

  get smoothedPolylineRadiusWithNoScale(): number {
    return this.Dpi * 0.05
  }
  getInterpolationSlack(): number {
    return this.mouseHitDistance
  }
  /** the distance in inches */
  private mouseHitDistance = 0.05 / 2
  get Dpi(): number {
    return 96 * window.devicePixelRatio
  }

  getHitSlack(): number {
    const dpi = this.Dpi
    const slackInPoints = dpi * this.mouseHitDistance
    return slackInPoints / this.CurrentScale
  }

  layoutEditor: LayoutEditor
  /** The default is true and the value is reset to true after each call to setGraph */
  needCreateGeometry = true
  /** The default is true and the value is reset to true after each call to setGraph */
  needCalculateLayout = true
  getSvgString(): string {
    return this._svgCreator.getSvgString()
  }

  getJSONString(): string {
    if (this.graph == null) return 'no graph'
    return JSON.stringify(graphToJSON(this.graph), null, 2)
  }
  private _graph?: Graph
  private _layoutOptions: LayoutOptions = {}
  private _textMeasurer: TextMeasurer
  private _svgCreator: SvgCreator

  private _objectTree: RTree<GeomHitTreeNodeType, Point>

  // public get objectTree(): RTree<GeomHitTreeNodeType, Point> {
  //   if (this._objectTree == null || this._objectTree.RootNode == null) {
  //     this._objectTree = buildRTreeWithInterpolatedEdges(this.graph, this.getHitSlack())
  //   }
  //   return this._objectTree
  // }
  // public set objectTree(value: RTree<GeomHitTreeNodeType, Point>) {
  //   this._objectTree = value
  // }

  private processMouseMove(e: PointerEvent): void {
    this.mousePosition = new Point(e.clientX, e.clientY)

    if (this == null || this._svgCreator == null) {
      return
    }
    if (!this.layoutEditingEnabled) {
      return
    }

    if (this.layoutEditor.dragging && this.insertingEdge == false) {
      return
    }
    if (this.insertingNode) {
      this._svgCreator.positionNodeInsertionCircle(this.ScreenToSourceP(this.mousePosition.x, this.mousePosition.y))
      return
    }
    if (this.insertingEdge) {
      this._svgCreator.positionEdgeInsertionElement(
        this.ScreenToSourceP(this.mousePosition.x, this.mousePosition.y),
        this.layoutEditor.hasEdgeInsertionPort,
      )
    }

    this.setObjectUnderCursorFromEvent(e)
  }

  setObjectUnderCursorFromEvent(e: PointerEvent) {
    if (this._objectTree == null) {
      this._objectTree = buildRTreeWithInterpolatedEdges(this.graph, this.getHitSlack())
    }
    const elems = Array.from(getGeomIntersectedObjects(this._objectTree, this.getHitSlack(), this.screenToSource(e)))
    if (elems.length == 0) {
      this.objectUnderMouseCursor = null
      return
    }
    sortElems()
    const favorite = elems[0]
    if (favorite instanceof GeomObject) {
      this.objectUnderMouseCursor = favorite.entity.getAttr(AttributeRegistry.ViewerIndex)
    }

    // end of the main function processMouseMove
    function sortElems() {
      elems.sort((a: GeomObject, b: GeomEdge) => {
        const atype = a instanceof GeomGraph ? 3 : a instanceof GeomLabel ? 2 : a instanceof GeomNode ? 1 : 0 // 0 for GeomEdge
        const btype = b instanceof GeomGraph ? 3 : b instanceof GeomLabel ? 2 : b instanceof GeomNode ? 1 : 0 // 0 for GeomEdge
        if (atype != btype) return atype - btype

        if (atype == 2) return 0 // both are GeomLabels

        return depth(b) - depth(a)
        function depth(a: GeomObject) {
          let d = 0
          let p = a.entity.parent
          while (p) {
            d++
            p = p.parent
          }
          return d
        }
      })
    }
  }

  constructor(container: HTMLElement = document.body) {
    this.container = container
    this._textMeasurer = new TextMeasurer()
    this._svgCreator = new SvgCreator(container)
    this._svgCreator.getSmoothedPolylineRadius = () => this.smoothedPolylineCircleRadius

    container.addEventListener('pointerdown', (e) => {
      if (this.layoutEditor.viewerMouseDown(this, e)) {
        this.panZoom.pause()
      }
    })

    container.addEventListener('pointermove', (e) => {
      this.processMouseMove(e)
      if (this.layoutEditingEnabled) this.layoutEditor.viewerMouseMove(this, e)
    })

    container.addEventListener('pointerup', (e) => {
      if (!this.layoutEditingEnabled) return
      this.layoutEditor.viewerMouseUp(this, e)
      if (this.panZoom) this.panZoom.resume()
    })

    this.layoutEditor = new LayoutEditor(this)
  }
  private _insertionMode: InsertionMode
  public get insertionMode(): InsertionMode {
    return this._insertionMode
  }
  public set insertionMode(value: InsertionMode) {
    if (value == this.insertionMode) return

    switch (value) {
      case InsertionMode.Default:
        this._svgCreator.stopNodeInsertion()
        this._svgCreator.stopEdgeInsertion()
        break
      case InsertionMode.Node:
        this._svgCreator.prepareToNodeInsertion(this.ScreenToSourceP(this.mousePosition.x, this.mousePosition.y))
        break
      case InsertionMode.Edge:
        this._svgCreator.prepareToEdgeInsertion(
          this.ScreenToSourceP(this.mousePosition.x, this.mousePosition.y),
          this.layoutEditor.hasEdgeInsertionPort,
        )
        break
      default:
        throw new Error('not implemented')
    }

    this._insertionMode = value
  }
  createUndoPoint(): void {
    this.layoutEditor.createUndoPoint()
  }
  selectedEntities(): IViewerObject[] {
    const ret = Array.from(this.layoutEditor.dragGroup)
    if (this.objectUnderMouseCursor) {
      ret.push(this.objectUnderMouseCursor)
    }
    if (this.layoutEditor.edgeWithSmoothedPolylineExposed) {
      ret.push(this.layoutEditor.edgeWithSmoothedPolylineExposed)
    }
    return ret
  }
  createIViewerNodeNPA(drawingNode: Node, center: Point, visualElement: any): IViewerNode {
    throw new Error('Method not implemented.')
  }
  createIViewerNodeN(node: Node, center: Point): IViewerNode {
    const drawingGraph = this.graph.getAttr(AttributeRegistry.DrawingObjectIndex) as DrawingGraph
    drawingGraph.createNodeGeometry(node, center)
    this._svgCreator.drawNode(node)
    return svgViewerObj(node) as unknown as IViewerNode
  }

  undo(): void {
    this.layoutEditor.undo()
  }

  redo(): void {
    this.layoutEditor.redo()
  }

  viewChangeEvent: EventHandler

  /** when the graph is set : the geometry for it is created and the layout is done */
  setGraph(graph: Graph, options: LayoutOptions = this._layoutOptions) {
    if (this._graph === graph) {
      this.setOptions(options)
    } else {
      this._graph = graph
      this._layoutOptions = options
      this._textMeasurer.setOptions(options.label || {})

      const drawingGraph = <DrawingGraph>DrawingGraph.getDrawingObj(graph) || new DrawingGraph(graph)

      if (this.needCreateGeometry) {
        drawingGraph.createGeometry(this._textMeasurer.measure)
      } else {
        // still need to measure the text sizes
        drawingGraph.measureLabelSizes(this._textMeasurer.measure)
      }

      if (this.needCalculateLayout) {
        layoutGraph(graph, this._layoutOptions, true)
      }

      this._update()
    }
    this.needCalculateLayout = this.needCreateGeometry = true
  }

  setOptions(options: LayoutOptions) {
    const oldLabelSettings = this._layoutOptions.label
    const newLabelSettings = options.label
    const fontChanged = !deepEqual(oldLabelSettings, newLabelSettings)

    this._layoutOptions = options

    if (!this._graph) {
      return
    }

    const drawingGraph = <DrawingGraph>DrawingGraph.getDrawingObj(this._graph)
    if (fontChanged) {
      this._textMeasurer.setOptions(options.label || {})
      drawingGraph.createGeometry(this._textMeasurer.measure)
    }
    const relayout = fontChanged
    layoutGraph(this._graph, this._layoutOptions, relayout)
    this._update()
  }

  private _update() {
    if (!this._graph) return
    this._objectTree = null
    this._svgCreator.setGraph(this._graph)
    if (this.panZoom) {
      this.panZoom.dispose()
    }
    this.panZoom = panZoom(this._svgCreator.superTransGroup, {
      onTouch: () => {
        // `e` - is the current touch event.

        return false // tells the library to not preventDefault.
      },
    })

    this.panZoom.showRectangle(this._svgCreator.getShowRect())
    //   console.log(this._svgCreator.svg.getBoundingClientRect())

    this.layoutEditor.viewerGraphChanged()
    if (this.graph.deepEdgesCount > 2000 && this.graph.nodeCountDeep > 1000) {
      this.layoutEditingEnabled = false
    }
  }
  /** maps the screen coordinates to the graph coordinates */
  screenToSource(e: PointerEvent): Point {
    return this.ScreenToSourceP(e.clientX, e.clientY)
  }

  /** maps the screen coordinates to the graph coordinates */
  private ScreenToSourceP(x: number, y: number): Point {
    // m is the reverse mapping : that is the mapping from the graph coords to the client's
    const m = this._svgCreator.getTransform()
    return m.inverse().multiplyPoint(new Point(x, y))
  }
  IncrementalDraggingModeAlways = false
  get CurrentScale(): number {
    return this._svgCreator.getScale()
  }

  needToCalculateLayout: boolean
  GraphChanged: EventHandler = new EventHandler()

  _objectUnderMouse: IViewerObject

  objectUnderMouseCursorChanged: EventHandler = new EventHandler()
  get objectUnderMouseCursor(): IViewerObject {
    return this._objectUnderMouse
  }
  set objectUnderMouseCursor(value) {
    if (this._objectUnderMouse !== value) {
      this._objectUnderMouse = value
      // if (value) {
      //   console.log(this._objectUnderMouse.entity)
      // } else {
      //   if (this.layoutEditor.insertingEdge) {
      //     console.log('no selection')
      //   } else {
      //     console.log('no sel: no insert')
      //   }
      // }
    }
  }
  invalidate(objectToInvalidate: IViewerObject): void {
    //  console.log('invalidate', objectToInvalidate.entity)
    this._objectTree = null
    if (this.graph !== objectToInvalidate.entity && isRemoved(objectToInvalidate.entity)) {
      const svgElem = (objectToInvalidate.entity.getAttr(AttributeRegistry.ViewerIndex) as SvgViewerObject).svgData
      svgElem.remove()
    } else if (this.graph == objectToInvalidate.entity) {
      this.panZoom.showRectangle(this._svgCreator.getShowRect())
    } else {
      this._svgCreator.invalidate(objectToInvalidate)
    }
  }
  invalidateAll(): void {
    //TODO : implement
  }
  modifierKeys = ModifierKeysEnum.None
  get entities(): Iterable<IViewerObject> {
    return this.entitiesIter()
  }

  get DpiX() {
    return this.Dpi
  }
  get DpiY() {
    return this.Dpi
  }
  LineThicknessForEditing = 2
  /** controls if the layout can be changed by mouse or touch interactions */
  layoutEditingEnabled = true
  private get insertingNode() {
    return this.insertionMode == InsertionMode.Node
  }
  private get insertingEdge() {
    return this.insertionMode == InsertionMode.Edge
  }
  PopupMenus(menuItems: [string, () => void][]): void {
    throw new Error('Method not implemented.')
  }
  get smoothedPolylineCircleRadius(): number {
    return this.smoothedPolylineRadiusWithNoScale / this.CurrentScale
  }

  addEdge(edge: IViewerEdge, registerForUndo: boolean): void {
    this._objectTree = null
    if (registerForUndo) this.layoutEditor.registerAdd(edge.entity)
  }
  createEdgeWithGivenGeometry(edge: Edge): IViewerEdge {
    this._svgCreator.drawEdge(edge)
    return svgViewerObj(edge) as unknown as IViewerEdge
  }
  addNode(node: IViewerNode, registerForUndo: boolean): void {
    this._objectTree = null
    if (registerForUndo) {
      this.layoutEditor.registerAdd(node.entity)
    }
  }

  remove(viewerObj: IViewerObject, registerForUndo: boolean): void {
    const ent = viewerObj.entity
    this._objectTree = null
    if (registerForUndo) this.layoutEditor.registerDelete(ent)
    if (this.objectUnderMouseCursor === viewerObj) {
      this.objectUnderMouseCursor = null
    }

    const svgVO = viewerObj as SvgViewerObject
    svgVO.svgData.remove()
    this.layoutEditor.forget(viewerObj)
    if (ent instanceof Graph) {
      this.removeSubgraph(ent)
    } else {
      this.removeForNonSubgraph(ent, registerForUndo)
    }
  }

  private removeForNonSubgraph(ent: Entity, registerForUndo: boolean) {
    if (ent instanceof Node) {
      if (registerForUndo) {
        for (const e of ent.edges) {
          this.layoutEditor.registerDelete(e)
          if (e.label) this.layoutEditor.registerDelete(e.label)
        }
      }
      const graph = ent.parent as Graph
      graph.removeNode(ent)

      for (const e of ent.edges) {
        removeEdge(e)
      }
    } else if (ent instanceof Edge) {
      ent.remove()
      if (registerForUndo) if (ent.label) this.layoutEditor.registerDelete(ent.label)
      removeEdge(ent)
    } else if (ent instanceof Label) {
      const edge = ent.parent as Edge
      edge.label = null
    }
  }

  private removeSubgraph(subgraph: Graph) {
    const elems = Array.from(subgraph.allElements())
    for (const e of elems) {
      svgViewerObj(e).svgData.remove()
    }
    subgraph.removeSubgraph()

    // we do net need to change the subgraph structure: just to remove all the visuals
    for (const e of elems) {
      const ve = svgViewerObj(e).svgData
      ve.remove()
      if (e instanceof Edge && e.label) {
        svgViewerObj(e.label).svgData.remove()
      }
    }
  }

  RouteEdge(drawingEdge: Edge): IViewerEdge {
    throw new Error('Method not implemented.')
  }
  ViewerGraph: IViewerGraph
  ArrowheadLength: number
  SetSourcePortForEdgeRouting(portLocation: Point): void {
    this.sourcePortLocatiton = portLocation
  }
  setTargetPortForEdgeRouting(portLocation: Point): void {
    this.targetPortLocatiton = portLocation
  }
  RemoveSourcePortEdgeRouting(): void {
    //throw new Error('Method not implemented.')
  }
  RemoveTargetPortEdgeRouting(): void {
    // throw new Error('Method not implemented.')
  }
  drawRubberEdge(edgeGeometry: GeomEdge): void {
    this._svgCreator.drawRubberEdge(edgeGeometry)
  }
  stopDrawingRubberEdge(): void {
    this._svgCreator.removeRubberEdge()
  }
  get graph(): Graph {
    return this._graph
  }

  get Transform(): PlaneTransformation {
    return this._svgCreator.getTransform()
  }
}
function removeEdge(e: Edge) {
  e.remove()
  svgViewerObj(e).svgData.remove()
  if (e.label) {
    svgViewerObj(e.label).svgData.remove()
  }
}

function isRemoved(entity: Entity): boolean {
  if (entity instanceof Edge) {
    if (entity.source !== entity.target) {
      if (!entity.source.outEdges.has(entity)) return true
      if (!entity.target.inEdges.has(entity)) return true
      return nodeIsRemoved(entity.source) || nodeIsRemoved(entity.target)
    } else return !entity.source.selfEdges.has(entity) || nodeIsRemoved(entity.source)
  }

  if (entity instanceof Node) {
    return nodeIsRemoved(entity)
  }
  if (entity instanceof Label) {
    if (entity.parent == null) return true
    return isRemoved(entity.parent)
  }
  return false
  /** the only proof that the node is removed is
   * a) the node has a valid parent
   * and
   * b) the parent does not have the node in its node collection
   * or a) and be hods for one of the node ancestors
   *
   **/
  function nodeIsRemoved(node: Node): boolean {
    let parent = node.parent as Graph
    while (parent) {
      if (parent.findNode(node.id) !== node) return true
      node = parent
      parent = parent.parent as Graph
    }
    return false
  }
}
