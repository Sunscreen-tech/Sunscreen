/**   the interface for the viewer for editing the graph layout, and the graph */

import {Edge, EventHandler, GeomEdge, Graph, PlaneTransformation, Point, Node} from '@msagl/core'
import {IViewerEdge} from './iViewerEdge'
import {IViewerGraph} from './iViewerGraph'
import {IViewerNode} from './iViewerNode'
import {IViewerObject} from './iViewerObject'
import {ModifierKeysEnum} from './modifierKeys'
export enum InsertionMode {
  Default,
  Node,
  Edge,
}
export interface IViewer {
  setObjectUnderCursorFromEvent(e: PointerEvent): unknown
  /** creates an undo action to the current state */
  createUndoPoint(): void
  /** returns the array of the entities that are currently selected */
  selectedEntities(): Array<IViewerObject>
  /** maps a point in the screen coordinates to the point in the graph coordinates*/
  screenToSource(e: PointerEvent): Point
  IncrementalDraggingModeAlways: boolean

  //  the scale to screen

  CurrentScale: number

  /** Creates a visual element for the node, and the corresponding geometry node is created according
   *  to the size of the visual element.  If the latter is not null then the node width and the node
   *  height will be taken from the visual element.
   * Returns IViewerNode.
   */
  createIViewerNodeNPA(drawingNode: Node, center: Point, visualElement: any): IViewerNode

  //  creates a default visual element for the node

  //  <returns></returns>
  createIViewerNodeN(drawingNode: Node, center: Point): IViewerNode

  /**  if set to true the Graph geometry is unchanged after the assignment viewer.Graph=graph; */

  needToCalculateLayout: boolean

  //  the viewer signalls that the view, the transform or the viewport, has changed

  viewChangeEvent: EventHandler

  //  the event raised at a time when ObjectUnderMouseCursor changes

  objectUnderMouseCursorChanged: EventHandler

  /** Returns the object under the cursor and null if there is none */
  objectUnderMouseCursor: IViewerObject

  //  forcing redraw of the object

  invalidate(objectToInvalidate: IViewerObject): void

  //  invalidates everything

  invalidateAll(): void

  //  returns modifier keys; control, shift, or alt are pressed at the moments

  modifierKeys: ModifierKeysEnum

  //  gets all entities which can be manipulated by the viewer

  entities: Iterable<IViewerObject>

  //  number of dots per inch in x direction

  DpiX: number

  //  number of dots per inch in y direction

  DpiY: number

  //  The scale dependent width of an edited curve that should be clearly visible.
  //  Used in the default entity editing.

  LineThicknessForEditing: number

  //  enables and disables the default editing of the viewer

  layoutEditingEnabled: boolean

  insertionMode: InsertionMode

  //  Pops up a pop up menu with a menu item for each couple, the string is the title and the delegate is the callback

  PopupMenus(menuItems: Array<[string, () => void]>): void

  //  The radius of the circle drawn around a polyline corner

  smoothedPolylineCircleRadius: number

  //  gets or sets the graph

  graph: Graph

  addEdge(edge: IViewerEdge, registerForUndo: boolean): void

  //  drawing edge already has its geometry in place

  //  <returns></returns>
  createEdgeWithGivenGeometry(drawingEdge: Edge): IViewerEdge

  //  adds a node to the viewer graph

  addNode(node: IViewerNode, registerForUndo: boolean): void

  /**removes an edge from the graph */
  remove(obj: IViewerObject, registerForUndo: boolean): void

  //  Routes the edge. The edge will not be not attached to the graph after the routing

  //  <returns></returns>
  RouteEdge(drawingEdge: Edge): IViewerEdge

  //  gets the viewer graph

  ViewerGraph: IViewerGraph

  //  arrowhead length for newly created edges

  ArrowheadLength: number

  //  creates the port visual if it does not exist, and sets the port location

  SetSourcePortForEdgeRouting(portLocation: Point): void

  //  creates the port visual if it does not exist, and sets the port location

  setTargetPortForEdgeRouting(portLocation: Point): void

  //  removes the port

  RemoveSourcePortEdgeRouting(): void

  //  removes the port

  RemoveTargetPortEdgeRouting(): void

  //

  drawRubberEdge(edgeGeometry: GeomEdge): void

  //  stops drawing the rubber edge

  stopDrawingRubberEdge(): void

  //  the transformation from the graph surface to the client viewport

  Transform: PlaneTransformation
  undo(): void
  redo(): void
}
