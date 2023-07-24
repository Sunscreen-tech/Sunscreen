//      the editor of a graph() layout
import {SortedMap} from '@esfx/collections-sortedmap'
import {IncrementalDragger} from './incrementalDragger'
import {IViewerNode} from './iViewerNode'
import {UndoList} from './undoRedoActionsList'
import {
  RelativeFloatingPort,
  StraightLineEdges,
  EdgeLabelPlacement,
  RectilinearInteractiveEditor,
  Point,
  Entity,
  GeomEdge,
  GeomGraph,
  GeomObject,
  ILayoutSettings,
  EdgeRoutingMode,
  GeomLabel,
  Curve,
  LineSegment,
  GeomNode,
  SplineRouter,
  Arrowhead,
  AttributeRegistry,
  Assert,
  ICurve,
  SmoothedPolyline,
  CornerSite,
  IntersectionInfo,
  PointLocation,
} from '@msagl/core'

export enum DraggingMode {
  Incremental,
  Default,
}
export class GeometryGraphEditor {
  updateDeltaForDragUndo(delta: Point) {
    this.undoList.updateDeltaForDragUndo(delta)
  }
  registerDelete(entity: Entity) {
    this.undoList.registerDelete(entity)
  }
  registerAdd(entity: Entity) {
    this.undoList.registerAdd(entity)
  }
  *entitiesToBeChangedByRedo(): IterableIterator<Entity> {
    yield* this.undoList.entitiesToBeChangedByRedo()
  }
  *entitiesToBeChangedByUndo(): IterableIterator<Entity> {
    yield* this.undoList.entitiesToBeChangedByUndo()
  }

  createUndoPoint() {
    this.undoList.createUndoPoint()
  }

  private edgesToReroute: Set<GeomEdge> = new Set<GeomEdge>()

  graph: () => GeomGraph

  private objectsToDrag: Set<GeomObject> = new Set<GeomObject>()

  private undoList: UndoList = new UndoList()

  incrementalDragger: IncrementalDragger
  /**      return the current undo action*/

  public get LayoutSettings(): ILayoutSettings {
    return this.graph().layoutSettings
  }

  protected get EdgeRoutingMode(): EdgeRoutingMode {
    return this.LayoutSettings.commonSettings.edgeRoutingSettings.EdgeRoutingMode
  }

  //      The edge data of the edge selected for editing
  geomEdgeWithSmoothedPolylineExposed: GeomEdge

  /**  returns true if "undo" is available */
  public get canUndo(): boolean {
    return this.undoList.canUndo()
  }

  /**  returns true if "redo" is available*/
  public get canRedo(): boolean {
    return this.undoList.canRedo()
  }

  static calculateAttachmentSegment(label: GeomLabel) {
    const edge = <GeomEdge>GeomObject.getGeom(label.parent.entity)
    if (edge != null) {
      GeometryGraphEditor.CalculateAttachedSegmentEnd(label, edge)
      if (!Point.closeDistEps(label.attachmentSegmentEnd, label.center)) {
        const x: IntersectionInfo = Curve.intersectionOne(
          label.boundingBox.perimeter(),
          LineSegment.mkPP(label.attachmentSegmentEnd, label.center),
          false,
        )
        label.attachmentSegmentStart = x != null ? x.x : label.center
      } else {
        label.attachmentSegmentStart = label.center
      }
    }
  }

  static CalculateAttachedSegmentEnd(label: GeomLabel, edge: GeomEdge) {
    label.attachmentSegmentEnd = edge.curve.value(edge.curve.closestParameter(label.center))
  }

  /** drags elements by the delta,
   * and return the array of entities with the changed geometry
   *
   */

  drag(delta: Point, draggingMode: DraggingMode, lastMousePosition: Point) {
    if (delta.x == 0 && delta.y == 0) return
    for (const o of this.objectsToDrag) {
      this.registerForUndoDrag(o.entity)
    }
    if (this.geomEdgeWithSmoothedPolylineExposed == null) {
      if (this.EdgeRoutingMode !== EdgeRoutingMode.Rectilinear && this.EdgeRoutingMode !== EdgeRoutingMode.RectilinearToCenter) {
        this.dragObjectsForNonRectilinearCase(delta, draggingMode)
      } else {
        this.DragObjectsForRectilinearCase(delta)
      }
    } else {
      // this.EditedEdge != null
      this.dragPolylineCorner(lastMousePosition, delta)
    }
  }
  registerForUndoDrag(entity: Entity) {
    this.undoList.registerForUndoDrag(entity)
  }

  DragObjectsForRectilinearCase(delta: Point): Array<Entity> {
    for (const node of this.objectsToDrag) {
      if (node instanceof GeomNode) {
        node.translate(delta)
      }
    }

    RectilinearInteractiveEditor.CreatePortsAndRouteEdges(
      this.LayoutSettings.commonSettings.NodeSeparation / 3,
      1,
      this.graph().nodesBreadthFirst,
      this.graph().deepEdges,
      this.LayoutSettings.commonSettings.edgeRoutingSettings.EdgeRoutingMode,
    )
    EdgeLabelPlacement.constructorG(this.graph()).run()

    // for (const e of this.geomGraph.deepEdges) {
    //   this.UpdateGraphBoundingBoxWithCheck(e)
    // }

    // for (const n of this.geomGraph.deepNodes) {
    //   this.UpdateGraphBoundingBoxWithCheck(n)
    // }

    this.propagateChangesToClusterParents()
    throw new Error('not implemented')
  }

  dragObjectsForNonRectilinearCase(delta: Point, draggingMode: DraggingMode) {
    if (draggingMode === DraggingMode.Incremental) {
      this.DragIncrementally(delta)
    } else if (
      false && //debug - not implemented yet! TODO
      (this.EdgeRoutingMode === EdgeRoutingMode.Spline || this.EdgeRoutingMode === EdgeRoutingMode.SplineBundling)
    ) {
      this.DragWithSplinesOrBundles(delta)
    } else {
      this.dragWithStraightLines(delta)
    }
  }

  dragWithStraightLines(delta: Point) {
    for (const geomObj of this.objectsToDrag) {
      if (geomObj instanceof GeomGraph) {
        geomObj.deepTranslate(delta)
      } else {
        geomObj.translate(delta)
      }
    }

    this.propagateChangesToClusterParents()
    this.routeEdgesAsStraightLines()
  }

  propagateChangesToClusterParents() {
    const touchedWithChangedBorder = new Set<GeomGraph>()
    for (const n of this.objectsToDrag) {
      if (n instanceof GeomNode === false) continue
      const geomNode = n as GeomNode
      for (const c of geomNode.node.getAncestors()) {
        const gc = GeomObject.getGeom(c)
        if (gc !== this.graph() && !this.objectsToDrag.has(gc)) {
          touchedWithChangedBorder.add(gc as GeomGraph)
        }
      }
    }

    if (touchedWithChangedBorder.size > 0) {
      for (const c of this.graph().subgraphsDepthFirst) {
        const gc = c as GeomGraph
        if (touchedWithChangedBorder.has(gc)) {
          const newBox = gc.getPumpedGraphWithMarginsBox()
          if (!newBox.equalEps(gc.boundingBox)) {
            this.registerForUndo(gc.entity)
            for (const e of gc.selfEdges()) {
              this.addToEdgesToReroute(e)
            }
            for (const e of gc.inEdges()) {
              this.addToEdgesToReroute(e)
            }
            for (const e of gc.outEdges()) {
              this.addToEdgesToReroute(e)
            }

            gc.boundingBox = newBox
          }
        }
      }
    }
  }
  addToEdgesToReroute(e: GeomEdge) {
    //    Assert.assert(!this.bothEndsInDragObjects(e))
    this.edgesToReroute.add(e)
  }
  //bothEndsInDragObjects(e: GeomEdge) {
  //  return this.objectsToDrag.has(e.source) && this.objectsToDrag.has(e.target)
  //}

  DragWithSplinesOrBundles(delta: Point) {
    for (const geomObj of this.objectsToDrag) {
      if (geomObj instanceof GeomNode) {
        geomObj.translate(delta)
      }
    }

    this.RunSplineRouterAndPutLabels()
  }

  RunSplineRouterAndPutLabels() {
    const router = SplineRouter.mk5(
      this.graph(),
      this.LayoutSettings.commonSettings.edgeRoutingSettings.Padding,
      this.LayoutSettings.commonSettings.edgeRoutingSettings.PolylinePadding,
      this.LayoutSettings.commonSettings.edgeRoutingSettings.ConeAngle,
      this.LayoutSettings.commonSettings.edgeRoutingSettings.bundlingSettings,
    )
    router.run()
    const elp = EdgeLabelPlacement.constructorG(this.graph())
    elp.run()
  }

  registerForUndo(e: Entity) {
    this.undoList.registerForUndo(e)
  }

  routeEdgesAsStraightLines() {
    for (const edge of this.edgesToReroute) {
      this.registerForUndo(edge.entity)
      StraightLineEdges.CreateSimpleEdgeCurveWithUnderlyingPolyline(edge)
      if (edge.label) {
        this.registerForUndo(edge.edge.label)
      }
    }

    const ep = EdgeLabelPlacement.constructorGA(this.graph(), Array.from(this.edgesToReroute))
    ep.run()
  }

  // UpdateGraphBoundingBoxWithCheck_() {
  //   for (const node of this.graph().shallowNodes) {
  //     // shallow or deep?
  //     this.UpdateGraphBoundingBoxWithCheck(node)
  //   }

  //   for (const edge of this.graph().edges()) {
  //     // shallow or deep?
  //     this.UpdateGraphBoundingBoxWithCheck(edge)
  //   }
  // }

  DragIncrementally(delta: Point) {
    if (this.incrementalDragger == null) {
      this.InitIncrementalDragger()
    }

    this.incrementalDragger.Drag(delta)
  }

  dragPolylineCorner(lastMousePosition: Point, delta: Point) {
    const site: CornerSite = GeometryGraphEditor.findClosestCornerForEdit(
      this.geomEdgeWithSmoothedPolylineExposed.smoothedPolyline,
      lastMousePosition,
    )
    site.point = site.point.add(delta)

    if (site.prev == null) {
      pullSiteToTheNode(this.geomEdgeWithSmoothedPolylineExposed.source, site)
    } else if (site.next == null) {
      pullSiteToTheNode(this.geomEdgeWithSmoothedPolylineExposed.target, site)
    }

    GeometryGraphEditor.createCurveOnChangedPolyline(this.geomEdgeWithSmoothedPolylineExposed)
  }

  static dragEdgeWithSite(delta: Point, e: GeomEdge, site: CornerSite) {
    site.point = site.point.add(delta)
    GeometryGraphEditor.createCurveOnChangedPolyline(e)
  }

  static createCurveOnChangedPolyline(e: GeomEdge) {
    const curve: Curve = e.smoothedPolyline.createCurve()

    if (!Arrowhead.trimSplineAndCalculateArrowheadsII(e, e.source.boundaryCurve, e.target.boundaryCurve, curve, false)) {
      Arrowhead.createBigEnoughSpline(e)
    }

    e.sourcePort = new RelativeFloatingPort(
      () => e.source.boundaryCurve,
      () => e.source.center,
      edgeStart().sub(e.source.center),
    )
    e.targetPort = new RelativeFloatingPort(
      () => e.target.boundaryCurve,
      () => e.target.center,
      edgeEnd().sub(e.target.center),
    )
    function edgeStart(): Point {
      return e.sourceArrowhead ? e.sourceArrowhead.tipPosition : e.curve.start
    }
    function edgeEnd(): Point {
      return e.targetArrowhead ? e.targetArrowhead.tipPosition : e.curve.end
    }
  }

  prepareForObjectDragging(markedObjects: Iterable<GeomObject>, dragMode: DraggingMode) {
    this.geomEdgeWithSmoothedPolylineExposed = null
    this.calculateObjectToDragAndEdgesToReroute(markedObjects)
    this.undoList.createUndoPoint()
    if (dragMode === DraggingMode.Incremental) {
      this.InitIncrementalDragger()
    }
  }

  PrepareForClusterCollapseChange(changedClusters: Iterable<IViewerNode>) {
    throw new Error('not implemented')
    // this.InsertToListAndSetTheBoxBefore(new ClustersCollapseExpandUndoRedoAction(this.graph()))
    // for (const iCluster of changedClusters) {
    //   throw new Error('not implemented') // this.CurrentUndoAction.AddAffectedObject(iCluster) //
    // }
  }

  InitIncrementalDragger() {
    this.incrementalDragger = new IncrementalDragger(
      Array.from(this.objectsToDrag).filter((o) => o instanceof GeomNode) as Array<GeomNode>,
      this.graph(),
      this.LayoutSettings,
    )
  }

  clearDraggedSets() {
    this.objectsToDrag.clear()
    this.edgesToReroute.clear()
  }

  private addToObjectsToDrag(geomObj: GeomObject) {
    this.objectsToDrag.add(geomObj)
  }

  /** fills the fields objectsToDrag, edgesToDrag */
  calculateObjectToDragAndEdgesToReroute(markedObjects: Iterable<GeomObject>) {
    this.clearDraggedSets()
    for (const geometryObject of markedObjects) {
      this.addToObjectsToDrag(geometryObject)
      const isEdge = geometryObject instanceof GeomEdge
      if (isEdge) {
        this.addToObjectsToDrag((geometryObject as GeomEdge).source)
        this.addToObjectsToDrag((geometryObject as GeomEdge).target)
      }
    }

    this.removeClusterSuccessorsFromObjectsToDrag()
    this.calculateDragSetsForEdges()
  }

  removeClusterSuccessorsFromObjectsToDrag() {
    const listToRemove = new Array<GeomObject>()
    for (const node of this.objectsToDrag) {
      if (this.hasAncestorInObjectsToDrag(node)) listToRemove.push(node)
    }

    for (const node of listToRemove) {
      this.objectsToDrag.delete(node)
    }
  }

  // UpdateGraphBoundingBoxWithCheck(geomObj: GeomObject) {
  //   const bBox = geomObj.boundingBox.clone()
  //   const leftTop = new Point(-this.geomGraph.margins.left, this.geomGraph.margins.top)
  //   const rightBottom = new Point(-this.geomGraph.margins.right, -this.geomGraph.margins.bottom)
  //   const bounds = this.geomGraph.boundingBox.clone()
  //   this.GraphBoundingBoxGetsExtended ||=
  //     bounds.addWithCheck(bBox.leftTop.add(leftTop)) || bounds.addWithCheck(bBox.rightBottom.add(rightBottom))
  //   this.geomGraph.boundingBox = bounds
  // }

  calculateDragSetsForEdges() {
    // copy this.objectsToDrag to an array because new entities might be added to it
    for (const geomObj of Array.from(this.objectsToDrag)) {
      if (geomObj instanceof GeomGraph) {
        this.addGeomGraphEdgesToRerouteOrDrag(geomObj)
      } else if (geomObj instanceof GeomNode) {
        this.addNodeEdgesToRerouteOrDrag(geomObj as GeomNode)
      } else if (geomObj instanceof GeomEdge && geomObj.edge.label) {
        this.addToObjectsToDrag(geomObj.edge.label.getAttr(AttributeRegistry.GeomObjectIndex))
      }
    }
  }

  private addNodeEdgesToRerouteOrDrag(node: GeomNode) {
    Assert.assert(node instanceof GeomGraph == false)
    for (const edge of node.selfEdges()) {
      this.addToObjectsToDrag(edge)
    }

    for (const edge of node.inEdges()) {
      if (this.hasSelfOrAncestorInObjectsToDrag(edge.source)) {
        // has to drag
        this.addToObjectsToDrag(edge)
      } else {
        this.addToEdgesToReroute(edge)
      }
    }

    for (const edge of node.outEdges()) {
      if (this.hasSelfOrAncestorInObjectsToDrag(edge.target)) {
        // has to drag
        this.addToObjectsToDrag(edge)
      } else {
        this.addToEdgesToReroute(edge)
      }
    }
    if (node instanceof GeomGraph)
      for (const n of node.nodesBreadthFirst) {
        this.addNodeEdgesToRerouteOrDrag(n)
      }
  }
  private addGeomGraphEdgesToRerouteOrDrag(subg: GeomGraph) {
    Assert.assert(subg instanceof GeomGraph)
    for (const edge of subg.selfEdges()) {
      this.addToObjectsToDrag(edge)
    }

    for (const edge of subg.inEdges()) {
      if (subg.isAncestor(edge.source)) continue
      if (this.hasSelfOrAncestorInObjectsToDrag(edge.source)) {
        this.addToObjectsToDrag(edge)
      } else {
        this.addToEdgesToReroute(edge)
      }
    }

    for (const edge of subg.outEdges()) {
      if (subg.isAncestor(edge.target)) continue
      if (this.hasSelfOrAncestorInObjectsToDrag(edge.target)) {
        // has to drag
        this.addToObjectsToDrag(edge)
      } else {
        this.addToEdgesToReroute(edge)
      }
    }
    for (const n of subg.nodesBreadthFirst) {
      for (const e of n.outEdges()) {
        const target = e.target
        if (subg.isAncestor(target)) continue
        if (this.hasSelfOrAncestorInObjectsToDrag(target)) this.addToObjectsToDrag(e)
        else this.addToEdgesToReroute(e)
      }
      for (const e of n.inEdges()) {
        const source = e.source
        if (subg.isAncestor(source)) continue
        if (this.hasSelfOrAncestorInObjectsToDrag(source)) this.addToObjectsToDrag(e)
        else this.addToEdgesToReroute(e)
      }
    }
  }
  /** returns true iff the edge is under a cluster belonging to this.objectsToDrag */

  private hasSelfOrAncestorInObjectsToDrag(ent: GeomObject) {
    while (ent) {
      if (this.objectsToDrag.has(ent)) return true
      ent = ent.parent
    }
    return false
  }

  private hasAncestorInObjectsToDrag(ent: GeomObject) {
    ent = ent.parent
    while (ent) {
      if (this.objectsToDrag.has(ent)) return true
      ent = ent.parent
    }
    return false
  }

  static CalculateMiddleOffsetsForMultiedge(
    multiedge: Array<GeomEdge>,
    node: GeomNode,
    offsetsInsideOfMultiedge: Map<GeomEdge, number>,
    nodeSeparation: number,
  ) {
    const middleAngles = GeometryGraphEditor.GetMiddleAnglesOfMultiedge(multiedge, node)
    const edges = Array.from(middleAngles.values()) // the edges should be sorted here

    const separation: number = nodeSeparation * 6
    const k: number = edges.length / 2
    const even: boolean = k * 2 === edges.length
    let off: number
    if (even) {
      off = -(separation / 2)
      for (let j: number = k - 1; j >= 0; j--) {
        const edge: GeomEdge = edges[j]
        offsetsInsideOfMultiedge.set(edge, off)
        off -= separation + (edge.label ? edge.label.width : 0)
      }

      off = separation / 2
      for (let j: number = k; j < edges.length; j++) {
        const edge: GeomEdge = edges[j]
        offsetsInsideOfMultiedge.set(edge, off)
        off += separation + (edge.label ? edge.label.width : 0)
      }
    } else {
      off = 0
      for (let j: number = k; j >= 0; j--) {
        const edge: GeomEdge = edges[j]
        offsetsInsideOfMultiedge.set(edge, off)
        off = separation + (edge.label ? edge.label.width : 0)
      }

      off = separation
      for (let j: number = k + 1; j < edges.length; j++) {
        const edge: GeomEdge = edges[j]
        offsetsInsideOfMultiedge.set(edge, off)
        off += separation + (edge.label ? edge.label.width : 0)
      }
    }
  }

  static GetMiddleAnglesOfMultiedge(multiedge: Array<GeomEdge>, node: GeomNode): SortedMap<number, GeomEdge> {
    const ret = new SortedMap<number, GeomEdge>()
    const firstEdge: GeomEdge = multiedge[0]
    const a: Point = node.center
    const b: Point = GeometryGraphEditor.Middle(firstEdge.curve)
    ret.set(0, firstEdge)
    for (let i = 1; i < multiedge.length; i++) {
      const edge: GeomEdge = multiedge[i]
      const c: Point = GeometryGraphEditor.Middle(edge.curve)
      let angle: number = Point.anglePCP(b, a, c)
      if (angle > Math.PI) {
        angle -= Math.PI * 2
      }

      ret.set(angle, edge)
    }

    return ret
  }

  static Middle(iCurve: ICurve): Point {
    return iCurve.value(0.5 * iCurve.parStart + 0.5 * iCurve.parEnd)
  }

  static *GetMultiEdges(node: GeomNode): IterableIterator<Array<GeomEdge>> {
    const nodeToMultiEdge = new Map<GeomNode, Array<GeomEdge>>()
    for (const edge of node.outEdges()) {
      GeometryGraphEditor.GetOrCreateListOfMultiedge(nodeToMultiEdge, edge.target).push(edge)
    }

    for (const edge of node.inEdges()) {
      GeometryGraphEditor.GetOrCreateListOfMultiedge(nodeToMultiEdge, edge.source).push(edge)
    }

    for (const list of nodeToMultiEdge.values()) {
      if (list.length > 1) {
        yield list
      }
    }
  }

  static GetOrCreateListOfMultiedge(nodeToMultiEdge: Map<GeomNode, Array<GeomEdge>>, node: GeomNode): Array<GeomEdge> {
    let ret = nodeToMultiEdge.get(node)
    if (ret) return ret
    nodeToMultiEdge.set(node, (ret = []))
    return ret
  }

  prepareForGeomEdgeChange(geometryEdge: GeomEdge) {
    Assert.assert(this.geomEdgeWithSmoothedPolylineExposed === geometryEdge)
    this.createUndoPoint()
    this.registerForUndo(geometryEdge.edge)
  }

  //      Undoes the last editing.

  public undo() {
    this.undoList.undo()
  }
  // createRedoActionIfNeeded() {
  //   const currentUndo = this.undoList.currentUndo
  //   if (currentUndo.Next != null) return
  //   let action: UndoRedoAction
  //   if (currentUndo instanceof ObjectDragUndoRedoAction) {
  //     action = new ObjectDragUndoRedoAction(currentUndo.geomGraph)
  //   } else {
  //     action = null
  //     throw new Error('not implemented')
  //   }
  //   currentUndo.Next = action
  //   action.Previous = currentUndo
  //   for (const e of currentUndo.EditedObjects) {
  //     action.addRestoreData(e, getRestoreData(e))
  //   }
  // }

  //      redo the dragging

  public redo() {
    this.undoList.redo()
  }

  //      clear the editor

  public clear() {
    this.objectsToDrag = new Set<GeomObject>()
    this.edgesToReroute.clear()
    this.undoList = new UndoList()
  }

  //      gets the enumerator pointing to the polyline corner before the point

  public static getPreviousCornerSite(edge: GeomEdge, point: Point): CornerSite {
    let prevSite: CornerSite = edge.smoothedPolyline.headSite
    let nextSite: CornerSite = prevSite.next
    for (; nextSite != null; ) {
      if (GeometryGraphEditor.betweenSites(prevSite, nextSite, point)) {
        return prevSite
      }

      prevSite = nextSite
      nextSite = nextSite.next
    }

    return null
  }

  static betweenSites(prevSite: CornerSite, nextSite: CornerSite, point: Point): boolean {
    const par: number = LineSegment.closestParameterOnLineSegment(point, prevSite.point, nextSite.point)
    return par > 0.1 && par < 0.9
  }

  //      insert a polyline corner

  insertSite(edge: GeomEdge, point: Point, siteBeforeInsertion: CornerSite) {
    this.prepareForGeomEdgeChange(edge)
    // creating the new site
    const s = CornerSite.mkSiteSPS(siteBeforeInsertion, point, siteBeforeInsertion.next)
    GeometryGraphEditor.dragEdgeWithSite(new Point(0, 0), edge, s)
  }

  //      deletes the polyline corner

  deleteSite(edge: GeomEdge, site: CornerSite) {
    this.prepareForGeomEdgeChange(edge)
    Assert.assert(this.geomEdgeWithSmoothedPolylineExposed === edge)
    site.prev.next = site.next
    // removing the site from the list
    site.next.prev = site.prev
    // recalculate the edge geometry  in a correct way
    GeometryGraphEditor.dragEdgeWithSite(new Point(0, 0), edge, site.prev)
  }

  //      finds the polyline corner near the mouse position

  static findClosestCornerForEdit(sp: SmoothedPolyline, mousePoint: Point, minDist: number = Number.POSITIVE_INFINITY): CornerSite {
    if (minDist !== Number.POSITIVE_INFINITY) {
      minDist *= minDist
    }
    let site = sp.headSite
    let bestSite = site
    let dist = bestSite.point.sub(mousePoint).lengthSquared
    while (site.next != null) {
      site = site.next
      const d = mousePoint.sub(site.point).lengthSquared
      if (d < dist) {
        bestSite = site
        dist = d
      }
    }
    if (dist > minDist) return null
    return bestSite
  }

  ReactOnViewChange() {
    //this.LayoutSettings.Interactor.RunOnViewChange();
  }

  ForgetDragging() {
    this.incrementalDragger = null
  }
}
function pullSiteToTheNode(node: GeomNode, site: CornerSite) {
  const bc = node.boundaryCurve
  const location = Curve.PointRelativeToCurveLocation(site.point, bc)
  if (location != PointLocation.Outside) return

  const ls = LineSegment.mkPP(node.center, site.point)
  const x = Curve.intersectionOne(ls, bc, false)
  if (x) {
    site.point = x.x
  }
}
