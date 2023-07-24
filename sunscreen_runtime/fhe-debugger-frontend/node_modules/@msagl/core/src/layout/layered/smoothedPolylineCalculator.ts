import {CornerSite} from '../../math/geometry/cornerSite'
import {Curve} from '../../math/geometry/curve'
import {GeomConstants} from '../../math/geometry/geomConstants'
import {ICurve} from '../../math/geometry/icurve'
import {LineSegment} from '../../math/geometry/lineSegment'
import {Parallelogram} from '../../math/geometry/parallelogram'
import {PN, PNInternal} from '../../math/geometry/parallelogramNode'
import {Point, TriangleOrientation} from '../../math/geometry/point'
import {Polyline} from '../../math/geometry/polyline'
import {SmoothedPolyline} from '../../math/geometry/smoothedPolyline'
import {GeomGraph} from '../core/geomGraph'
import {Anchor} from './anchor'
import {Database} from './Database'
import {LayerArrays} from './LayerArrays'
import {LayerEdge} from './layerEdge'
import {PolyIntEdge} from './polyIntEdge'
import {ProperLayeredGraph} from './ProperLayeredGraph'
import {SugiyamaLayoutSettings} from './sugiyamaLayoutSettings'
import {HierarchyCalculator} from './HierarchyCalculator'
import {BezierSeg} from '../../math/geometry/bezierSeg'
import {Routing} from './routing'
import {NodeKind} from './NodeKind'

import {RefinerBetweenTwoLayers} from './RefinerBetweenTwoLayers'
import {closeDistEps} from '../../utils/compare'
export class SmoothedPolylineCalculator {
  headSite: CornerSite

  // corresponds to the bottom point
  edgePath: PolyIntEdge

  anchors: Anchor[]

  originalGraph: GeomGraph

  eastHierarchy: PN

  westHierarchy: PN

  thinEastHierarchy: PN

  thinWestHierarchy: PN

  thinRightNodes = new Array<PN>()

  thinWestNodes = new Array<PN>()

  database: Database

  layeredGraph: ProperLayeredGraph

  layerArrays: LayerArrays

  settings: SugiyamaLayoutSettings

  // Creates a smoothed polyline

  constructor(
    edgePathPar: PolyIntEdge,
    anchorsP: Anchor[],
    origGraph: GeomGraph,
    settings: SugiyamaLayoutSettings,
    la: LayerArrays,
    layerGraph: ProperLayeredGraph,
    databaseP: Database,
  ) {
    this.database = databaseP
    this.edgePath = edgePathPar
    this.anchors = anchorsP
    this.layerArrays = la
    this.originalGraph = origGraph
    this.settings = settings
    this.layeredGraph = layerGraph
    this.eastHierarchy = this.BuildEastHierarchy()
    this.westHierarchy = this.BuildWestHierarchy()
  }

  private BuildEastHierarchy(): PN {
    const boundaryAnchorsCurves: Array<Polyline> = this.FindEastBoundaryAnchorCurves()
    const l = new Array<PN>()
    for (const c of boundaryAnchorsCurves) {
      l.push(c.pNodeOverICurve())
    }

    this.thinEastHierarchy = HierarchyCalculator.Calculate(this.thinRightNodes)
    return HierarchyCalculator.Calculate(l)
  }

  private BuildWestHierarchy(): PN {
    const boundaryAnchorCurves: Array<Polyline> = this.FindWestBoundaryAnchorCurves()
    const l = new Array<PN>()
    for (const a of boundaryAnchorCurves) {
      l.push(a.pNodeOverICurve())
    }

    this.thinWestHierarchy = HierarchyCalculator.Calculate(this.thinWestNodes)
    return HierarchyCalculator.Calculate(l)
  }

  FindEastBoundaryAnchorCurves(): Array<Polyline> {
    const ret: Array<Polyline> = new Array<Polyline>()
    let uOffset = 0
    for (const u of this.edgePath) {
      let westMostAnchor: Anchor = null
      for (const v of this.EastBoundaryNodesOfANode(u, Routing.GetNodeKind(uOffset, this.edgePath))) {
        const a: Anchor = this.anchors[v]
        if (westMostAnchor == null || westMostAnchor.origin.x > a.origin.x) {
          westMostAnchor = a
        }

        ret.push(a.polygonalBoundary)
      }

      if (westMostAnchor != null) {
        this.thinRightNodes.push(LineSegment.mkLinePXY(westMostAnchor.origin, this.originalGraph.right, westMostAnchor.y).pNodeOverICurve())
      }

      uOffset++
    }

    // if (Routing.db) {
    //    var l = new Array<DebugCurve>();
    //       l.AddRange(db.Anchors.Select(a=>new DebugCurve(100,1,"red", a.PolygonalBoundary)));
    //    l.AddRange(thinRightNodes.Select(n=>n.parallelogram).Select(p=>new Polyline(p.Vertex(VertexId.Corner), p.Vertex(VertexId.VertexA),
    //        p.Vertex(VertexId.OtherCorner), p.Vertex(VertexId.VertexB))).Select(c=>new DebugCurve(100,3,"brown", c)));
    //    foreach (var le of this.edgePath.LayerEdges)
    //        l. push(new DebugCurve(100, 1, "blue", LineSegment.mkPP(db.anchors[le.Source].Origin, db.anchors[le.Target].Origin)));
    //   LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
    //    // Database(db, thinRightNodes.Select(p=>new Polyline(p.parallelogram.Vertex(VertexId.Corner), p.parallelogram.Vertex(VertexId.VertexA),
    //        //p.parallelogram.Vertex(VertexId.OtherCorner), p.parallelogram.Vertex(VertexId.VertexB)){Closed=true}).ToArray());
    // }
    return ret
  }

  private FindWestBoundaryAnchorCurves(): Polyline[] {
    const ret = []
    let uOffset = 0
    for (const u of this.edgePath.nodes()) {
      let eastMost = -1
      for (const v of this.LeftBoundaryNodesOfANode(u, Routing.GetNodeKind(uOffset, this.edgePath))) {
        if (eastMost === -1 || this.layerArrays.x[v] > this.layerArrays.x[eastMost]) {
          eastMost = v
        }

        ret.push(this.anchors[v].polygonalBoundary)
      }

      if (eastMost !== -1) {
        const a: Anchor = this.anchors[eastMost]
        this.thinWestNodes.push(LineSegment.mkLinePXY(a.origin, this.originalGraph.left, a.origin.y).pNodeOverICurve())
      }

      uOffset++
    }

    return ret
  }

  *FillRightTopAndBottomVerts(layer: number[], vPosition: number, nodeKind: NodeKind): IterableIterator<number> {
    let b = 0
    let t = 0
    if (nodeKind === NodeKind.Bottom) {
      b = Number.MAX_VALUE
      // we don't have bottom boundaries here since they will be cut off
    } else if (nodeKind === NodeKind.Top) {
      t = Number.MAX_VALUE
      // we don't have top boundaries here since they will be cut off
    }

    const v: number = layer[vPosition]
    for (let i = vPosition + 1; i < layer.length; i++) {
      const u: number = layer[i]
      const anchor: Anchor = this.anchors[u]
      if (anchor.topAnchor > t) {
        if (!this.NodeUCanBeCrossedByNodeV(u, v)) {
          t = anchor.topAnchor
          if (anchor.bottomAnchor > b) {
            b = anchor.bottomAnchor
          }

          yield u
        }
      } else if (anchor.bottomAnchor > b) {
        if (!this.NodeUCanBeCrossedByNodeV(u, v)) {
          b = anchor.bottomAnchor
          if (anchor.topAnchor > t) {
            t = anchor.topAnchor
          }

          yield u
        }
      }
    }
  }

  *FillLeftTopAndBottomVerts(layer: number[], vPosition: number, nodeKind: NodeKind): IterableIterator<number> {
    let b = 0
    let t = 0
    if (nodeKind === NodeKind.Top) {
      t = Number.MAX_VALUE // there are no top vertices - they are cut down by the top boundaryCurve curve
    } else if (nodeKind === NodeKind.Bottom) {
      b = Number.MAX_VALUE // there are no bottom vertices - they are cut down by the top boundaryCurve curve
    }

    const v: number = layer[vPosition]
    for (let i = vPosition - 1; i >= 0; i--) {
      const u: number = layer[i]
      const anchor: Anchor = this.anchors[u]
      if (anchor.topAnchor > t + GeomConstants.distanceEpsilon) {
        if (!this.NodeUCanBeCrossedByNodeV(u, v)) {
          t = anchor.topAnchor
          b = Math.max(b, anchor.bottomAnchor)
          yield u
        }
      } else if (anchor.bottomAnchor > b + GeomConstants.distanceEpsilon) {
        if (!this.NodeUCanBeCrossedByNodeV(u, v)) {
          t = Math.max(t, anchor.topAnchor)
          b = anchor.bottomAnchor
          yield u
        }
      }
    }
  }

  IsVirtualVertex(v: number): boolean {
    return v >= this.originalGraph.shallowNodeCount
  }

  IsLabel(u: number): boolean {
    return this.anchors[u].hasLabel
  }

  private NodeUCanBeCrossedByNodeV(u: number, v: number): boolean {
    if (this.IsLabel(u)) {
      return false
    }

    if (this.IsLabel(v)) {
      return false
    }

    if (this.IsVirtualVertex(u) && this.IsVirtualVertex(v) && this.EdgesIntersectSomewhere(u, v)) {
      return true
    }

    return false
  }

  private EdgesIntersectSomewhere(u: number, v: number): boolean {
    if (this.UVAreMiddlesOfTheSameMultiEdge(u, v)) {
      return false
    }

    return this.IntersectAbove(u, v) || this.IntersectBelow(u, v)
  }

  private UVAreMiddlesOfTheSameMultiEdge(u: number, v: number): boolean {
    if (
      this.database.MultipleMiddles.has(u) &&
      this.database.MultipleMiddles.has(v) &&
      this.SourceOfTheOriginalEdgeContainingAVirtualNode(u) === this.SourceOfTheOriginalEdgeContainingAVirtualNode(v)
    ) {
      return true
    }

    return false
  }

  SourceOfTheOriginalEdgeContainingAVirtualNode(u: number): number {
    while (this.IsVirtualVertex(u)) {
      u = this.IncomingEdge(u).Source
    }

    return u
  }

  private IntersectBelow(u: number, v: number): boolean {
    do {
      const eu: LayerEdge = this.OutcomingEdge(u)
      const ev: LayerEdge = this.OutcomingEdge(v)
      if (this.Intersect(eu, ev)) {
        return true
      }
      u = eu.Target
      v = ev.Target
    } while (this.IsVirtualVertex(u) && this.IsVirtualVertex(v))

    return u === v
  }

  private IntersectAbove(u: number, v: number): boolean {
    do {
      const eu: LayerEdge = this.IncomingEdge(u)
      const ev: LayerEdge = this.IncomingEdge(v)
      if (this.Intersect(eu, ev)) {
        return true
      }

      u = eu.Source
      v = ev.Source
    } while (this.IsVirtualVertex(u) && this.IsVirtualVertex(v))
    return u === v
  }

  private Intersect(e: LayerEdge, m: LayerEdge): boolean {
    const a: number = this.layerArrays.x[e.Source] - this.layerArrays.x[m.Source]
    const b: number = this.layerArrays.x[e.Target] - this.layerArrays.x[m.Target]
    return (a > 0 && b < 0) || (a < 0 && b > 0)
    // return (layerArrays.x[e.Source] - layerArrays.x[m.Source]) * (layerArrays.x[e.Target] - layerArrays.x[m.Target]) < 0;
  }

  private IncomingEdge(u: number): LayerEdge {
    return this.layeredGraph.InEdgeOfVirtualNode(u)
  }

  // here u is a virtual vertex
  private OutcomingEdge(u: number): LayerEdge {
    return this.layeredGraph.OutEdgeOfVirtualNode(u)
  }

  private EastBoundaryNodesOfANode(i: number, nodeKind: NodeKind): IterableIterator<number> {
    return this.FillRightTopAndBottomVerts(this.NodeLayer(i), this.layerArrays.x[i], nodeKind)
  }

  private NodeLayer(i: number): number[] {
    return this.layerArrays.Layers[this.layerArrays.y[i]]
  }

  private LeftBoundaryNodesOfANode(i: number, nodeKind: NodeKind): IterableIterator<number> {
    return this.FillLeftTopAndBottomVerts(this.NodeLayer(i), this.layerArrays.x[i], nodeKind)
  }

  getSpline(optimizeShortEdges: boolean): ICurve {
    this.createRefinedPolyline(optimizeShortEdges)
    return this.createSmoothedPolyline()
  }

  // Poly(): Curve {
  //  const c: Curve = new Curve()
  //  for (let s = this.headSite; s.next != null; s = s.next) {
  //    c.addSegment(
  //      new BezierSeg(s.point, Point.convSum(1 / 3, s.point, s.next.point), Point.convSum(2 / 3, s.point, s.next.point), s.next.point),
  //    )
  //  }

  //  return c
  // }

  get GetPolyline(): SmoothedPolyline {
    /*Assert.assert(this.headSite != null)*/
    return new SmoothedPolyline(this.headSite)
  }

  LineSegIntersectBound(a: Point, b: Point): boolean {
    const l = LineSegment.mkPP(a, b)
    return (
      SmoothedPolylineCalculator.CurveIntersectsHierarchy(l, this.westHierarchy) ||
      SmoothedPolylineCalculator.CurveIntersectsHierarchy(l, this.thinWestHierarchy) ||
      SmoothedPolylineCalculator.CurveIntersectsHierarchy(l, this.eastHierarchy) ||
      SmoothedPolylineCalculator.CurveIntersectsHierarchy(l, this.thinEastHierarchy)
    )
  }

  SegIntersectWestBound(a: CornerSite, b: CornerSite): boolean {
    return (
      SmoothedPolylineCalculator.SegIntersectsBound(a, b, this.westHierarchy) ||
      SmoothedPolylineCalculator.SegIntersectsBound(a, b, this.thinWestHierarchy)
    )
  }

  SegIntersectEastBound(a: CornerSite, b: CornerSite): boolean {
    return (
      SmoothedPolylineCalculator.SegIntersectsBound(a, b, this.eastHierarchy) ||
      SmoothedPolylineCalculator.SegIntersectsBound(a, b, this.thinEastHierarchy)
    )
  }

  private TryToRemoveInflectionCorner(t: {s: CornerSite; cut: boolean}) {
    if (
      !t.s.next ||
      !t.s.prev ||
      (t.s.turn === TriangleOrientation.Counterclockwise && this.SegIntersectEastBound(t.s.prev, t.s.next)) ||
      (t.s.turn === TriangleOrientation.Clockwise && this.SegIntersectWestBound(t.s.prev, t.s.next))
    ) {
      t.cut = false
      t.s = t.s.next
      return
    }
    // we have a cut
    const nextS = t.s.next
    t.s.prev.next = nextS
    // forget about s
    nextS.prev = t.s.prev
    t.s = nextS
    t.cut = true
  }

  static SegIntersectsBound(a: CornerSite, b: CornerSite, hierarchy: PN): boolean {
    return SmoothedPolylineCalculator.CurveIntersectsHierarchy(LineSegment.mkPP(a.point, b.point), hierarchy)
  }

  private static CurveIntersectsHierarchy(lineSeg: LineSegment, hierarchy: PN): boolean {
    if (hierarchy == null) {
      return false
    }
    if (!Parallelogram.intersect(lineSeg.pNodeOverICurve().parallelogram, hierarchy.parallelogram)) {
      return false
    }
    if (hierarchy.node.hasOwnProperty('children')) {
      const n = hierarchy.node as PNInternal
      const ret =
        SmoothedPolylineCalculator.CurveIntersectsHierarchy(lineSeg, n.children[0]) ||
        SmoothedPolylineCalculator.CurveIntersectsHierarchy(lineSeg, n.children[1])
      return ret
    }
    return Curve.intersectionOne(lineSeg, hierarchy.seg, false) != null
  }

  static Flat(i: CornerSite): boolean {
    return Point.getTriangleOrientation(i.prev.point, i.point, i.next.point) === TriangleOrientation.Collinear
  }

  Reverse(): SmoothedPolylineCalculator {
    const ret: SmoothedPolylineCalculator = new SmoothedPolylineCalculator(
      this.edgePath,
      this.anchors,
      this.originalGraph,
      this.settings,
      this.layerArrays,
      this.layeredGraph,
      this.database,
    )
    let site: CornerSite = this.headSite
    let v: CornerSite = null
    while (site != null) {
      ret.headSite = site.clone()
      ret.headSite.next = v
      if (v != null) {
        v.prev = ret.headSite
      }

      v = ret.headSite
      site = site.next
    }

    return ret
  }

  private createRefinedPolyline(optimizeShortEdges: boolean) {
    this.CreateInitialListOfSites()
    let topSite: CornerSite = this.headSite
    let bottomSite: CornerSite
    for (let i = 0; i < this.edgePath.count; i++) {
      bottomSite = topSite.next
      this.RefineBeetweenNeighborLayers(topSite, this.EdgePathNode(i), this.EdgePathNode(i + 1))
      topSite = bottomSite
    }

    this.TryToRemoveInflections()
    if (optimizeShortEdges) {
      this.OptimizeShortPath()
    }
    //Assert.assert(this.)
  }

  private RefineBeetweenNeighborLayers(topSite: CornerSite, topNode: number, bottomNode: number) {
    RefinerBetweenTwoLayers.Refine(
      topNode,
      bottomNode,
      topSite,
      this.anchors,
      this.layerArrays,
      this.layeredGraph,
      this.originalGraph,
      this.settings.LayerSeparation,
    )
  }

  private CreateInitialListOfSites() {
    let currentSite = (this.headSite = CornerSite.mkSiteP(this.EdgePathPoint(0)))
    for (let i = 1; i <= this.edgePath.count; i++) {
      currentSite = CornerSite.mkSiteSP(currentSite, this.EdgePathPoint(i))
    }
  }

  get TailSite(): CornerSite {
    let s: CornerSite = this.headSite
    while (s.next != null) {
      s = s.next
    }

    return s
  }

  OptimizeForThreeSites() {
    /*Assert.assert(this.edgePath.LayerEdges.length === 2)*/
    const top: number = this.EdgePathNode(0)
    const bottom: number = this.EdgePathNode(2)
    const a: Anchor = this.anchors[top]
    const b: Anchor = this.anchors[bottom]
    if (closeDistEps(a.x, b.x)) {
      return
    }

    const t = {ax: a.x, bx: b.x, sign: 0}
    if (!this.FindLegalPositions(a, b, t)) {
      return
    }

    const ratio: number = (a.y - b.y) / (a.bottom - b.top)
    const xc = 0.5 * (t.ax + t.bx)
    const half: number = t.sign * ((t.ax - t.bx) * 0.5)
    t.ax = xc + ratio * (half * t.sign)
    t.bx = xc - ratio * (half * t.sign)
    this.headSite.point = new Point(t.ax, a.y)
    const ms = this.headSite.next
    const mY: number = ms.point.y
    ms.point = new Point(this.MiddlePos(t.ax, t.bx, a, b, mY), mY)
    ms.next.point = new Point(t.bx, b.y)
    const ma: Anchor = this.anchors[this.EdgePathNode(1)]
    ma.x = ms.point.x
  }

  OptimizeForTwoSites() {
    /*Assert.assert(this.edgePath.LayerEdges.length === 1)*/
    const top: number = this.EdgePathNode(0)
    const bottom: number = this.EdgePathNode(1)
    const a: Anchor = this.anchors[top]
    const b: Anchor = this.anchors[bottom]
    if (closeDistEps(a.x, b.x)) {
      return
    }

    const t = {ax: a.x, bx: b.x, sign: 0}

    if (!this.FindPositions(a, b, t)) {
      return
    }

    const ratio: number = (a.y - b.y) / (a.bottom - b.top)
    const xc = 0.5 * (t.ax + t.bx)
    const half: number = t.sign * ((t.ax - t.bx) * 0.5)
    t.ax = xc + ratio * (half * t.sign)
    t.bx = xc - ratio * (half * t.sign)
    this.headSite.point = new Point(t.ax, a.y)
    this.headSite.next.point = new Point(t.bx, b.y)
  }

  private FindLegalPositions(
    a: Anchor,
    b: Anchor,
    t: {
      ax: number
      bx: number
      sign: number
    },
  ): boolean {
    if (!this.FindPositions(a, b, t)) {
      return false
    }

    return this.PositionsAreLegal(t.ax, t.bx, t.sign, a, b, this.EdgePathNode(1))
  }

  private FindPositions(
    a: Anchor,
    b: Anchor,
    t: {
      ax: number
      bx: number
      sign: number
    },
  ): boolean {
    let overlapMax: number
    let overlapMin: number
    if (t.ax < t.bx) {
      t.sign = 1
      overlapMin = Math.max(t.ax, b.left)
      overlapMax = Math.min(a.right, t.bx)
    } else {
      t.sign = -1
      overlapMin = Math.max(a.left, t.bx)
      overlapMax = Math.min(b.right, t.ax)
    }

    if (overlapMin <= overlapMax) {
      t.bx = 0.5 * (overlapMin + overlapMax)
      t.ax = 0.5 * (overlapMin + overlapMax)
    } else {
      if (this.OriginToOriginSegCrossesAnchorSide(a, b)) {
        return false
      }

      if (t.sign === 1) {
        t.ax = a.right - 0.1 * a.rightAnchor
        t.bx = b.left
      } else {
        t.ax = a.left + 0.1 * a.leftAnchor
        t.bx = b.right
      }
    }

    return true
  }

  private OriginToOriginSegCrossesAnchorSide(a: Anchor, b: Anchor): boolean {
    /*Assert.assert(a.y > b.y)*/
    const seg = LineSegment.mkPP(a.origin, b.origin)
    return (
      (a.x < b.x && Curve.CurvesIntersect(seg, LineSegment.mkPP(a.rightBottom, a.rightTop))) ||
      Curve.CurvesIntersect(seg, LineSegment.mkPP(b.leftBottom, a.leftTop)) ||
      (a.x > b.x && Curve.CurvesIntersect(seg, LineSegment.mkPP(a.leftBottom, a.leftTop))) ||
      Curve.CurvesIntersect(seg, LineSegment.mkPP(b.rightBottom, a.rightTop))
    )
  }

  private OptimizeShortPath() {
    if (this.edgePath.count > 2) {
      return
    }

    if (
      this.edgePath.count === 2 &&
      this.headSite.next.next != null &&
      this.headSite.next.next.next == null &&
      this.anchors[this.EdgePathNode(1)].node == null
    ) {
      this.OptimizeForThreeSites()
    } else if (this.edgePath.count === 1) {
      this.OptimizeForTwoSites()
    }
  }

  private PositionsAreLegal(sax: number, sbx: number, sign: number, a: Anchor, b: Anchor, middleNodeIndex: number): boolean {
    if (!closeDistEps(sax, sbx) && (sax - sbx) * sign > 0) {
      return false
    }

    const mAnchor: Anchor = this.anchors[middleNodeIndex]
    const mx: number = this.MiddlePos(sax, sbx, a, b, mAnchor.y)
    if (!this.MiddleAnchorLegal(mx, middleNodeIndex, mAnchor)) {
      return false
    }

    return !this.LineSegIntersectBound(new Point(sax, a.bottom), new Point(sbx, b.top))
  }

  private MiddleAnchorLegal(mx: number, middleNodeIndex: number, mAnchor: Anchor): boolean {
    const mLayer = this.NodeLayer(middleNodeIndex)
    const pos: number = this.layerArrays.x[middleNodeIndex]
    const shift: number = mx - mAnchor.x
    if (pos > 0) {
      const l: Anchor = this.anchors[mLayer[pos - 1]]
      if (l.right > shift + mAnchor.left) {
        return false
      }
    }

    if (pos < mLayer.length - 1) {
      const r: Anchor = this.anchors[mLayer[pos + 1]]
      if (r.left < shift + mAnchor.right) {
        return false
      }
    }

    return true
  }

  private MiddlePos(sax: number, sbx: number, a: Anchor, b: Anchor, mY: number): number {
    const u: number = a.y - mY
    const l: number = mY - b.y
    /*Assert.assert(u >= 0 && l >= 0)*/
    return (sax * u + sbx * l) / (u + l)
  }

  private TryToRemoveInflections() {
    if (this.TurningAlwaySameDirection()) {
      return
    }

    let progress = true
    while (progress) {
      progress = false

      for (const t = {s: this.headSite, cut: false}; t.s; ) {
        this.TryToRemoveInflectionCorner(t)
        progress = t.cut || progress
      }
    }
  }

  private TurningAlwaySameDirection(): boolean {
    let sign = 0
    // undecided
    for (let s = this.headSite.next; s != null && s.next != null; s = s.next) {
      const nsign: number = s.turn
      if (sign === 0) {
        // try to set the sign
        if (nsign > 0) {
          sign = 1
        } else if (nsign < 0) {
          sign = -1
        }
      } else if (sign * nsign < 0) {
        return false
      }
    }

    return true
  }

  EdgePathPoint(i: number): Point {
    return this.anchors[this.EdgePathNode(i)].origin
  }

  EdgePathNode(i: number): number {
    return i === this.edgePath.count ? this.edgePath.LayerEdges[this.edgePath.count - 1].Target : this.edgePath.LayerEdges[i].Source
  }

  createSmoothedPolyline(): Curve {
    this.RemoveVerticesWithNoTurns()
    let curve = new Curve()
    const a: CornerSite = this.headSite
    const t = Curve.findCorner(a)

    // the corner other end
    if (t !== undefined) {
      this.createFilletCurve(curve, {a: a, b: t.b, c: t.c})
      curve = this.ExtendCurveToEndpoints(curve)
    } else {
      curve.addSegment(LineSegment.mkPP(this.headSite.point, this.TailSite.point))
    }

    /*Assert.assert(this.curveIsLegal(curve))*/
    return curve
  }

  curveIsLegal(curve: Curve): boolean {
    return true
    for (const n of this.layeredGraph.BaseGraph.nodes) {
      let i = this.edgePath.getNode(0)
      if (n === this.layeredGraph.BaseGraph.nodes[i]) continue
      i = this.edgePath.getNode(this.edgePath.LayerEdges.length)
      if (n === this.layeredGraph.BaseGraph.nodes[i]) continue
      const nc = n.boundaryCurve

      if (Curve.CurvesIntersect(nc, curve)) {
        //  SvgDebugWriter.dumpICurves('./tmp/cross.svg', [nc, curve])
        return false
      }
    }

    return true
  }

  private RemoveVerticesWithNoTurns() {
    while (this.RemoveVerticesWithNoTurnsOnePass()) {}
  }

  private RemoveVerticesWithNoTurnsOnePass(): boolean {
    let ret = false
    for (let s: CornerSite = this.headSite; s.next != null && s.next.next != null; s = s.next) {
      if (SmoothedPolylineCalculator.Flat(s.next)) {
        ret = true
        s.next = s.next.next
        // crossing out s.next
        s.next.prev = s
      }
    }

    return ret
  }

  private ExtendCurveToEndpoints(curve: Curve): Curve {
    let p: Point = this.headSite.point
    if (!Point.closeDistEps(p, curve.start)) {
      const nc: Curve = new Curve()
      nc.addSegs([LineSegment.mkPP(p, curve.start), curve])
      curve = nc
    }

    p = this.TailSite.point
    if (!Point.closeDistEps(p, curve.end)) {
      curve.addSegment(LineSegment.mkPP(curve.end, p))
    }

    return curve
  }

  private createFilletCurve(
    curve: Curve,
    t: {
      a: CornerSite
      b: CornerSite
      c: CornerSite
    },
  ) {
    for (; true; ) {
      this.AddSmoothedCorner(t.a, t.b, t.c, curve)
      t.a = t.b
      t.b = t.c
      if (t.b.next != null) {
        t.c = t.b.next
      } else {
        break
      }
    }
  }
  private AddSmoothedCorner(a: CornerSite, b: CornerSite, c: CornerSite, curve: Curve) {
    let k = 0.5
    let seg: BezierSeg
    do {
      seg = Curve.createBezierSeg(k, k, a, b, c)
      // SvgDebugWriter.dumpDebugCurves(
      //  './tmp/' + ++SmoothedPolylineCalculator.count + 'sm.svg',
      //  this.getDebugCurvesForCorner(a, b, c),
      // )
      b.previouisBezierCoefficient = k
      k /= 2
    } while (this.BezierSegIntersectsBoundary(seg))

    k *= 2
    // that was the last k
    if (k < 0.5) {
      // one time try a smoother seg
      k = 0.5 * (k + k * 2)
      const nseg: BezierSeg = Curve.createBezierSeg(k, k, a, b, c)
      if (!this.BezierSegIntersectsBoundary(nseg)) {
        b.nextBezierCoefficient = k
        b.previouisBezierCoefficient = k
        seg = nseg
      }
    }

    if (curve.segs.length > 0 && !Point.closeDistEps(curve.end, seg.start)) {
      curve.addSegment(LineSegment.mkPP(curve.end, seg.start))
    }

    curve.addSegment(seg)
  }

  // getDebugCurvesForCorner(
  //  a: CornerSite,
  //  b: CornerSite,
  //  c: CornerSite,
  // ): //import{('../../math/geometry/debugCurve').}DebugCurve[] {
  //  let r = []
  //  r = r.concat(getHierDC(this.thinWestHierarchy, 'Red'))
  //  r = r.concat(getHierDC(this.westHierarchy, 'Orange'))
  //  r = r.concat(getHierDC(this.eastHierarchy, 'Blue'))
  //  r = r.concat(getHierDC(this.thinEastHierarchy, 'Green'))

  //  for (const a of this.anchors) {
  //    r.push(DebugCurve.mkDebugCurveTWCI(100, 0.3, 'Gray', a.polygonalBoundary))
  //  }
  //  r.push(
  //    DebugCurve.mkDebugCurveTWCI(
  //      100,
  //      2,
  //      'Blue',
  //      LineSegment.mkPP(a.point, b.point),
  //    ),
  //  )
  //  r.push(
  //    DebugCurve.mkDebugCurveTWCI(
  //      100,
  //      2,
  //      'Blue',
  //      LineSegment.mkPP(b.point, c.point),
  //    ),
  //  )
  //  const p = new Polyline()
  //  for (let i = 0; i <= this.edgePath.count; i++) {
  //    p.addPoint(this.EdgePathPoint(i))
  //  }
  //  r.push(DebugCurve.mkDebugCurveTWCI(100, 1, 'Yellow', p))

  //  return r
  // }

  private BezierSegIntersectsBoundary(seg: BezierSeg): boolean {
    const side: number = Point.signedDoubledTriangleArea(seg.B(0), seg.B(1), seg.B(2))
    if (side < 0) {
      return this.BezierSegIntersectsTree(seg, this.thinWestHierarchy) || this.BezierSegIntersectsTree(seg, this.westHierarchy)
    } else {
      return this.BezierSegIntersectsTree(seg, this.thinEastHierarchy) || this.BezierSegIntersectsTree(seg, this.eastHierarchy)
    }
  }

  private BezierSegIntersectsTree(seg: BezierSeg, tree: PN): boolean {
    if (tree == null) return false
    if (Parallelogram.intersect(seg.pNodeOverICurve().parallelogram, tree.parallelogram)) {
      if (tree.node.hasOwnProperty('children')) {
        const n = tree.node as PNInternal
        return this.BezierSegIntersectsTree(seg, n.children[0]) || this.BezierSegIntersectsTree(seg, n.children[1])
      } else {
        return SmoothedPolylineCalculator.BezierSegIntersectsBoundary(seg, tree.seg)
      }
    } else {
      return false
    }
  }

  static BezierSegIntersectsBoundary(seg: BezierSeg, ic: ICurve): boolean {
    for (const x of Curve.getAllIntersections(seg, ic, false)) {
      if (ic instanceof Curve) {
        const c: Curve = <Curve>ic
        if (Curve.realCutWithClosedCurve(x, c, false)) {
          return true
        }
      } else {
        // curve is from a thin hierarchy that's forbidden to touch
        return true
      }
    }

    return false
  }
}
// function getHierDC(hierarchy: PN, color: string): DebugCurve[] {
//  if (hierarchy == null  || hierarchy.node == null ) return []
//  if (hierarchy.node.hasOwnProperty('children')) {
//    const n = hierarchy.node as PNInternal
//    return getHierDC(n.children[0], color).concat(
//      getHierDC(n.children[1], color),
//    )
//  }
//  return [DebugCurve.mkDebugCurveTWCI(100, 0.5, color, hierarchy.seg)]
// }
