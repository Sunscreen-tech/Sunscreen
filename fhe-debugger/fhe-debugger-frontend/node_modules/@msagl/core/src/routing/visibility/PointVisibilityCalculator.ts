// following "Visibility Algorithms in the Plane", Ghosh

import {Point} from '../..'
import {Polyline, GeomConstants} from '../../math/geometry'
import {TriangleOrientation} from '../../math/geometry/point'
import {PolylinePoint} from '../../math/geometry/polylinePoint'
import {BinaryHeapWithComparer} from '../../structs/BinaryHeapWithComparer'
import {RBNode} from '../../math/RBTree/rbNode'
import {RBTree} from '../../math/RBTree/rbTree'

import {ActiveEdgeComparerWithRay} from './ActiveEdgeComparerWithRay'
import {Stem} from './Stem'
import {StemStartPointComparer} from './StemStartPointComparer'
import {TollFreeVisibilityEdge} from './TollFreeVisibilityEdge'
import {VisibilityGraph} from './VisibilityGraph'
import {VisibilityKind} from './VisibilityKind'
import {VisibilityVertex} from './VisibilityVertex'

export class PointVisibilityCalculator {
  activeEdgeComparer: ActiveEdgeComparerWithRay
  activeSidesTree: RBTree<PolylinePoint>

  // A mapping from sides to their RBNodes

  sideNodes: Map<PolylinePoint, RBNode<PolylinePoint>> = new Map<PolylinePoint, RBNode<PolylinePoint>>()

  heapForSorting: BinaryHeapWithComparer<Stem>

  visibilityGraph: VisibilityGraph

  visibilityKind: VisibilityKind

  // These are parts of hole boundaries visible from q where each node is taken in isolation

  visibleBoundaries: Map<Polyline, Stem> = new Map<Polyline, Stem>()

  q: Point

  qPolylinePoint: PolylinePoint
  qV: VisibilityVertex

  get QVertex(): VisibilityVertex {
    return this.qV
  }

  set QVertex(value: VisibilityVertex) {
    this.qV = value
  }

  // the sorted list of possibly visible vertices
  sortedListOfPolypoints: Array<PolylinePoint> = new Array<PolylinePoint>()

  // We suppose that the holes are convex, oriented clockwise, and are mutually disjoint
  holes: Array<Polyline>

  // "point" can belong to the boundary of one of the holes
  // tangent or regural visibility
  // "qVertex" : the graph vertex corresponding to the pivot
  static CalculatePointVisibilityGraph(
    listOfHoles: Iterable<Polyline>,
    visibilityGraph: VisibilityGraph,
    point: Point,
    visibilityKind: VisibilityKind,
  ): VisibilityVertex {
    // maybe there is nothing to do
    const qv = visibilityGraph.FindVertex(point)
    if (qv != null) {
      return qv
    }

    const calculator = new PointVisibilityCalculator(listOfHoles, visibilityGraph, point, visibilityKind)
    calculator.FillGraph()
    return calculator.QVertex
  }

  FillGraph() {
    this.ComputeHoleBoundariesPossiblyVisibleFromQ()
    if (this.visibleBoundaries.size > 0) {
      this.SortSAndInitActiveSides()
      // CheckActiveSidesAreConsistent();
      this.Sweep()
    }
  }

  // sorts the set of potentially visible vertices around point q

  SortSAndInitActiveSides() {
    this.InitHeapAndInsertActiveSides()
    for (let stem: Stem = this.heapForSorting.GetMinimum(); ; stem = this.heapForSorting.GetMinimum()) {
      this.sortedListOfPolypoints.push(stem.Start)
      if (stem.MoveStartClockwise()) {
        this.heapForSorting.ChangeMinimum(stem)
      } else {
        this.heapForSorting.Dequeue()
      }

      if (this.heapForSorting.Count === 0) {
        break
      }
    }
  }

  InitHeapAndInsertActiveSides() {
    for (const pp of this.GetInitialVisibleBoundaryStemsAndInsertActiveSides()) {
      this.heapForSorting.Enqueue(pp)
    }
  }

  // these are chuncks of the visible boundaries growing from the polyline  point just above its crossing with the horizontal ray or
  // from the visible part start
  // In the general case we have two stems from one polyline

  *GetInitialVisibleBoundaryStemsAndInsertActiveSides(): IterableIterator<Stem> {
    for (const [hole, stem] of this.visibleBoundaries) {
      let crosses = false
      for (const side of stem.Sides()) {
        const source: PolylinePoint = side
        if (source.point.y < this.q.y) {
          if (side.nextOnPolyline.point.y >= this.q.y) {
            const orientation: TriangleOrientation = Point.getTriangleOrientation(this.q, source.point, side.nextOnPolyline.point)
            if (orientation === TriangleOrientation.Counterclockwise || orientation === TriangleOrientation.Collinear) {
              crosses = true
              // we have two stems here
              yield new Stem(stem.Start, side)
              yield new Stem(side.nextOnPolyline, stem.End)
              this.RegisterActiveSide(side)
              break
            }
          }
        } else if (source.point.y > this.q.y) {
          break
        } else if (side.point.x >= this.q.x) {
          // we have pp.Y==q.Y
          crosses = true
          // we need to add one or two stems here
          yield new Stem(side, stem.End)
          if (side !== stem.Start) {
            yield new Stem(stem.Start, hole.prev(source))
          }
          this.RegisterActiveSide(side)
          break
        }
      }

      // there is no intersection with the ray
      if (!crosses) {
        yield stem
      }
    }
  }

  RegisterActiveSide(side: PolylinePoint) {
    this.activeEdgeComparer.IntersectionOfTheRayAndInsertedEdge = this.activeEdgeComparer.IntersectEdgeWithRay(side, new Point(1, 0))
    this.sideNodes.set(side, this.activeSidesTree.insert(side))
  }

  // private Polyline GetPolylineBetweenPolyPointsTest(Polyline hole, PolylinePoint p0, PolylinePoint p1) {
  //    Polyline ret = new Polyline();
  //    while (p0 !== p1) {
  //        ret.AddPoint(p0.Point);
  //        p0 = hole.Next(p0);
  //    }
  //    ret.AddPoint(p1.Point);
  //    return ret;
  // }
  constructor(holes: Iterable<Polyline>, visibilityGraph: VisibilityGraph, point: Point, visibilityKind: VisibilityKind) {
    this.holes = Array.from(holes)
    // this.graphOfHoleBoundaries = holeBoundariesGraph;
    this.visibilityGraph = visibilityGraph
    this.q = point
    this.qPolylinePoint = PolylinePoint.mkFromPoint(this.q)
    this.QVertex = this.visibilityGraph.AddVertexP(this.qPolylinePoint.point)
    this.visibilityKind = visibilityKind
    const comp = new StemStartPointComparer(this.q)
    this.heapForSorting = new BinaryHeapWithComparer<Stem>(comp.IComparer.bind(comp))
  }

  Sweep() {
    for (const polylinePoint of this.sortedListOfPolypoints) {
      this.SweepPolylinePoint(polylinePoint)
    }
  }

  // this code will work for convex holes

  SweepPolylinePoint(v: PolylinePoint) {
    const inSide: PolylinePoint = PointVisibilityCalculator.GetIncomingSide(v)
    const outSide: PolylinePoint = this.GetOutgoingSide(v)
    // if (inEdge != null && outEdge != null)
    //    SugiyamaLayoutSettings.Show(new LineSegment(inEdge.Start.Point, inEdge.End.Point), new LineSegment(outEdge.Start.Point,
    //        outEdge.End.Point), new LineSegment(this.q, v.Point));
    // else if (inEdge != null)
    //    SugiyamaLayoutSettings.Show(new LineSegment(inEdge.Start.Point, inEdge.End.Point), new LineSegment(this.q, v.Point));
    // else if (outEdge != null)
    //    SugiyamaLayoutSettings.Show(new LineSegment(outEdge.Start.Point, outEdge.End.Point), new LineSegment(this.q, v.Point));
    this.activeEdgeComparer.IntersectionOfTheRayAndInsertedEdge = v.point
    let node: RBNode<PolylinePoint>
    if ((node = this.sideNodes.get(inSide))) {
      // we have an active edge
      if (node === this.activeSidesTree.treeMinimum()) {
        this.AddEdge(v)
      }

      if (outSide != null) {
        node.item = outSide
        // just replace the edge since the order does not change
        this.sideNodes.set(outSide, node)
      } else {
        const changedNode: RBNode<PolylinePoint> = this.activeSidesTree.deleteSubTree(node)
        if (changedNode != null) {
          if (changedNode.item != null) {
            this.sideNodes.set(changedNode.item, changedNode)
          }
        }
      }

      this.sideNodes.delete(inSide)
    } else if (outSide != null) {
      let outsideNode: RBNode<PolylinePoint>
      if (!(outsideNode = this.sideNodes.get(outSide))) {
        outsideNode = this.activeSidesTree.insert(outSide)
        this.sideNodes.set(outSide, outsideNode)
        if (outsideNode === this.activeSidesTree.treeMinimum()) {
          this.AddEdge(v)
        }
      }
    } else {
      throw new Error()
    }
  }

  AddEdge(v: PolylinePoint) {
    if (
      this.visibilityKind === VisibilityKind.Regular ||
      (this.visibilityKind === VisibilityKind.Tangent && PointVisibilityCalculator.LineTouchesPolygon(this.QVertex.point, v))
    ) {
      this.visibilityGraph.AddEdgeF(this.QVertex.point, v.point, (a, b) => new TollFreeVisibilityEdge(a, b))
    }
  }

  static LineTouchesPolygon(a: Point, p: PolylinePoint): boolean {
    const prev: Point = p.polyline.prev(p).point
    const next: Point = p.polyline.next(p).point
    const v: Point = p.point
    return Point.signedDoubledTriangleArea(a, v, prev) * Point.signedDoubledTriangleArea(a, v, next) >= 0
  }

  // ReSharper disable UnusedMember.Local
  /*
        DrawActiveEdgesAndVisibleGraph() {
            // ReSharper restore UnusedMember.Local
            let l = new Array<ICurve>();
            for (let pe: VisibilityEdge in this.visibilityGraph.Edges) {
                l.Add(new LineSegment(pe.SourcePoint, pe.TargetPoint));
            }
            
            for (let pe: PolylinePoint in this.activeSidesTree) {
                l.Add(new LineSegment(pe.Point, pe.NextOnPolyline.Point));
            }
            
            l.Add(new Ellipse(0.1, 0.1, this.q));
            LayoutAlgorithmSettings.Show(l.ToArray());
        }
  */

  GetOutgoingSide(v: PolylinePoint): PolylinePoint {
    const visibleStem: Stem = this.visibleBoundaries.get(v.polyline)
    if (v === visibleStem.End) {
      return null
    }

    return v
  }

  static GetIncomingSide(v: PolylinePoint): PolylinePoint {
    return v.prevOnPolyline
  }

  ComputeHoleBoundariesPossiblyVisibleFromQ() {
    this.InitActiveEdgesAndActiveEdgesComparer()
    for (const hole of this.holes) {
      this.ComputeVisiblePartOfTheHole(hole)
    }
  }

  InitActiveEdgesAndActiveEdgesComparer() {
    this.activeEdgeComparer = new ActiveEdgeComparerWithRay()
    this.activeEdgeComparer.pivot = this.q
    this.activeSidesTree = new RBTree<PolylinePoint>(this.activeEdgeComparer.Compare.bind(this.activeEdgeComparer))
  }

  ComputeVisiblePartOfTheHole(hole: Polyline) {
    // find a separating edge
    let a: PolylinePoint
    let needToGoCounterclockWise = true
    for (a = hole.startPoint; !this.HoleSideIsVisibleFromQ(hole, a); a = hole.next(a)) {
      //Assert.assert(needToGoCounterclockWise || a !== hole.startPoint)
      // check that we have not done the full circle
      needToGoCounterclockWise = false
    }

    let b: PolylinePoint = hole.next(a)
    // now the side a, a.Next - is separating
    if (needToGoCounterclockWise) {
      while (this.HoleSideIsVisibleFromQ(hole, hole.prev(a))) {
        a = hole.prev(a)
      }
    }

    // go clockwise starting from b
    for (; this.HoleSideIsVisibleFromQ(hole, b); b = hole.next(b)) {}

    this.visibleBoundaries.set(hole, new Stem(a, b))
  }

  HoleSideIsVisibleFromQ(hole: Polyline, b: PolylinePoint): boolean {
    return Point.signedDoubledTriangleArea(this.q, b.point, hole.next(b).point) >= -GeomConstants.squareOfDistanceEpsilon
  }
}
