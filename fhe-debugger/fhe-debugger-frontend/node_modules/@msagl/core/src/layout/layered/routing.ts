import {Curve} from '../../math/geometry/curve'
import {ICurve} from '../../math/geometry/icurve'
import {LineSegment} from '../../math/geometry/lineSegment'
import {Point} from '../../math/geometry/point'
import {Rectangle} from '../../math/geometry/rectangle'
import {SmoothedPolyline} from '../../math/geometry/smoothedPolyline'
import {BasicGraph} from '../../structs/BasicGraph'
import {IntPair} from '../../utils/IntPair'
import {GeomGraph} from '../core/geomGraph'
import {Algorithm} from './../../utils/algorithm'
import {Anchor} from './anchor'
import {Database} from './Database'
import {LayerArrays} from './LayerArrays'
import {PolyIntEdge} from './polyIntEdge'
import {ProperLayeredGraph} from './ProperLayeredGraph'
import {SugiyamaLayoutSettings} from './sugiyamaLayoutSettings'
//import { FlatEdgeRouter } from './FlatEdgeRouter'
import {CornerSite} from '../../math/geometry/cornerSite'
import {NodeKind} from './NodeKind'
import {Arrowhead} from '../core/arrowhead'
import {GeomNode} from '../core/geomNode'
import {SmoothedPolylineCalculator} from './smoothedPolylineCalculator'
import {GeomEdge} from '../core/geomEdge'

import {StraightLineEdges} from '../../routing/StraightLineEdges'
import {SplineRouter} from '../../routing/splineRouter'
import {EdgeLabelPlacement} from '../edgeLabelPlacement'

// The class responsible for the routing of splines
export class Routing extends Algorithm {
  settings: SugiyamaLayoutSettings

  Database: Database

  IntGraph: BasicGraph<GeomNode, PolyIntEdge>

  LayerArrays: LayerArrays

  OriginalGraph: GeomGraph

  ProperLayeredGraph: ProperLayeredGraph

  constructor(
    settings: SugiyamaLayoutSettings,
    originalGraph: GeomGraph,
    dbP: Database,
    yLayerArrays: LayerArrays,
    properLayeredGraph: ProperLayeredGraph,
    intGraph: BasicGraph<GeomNode, PolyIntEdge>,
  ) {
    super(null) // todo: init with the not null canceltoken
    this.settings = settings
    this.OriginalGraph = originalGraph
    this.Database = dbP
    this.ProperLayeredGraph = properLayeredGraph
    this.LayerArrays = yLayerArrays
    this.IntGraph = intGraph
  }

  // Executes the actual algorithm.
  run() {
    this.createSplines()
  }

  // The method does the main work.
  createSplines() {
    this.createRegularSplines()
    this.createSelfSplines()
    if (this.IntGraph != null) {
      this.RouteFlatEdges()
    }
    if (this.OriginalGraph.graph.parent == null) {
      // TODO: just creating straigh line edges for missing ones, hook up SplineRouter
      this.RouteUnroutedEdges()
    }
  }

  RouteUnroutedEdges() {
    const edgesToRoute = []
    for (const e of this.OriginalGraph.deepEdges) {
      if (!e.curve) edgesToRoute.push(e)
    }
    if (edgesToRoute.length == 0) {
      return
    }
    const sugSettings = this.OriginalGraph.layoutSettings ? this.OriginalGraph.layoutSettings : new SugiyamaLayoutSettings()
    const ers = sugSettings.commonSettings.edgeRoutingSettings
    const sr = new SplineRouter(
      this.OriginalGraph,
      edgesToRoute,
      ers.padding,
      ers.polylinePadding,
      ers.coneAngle,
      ers.bundlingSettings,
      this.cancelToken,
    )
    sr.run()
    const elp = EdgeLabelPlacement.constructorGA(this.OriginalGraph, edgesToRoute)
    elp.run()
  }

  RouteFlatEdges() {
    // throw new Error('not implemented')
    // const flatEdgeRouter = new FlatEdgeRouter(this.settings, this)
    // flatEdgeRouter.run()
  }

  createRegularSplines() {
    for (const intEdgeList of this.Database.RegularMultiedges()) {
      if (betterRouteAsSplines(intEdgeList)) continue
      // Here we try to optimize multi-edge routing
      const m = intEdgeList.length
      const optimizeShortEdges = m === 1 && this.MayOptimizeEdge(intEdgeList[0])
      for (let i: number = Math.floor(m / 2); i < m; i++) {
        this.createSplineForNonSelfEdge(intEdgeList[i], optimizeShortEdges)
      }

      for (let i = Math.floor(m / 2) - 1; i >= 0; i--) {
        this.createSplineForNonSelfEdge(intEdgeList[i], optimizeShortEdges)
      }
    }
  }

  MayOptimizeEdge(intEdge: PolyIntEdge): boolean {
    return !(
      this.ProperLayeredGraph.OutDegreeIsMoreThanOne(intEdge.source) ||
      this.ProperLayeredGraph.InDegreeIsMoreThanOne(intEdge.target) ||
      hasSelfEdge(intEdge.edge.source) ||
      hasSelfEdge(intEdge.edge.target)
    )
  }

  createSelfSplines() {
    for (const [k, v] of this.Database.Multiedges.keyValues()) {
      const ip: IntPair = k
      if (ip.x === ip.y) {
        const anchor: Anchor = this.Database.Anchors[ip.x]
        let offset: number = anchor.leftAnchor
        for (const intEdge of v) {
          const dx: number = this.settings.NodeSeparation + (this.settings.MinNodeWidth + offset)
          const dy: number = anchor.bottomAnchor / 2
          const p0: Point = anchor.origin
          const p1: Point = p0.add(new Point(0, dy))
          const p2: Point = p0.add(new Point(dx, dy))
          const p3: Point = p0.add(new Point(dx, -dy))
          const p4: Point = p0.add(new Point(0, -dy))
          let s = CornerSite.mkSiteP(p0)
          const polyline = new SmoothedPolyline(s)
          s = CornerSite.mkSiteSP(s, p1)
          s = CornerSite.mkSiteSP(s, p2)
          s = CornerSite.mkSiteSP(s, p3)
          s = CornerSite.mkSiteSP(s, p4)
          CornerSite.mkSiteSP(s, p0)
          const c: Curve = polyline.createCurve()
          intEdge.curve = c
          intEdge.edge.smoothedPolyline = polyline
          offset = dx
          if (intEdge.edge.label != null) {
            offset += intEdge.edge.label.width
            const curveMiddle = c.value((c.parStart + c.parEnd) / 2)

            const center = new Point(curveMiddle.x + intEdge.labelWidth / 2, anchor.y)
            const del = new Point(intEdge.edge.label.width / 2, intEdge.edge.label.height / 2)
            const box = Rectangle.mkPP(center.add(del), center.sub(del))
            intEdge.edge.label.width = box.width
            intEdge.edge.label.height = box.height
            intEdge.edge.label.positionCenter(center)
          }

          Arrowhead.trimSplineAndCalculateArrowheadsII(
            intEdge.edge,
            intEdge.edge.source.boundaryCurve,
            intEdge.edge.target.boundaryCurve,
            c,
            false,
          )
        }
      }
    }
  }

  createSplineForNonSelfEdge(es: PolyIntEdge, optimizeShortEdges: boolean) {
    if (es.LayerEdges != null) {
      this.drawSplineBySmothingThePolyline(es, optimizeShortEdges)
      if (!es.IsVirtualEdge) {
        es.updateEdgeLabelPosition(this.Database.Anchors)
        Arrowhead.trimSplineAndCalculateArrowheadsII(es.edge, es.edge.source.boundaryCurve, es.edge.target.boundaryCurve, es.curve, true)
      }
    }
  }

  drawSplineBySmothingThePolyline(edgePath: PolyIntEdge, optimizeShortEdges: boolean) {
    const scalc = new SmoothedPolylineCalculator(
      edgePath,
      this.Database.Anchors,
      this.OriginalGraph,
      this.settings,
      this.LayerArrays,
      this.ProperLayeredGraph,
      this.Database,
    )
    const spline: ICurve = scalc.getSpline(optimizeShortEdges)
    if (edgePath.reversed) {
      edgePath.curve = spline.reverse()
      edgePath.underlyingPolyline = scalc.Reverse().GetPolyline
    } else {
      edgePath.curve = spline
      edgePath.underlyingPolyline = scalc.GetPolyline
    }
  }

  // void UpdateEdgeLabelPosition(LayerEdge[][] list, int i) {
  //    IntEdge e;
  //    int labelNodeIndex;
  //    if (Engine.GetLabelEdgeAndVirtualNode(list, i, out e, out labelNodeIndex)) {
  //        UpdateLabel(e, labelNodeIndex, db.Anchors);
  //    }
  // }
  static UpdateLabel(e: GeomEdge, anchor: Anchor) {
    let labelSide: LineSegment = null
    if (anchor.labelIsToTheRightOfTheSpline) {
      e.label.positionCenter(new Point(anchor.x + anchor.rightAnchor / 2, anchor.y))
      labelSide = LineSegment.mkPP(e.label.boundingBox.leftTop, e.label.boundingBox.leftBottom)
    } else if (anchor.labelIsToTheLeftOfTheSpline) {
      e.label.positionCenter(new Point(anchor.x - anchor.leftAnchor / 2, anchor.y))
      labelSide = LineSegment.mkPP(e.label.boundingBox.rightTop, e.label.boundingBox.rightBottom)
    }

    const segmentInFrontOfLabel: ICurve = Routing.GetSegmentInFrontOfLabel(e.curve, e.label.center.y)
    if (segmentInFrontOfLabel == null) {
      return
    }

    if (Curve.getAllIntersections(e.curve, Curve.polyFromBox(e.label.boundingBox), false).length === 0) {
      const t: {curveClosestPoint: Point; labelSideClosest: Point} = {
        curveClosestPoint: undefined,
        labelSideClosest: undefined,
      }
      if (Routing.FindClosestPoints(t, segmentInFrontOfLabel, labelSide)) {
        // shift the label if needed
        Routing.ShiftLabel(e, t)
      } else {
        // assume that the distance is reached at the ends of labelSideClosest
        const u: number = segmentInFrontOfLabel.closestParameter(labelSide.start)
        const v: number = segmentInFrontOfLabel.closestParameter(labelSide.end)
        if (segmentInFrontOfLabel.value(u).sub(labelSide.start).length < segmentInFrontOfLabel.value(v).sub(labelSide.end).length) {
          t.curveClosestPoint = segmentInFrontOfLabel.value(u)
          t.labelSideClosest = labelSide.start
        } else {
          t.curveClosestPoint = segmentInFrontOfLabel.value(v)
          t.labelSideClosest = labelSide.end
        }

        Routing.ShiftLabel(e, t)
      }
    }
  }

  static ShiftLabel(e: GeomEdge, t: {curveClosestPoint: Point; labelSideClosest: Point}) {
    const w: number = e.lineWidth / 2
    const shift: Point = t.curveClosestPoint.sub(t.labelSideClosest)
    const shiftLength: number = shift.length
    //   SugiyamaLayoutSettings.Show(e.Curve, shiftLength > 0 ? new LineSegment(curveClosestPoint, labelSideClosest) : null, PolyFromBox(e.label.boundingBox));
    if (shiftLength > w) {
      e.label.positionCenter(e.label.center.add(shift.div(shiftLength * (shiftLength - w))))
    }
  }

  static FindClosestPoints(
    t: {curveClosestPoint: Point; labelSideClosest: Point},
    segmentInFrontOfLabel: ICurve,
    labelSide: LineSegment,
  ): boolean {
    const di = Curve.minDistWithinIntervals(
      segmentInFrontOfLabel,
      labelSide,
      segmentInFrontOfLabel.parStart,
      segmentInFrontOfLabel.parEnd,
      labelSide.parStart,
      labelSide.parEnd,
      (segmentInFrontOfLabel.parStart + segmentInFrontOfLabel.parEnd) / 2,
      (labelSide.parStart + labelSide.parEnd) / 2,
    )
    if (di) {
      t.curveClosestPoint = di.aX
      t.labelSideClosest = di.bX
      return true
    }
    return false
  }

  static GetSegmentInFrontOfLabel(edgeCurve: ICurve, labelY: number): ICurve {
    if (edgeCurve instanceof Curve) {
      const curve = <Curve>edgeCurve
      for (const seg of curve.segs) {
        if ((seg.start.y - labelY) * (seg.end.y - labelY) <= 0) {
          return seg
        }
      }
    } else {
      /*Assert.assert(false)*/
    }

    // not implemented
    return null
  }

  static GetNodeKind(vertexOffset: number, edgePath: PolyIntEdge): NodeKind {
    return vertexOffset === 0 ? NodeKind.Top : vertexOffset < edgePath.count ? NodeKind.Internal : NodeKind.Bottom
  }
}
function betterRouteAsSplines(intEdgeList: PolyIntEdge[]) {
  if (intEdgeList.length < 4) return false
  for (const pie of intEdgeList) if (pie.edge.label) return false
  return true
}

function hasSelfEdge(geomNode: GeomNode): boolean {
  return geomNode.node.selfEdges.size > 0
}
