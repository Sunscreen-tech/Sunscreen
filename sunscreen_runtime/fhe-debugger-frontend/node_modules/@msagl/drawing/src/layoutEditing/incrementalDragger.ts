import {Curve, GeomEdge, GeomGraph, GeomNode, Graph, ILayoutSettings, Point, Polyline, Rectangle, SplineRouter} from '@msagl/core'
import {BumperPusher} from './bumperPusher'
import {LabelFixture} from './labelFixture'

export class IncrementalDragger {
  geomGraph_: GeomGraph
  get geomGraph(): GeomGraph {
    return this.geomGraph_
  }

  set geomGraph(value: GeomGraph) {
    this.geomGraph_ = value
  }

  nodeSeparation: number

  layoutSettings: ILayoutSettings

  listOfPushers = new Array<BumperPusher>()

  pushingNodesArray: GeomNode[]

  /**   it is an edge subset that needs to be refreshed by the viewer*/
  public changedEdges: GeomEdge[]

  labelFixtures: Map<GeomEdge, LabelFixture> = new Map<GeomEdge, LabelFixture>()

  //

  public constructor(pushingNodes: Array<GeomNode>, graph: GeomGraph, layoutSettings: any) {
    this.geomGraph = graph
    this.nodeSeparation = layoutSettings.NodeSeparation
    this.layoutSettings = layoutSettings
    this.pushingNodesArray = pushingNodes
    // Debug.Assert((this.pushingNodesArray.All(() => {  }, (IncrementalDragger.DefaultClusterParent(n) == null ))
    //                 || (new Set<GeomNode>(this.pushingNodesArray.Select(() => {  }, n.ClusterParent)).Count === 1)), "dragged nodes have to belong to the same cluster");
    this.InitBumperPushers()
  }

  InitBumperPushers() {
    if (this.pushingNodesArray.length === 0) {
      return
    }
    let gg = GeomGraph.getGeom(this.pushingNodesArray[0].node.parent as Graph)
    let pushingArray = this.pushingNodesArray
    do {
      this.listOfPushers.push(new BumperPusher(gg.shallowNodes, this.nodeSeparation, pushingArray))
      if (gg.graph.parent) {
        gg = GeomGraph.getGeom(gg.graph.parent as Graph)
        pushingArray = [gg]
      } else {
        break
      }
    } while (true)
  }

  RunPushers() {
    for (let i = 0; i < this.listOfPushers.length; i++) {
      const bumperPusher = this.listOfPushers[i]
      bumperPusher.PushNodes()
      const cluster = bumperPusher.FirstPushingNode().node.parent
      if (cluster === this.geomGraph_.graph) {
        break
      }
      const sg = GeomGraph.getGeom(cluster as Graph)
      const bbox = sg.boundingBox
      sg.calculateBoundsFromChildren()
      const newBox = sg.boundingBox
      if (newBox.equalEps(bbox)) {
        break
      }

      this.listOfPushers[i + 1].UpdateRTreeByChangedNodeBox(sg, bbox)
    }
  }

  public Drag(delta: Point) {
    if (delta.x == null && delta.y == null) return

    for (const n of this.pushingNodesArray) {
      n.translate(delta)
    }

    this.RunPushers()
    this.RouteChangedEdges()
  }

  RouteChangedEdges() {
    this.changedEdges = this.GetChangedEdges(this.GetChangedNodes())
    this.InitLabelFixtures(this.changedEdges)
    const router = new SplineRouter(
      this.geomGraph_,
      this.changedEdges,
      this.layoutSettings.commonSettings.edgeRoutingSettings.Padding,
      this.layoutSettings.commonSettings.edgeRoutingSettings.PolylinePadding,
      this.layoutSettings.commonSettings.edgeRoutingSettings.ConeAngle,
      this.layoutSettings.commonSettings.edgeRoutingSettings.bundlingSettings,
    )
    router.run()
    this.PositionLabels(this.changedEdges)
  }

  PositionLabels(changedEdges: GeomEdge[]) {
    for (const edge of changedEdges) {
      this.PositionEdgeLabel(edge)
    }
  }

  PositionEdgeLabel(edge: GeomEdge) {
    const lf = this.labelFixtures.get(edge)
    if (lf == null) return
    const curve = edge.curve
    const lenAtLabelAttachment = curve.length * lf.RelativeLengthOnCurve
    const par = curve.getParameterAtLength(lenAtLabelAttachment)
    const tang = curve.derivative(par)
    const norm = (lf.RightSide ? tang.rotate90Cw() : tang.rotate90Ccw()).normalize().mul(lf.NormalLength)
    edge.label.positionCenter(curve.value(par).add(norm))
  }

  InitLabelFixtures(edges: Iterable<GeomEdge>) {
    for (const edge of edges) {
      this.InitLabelFixture(edge)
    }
  }

  InitLabelFixture(edge: GeomEdge) {
    if (edge.label == null) {
      return
    }

    if (this.labelFixtures.has(edge)) {
      return
    }

    const attachmentPar = edge.curve.closestParameter(edge.label.center)
    const curve = edge.curve
    const tang = curve.derivative(attachmentPar)
    const normal = tang.rotate90Cw()
    const fromCurveToLabel = edge.label.center.sub(curve.value(attachmentPar))
    const fixture = new LabelFixture(
      curve.lengthPartial(0, attachmentPar) / curve.length,
      fromCurveToLabel.dot(normal) > 0,
      fromCurveToLabel.length,
    )
    this.labelFixtures.set(edge, fixture)
  }

  GetChangedEdges(changedNodes: Set<GeomNode>): Array<GeomEdge> {
    const list = []
    const box = Rectangle.mkOnRectangles(Array.from(changedNodes).map((n) => n.boundingBox))
    const boxPoly = box.perimeter()
    for (const e of this.geomGraph.deepEdges) {
      if (this.EdgeNeedsRouting(box, e, boxPoly, changedNodes)) {
        list.push(e)
      }
    }

    return list
  }

  EdgeNeedsRouting(box: Rectangle, edge: GeomEdge, boxPolyline: Polyline, changedNodes: Set<GeomNode>): boolean {
    if (edge.curve == null) {
      return true
    }

    if (changedNodes.has(edge.source) || changedNodes.has(edge.target)) {
      return true
    }

    if (edge.source.boundingBox.intersects(box) || edge.target.boundaryCurve.boundingBox.intersects(box)) {
      return true
    }

    if (!edge.boundingBox.intersects(box)) {
      return false
    }

    return Curve.intersectionOne(boxPolyline, edge.curve, false) != null
  }

  GetChangedNodes(): Set<GeomNode> {
    const ret = new Set<GeomNode>()
    for (const p of this.listOfPushers) {
      for (const n of p.FixedNodes) ret.add(n)
    }
    return ret
  }
}
