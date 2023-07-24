import {ICurve, Edge, GeomEdge, GeomGraph, Graph, Node, GeomNode} from '..'
import {Port} from '../layout/core/port'
import {Curve, Point, PointLocation} from '../math/geometry'
import {HitTestBehavior} from '../math/geometry/RTree/hitTestBehavior'
import {createRectangleNodeOnData, RectangleNode} from '../math/geometry/RTree/rectangleNode'
import {CrossRectangleNodesSameType} from '../math/geometry/RTree/rectangleNodeUtils'
import {GetConnectedComponents} from '../math/graphAlgorithms/ConnectedComponentCalculator'
import {BasicGraphOnEdges, mkGraphOnEdgesN} from '../structs/basicGraphOnEdges'
import {IntPair} from '../utils/IntPair'
import {BundlingSettings} from './BundlingSettings'
import {InteractiveEdgeRouter} from './interactiveEdgeRouter'
import {PreGraph} from './PreGraph'
import {Shape} from './shape'
import {BundleRouter} from './spline/bundling/BundleRouter'
import {SdShortestPath} from './spline/bundling/SdShortestPath'

export class MultiEdgeRouter {
  multiEdges: Array<GeomEdge[]>

  interactiveEdgeRouter: InteractiveEdgeRouter

  bundlingSettings: BundlingSettings

  transparentShapeSetter: (e: GeomEdge) => Array<Shape>

  nodeTree: RectangleNode<ICurve, Point>

  constructor(
    multiEdges: Array<GeomEdge[]>,
    interactiveEdgeRouter: InteractiveEdgeRouter,
    nodeBoundaryCurves: Array<ICurve>,
    bundlingSettings: BundlingSettings,
    transparentShapeSetter: (e: GeomEdge) => Array<Shape>,
  ) {
    this.multiEdges = multiEdges
    this.interactiveEdgeRouter = interactiveEdgeRouter
    this.bundlingSettings = bundlingSettings
    this.bundlingSettings.edgeWidthShrinkCoeff = 1
    this.transparentShapeSetter = transparentShapeSetter
    this.nodeTree = createRectangleNodeOnData(nodeBoundaryCurves, (c) => c.boundingBox)
  }

  run() {
    for (const graph of this.GetIndependantPreGraphs()) {
      const br = new BundleRouter(
        graph.edges,
        new SdShortestPath(this.transparentShapeSetter, null, null),
        this.interactiveEdgeRouter.VisibilityGraph,
        this.bundlingSettings,
        this.interactiveEdgeRouter.LoosePadding,
        this.interactiveEdgeRouter.TightHierarchy,
        this.interactiveEdgeRouter.LooseHierarchy,
        null,
        null,
        null,
      )
      br.run()
    }
  }

  private GetPortCurve(port: Port): ICurve {
    const curve = this.nodeTree.FirstHitNodeWithPredicate(port.Location, (point, c) =>
      Curve.PointRelativeToCurveLocation(point, c) !== PointLocation.Outside ? HitTestBehavior.Stop : HitTestBehavior.Continue,
    ).UserData
    return curve
  }

  // creates a set of pregraphs suitable for bundle routing

  GetIndependantPreGraphs(): Array<PreGraph> {
    const preGraphs = this.CreateInitialPregraphs()

    do {
      const count = preGraphs.length
      const t = {preGraphs: preGraphs}
      this.UniteConnectedPreGraphs(t)
      if (count <= preGraphs.length) break
    } while (true)
    return preGraphs
  }

  UniteConnectedPreGraphs(t: {preGraphs: Array<PreGraph>}) {
    const intersectionGraph = MultiEdgeRouter.GetIntersectionGraphOfPreGraphs(t.preGraphs)
    if (intersectionGraph == null) return
    const connectedComponents = GetConnectedComponents(intersectionGraph)
    const newPreGraphList = new Array<PreGraph>()
    for (const component of connectedComponents) {
      let preGraph: PreGraph = null
      for (const i of component) {
        if (preGraph == null) {
          preGraph = t.preGraphs[i]
          newPreGraphList.push(preGraph)
        } else {
          preGraph.AddGraph(t.preGraphs[i])
        }
      }
    }
    t.preGraphs = newPreGraphList
    for (const pg of t.preGraphs) this.AddIntersectingNodes(pg)
  }

  private AddIntersectingNodes(pg: PreGraph) {
    const rect = pg.boundingBox
    for (const curve of this.nodeTree.GetNodeItemsIntersectingRectangle(rect)) {
      pg.AddNodeBoundary(curve)
    }
  }

  static GetIntersectionGraphOfPreGraphs(preGraphs: Array<PreGraph>): BasicGraphOnEdges<IntPair> {
    const intersectingPairs = MultiEdgeRouter.EnumeratePairsOfIntersectedPreGraphs(preGraphs)
    if (intersectingPairs.length) {
      return mkGraphOnEdgesN(intersectingPairs, preGraphs.length)
    }

    return null
  }

  static EnumeratePairsOfIntersectedPreGraphs(preGraphs: Array<PreGraph>): Array<IntPair> {
    const arr = Array.from(Array(preGraphs.length).keys())
    const rn = createRectangleNodeOnData(arr, (i) => preGraphs[i].boundingBox)
    const list = new Array<IntPair>()
    CrossRectangleNodesSameType(rn, rn, (i, j) => list.push(new IntPair(i, j)))
    return list
  }

  CreateInitialPregraphs(): Array<PreGraph> {
    return this.multiEdges.map((a: GeomEdge[]) => this.CreatePregraphFromSetOfEdgeGeometries(a))
  }

  private CreatePregraphFromSetOfEdgeGeometries(egs: GeomEdge[]): PreGraph {
    const nodeBoundaries = new Set<ICurve>()
    const eg = egs[0]
    const c = this.GetPortCurve(eg.sourcePort)
    const rect = c.boundingBox
    nodeBoundaries.add(c)
    nodeBoundaries.add(eg.targetPort.Curve)
    rect.addRec(eg.targetPort.Curve.boundingBox)
    const overlapped = this.nodeTree.GetNodeItemsIntersectingRectangle(rect)
    for (const nodeBoundary of overlapped) nodeBoundaries.add(nodeBoundary)
    return PreGraph.constructorStatic(egs, nodeBoundaries)
  }
}
