import {CornerSite} from '../../math/geometry/cornerSite'
import {CurveFactory} from '../../math/geometry/curveFactory'
import {DebugCurve} from '../../math/geometry/debugCurve'
//import{ {DebugCurve} from '../../math/geometry/}DebugCurve'
import {GeomConstants} from '../../math/geometry/geomConstants'
import {Point} from '../../math/geometry/point'
import {closeDistEps} from '../../utils/compare'
import {randomInt} from '../../utils/random'
import {GeomGraph} from '../core/geomGraph'
import {Anchor} from './anchor'
import {LayerArrays} from './LayerArrays'
import {LayerEdge} from './layerEdge'
import {NodeKind} from './NodeKind'
import {ProperLayeredGraph} from './ProperLayeredGraph'

type Points = () => Array<Point>

export class RefinerBetweenTwoLayers {
  topNode: number

  bottomNode: number

  topSite: CornerSite

  bottomSite: CornerSite

  currentTopSite: CornerSite

  currentBottomSite: CornerSite

  layerArrays: LayerArrays

  layeredGraph: ProperLayeredGraph

  originalGraph: GeomGraph

  topCorners: () => IterableIterator<Point>

  bottomCorners: () => IterableIterator<Point>

  anchors: Anchor[]

  layerSeparation: number

  constructor(
    topNodeP: number,
    bottomNodeP: number,
    topSiteP: CornerSite,
    layerArraysP: LayerArrays,
    layeredGraphP: ProperLayeredGraph,
    originalGraphP: GeomGraph,
    anchorsP: Anchor[],
    layerSeparation: number,
  ) {
    this.topNode = topNodeP
    this.bottomNode = bottomNodeP
    this.topSite = topSiteP
    this.bottomSite = topSiteP.next
    this.currentTopSite = topSiteP
    this.currentBottomSite = topSiteP.next
    this.layerArrays = layerArraysP
    this.layeredGraph = layeredGraphP
    this.originalGraph = originalGraphP
    this.anchors = anchorsP
    this.layerSeparation = layerSeparation
  }

  static Refine(
    topNodeP: number,
    bottomNode: number,
    topSiteP: CornerSite,
    anchors: Anchor[],
    layerArraysP: LayerArrays,
    layeredGraph: ProperLayeredGraph,
    originalGraph: GeomGraph,
    layerSeparation: number,
  ) {
    const refiner: RefinerBetweenTwoLayers = new RefinerBetweenTwoLayers(
      topNodeP,
      bottomNode,
      topSiteP,
      layerArraysP,
      layeredGraph,
      originalGraph,
      anchors,
      layerSeparation,
    )
    refiner.Refine()
  }

  Refine() {
    this.Init()
    while (this.InsertSites()) {}
  }

  private FixCorner(start: Point, corner: Point, end: Point): Point {
    if (start.equal(corner)) {
      return corner
    }

    const a: Point = Point.ClosestPointAtLineSegment(corner, start, end)
    let offsetInTheChannel: Point = corner.sub(a)
    const y = Math.abs(offsetInTheChannel.y)
    const sep = this.layerSeparation / 2
    if (y > sep) {
      offsetInTheChannel = offsetInTheChannel.mul(sep / (y * 2))
    }

    return offsetInTheChannel.add(corner)
  }

  private InsertSites(): boolean {
    if (randomInt(2) === 0) {
      return this.CalculateNewTopSite() || this.CalculateNewBottomSite()
    } else {
      return this.CalculateNewBottomSite() || this.CalculateNewTopSite()
    }
  }

  // circimvating from the side

  CalculateNewBottomSite(): boolean {
    const mainSeg = this.currentBottomSite.point.sub(this.currentTopSite.point)
    let cotan: number = RefinerBetweenTwoLayers.absCotan(mainSeg)
    let vOfNewSite: Point
    let someBottomCorners = false
    for (const p of this.bottomCorners()) {
      const cornerCotan: number = RefinerBetweenTwoLayers.absCotan(p.sub(this.currentBottomSite.point))
      if (cornerCotan < cotan) {
        cotan = cornerCotan
        vOfNewSite = p
        someBottomCorners = true
      }
    }

    if (!someBottomCorners) {
      return false
    }

    if (!closeDistEps(cotan, RefinerBetweenTwoLayers.absCotan(mainSeg))) {
      this.currentBottomSite = CornerSite.mkSiteSPS(
        this.currentTopSite,
        this.FixCorner(this.currentTopSite.point, vOfNewSite, this.currentBottomSite.point),
        this.currentBottomSite,
      )
      // consider a different FixCorner
      return true
    }

    return false
    // no progress
  }

  private static absCotan(mainSeg: Point): number {
    return Math.abs(mainSeg.x / mainSeg.y)
  }

  private CalculateNewTopSite(): boolean {
    const mainSeg: Point = this.currentBottomSite.point.sub(this.currentTopSite.point)
    let cotan: number = RefinerBetweenTwoLayers.absCotan(mainSeg)
    let vOfNewSite: Point
    let someTopCorners = false
    for (const p of this.topCorners()) {
      const cornerCotan: number = RefinerBetweenTwoLayers.absCotan(p.sub(this.currentTopSite.point))
      if (cornerCotan < cotan) {
        cotan = cornerCotan
        vOfNewSite = p
        someTopCorners = true
      }
    }

    if (!someTopCorners) {
      return false
    }

    if (!closeDistEps(cotan, RefinerBetweenTwoLayers.absCotan(mainSeg))) {
      this.currentTopSite = CornerSite.mkSiteSPS(
        this.currentTopSite,
        this.FixCorner(this.currentTopSite.point, vOfNewSite, this.currentBottomSite.point),
        this.currentBottomSite,
      )
      // consider a different FixCorner
      return true
    }

    return false
    // no progress
  }

  // private CornerSite AvoidBottomLayer() {
  //    Point corner;
  //    if (StickingCornerFromTheBottomLayer(out corner)) {
  //        corner = FixCorner(this.currentTopSite.v, corner, this.currentBottomSite.v);
  //        return new CornerSite(this.currentTopSite, corner, this.currentBottomSite);
  //    } else
  //        return null;
  // }
  // private CornerSite AvoidTopLayer() {
  //    Point corner;
  //    if (StickingCornerFromTheTopLayer(out corner)) {
  //        corner = FixCorner(this.currentTopSite.v, corner, this.currentBottomSite.v);
  //        return new CornerSite(this.currentTopSite, corner, this.currentBottomSite);
  //    } else
  //        return null;
  // }
  // private bool StickingCornerFromTheTopLayer(out Point corner) {
  //    corner = this.currentBottomSite.v;
  //    foreach (Point l of this.topCorners()) {
  //        Point p = l;
  //        if (this.counterClockwise(ref currentTopSite.v, ref p, ref corner))
  //            corner = p;
  //    }
  //    return corner !== this.currentBottomSite.v;
  // }
  // private bool StickingCornerFromTheBottomLayer(out Point corner) {
  //    corner = this.currentTopSite.v;
  //    foreach (Point l of this.bottomCorners()) {
  //        Point p = l;
  //        if (this.counterClockwise(ref currentBottomSite.v, ref p, ref corner))
  //            corner = p;
  //    }
  //    return corner !== this.currentTopSite.v;
  // }
  private Init() {
    if (this.IsTopToTheLeftOfBottom()) {
      this.topCorners = () => this.CornersToTheRightOfTop()
      this.bottomCorners = () => this.CornersToTheLeftOfBottom()
    } else {
      this.topCorners = () => this.CornersToTheLeftOfTop()
      this.bottomCorners = () => this.CornersToTheRightOfBottom()
    }
  }

  private IsTopToTheLeftOfBottom(): boolean {
    return this.topSite.point.x < this.topSite.next.point.x
  }

  *NodeCorners(node: number): IterableIterator<Point> {
    for (const p of this.anchors[node].polygonalBoundary.polylinePoints()) {
      yield p.point
    }
  }

  *CornersToTheLeftOfBottom(): IterableIterator<Point> {
    const bottomPosition: number = this.layerArrays.x[this.bottomNode]
    const leftMost: number = this.currentTopSite.point.x
    const rightMost: number = this.currentBottomSite.point.x
    for (const node of this.LeftFromTheNode(this.NodeLayer(this.bottomNode), bottomPosition, NodeKind.Bottom, leftMost, rightMost)) {
      for (const p of this.NodeCorners(node)) {
        if (p.y > this.currentBottomSite.point.y && RefinerBetweenTwoLayers.PossibleCorner(leftMost, rightMost, p)) {
          yield p
        }
      }
    }
  }

  *CornersToTheLeftOfTop(): IterableIterator<Point> {
    const topPosition: number = this.layerArrays.x[this.topNode]
    const leftMost: number = this.currentBottomSite.point.x
    const rightMost: number = this.currentTopSite.point.x
    for (const node of this.LeftFromTheNode(this.NodeLayer(this.topNode), topPosition, NodeKind.Top, leftMost, rightMost)) {
      for (const p of this.NodeCorners(node)) {
        if (p.y < this.currentTopSite.point.y && RefinerBetweenTwoLayers.PossibleCorner(leftMost, rightMost, p)) {
          yield p
        }
      }
    }
  }

  *CornersToTheRightOfBottom(): IterableIterator<Point> {
    const bottomPosition: number = this.layerArrays.x[this.bottomNode]
    const leftMost: number = this.currentBottomSite.point.x
    const rightMost: number = this.currentTopSite.point.x
    for (const node of this.RightFromTheNode(this.NodeLayer(this.bottomNode), bottomPosition, NodeKind.Bottom, leftMost, rightMost)) {
      for (const p of this.NodeCorners(node)) {
        if (p.y > this.currentBottomSite.point.y && RefinerBetweenTwoLayers.PossibleCorner(leftMost, rightMost, p)) {
          yield p
        }
      }
    }
  }

  *CornersToTheRightOfTop(): IterableIterator<Point> {
    const topPosition: number = this.layerArrays.x[this.topNode]
    const leftMost: number = this.currentTopSite.point.x
    const rightMost: number = this.currentBottomSite.point.x
    for (const node of this.RightFromTheNode(this.NodeLayer(this.topNode), topPosition, NodeKind.Top, leftMost, rightMost)) {
      for (const p of this.NodeCorners(node)) {
        if (p.y < this.currentTopSite.point.y && RefinerBetweenTwoLayers.PossibleCorner(leftMost, rightMost, p)) {
          yield p
        }
      }
    }
  }

  private static PossibleCorner(leftMost: number, rightMost: number, p: Point): boolean {
    return p.x > leftMost && p.x < rightMost
  }

  private NodeLayer(j: number): number[] {
    return this.layerArrays.Layers[this.layerArrays.y[j]]
  }

  IsLabel(u: number): boolean {
    return this.anchors[u].hasLabel
  }

  private NodeUCanBeCrossedByNodeV(u: number, v: number): boolean {
    if (this.IsLabel(u) || this.IsLabel(v)) {
      return false
    }

    if (this.IsVirtualVertex(u) && this.IsVirtualVertex(v) && this.AdjacentEdgesIntersect(u, v)) {
      return true
    }

    return false
  }

  private AdjacentEdgesIntersect(u: number, v: number): boolean {
    return this.Intersect(this.IncomingEdge(u), this.IncomingEdge(v)) || this.Intersect(this.OutcomingEdge(u), this.OutcomingEdge(v))
  }

  private Intersect(e: LayerEdge, m: LayerEdge): boolean {
    return (this.layerArrays.x[e.Source] - this.layerArrays.x[m.Source]) * (this.layerArrays.x[e.Target] - this.layerArrays.x[m.Target]) < 0
  }

  private IncomingEdge(u: number): LayerEdge {
    for (const le of this.layeredGraph.InEdges(u)) {
      return le
    }

    throw new Error()
  }

  // here u is a virtual vertex
  private OutcomingEdge(u: number): LayerEdge {
    for (const le of this.layeredGraph.OutEdges(u)) {
      return le
    }

    throw new Error()
  }

  IsVirtualVertex(v: number): boolean {
    return v >= this.originalGraph.shallowNodeCount
  }

  *RightFromTheNode(
    layer: number[],
    vPosition: number,
    nodeKind: NodeKind,
    leftMostX: number,
    rightMostX: number,
  ): IterableIterator<number> {
    let b = 0
    let t = 0
    if (nodeKind === NodeKind.Bottom) {
      b = Number.MAX_VALUE
    }

    // we don't have bottom boundaries here since they will be cut off
    if (nodeKind === NodeKind.Top) {
      t = Number.MAX_VALUE
    }

    // we don't have top boundaries here since they will be cut off
    const v: number = layer[vPosition]
    for (let i = vPosition + 1; i < layer.length; i++) {
      const u: number = layer[i]
      if (this.NodeUCanBeCrossedByNodeV(u, v)) {
        continue
      }

      const anchor: Anchor = this.anchors[u]
      if (anchor.left >= rightMostX) {
        break
      }

      if (anchor.right > leftMostX) {
        if (anchor.topAnchor > t + GeomConstants.distanceEpsilon) {
          t = anchor.topAnchor
          yield u
        } else if (anchor.bottomAnchor > b + GeomConstants.distanceEpsilon) {
          b = anchor.bottomAnchor
          yield u
        }
      }
    }
  }

  *LeftFromTheNode(
    layer: number[],
    vPosition: number,
    nodeKind: NodeKind,
    leftMostX: number,
    rightMostX: number,
  ): IterableIterator<number> {
    let b = 0
    let t = 0
    if (nodeKind === NodeKind.Bottom) {
      b = Number.MAX_VALUE
    }

    // we don't have bottom boundaries here since they will be cut off
    if (nodeKind === NodeKind.Top) {
      t = Number.MAX_VALUE
    }

    // we don't have top boundaries here since they will be cut off
    const v: number = layer[vPosition]
    for (let i = vPosition - 1; i > -1; i--) {
      const u: number = layer[i]
      if (this.NodeUCanBeCrossedByNodeV(u, v)) {
        continue
      }

      const anchor: Anchor = this.anchors[u]
      if (anchor.right <= leftMostX) {
        break
      }

      if (anchor.left < rightMostX) {
        if (anchor.topAnchor > t + GeomConstants.distanceEpsilon) {
          t = anchor.topAnchor
          yield u
        } else if (anchor.bottomAnchor > b + GeomConstants.distanceEpsilon) {
          b = anchor.bottomAnchor
          yield u
        }
      }
    }
  }
}
export function getAnchorDebugCurve(a: Anchor): any {
  return DebugCurve.mkDebugCurveTWCI(100, 1, 'black', a.polygonalBoundary)
}

function getCornerDebugCurve(p: Point, color: string) {
  return DebugCurve.mkDebugCurveTWCI(200, 2, color, CurveFactory.mkCircle(10, p))
}
