import {Random} from 'reliable-random'
import {GeomConstants} from '../../math/geometry/geomConstants'
import {Point} from '../../math/geometry/point'
import {Size, Rectangle} from '../../math/geometry/rectangle'
import {Cdt} from '../../routing/ConstrainedDelaunayTriangulation/Cdt'
import {CdtSite} from '../../routing/ConstrainedDelaunayTriangulation/CdtSite'
import {PointSet} from '../../utils/PointSet'

import {GeomNode} from '../core/geomNode'
import {MstLineSweeper} from './MstLineSweeper'
import {MstEdge, MstOnDelaunayTriangulation} from './MstOnDelaunayTriangulation'
import {OverlapRemovalSettings} from './OverlapRemovalSettings'
// Overlap Removal using Minimum Spanning Tree on the delaunay triangulation. The edge weight corresponds to the amount of overlap between two nodes.
export class GTreeOverlapRemoval {
  _settings: OverlapRemovalSettings

  _overlapForLayers: boolean

  lastRunNumberIterations: number

  _nodes: GeomNode[]

  // Settings to be used for the overlap removal, not all of them are used.
  public constructor(settings: OverlapRemovalSettings, nodes: GeomNode[]) {
    this._settings = settings
    this._nodes = nodes
  }

  // Removes the overlap by using the default settings.
  public static RemoveOverlaps(nodes: GeomNode[], nodeSeparation: number) {
    const settings = new OverlapRemovalSettings()
    settings.RandomizationShift = 1
    settings.NodeSeparation = nodeSeparation
    const mst = new GTreeOverlapRemoval(settings, nodes)
    mst.RemoveOverlaps()
  }

  // Removes the overlaps for the given graph.
  public RemoveOverlaps() {
    if (this._nodes.length < 3) {
      this.RemoveOverlapsOnTinyGraph()
      return
    }
    const t = {nodePositions: new Array<Point>(), nodeSizes: new Array<Size>()}
    InitNodePositionsAndBoxes(this._settings, this._nodes, t, this._settings.RandomizationShift)

    this.lastRunNumberIterations = 0
    while (this.OneIteration(t.nodePositions, t.nodeSizes, false)) {
      this.lastRunNumberIterations++
    }

    while (this.OneIteration(t.nodePositions, t.nodeSizes, true)) {
      this.lastRunNumberIterations++
    }

    for (let i = 0; i < this._nodes.length; i++) {
      this._nodes[i].center = t.nodePositions[i]
    }
  }

  RemoveOverlapsOnTinyGraph() {
    if (this._nodes.length === 1) {
      return
    }

    if (this._nodes.length === 2) {
      const a = this._nodes[0]
      const b = this._nodes[1]
      if (Point.closeDistEps(a.center, b.center)) {
        b.center = b.center.add(new Point(0.001, 0))
      }

      const idealDist = this.GetIdealDistanceBetweenTwoNodes(a, b)
      const o = Point.middle(a.center, b.center)
      let dir = a.center.sub(b.center)
      const dist = dir.length
      dir = dir.mul(0.5 * (idealDist / dist))
      a.center = o.add(dir)
      b.center = o.sub(dir)
    }
  }

  GetIdealDistanceBetweenTwoNodes(a: GeomNode, b: GeomNode): number {
    const ab = a.center.sub(b.center)
    const dx: number = Math.abs(ab.x)
    const dy: number = Math.abs(ab.y)
    const w: number = (a.width + b.width) / 2 + this._settings.NodeSeparation

    const h: number = (a.height + b.height) / 2 + this._settings.NodeSeparation
    let scaleX: number = Number.POSITIVE_INFINITY
    let scaleY: number = Number.POSITIVE_INFINITY
    if (dx > GeomConstants.tolerance) {
      scaleX = w / dx
    }
    if (dy > GeomConstants.tolerance) {
      scaleY = h / dy
    }

    return Math.min(scaleX, scaleY) * ab.length
  }

  static AvgEdgeLength(nodes: GeomNode[]): number {
    let count = 0
    let avgEdgeLength = 0
    for (const n of nodes) {
      for (const edge of n.outEdges()) {
        avgEdgeLength += n.center.sub(edge.target.center).length
        count++
      }
    }
    return count > 0 ? avgEdgeLength / count : 1
  }

  // Does one iterations in which a miniminum spanning tree is
  // determined on the delaunay triangulation and finally the tree is extended to resolve the overlaps.
  OneIteration(nodePositions: Point[], nodeSizes: Size[], scanlinePhase: boolean): boolean {
    const ts = new Array<[Point, number]>()
    for (let i = 0; i < nodePositions.length; i++) {
      ts.push([nodePositions[i], i])
    }

    const cdt = Cdt.constructor_(ts)

    cdt.run()
    const siteIndex = new Map<CdtSite, number>()
    for (let i = 0; i < nodePositions.length; i++) {
      siteIndex.set(cdt.PointsToSites.get(nodePositions[i]), i)
    }

    let numCrossings = 0
    const proximityEdges = new Array<MstEdge>()
    for (const site of cdt.PointsToSites.values()) {
      for (const edge of site.Edges) {
        const point1: Point = edge.upperSite.point
        const point2: Point = edge.lowerSite.point
        const i = siteIndex.get(edge.upperSite)
        const j = siteIndex.get(edge.lowerSite)
        /*Assert.assert(Point.closeDistEps(point1, nodePositions[i]))*/
        /*Assert.assert(Point.closeDistEps(point2, nodePositions[j]))*/
        const mstEdge = GTreeOverlapRemoval.GetIdealEdge(i, j, point1, point2, nodeSizes)
        proximityEdges.push(mstEdge)
        if (mstEdge.overlapFactor > 1) {
          numCrossings++
        }
      }
    }

    if (numCrossings === 0 || scanlinePhase) {
      const additionalCrossings: number = this.FindProximityEdgesWithSweepLine(proximityEdges, nodeSizes, nodePositions)
      if (numCrossings === 0 && additionalCrossings === 0) {
        //                    if(nodeSizes.Length>100)
        //                    ShowAndMoveBoxesRemoveLater(null, proximityEdges, nodeSizes, nodePositions, -1);
        return false
      }

      if (numCrossings === 0 && !scanlinePhase) {
        return false
      }
    }

    const treeEdges = MstOnDelaunayTriangulation.GetMst(proximityEdges, nodePositions.length)
    GTreeOverlapRemoval.MoveNodePositions(
      treeEdges,
      nodePositions,
      treeEdges[0].source, // it is the root
    )
    return true
  }

  FindProximityEdgesWithSweepLine(proximityEdges: Array<MstEdge>, nodeSizes: Size[], nodePositions: Point[]): number {
    const mstLineSweeper: MstLineSweeper = new MstLineSweeper(proximityEdges, nodeSizes, nodePositions, this._overlapForLayers)
    return mstLineSweeper.Run()
  }

  // Returns an edge with: i, j, t(overlapFactor), ideal distance, edge weight.
  static GetIdealEdge(i: number, j: number, point1: Point, point2: Point, nodeSizes: Size[]): MstEdge {
    const t = {overlapFactor: 0}
    const idealDist: number = GTreeOverlapRemoval.GetIdealEdgeLength(i, j, point1, point2, nodeSizes, t)
    const length: number = point1.sub(point2).length
    const box1 = Rectangle.mkSizeCenter(nodeSizes[i], point1)
    const box2 = Rectangle.mkSizeCenter(nodeSizes[j], point2)

    const weight = t.overlapFactor > 1 ? length - idealDist : GTreeOverlapRemoval.GetDistanceRects(box1, box2)

    return {
      source: Math.min(i, j),
      target: Math.max(i, j),
      overlapFactor: t.overlapFactor,
      idealDistance: idealDist,
      weight: weight,
    }
  }

  // Returns the ideal edge length, such that the overlap is removed.
  static GetIdealEdgeLength(
    i: number,
    j: number,
    point1: Point,
    point2: Point,
    nodeBoxes: Size[],
    wrapTRes: {overlapFactor: number},
  ): number {
    const p1p2 = point1.sub(point2)
    const dist: number = p1p2.length
    const dx: number = Math.abs(p1p2.x)
    const dy: number = Math.abs(p1p2.y)
    const h: number = (nodeBoxes[i].width + nodeBoxes[j].width) / 2
    const w: number = (nodeBoxes[i].height + nodeBoxes[j].height) / 2
    if (dx >= h || dy >= w) {
      // no overlap
      wrapTRes.overlapFactor = 1
      return p1p2.length
    }
    let t: number
    const accuracy = 1e-10
    if (dx > accuracy) {
      if (dy > accuracy) {
        t = Math.min(h / dx, w / dy)
      } else {
        t = h / dx
      }
    } else if (dy > accuracy) {
      t = w / dy
    } else {
      // the points almost coincide : this should not happen.
      // Anyway, they will be moved away on some random vector
      wrapTRes.overlapFactor = 2 // important that is greater than 1
      return Math.sqrt(h * h + w * w) / 4
    }

    /*Assert.assert(t >= 1)*/

    t = Math.max(t, 1.001) // to be  on the safe side

    wrapTRes.overlapFactor = t
    return t * dist
  }

  // Returns the distance between two given rectangles or zero if they intersect.
  static GetDistanceRects(a: Rectangle, b: Rectangle): number {
    if (a.intersects(b)) {
      return 0
    }

    let dy = 0
    let dx = 0
    if (a.right < b.left) {
      dx = a.left - b.right
    } else if (b.right < a.left) {
      dx = a.left - b.right
    }

    if (a.top < b.bottom) {
      dy = b.bottom - a.top
    } else if (b.top < a.bottom) {
      dy = a.bottom - b.top
    }

    const euclid: number = Math.sqrt(dx * dx + dy * dy)
    return euclid
  }
  /*
  // Shows the current state of the algorithm for debug purposes.
  ShowAndMoveBoxesRemoveLater(treeEdges: Array<MstEdge>, proximityEdges: Array<MstEdge>, nodeSizes: Size[], nodePos: Point[], rootId: number) {
    let l = new Array<DebugCurve>();
    for (let tuple of proximityEdges) {
      l.Add(new DebugCurve(100, 0.5, "black", new LineSegment(nodePos[tuple.Item1], nodePos[tuple.Item2])));
    }

    // just for debug
    let nodeBoxes = new Array(nodeSizes.length);
    for (let i: number = 0; (i < nodePos.length); i++) {
      nodeBoxes[i] = new Rectangle(nodeSizes[i], nodePos[i]);
    }

    l.AddRange(nodeBoxes.Select(() => { }, new DebugCurve(100, 0.3, "green", b.Perimeter())));
    if ((treeEdges != null)) {
      l.AddRange(treeEdges.Select(() => { }, new DebugCurve(200, GTreeOverlapRemoval.GetEdgeWidth(e), "red", new LineSegment(nodePos[e.Item1], nodePos[e.Item2]))));
    }

    if ((rootId >= 0)) {
      l.Add(new DebugCurve(100, 10, "blue", CurveFactory.CreateOctagon(30, 30, nodePos[rootId])));
    }

    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  }

  static GetEdgeWidth(edge: MstEdge): number {
    if ((edge.Item3 > 1)) {
      return 6;
    }

    return 2;
  }
*/
  // Lets the tree grow according to the ideal distances.
  static MoveNodePositions(treeEdges: Array<MstEdge>, nodePositions: Point[], rootNodeId: number) {
    const posOld = nodePositions.map((p) => p.clone())
    const visited = new Set<number>()
    visited.add(rootNodeId)
    for (let i = 0; i < treeEdges.length; i++) {
      const e = treeEdges[i]
      if (visited.has(e.source)) {
        GTreeOverlapRemoval.MoveNode(e.source, e.target, posOld, nodePositions, visited, e.idealDistance)
      } else {
        /*Assert.assert(visited.has(e.target))*/ // hmm, why does this hold?
        GTreeOverlapRemoval.MoveNode(e.target, e.source, posOld, nodePositions, visited, e.idealDistance)
      }
    }
  }

  static MoveNode(standingNode: number, movingNode: number, oldPos: Point[], newPos: Point[], visited: Set<number>, idealDist: number) {
    let dir = oldPos[movingNode].sub(oldPos[standingNode])
    dir = dir.mul(idealDist / dir.length + 0.01)
    newPos[movingNode] = newPos[standingNode].add(dir)
    visited.add(movingNode)
  }

  //
  public GetLastRunIterations(): number {
    return this.lastRunNumberIterations
  }
}

function InitNodePositionsAndBoxes(
  overlapRemovalSettings: OverlapRemovalSettings,
  nodes: GeomNode[],
  t: {nodePositions: Point[]; nodeSizes: Size[]},
  randomizeShift: number,
) {
  t.nodePositions = nodes.map((v) => v.center)
  if (randomizeShift) randomizePoints(t.nodePositions, new Random(0, 0), randomizeShift)
  t.nodeSizes = nodes.map((n) => {
    const s = n.boundingBox.size
    s.width += overlapRemovalSettings.NodeSeparation // this pad with both sides by overlapRemovalSettings.NodeSeparation/2
    s.height += overlapRemovalSettings.NodeSeparation
    return s
  })
}
/** When randomizeAll is true then the points are shifter randomly at the small distance between 0 and epsilon.
 * Otherwise the points are shifted just to avoid the exact repetition.
 */
function randomizePoints(points: Point[], random: Random, randomizationShift: number) {
  const pointSet = new PointSet()
  for (let i = 0; i < points.length; i++) {
    let p: Point = points[i]
    if (randomizationShift || pointSet.has(p)) {
      do {
        const newX: number = p.x + (2 * random.random() - 1) * randomizationShift
        const newY: number = p.y + (2 * random.random() - 1) * randomizationShift
        p = new Point(newX, newY)
      } while (pointSet.has(p))
    }

    points[i] = p
    pointSet.add(p)
  }
}
