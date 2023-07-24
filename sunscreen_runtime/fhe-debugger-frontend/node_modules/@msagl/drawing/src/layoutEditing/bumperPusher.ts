//  pushes the nodes it got bumped to: pushes horizontally or vertically

import {GeomNode, RTree, Point, Rectangle, GeomGraph, insertRange} from '@msagl/core'
import {createRectangleNodeOnData, RectangleNode} from '@msagl/core'
import {Queue} from 'queue-typescript'

export class BumperPusher {
  separation: number

  private fixedNodes: Set<GeomNode> = new Set<GeomNode>()

  rtree: RTree<GeomNode, Point>

  pushingNodes: GeomNode[]

  //

  public constructor(pushedNodes: Iterable<GeomNode>, separation: number, pushingNodes: GeomNode[]) {
    this.separation = separation
    this.rtree = new RTree<GeomNode, Point>(createRectangleNodeOnData(pushedNodes, (n) => this.GetPaddedBoxOfNode(n)))
    // LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(rtree.GetAllLeaves().Select(n=>new DebugCurve(n.BoundaryCurve)));
    this.pushingNodes = pushingNodes
  }

  get FixedNodes(): Iterable<GeomNode> {
    return this.fixedNodes
  }

  GetPaddedBoxOfNode(n: GeomNode): Rectangle {
    const ret = n.boundaryCurve.boundingBox.clone()
    ret.pad(this.separation / 2)
    return ret
  }

  //

  public PushNodes(): Array<GeomNode> {
    this.fixedNodes.clear()
    insertRange(this.fixedNodes, this.pushingNodes)
    const q = new Queue<GeomNode>()
    for (const pn of this.pushingNodes) q.enqueue(pn)
    const ret = new Array<GeomNode>()
    while (q.length > 0) {
      const n = q.dequeue()
      for (const node of this.PushByNodeAndReportPushedAsFixed(n)) {
        q.enqueue(node)
        this.fixedNodes.add(node)
        ret.push(node)
      }
    }

    return ret
  }

  PushByNodeAndReportPushedAsFixed(pushingNode: GeomNode): Array<GeomNode> {
    const ret = []
    const pushingNodeBox = this.GetPaddedBoxOfNode(pushingNode)
    for (const rectNode of this.rtree.GetAllLeavesIntersectingRectangle(pushingNodeBox)) {
      if (this.fixedNodes.has(rectNode.UserData)) continue
      if (this.PushNodeAndUpdateRTree(pushingNode, rectNode)) ret.push(rectNode.UserData)
    }
    return ret
  }

  PushNodeAndUpdateRTree(pushingNode: GeomNode, pushed: RectangleNode<GeomNode, Point>): boolean {
    const del = pushed.UserData.center.sub(pushingNode.center)
    const w = pushingNode.width / 2 + pushed.UserData.width / 2
    const h = pushingNode.height / 2 + pushed.UserData.height / 2
    const absDelXBetweenCenters = Math.abs(del.x)
    const absDelYBetweenCenters = Math.abs(del.y)

    const xSep = absDelXBetweenCenters - w
    const ySep = absDelYBetweenCenters - h
    if (xSep >= this.separation || ySep >= this.separation) return false
    if (absDelXBetweenCenters >= absDelYBetweenCenters) {
      const d = del.x > 0 ? this.separation - xSep : xSep - this.separation
      this.PushByX(d, pushed)
    } else {
      const d = del.y > 0 ? this.separation - ySep : ySep - this.separation
      this.PushByY(d, pushed)
    }
    this.UpdateBoundingBoxesOfPushedAndUpParents(pushed)
    return true
  }

  PushByX(del: number, pushed: RectangleNode<GeomNode, Point>) {
    const delPoint = new Point(del, 0)
    BumperPusher.PushByPoint(pushed, delPoint)
  }

  static PushByPoint(pushed: RectangleNode<GeomNode, Point>, delPoint: Point) {
    pushed.UserData.center = pushed.UserData.center.add(delPoint)
    if (pushed.UserData instanceof GeomGraph) {
      pushed.UserData.translate(delPoint)
    }
  }

  PushByY(del: number, pushed: RectangleNode<GeomNode, Point>) {
    const delPoint = new Point(0, del)
    BumperPusher.PushByPoint(pushed, delPoint)
  }

  UpdateBoundingBoxesOfPushedAndUpParents(pushed: RectangleNode<GeomNode, Point>) {
    pushed.irect = this.GetPaddedBoxOfNode(pushed.UserData)
    let parent = pushed.Parent
    while (parent != null) {
      parent.irect = parent.Left.irect.add_rect(parent.Right.irect)
      parent = parent.Parent
    }
  }

  //

  public UpdateRTreeByChangedNodeBox(cluster: GeomNode, previousBox: Rectangle) {
    const rectNode: RectangleNode<GeomNode, Point> = this.FindClusterNode(cluster, previousBox)
    this.UpdateBoundingBoxesOfPushedAndUpParents(rectNode)
  }

  FindClusterNode(cluster: GeomNode, previousBox: Rectangle): RectangleNode<GeomNode, Point> {
    const node = this.rtree.RootNode
    return this.FindClusterNodeRecurse(node, cluster, previousBox)
  }

  FindClusterNodeRecurse(node: RectangleNode<GeomNode, Point>, cluster: GeomNode, previousBox: Rectangle): RectangleNode<GeomNode, Point> {
    if (node.UserData != null) return node.UserData === cluster ? node : null

    let n0: RectangleNode<GeomNode, Point> = null
    if (previousBox.intersects(node.left.irect as Rectangle)) n0 = this.FindClusterNodeRecurse(node.Left, cluster, previousBox)
    if (n0 != null) return n0
    if (previousBox.intersects(<Rectangle>node.right.irect)) return this.FindClusterNodeRecurse(node.Right, cluster, previousBox)
    return null
  }

  public FirstPushingNode(): GeomNode {
    return this.pushingNodes[0]
  }
}
