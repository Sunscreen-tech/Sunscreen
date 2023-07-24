// sweeps a given direction of cones and adds discovered edges to the graph

import {Point} from '../../..'
import {Polyline, GeomConstants, ICurve, CurveFactory, LineSegment} from '../../../math/geometry'
import {DebugCurve} from '../../../math/geometry/debugCurve'
import {TriangleOrientation} from '../../../math/geometry/point'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {RBNode} from '../../../math/RBTree/rbNode'
import {RBTree} from '../../../math/RBTree/rbTree'

import {closeDistEps} from '../../../utils/compare'
import {PointSet} from '../../../utils/PointSet'
import {LineSweeperBase} from '../../visibility/LineSweeperBase'
import {PortObstacleEvent} from '../../visibility/PortObstacleEvent'
import {TollFreeVisibilityEdge} from '../../visibility/TollFreeVisibilityEdge'
import {VisibilityEdge} from '../../visibility/VisibilityEdge'
import {VisibilityGraph} from '../../visibility/VisibilityGraph'
import {VisibilityVertex} from '../../visibility/VisibilityVertex'
import {BrokenConeSide} from './BrokenConeSide'
import {Cone} from './Cone'
import {ConeClosureEvent} from './ConeClosureEvent'
import {ConeLeftSide} from './ConeLeftSide'
import {ConeRightSide} from './ConeRightSide'
import {ConeSide} from './ConeSide'
import {ConeSideComparer} from './ConeSideComparer'
import {LeftIntersectionEvent} from './LeftIntersectionEvent'
import {LeftObstacleSide} from './LeftObstacleSide'
import {LeftVertexEvent} from './LeftVertexEvent'
import {ObstacleSide} from './ObstacleSide'
import {RightIntersectionEvent} from './RightIntersectionEvent'
import {RightObstacleSide} from './RightObstacleSide'
import {RightVertexEvent} from './RightVertexEvent'
import {SweepEvent} from './SweepEvent'
import {VertexEvent} from './VertexEvent'

export class LineSweeper extends LineSweeperBase /*implements IConeSweeper*/ {
  ConeRightSideDirection: Point
  ConeLeftSideDirection: Point

  coneSideComparer: ConeSideComparer

  visibilityGraph: VisibilityGraph

  rightConeSides: RBTree<ConeSide>

  leftConeSides: RBTree<ConeSide>

  portEdgesGraph: VisibilityGraph

  PortEdgesCreator: (a: VisibilityVertex, b: VisibilityVertex) => VisibilityEdge

  private constructor(
    obstacles: Array<Polyline>,
    direction: Point,
    coneRsDir: Point,
    coneLsDir: Point,
    visibilityGraph: VisibilityGraph,
    ports: PointSet,
    borderPolyline: Polyline,
  ) {
    super(obstacles, direction)
    this.visibilityGraph = visibilityGraph
    this.ConeRightSideDirection = coneRsDir
    this.ConeLeftSideDirection = coneLsDir
    this.coneSideComparer = new ConeSideComparer(this)
    this.leftConeSides = new RBTree<ConeSide>((a, b) => this.coneSideComparer.Compare(<ConeSide>a, <ConeSide>b))
    this.rightConeSides = new RBTree<ConeSide>((a, b) => this.coneSideComparer.Compare(<ConeSide>a, <ConeSide>b))
    this.Ports = ports
    this.BorderPolyline = borderPolyline
    this.PortEdgesCreator = (a, b) => {
      return new TollFreeVisibilityEdge(a, b, 0)
    }
  }

  BorderPolyline: Polyline

  static Sweep(
    obstacles: Array<Polyline>,
    direction: Point,
    coneAngle: number,
    visibilityGraph: VisibilityGraph,
    ports: PointSet,
    borderPolyline: Polyline,
  ) {
    const cs = new LineSweeper(
      obstacles,
      direction,
      direction.rotate(-coneAngle / 2),
      direction.rotate(coneAngle / 2),
      visibilityGraph,
      ports,
      borderPolyline,
    )
    cs.Calculate()
  }

  Calculate() {
    this.InitQueueOfEvents()
    while (this.EventQueue.Count > 0) {
      this.ProcessEvent(this.EventQueue.Dequeue())
    }

    if (this.BorderPolyline != null) {
      this.CloseRemainingCones()
    }

    this.CreatePortEdges()
  }

  CreatePortEdges() {
    if (this.portEdgesGraph != null) {
      for (const edge of this.portEdgesGraph.Edges) {
        this.visibilityGraph.AddEdgeF(edge.SourcePoint, edge.TargetPoint, this.PortEdgesCreator)
      }
    }
  }

  CloseRemainingCones() {
    if (this.leftConeSides.count === 0) {
      return
    }

    //Assert.assert(this.leftConeSides.count === this.rightConeSides.count)
    let p: PolylinePoint = this.BorderPolyline.startPoint
    let steps = this.leftConeSides.count
    // we cannot make more than leftConeSides.Count if the data is correct
    // because at each step we remove at least one cone
    do {
      const cone = this.leftConeSides.treeMinimum().item.Cone
      p = this.FindPolylineSideIntersectingConeRightSide(p, cone)
      p = this.GetPolylinePointInsideOfConeAndRemoveCones(p, cone)
      steps--
    } while (this.leftConeSides.count > 0 && steps > 0)
  }

  GetPolylinePointInsideOfConeAndRemoveCones(p: PolylinePoint, cone: Cone): PolylinePoint {
    const pn = p.nextOnPolyline
    const insidePoint: Point = LineSweeper.FindInsidePoint(p.point, pn.point, cone)
    if (Point.closeDistEps(insidePoint, p.point)) {
      this.AddEdgeAndRemoveCone(cone, p.point)
      this.AddEdgesAndRemoveRemainingConesByPoint(p.point)
      // we don't move p forward here. In the next iteration we just cross [p,pn] with the new leftmost cone right side
    } else if (Point.closeDistEps(insidePoint, pn.point)) {
      this.AddEdgeAndRemoveCone(cone, pn.point)
      this.AddEdgesAndRemoveRemainingConesByPoint(pn.point)
      p = pn
    } else {
      p = LineSweeper.InsertPointIntoPolylineAfter(this.BorderPolyline, p, insidePoint)
      this.AddEdgeAndRemoveCone(cone, p.point)
      this.AddEdgesAndRemoveRemainingConesByPoint(p.point)
    }

    return p
  }

  static FindInsidePoint(leftPoint: Point, rightPoint: Point, cone: Cone): Point {
    //            if (debug)
    //                LayoutAlgorithmSettings.Show(CurveFactory.CreateCircle(3, leftPoint),
    //                                             CurveFactory.CreateDiamond(3, 3, rightPoint),
    //                                             BorderPolyline, ExtendSegmentToZ(cone.LeftSide),
    //                                             ExtendSegmentToZ(cone.RightSide));
    return LineSweeper.FindInsidePointBool(
      leftPoint,
      rightPoint,
      cone.Apex,
      cone.Apex.add(cone.LeftSideDirection),
      cone.Apex.add(cone.RightSideDirection),
    )
  }

  static FindInsidePointBool(leftPoint: Point, rightPoint: Point, apex: Point, leftSideConePoint: Point, rightSideConePoint: Point): Point {
    if (Point.closeDistEps(leftPoint, rightPoint)) {
      return leftPoint
    }

    // does not matter which one to return
    if (Point.PointIsInsideCone(leftPoint, apex, leftSideConePoint, rightSideConePoint)) {
      return leftPoint
    }

    if (Point.PointIsInsideCone(rightPoint, apex, leftSideConePoint, rightSideConePoint)) {
      return rightPoint
    }

    const m = Point.middle(leftPoint, rightPoint)
    if (Point.pointToTheLeftOfLine(m, apex, leftSideConePoint)) {
      return LineSweeper.FindInsidePointBool(m, rightPoint, apex, leftSideConePoint, rightSideConePoint)
    }

    return LineSweeper.FindInsidePointBool(leftPoint, m, apex, leftSideConePoint, rightSideConePoint)
  }

  AddEdgesAndRemoveRemainingConesByPoint(point: Point) {
    const conesToRemove = new Array<Cone>()
    for (const leftConeSide of this.leftConeSides) {
      if (Point.PointToTheRightOfLineOrOnLine(point, leftConeSide.Start, leftConeSide.Start.add(leftConeSide.Direction))) {
        conesToRemove.push(leftConeSide.Cone)
      } else {
        break
      }
    }
    for (const cone of conesToRemove) this.AddEdgeAndRemoveCone(cone, point)
  }

  FindPolylineSideIntersectingConeRightSide(p: PolylinePoint, cone: Cone): PolylinePoint {
    const startPoint = p
    const a = cone.Apex
    const b = cone.Apex.add(this.ConeRightSideDirection)
    let pSign = LineSweeper.GetSign(p, a, b)
    for (; true; ) {
      const pn = p.nextOnPolyline
      const pnSigh = LineSweeper.GetSign(pn, a, b)
      if (pnSigh - pSign > 0) {
        return p
      }

      p = pn
      pSign = pnSigh
      if (p === startPoint) {
        throw new Error('cannod decide if the polyline intersects the cone!')
        //Assert.assert(false)
      }
    }
  }

  // #if TEST_MSAGL
  //         // ReSharper disable UnusedMember.Local

  //         static ICurve Box(Point p) {
  //             // ReSharper restore UnusedMember.Local
  //             return CurveFactory.CreateRectangle(2, 2, p);
  //         }

  //             "CA1303:Do not pass literals as localized parameters", MessageId = "System.Diagnostics.Debug.WriteLine(System.String)"
  //         )]
  //         void PrintOutRightSegTree() {
  //             System.Diagnostics.Debug.WriteLine("right segment tree");
  //             foreach(var t of rightConeSides)
  //             System.Diagnostics.Debug.WriteLine(t);
  //             System.Diagnostics.Debug.WriteLine("end of right segments");
  //         }
  // #endif

  static GetSign(p: PolylinePoint, a: Point, b: Point): number {
    const d = Point.signedDoubledTriangleArea(a, b, p.point)
    if (d < 0) {
      return 1
    }

    return d > 0 ? -1 : 0
  }

  // #if TEST_MSAGL && TEST_MSAGL

  //         void Showside(PolylinePoint p, Point a, Point b, PolylinePoint pn) {
  //             ShowBothTrees(new DebugCurve(100, 1, "brown", BorderPolyline), new DebugCurve(100, 2, "blue",
  //                 new LineSegment(a, b)),
  //                 new DebugCurve(100, 2, "green",
  //                     new LineSegment(
  //                         pn.point, p.point)
  //                 ));
  //         }
  // #endif
  //        void CheckThatPolylineIsLegal()
  //        {
  //            var p = BorderPolyline.startPoint;
  //            do
  //            {
  //                var pn = p.NextOnPolyline;
  //                Assert.assert(!Point.closeDistEps(p.point, pn.point));
  //                Assert.assert((pn.point - p.point)*(pn.NextOnPolyline.point - pn.point) > -GeomConstants.tolerance);
  //                p = pn;
  //            } while (p !== BorderPolyline.startPoint);
  //        }
  // #if TEST_MSAGL

  //         void ShowBoundaryPolyline() {
  //             LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(CreateBoundaryPolyDebugCurves());
  //         }

  //         Array < DebugCurve > CreateBoundaryPolyDebugCurves() {
  //             int i = 0;
  //             for (var p = BorderPolyline.startPoint; p != null; p = p.next) {
  //                 yield return new DebugCurve(new Ellipse(1, 1, p.point), i++);
  //             }
  //         }
  // #endif
  AddEdgeAndRemoveCone(cone: Cone, p: Point) {
    if (this.Ports != null && this.Ports.has(cone.Apex)) {
      this.CreatePortEdge(cone, p)
    } else {
      this.visibilityGraph.AddEdgePP(cone.Apex, p)
    }

    this.RemoveCone(cone)
  }

  CreatePortEdge(cone: Cone, p: Point) {
    if (this.portEdgesGraph == null) {
      this.portEdgesGraph = new VisibilityGraph()
    }

    const coneApexVert = this.portEdgesGraph.FindVertex(cone.Apex)
    // all previous edges adjacent to cone.Apex
    const edgesToFix = coneApexVert != null ? Array.from(coneApexVert.InEdges).concat(Array.from(coneApexVert.OutEdges.allNodes())) : null
    if (edgesToFix) {
      for (const edge of edgesToFix) {
        const otherPort = (edge.Target === coneApexVert ? edge.Source : edge.Target).point
        VisibilityGraph.RemoveEdge(edge)
        this.portEdgesGraph.AddEdgePP(otherPort, p)
      }
    }
    this.portEdgesGraph.AddEdgePP(cone.Apex, p)
  }

  static InsertPointIntoPolylineAfter(borderPolyline: Polyline, insertAfter: PolylinePoint, pointToInsert: Point): PolylinePoint {
    let np: PolylinePoint
    if (insertAfter.next != null) {
      np = PolylinePoint.mkFromPoint(pointToInsert)
      np.prev = insertAfter
      np.next = insertAfter.next
      insertAfter.next.prev = np
      insertAfter.next = np
    } else {
      np = PolylinePoint.mkFromPoint(pointToInsert)
      np.prev = insertAfter
      insertAfter.next = np
      borderPolyline.endPoint = np
    }
    np.polyline = borderPolyline
    // Assert.assert(
    //  !(
    //    Point.closeDistEps(np.point, np.prevOnPolyline.point) ||
    //    Point.closeDistEps(np.point, np.nextOnPolyline.point)
    //  ),
    // )
    borderPolyline.setInitIsRequired()
    return np
  }

  ProcessEvent(p: SweepEvent) {
    // Assert.assert(this.invariant())

    if (p instanceof VertexEvent) {
      this.ProcessVertexEvent(p)
    } else {
      if (p instanceof RightIntersectionEvent) {
        this.ProcessRightIntersectionEvent(p)
      } else {
        if (p instanceof LeftIntersectionEvent) {
          this.ProcessLeftIntersectionEvent(p)
        } else {
          if (p instanceof ConeClosureEvent) {
            if (!p.ConeToClose.Removed) {
              this.RemoveCone(p.ConeToClose)
            }
          } else {
            this.ProcessPortObstacleEvent(<PortObstacleEvent>p)
          }

          this.Z = this.GetZS(p)
        }
      }
    }

    // Assert.assert(TreesAreCorrect());
  }

  // #if TEST_MSAGL
  //        protected override bool TreesAreCorrect() {
  //            return TreeIsCorrect(leftConeSides) && TreeIsCorrect(rightConeSides);
  //        }
  //
  //        bool TreeIsCorrect(RBTree<ConeSide> tree) {
  //            var y = Number.NEGATIVE_INFINITY;
  //            foreach (var t of tree) {
  //                var x = coneSideComparer.IntersectionOfSegmentAndSweepLine(t);
  //                var yp = x*DirectionPerp;
  //                if (yp < y - GeomConstants.distanceEpsilon)
  //                    return false;
  //                y = yp;
  //            }
  //            return true;
  //        }
  // #endif
  ProcessPortObstacleEvent(portObstacleEvent: PortObstacleEvent) {
    this.Z = this.GetZS(portObstacleEvent)
    this.GoOverConesSeeingVertexEvent(portObstacleEvent)
    this.CreateConeOnVertex(portObstacleEvent)
  }

  ProcessLeftIntersectionEvent(leftIntersectionEvent: LeftIntersectionEvent) {
    if (leftIntersectionEvent.coneLeftSide.Removed === false) {
      if (
        Math.abs(leftIntersectionEvent.EndVertex.point.sub(leftIntersectionEvent.Site).dot(this.SweepDirection)) <
        GeomConstants.distanceEpsilon
      ) {
        // the cone is totally covered by a horizontal segment
        this.RemoveCone(leftIntersectionEvent.coneLeftSide.Cone)
      } else {
        this.RemoveSegFromLeftTree(leftIntersectionEvent.coneLeftSide)
        this.Z = this.GetZP(leftIntersectionEvent.Site)
        // it is safe now to restore the order
        const leftSide = new BrokenConeSide(leftIntersectionEvent.Site, leftIntersectionEvent.EndVertex, leftIntersectionEvent.coneLeftSide)
        this.InsertToTree(this.leftConeSides, leftSide)
        leftIntersectionEvent.coneLeftSide.Cone.LeftSide = leftSide
        this.LookForIntersectionOfObstacleSideAndLeftConeSide(leftIntersectionEvent.Site, leftIntersectionEvent.EndVertex)
        this.TryCreateConeClosureForLeftSide(leftSide)
      }
    } else {
      this.Z = this.GetZP(leftIntersectionEvent.Site)
    }
  }

  TryCreateConeClosureForLeftSide(leftSide: BrokenConeSide) {
    if (leftSide.Cone.RightSide instanceof ConeRightSide) {
      const coneRightSide = <ConeRightSide>leftSide.Cone.RightSide
      if (
        Point.getTriangleOrientation(coneRightSide.Start, coneRightSide.Start.add(coneRightSide.Direction), leftSide.EndVertex.point) ==
        TriangleOrientation.Clockwise
      ) {
        this.CreateConeClosureEvent(leftSide, coneRightSide)
      }
    }
  }

  CreateConeClosureEvent(brokenConeSide: BrokenConeSide, otherSide: ConeSide) {
    const x: Point = Point.RayIntersectsRayInteriors(brokenConeSide.start, brokenConeSide.Direction, otherSide.Start, otherSide.Direction)
    if (x) {
      const cc = new ConeClosureEvent(x, brokenConeSide.Cone)
      this.EnqueueEvent(cc)
    }
  }

  ProcessRightIntersectionEvent(rightIntersectionEvent: RightIntersectionEvent) {
    // restore Z for the time being
    // Z = PreviousZ;
    if (!rightIntersectionEvent.coneRightSide.Removed) {
      // it can happen that the cone side participating in the intersection is gone;
      // obstracted by another obstacle or because of a vertex found inside of the cone
      // PrintOutRightSegTree();
      this.RemoveSegFromRightTree(rightIntersectionEvent.coneRightSide)
      this.Z = this.GetZP(rightIntersectionEvent.Site)
      const rightSide = new BrokenConeSide(
        rightIntersectionEvent.Site,
        rightIntersectionEvent.EndVertex,
        rightIntersectionEvent.coneRightSide,
      )
      this.InsertToTree(this.rightConeSides, rightSide)
      rightIntersectionEvent.coneRightSide.Cone.RightSide = rightSide
      this.LookForIntersectionOfObstacleSideAndRightConeSide(rightIntersectionEvent.Site, rightIntersectionEvent.EndVertex)
      this.TryCreateConeClosureForRightSide(rightSide)
    } else {
      this.Z = this.GetZP(rightIntersectionEvent.Site)
    }
  }

  TryCreateConeClosureForRightSide(rightSide: BrokenConeSide) {
    if (rightSide.Cone.LeftSide instanceof ConeLeftSide) {
      const coneLeftSide = rightSide.Cone.LeftSide
      if (
        Point.getTriangleOrientation(coneLeftSide.Start, coneLeftSide.Start.add(coneLeftSide.Direction), rightSide.EndVertex.point) ==
        TriangleOrientation.Counterclockwise
      ) {
        this.CreateConeClosureEvent(rightSide, coneLeftSide)
      }
    }
  }

  RemoveConesClosedBySegment(leftPoint: Point, rightPoint: Point) {
    this.CloseConesCoveredBySegment(
      leftPoint,
      rightPoint,
      this.GetZP(leftPoint) > this.GetZP(rightPoint) ? this.leftConeSides : this.rightConeSides,
    )
  }

  CloseConesCoveredBySegment(leftPoint: Point, rightPoint: Point, tree: RBTree<ConeSide>) {
    //Assert.assert(rightPoint.sub(leftPoint).dot(this.directionPerp) > GeomConstants.distanceEpsilon)
    let node = tree.findFirst(
      (s) => Point.getTriangleOrientation(s.Start, s.Start.add(s.Direction), leftPoint) === TriangleOrientation.Counterclockwise,
    )
    if (node == null) return
    const x: Point = Point.IntervalIntersectsRay(leftPoint, rightPoint, node.item.Start, node.item.Direction)
    if (!x) {
      return
    }

    const conesToRemove = new Array<Cone>()
    do {
      conesToRemove.push(node.item.Cone)
      node = tree.next(node)
    } while (node != null && Point.IntervalIntersectsRay(leftPoint, rightPoint, node.item.Start, node.item.Direction) !== undefined)

    for (const cone of conesToRemove) this.RemoveCone(cone)
  }

  ProcessVertexEvent(vertexEvent: VertexEvent) {
    this.Z = this.GetZS(vertexEvent)
    this.GoOverConesSeeingVertexEvent(vertexEvent)
    this.AddConeAndEnqueueEvents(vertexEvent)
  }

  // #if TEST_MSAGL
  //         // ReSharper disable UnusedMember.Local

  //         static Ellipse EllipseOnVert(SweepEvent vertexEvent) {
  //             // ReSharper restore UnusedMember.Local
  //             return new Ellipse(5, 5, vertexEvent.Site);
  //         }
  //         // ReSharper disable UnusedMember.Local

  //         static Ellipse EllipseOnPolylinePoint(PolylinePoint pp) {
  //             // ReSharper restore UnusedMember.Local
  //             return EllipseOnPolylinePoint(pp, 5);
  //         }
  //         // ReSharper disable UnusedMember.Local

  //         static Ellipse EllipseOnPolylinePoint(PolylinePoint pp, double i)
  //         // ReSharper restore UnusedMember.Local
  //         {
  //             return new Ellipse(i, i, pp.point);
  //         }
  static Diamond(p: Point) {
    return CurveFactory.mkDiamond(2, 2, p)
  }
  //         // ReSharper disable UnusedMember.Local

  //             "CA1303:Do not pass literals as localized parameters", MessageId = "System.Diagnostics.Debug.WriteLine(System.String)"
  //         ),

  //         void CheckConsistency() {
  //             // ReSharper restore UnusedMember.Local
  //             foreach(var s of rightConeSides) {
  //                 coneSideComparer.SetOperand(s);
  //             }
  //             foreach(var s of leftConeSides) {
  //                 coneSideComparer.SetOperand(s);
  //                 if (!rightConeSides.Contains(s.Cone.RightSide)) {
  //                     PrintOutRightSegTree();
  //                     PrintOutLeftSegTree();
  //                     ShowLeftTree();
  //                     ShowRightTree();
  //                 }
  //             }
  //         }

  //         void ShowRightTree(params ICurve[] curves) {
  //             var l = Obstacles.Select(p => new DebugCurve(100, 5, "green", p)).ToList();
  //             l.AddRange(rightConeSides.Select(s => new DebugCurve(100, 5, "blue", ExtendSegmentToZ(s))));
  //             //            foreach (VisibilityEdge edge of visibilityGraph.Edges)
  //             //                l.Add(BezierOnEdge(edge));
  //             l.AddRange(curves.Select(c => new DebugCurve(100, 5, "brown", c)));
  //             LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  //         }

  //         void ShowBothTrees(params DebugCurve[] curves) {
  //             var l = Obstacles.Select(p => new DebugCurve(100, 5, "green", p)).ToList();
  //             l.AddRange(leftConeSides.Select(s => new DebugCurve(ExtendSegmentToZ(s))));
  //             l.AddRange(rightConeSides.Select(s => new DebugCurve(ExtendSegmentToZ(s))));
  //             //            foreach (VisibilityEdge edge of visibilityGraph.Edges)
  //             //                l.Add(BezierOnEdge(edge));
  //             LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  //         }
  //         void ShowLeftTree(params ICurve[] curves) {
  //             var l = Obstacles.Select(p => new DebugCurve(100, 0.01, "green", p)).ToList();
  //             var range = new RealNumberSpan();
  //             var ellipseSize = 0.01;
  //             foreach(var s of leftConeSides) {
  //                 var curve = ExtendSegmentToZ(s);
  //                 range.AddValue(curve.start * DirectionPerp);
  //                 range.AddValue(curve.End * DirectionPerp);
  //                 l.Add(new DebugCurve(100, 0.1, "red", curve));
  //                 l.Add(new DebugCurve(200, 0.1, "black", new Ellipse(ellipseSize, ellipseSize, curve.End)));
  //                 ellipseSize += 2;
  //             }
  //             l.Add(DebugSweepLine(range));
  //             //            foreach (VisibilityEdge edge of visibilityGraph.Edges)
  //             //                l.Add(BezierOnEdge(edge));
  //             l.AddRange(curves.Select(c => new DebugCurve(100, 0.5, "brown", c)));
  //             LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  //         }
  //         DebugCurve DebugSweepLine(RealNumberSpan range) {
  //             var ls = new LineSegment(Z * SweepDirection + DirectionPerp * range.Min, Z * SweepDirection + DirectionPerp * range.Max);
  //             return new DebugCurve(100, 0.1, "magenta", ls);
  //         }
  // #endif
  AddConeAndEnqueueEvents(vertexEvent: VertexEvent) {
    if (vertexEvent instanceof LeftVertexEvent) {
      const nextPoint: PolylinePoint = vertexEvent.Vertex.nextOnPolyline
      this.CloseConesAddConeAtLeftVertex(<LeftVertexEvent>vertexEvent, nextPoint)
    } else {
      if (vertexEvent instanceof RightVertexEvent) {
        const nextPoint: PolylinePoint = vertexEvent.Vertex.prevOnPolyline
        this.CloseConesAddConeAtRightVertex(<RightVertexEvent>vertexEvent, nextPoint)
      } else {
        this.CloseConesAddConeAtLeftVertex(vertexEvent, vertexEvent.Vertex.nextOnPolyline)
        this.CloseConesAddConeAtRightVertex(vertexEvent, vertexEvent.Vertex.prevOnPolyline)
      }
    }
  }

  CloseConesAddConeAtRightVertex(rightVertexEvent: VertexEvent, nextVertex: PolylinePoint) {
    const prevSite = rightVertexEvent.Vertex.nextOnPolyline.point
    if (this.directionPerp.dot(rightVertexEvent.Site.sub(prevSite)) > GeomConstants.distanceEpsilon) {
      this.RemoveConesClosedBySegment(prevSite, rightVertexEvent.Vertex.point)
    }
    if (this.directionPerp.dot(nextVertex.point.sub(rightVertexEvent.Site)) > GeomConstants.distanceEpsilon) {
      this.RemoveConesClosedBySegment(rightVertexEvent.Site, nextVertex.point)
    }

    const site = rightVertexEvent.Site
    const coneLp = site.add(this.ConeLeftSideDirection)
    const coneRp = site.add(this.ConeRightSideDirection)
    const nextSite = nextVertex.point
    // SugiyamaLayoutSettings.Show(new LineSegment(site, coneLP), new LineSegment(site, coneRP), new LineSegment(site, nextSite));
    // try to remove the right side
    if (this.GetZP(site.sub(prevSite)) > GeomConstants.distanceEpsilon) {
      this.RemoveRightSide(new RightObstacleSide(rightVertexEvent.Vertex.nextOnPolyline))
    }

    if (this.GetZP(site.sub(nextVertex.point)) > GeomConstants.distanceEpsilon) {
      this.RemoveLeftSide(new LeftObstacleSide(nextVertex))
    }

    if (this.GetZP(nextSite) + GeomConstants.distanceEpsilon < this.GetZS(rightVertexEvent)) {
      this.CreateConeOnVertex(rightVertexEvent)
    }

    if (!Point.PointToTheRightOfLineOrOnLine(nextSite, site, coneLp)) {
      // if (angle <= -coneAngle / 2) {
      this.CreateConeOnVertex(rightVertexEvent)
      if (Point.PointToTheLeftOfLineOrOnLine(nextSite.add(this.DirectionPerp), nextSite, site)) {
        this.EnqueueRightVertexEvent(new RightVertexEvent(nextVertex))
      }

      //  TryEnqueueRighVertexEvent(nextVertex);
    } else if (Point.PointToTheLeftOfLineOrOnLine(nextSite, site, coneRp)) {
      this.CaseToTheLeftOfLineOrOnLineConeRp(rightVertexEvent, nextVertex)
    } else {
      if (this.GetZP(nextSite.sub(site)) > GeomConstants.distanceEpsilon) {
        this.LookForIntersectionOfObstacleSideAndLeftConeSide(rightVertexEvent.Site, nextVertex)
        this.InsertRightSide(new RightObstacleSide(rightVertexEvent.Vertex))
      }

      this.EnqueueRightVertexEvent(new RightVertexEvent(nextVertex))
    }
  }

  CaseToTheLeftOfLineOrOnLineConeRp(rightVertexEvent: VertexEvent, nextVertex: PolylinePoint) {
    this.EnqueueRightVertexEvent(new RightVertexEvent(nextVertex))
    // the obstacle side is inside of the cone
    // we need to create an obstacle left side segment instead of the left cone side
    const cone = new Cone(rightVertexEvent.Vertex.point, this)
    const obstacleSideSeg = new BrokenConeSide(cone.Apex, nextVertex, new ConeLeftSide(cone))
    cone.LeftSide = obstacleSideSeg
    cone.RightSide = new ConeRightSide(cone)
    const rnode = this.InsertToTree(this.rightConeSides, cone.RightSide)
    this.LookForIntersectionWithConeRightSide(rnode)
    const lnode = this.InsertToTree(this.leftConeSides, cone.LeftSide)
    this.FixConeLeftSideIntersections(obstacleSideSeg, lnode)
    if (this.GetZP(nextVertex.point.sub(rightVertexEvent.Site)) > GeomConstants.distanceEpsilon) {
      this.InsertRightSide(new RightObstacleSide(rightVertexEvent.Vertex))
    }
  }

  LookForIntersectionOfObstacleSideAndRightConeSide(obstacleSideStart: Point, obstacleSideVertex: PolylinePoint) {
    const node: RBNode<ConeSide> = this.GetLastNodeToTheLeftOfPointInRightSegmentTree(obstacleSideStart)
    if (node != null) {
      if (node.item instanceof ConeRightSide) {
        const intersection = Point.IntervalIntersectsRay(
          obstacleSideStart,
          obstacleSideVertex.point,
          node.item.Start,
          this.ConeRightSideDirection,
        )
        if (intersection && this.SegmentIsNotHorizontal(intersection, obstacleSideVertex.point)) {
          this.EnqueueEvent(this.CreateRightIntersectionEvent(<ConeRightSide>node.item, intersection, obstacleSideVertex))
        }
      }
    }
  }

  CreateRightIntersectionEvent(
    coneRightSide: ConeRightSide,
    intersection: Point,
    obstacleSideVertex: PolylinePoint,
  ): RightIntersectionEvent {
    // Assert.assert(
    //  Math.abs(this.GetZP(obstacleSideVertex.point.sub(intersection))) > 0,
    // )
    return new RightIntersectionEvent(coneRightSide, intersection, obstacleSideVertex)
  }

  GetLastNodeToTheLeftOfPointInRightSegmentTree(obstacleSideStart: Point): RBNode<ConeSide> {
    return this.rightConeSides.findLast((s) => LineSweeper.PointIsToTheRightOfSegment(obstacleSideStart, s))
  }

  LookForIntersectionOfObstacleSideAndLeftConeSide(obstacleSideStart: Point, obstacleSideVertex: PolylinePoint) {
    const node = this.GetFirstNodeToTheRightOfPoint(obstacleSideStart)
    //          ShowLeftTree(Box(obstacleSideStart));
    if (node == null) {
      return
    }
    if (!(node.item instanceof ConeLeftSide)) return
    const coneLeftSide = <ConeLeftSide>node.item

    const intersection: Point = Point.IntervalIntersectsRay(
      obstacleSideStart,
      obstacleSideVertex.point,
      coneLeftSide.Start,
      this.ConeLeftSideDirection,
    )
    if (intersection) {
      this.EnqueueEvent(new LeftIntersectionEvent(coneLeftSide, intersection, obstacleSideVertex))
    }
  }

  GetFirstNodeToTheRightOfPoint(p: Point): RBNode<ConeSide> {
    return this.leftConeSides.findFirst((s) => LineSweeper.PointIsToTheLeftOfSegment(p, s))
  }

  static PointIsToTheLeftOfSegment(p: Point, seg: ConeSide): boolean {
    return Point.getTriangleOrientation(seg.Start, seg.Start.add(seg.Direction), p) === TriangleOrientation.Counterclockwise
  }

  static PointIsToTheRightOfSegment(p: Point, seg: ConeSide): boolean {
    return Point.getTriangleOrientation(seg.Start, seg.Start.add(seg.Direction), p) === TriangleOrientation.Clockwise
  }

  FixConeLeftSideIntersections(leftSide: BrokenConeSide, rbNode: RBNode<ConeSide>) {
    // the first intersection can happen only with succesors of leftSide
    // Assert.assert(rbNode != null)
    do {
      // this loop usually works only once
      rbNode = this.leftConeSides.next(rbNode)
    } while (
      rbNode != null &&
      Point.PointToTheRightOfLineOrOnLine(leftSide.Start, rbNode.item.Start, rbNode.item.Start.add(rbNode.item.Direction))
    )

    if (rbNode != null) {
      if (rbNode.item instanceof ConeLeftSide) {
        const seg = <ConeLeftSide>rbNode.item
        const intersection: Point = Point.IntervalIntersectsRay(leftSide.start, leftSide.End, seg.Start, seg.Direction)
        if (intersection) {
          this.EnqueueEvent(new LeftIntersectionEvent(seg, intersection, leftSide.EndVertex))
        }
      }
    }
  }

  InsertToTree(tree: RBTree<ConeSide>, coneSide: ConeSide): RBNode<ConeSide> {
    //Assert.assert(this.GetZP(coneSide.Direction) > 0)
    this.coneSideComparer.SetOperand(coneSide)
    return tree.insert(coneSide)
  }

  CloseConesAddConeAtLeftVertex(leftVertexEvent: VertexEvent, nextVertex: PolylinePoint) {
    // close segments first
    const prevSite = leftVertexEvent.Vertex.prevOnPolyline.point

    if (leftVertexEvent.Site.sub(prevSite).dot(this.directionPerp) < -GeomConstants.distanceEpsilon) {
      // we have a low non-vertical side going to the left from prevSite to leftVertexEvent
      this.RemoveConesClosedBySegment(leftVertexEvent.Site, prevSite)
    }
    if (nextVertex.point.sub(leftVertexEvent.Site).dot(this.directionPerp) < -GeomConstants.distanceEpsilon) {
      this.RemoveConesClosedBySegment(nextVertex.point, leftVertexEvent.Site)
    }
    const site = leftVertexEvent.Site
    const coneLp = site.add(this.ConeLeftSideDirection)
    const coneRp = site.add(this.ConeRightSideDirection)
    const nextSite = nextVertex.point
    // SugiyamaLayoutSettings.Show(new LineSegment(site, coneLP), new LineSegment(site, coneRP), new LineSegment(site, nextSite));
    if (this.GetZP(site.sub(prevSite)) > GeomConstants.distanceEpsilon) {
      this.RemoveLeftSide(new LeftObstacleSide(leftVertexEvent.Vertex.prevOnPolyline))
    }

    const nextDelZ = this.GetZP(nextSite) - this.Z
    if (nextDelZ < -GeomConstants.distanceEpsilon) {
      this.RemoveRightSide(new RightObstacleSide(nextVertex))
    }
    const toNext = nextSite.sub(leftVertexEvent.Site)
    if (
      nextDelZ < -GeomConstants.distanceEpsilon ||
      (closeDistEps(nextDelZ, 0) && this.GetZP(toNext) > 0 && toNext.dot(this.directionPerp) > -GeomConstants.distanceEpsilon)
    ) {
      // if (angle > Math.PI / 2)
      this.CreateConeOnVertex(leftVertexEvent) // it is the last left vertex on this obstacle
    } else if (!Point.PointToTheLeftOfLineOrOnLine(nextSite, site, coneRp)) {
      // if (angle >= coneAngle / 2) {
      this.CreateConeOnVertex(leftVertexEvent)
      this.EnqueueEvent(new LeftVertexEvent(nextVertex))
      // we schedule LeftVertexEvent for a vertex with horizontal segment to the left on the top of the obstace
    } else if (!Point.PointToTheLeftOfLineOrOnLine(nextSite, site, coneLp)) {
      // if (angle >= -coneAngle / 2) {
      // we cannot completely obscure the cone here
      this.EnqueueEvent(new LeftVertexEvent(nextVertex))
      // the obstacle side is inside of the cone
      // we need to create an obstacle right side segment instead of the cone side
      const cone = new Cone(leftVertexEvent.Vertex.point, this)
      const rightSide = new BrokenConeSide(leftVertexEvent.Vertex.point, nextVertex, new ConeRightSide(cone))
      cone.RightSide = rightSide
      cone.LeftSide = new ConeLeftSide(cone)
      this.LookForIntersectionWithConeLeftSide(this.InsertToTree(this.leftConeSides, cone.LeftSide))
      const rbNode = this.InsertToTree(this.rightConeSides, rightSide)
      this.FixConeRightSideIntersections(rightSide, rbNode)
      if (this.GetZP(toNext) > GeomConstants.distanceEpsilon) {
        this.InsertLeftSide(new LeftObstacleSide(leftVertexEvent.Vertex))
      }
    } else {
      this.EnqueueEvent(new LeftVertexEvent(nextVertex))
      if (this.GetZP(toNext) > GeomConstants.distanceEpsilon) {
        // if( angle >- Pi/2
        // Assert.assert(angle > -Math.PI / 2);
        this.LookForIntersectionOfObstacleSideAndRightConeSide(leftVertexEvent.Site, nextVertex)
        this.InsertLeftSide(new LeftObstacleSide(leftVertexEvent.Vertex))
      }
    }
  }

  RemoveCone(cone: Cone) {
    // the following should not happen if the containment hierarchy is correct.
    // If containment is not correct it still should not result in a fatal error, just a funny looking route.
    // Assert.assert(cone.Removed === false);
    cone.Removed = true
    this.RemoveSegFromLeftTree(cone.LeftSide)
    this.RemoveSegFromRightTree(cone.RightSide)
  }

  RemoveSegFromRightTree(coneSide: ConeSide) {
    //   ShowRightTree();
    //Assert.assert(coneSide.Removed === false)
    this.coneSideComparer.SetOperand(coneSide)
    let b = this.rightConeSides.remove(coneSide)
    coneSide.Removed = true
    if (b == null) {
      const tmpZ = this.Z
      this.Z = Math.max(this.GetZP(coneSide.Start), this.Z - 0.01)
      // we need to return to the past a little bit when the order was still correc
      this.coneSideComparer.SetOperand(coneSide)
      b = this.rightConeSides.remove(coneSide)
      this.Z = tmpZ
      // #if TEST_MSAGL
      //                 if (b == null ) {
      //                     PrintOutRightSegTree();
      //                 }
      // #endif
    }
  }

  RemoveSegFromLeftTree(coneSide: ConeSide) {
    //Assert.assert(coneSide.Removed === false)
    coneSide.Removed = true
    this.coneSideComparer.SetOperand(coneSide)
    const b = this.leftConeSides.remove(coneSide)
    if (b == null) {
      const tmpZ = this.Z
      this.Z = Math.max(this.GetZP(coneSide.Start), this.Z - 0.01)
      this.coneSideComparer.SetOperand(coneSide)
      // #if TEST_MSAGL
      //                 b =
      // #endif
      this.leftConeSides.remove(coneSide)
      this.Z = tmpZ
      // #if TEST_MSAGL
      //                 if (b == null ) {
      //                     PrintOutLeftSegTree();
      //                     ShowLeftTree(new Ellipse(2, 2, coneSide.start));
      //                 }
      // #endif
    }

    //Assert.assert(b != null)
  }

  FixConeRightSideIntersections(rightSide: BrokenConeSide, rbNode: RBNode<ConeSide>) {
    // the first intersection can happen only with predecessors of rightSide
    //Assert.assert(rbNode != null)
    do {
      // this loop usually works only once
      rbNode = this.rightConeSides.previous(rbNode)
    } while (
      rbNode != null &&
      Point.PointToTheLeftOfLineOrOnLine(rightSide.start, rbNode.item.Start, rbNode.item.Start.add(rbNode.item.Direction))
    )

    if (rbNode != null) {
      let intersection: Point
      if (rbNode.item instanceof ConeRightSide) {
        const seg = <ConeRightSide>rbNode.item
        if ((intersection = Point.IntervalIntersectsRay(rightSide.start, rightSide.End, seg.Start, seg.Direction))) {
          this.EnqueueEvent(this.CreateRightIntersectionEvent(seg, intersection, rightSide.EndVertex))
          // Show(CurveFactory.CreateDiamond(3, 3, intersection));
        }
      }
    }
  }

  CreateConeOnVertex(sweepEvent: SweepEvent) {
    const cone = new Cone(sweepEvent.Site, this)
    cone.LeftSide = new ConeLeftSide(cone)
    cone.RightSide = new ConeRightSide(cone)
    const leftNode = this.InsertToTree(this.leftConeSides, cone.LeftSide)
    const rightNode = this.InsertToTree(this.rightConeSides, cone.RightSide)
    this.LookForIntersectionWithConeRightSide(rightNode)
    this.LookForIntersectionWithConeLeftSide(leftNode)
  }

  LookForIntersectionWithConeLeftSide(leftNode: RBNode<ConeSide>) {
    // Show(new Ellipse(1, 1, leftNode.item.start));

    if (leftNode.item instanceof ConeLeftSide) {
      const coneLeftSide = leftNode.item
      const rightObstacleSide: RightObstacleSide = this.FindFirstObstacleSideToTheLeftOfPoint(coneLeftSide.Start)
      if (rightObstacleSide != null) {
        this.TryIntersectionOfConeLeftSideAndObstacleSide(coneLeftSide, rightObstacleSide)
      }
    } else {
      const seg = <BrokenConeSide>leftNode.item
      leftNode = this.leftConeSides.next(leftNode)
      if (leftNode != null) {
        if (leftNode.item instanceof ConeLeftSide) {
          this.TryIntersectionOfConeLeftSideAndObstacleConeSide(leftNode.item, seg)
        }
      }
    }
  }

  LookForIntersectionWithConeRightSide(rightNode: RBNode<ConeSide>) {
    // Show(new Ellipse(10, 5, rightNode.item.start));

    if (rightNode.item instanceof ConeRightSide) {
      const crs = rightNode.item
      const leftObstacleSide: LeftObstacleSide = this.FindFirstObstacleSideToToTheRightOfPoint(crs.Start)
      if (leftObstacleSide != null) {
        this.TryIntersectionOfConeRightSideAndObstacleSide(crs, leftObstacleSide)
      }
    } else {
      const seg = <BrokenConeSide>rightNode.item
      rightNode = this.rightConeSides.previous(rightNode)
      if (rightNode != null) {
        if (rightNode.item instanceof ConeRightSide) {
          this.TryIntersectionOfConeRightSideAndObstacleConeSide(rightNode.item, seg)
        }
      }
    }
  }

  TryIntersectionOfConeRightSideAndObstacleConeSide(coneRightSide: ConeRightSide, seg: BrokenConeSide) {
    const x = Point.IntervalIntersectsRay(seg.start, seg.End, coneRightSide.Start, coneRightSide.Direction)
    if (x) {
      this.EnqueueEvent(this.CreateRightIntersectionEvent(coneRightSide, x, seg.EndVertex))
      // Show(CurveFactory.CreateDiamond(3, 3, x));
    }
  }

  TryIntersectionOfConeRightSideAndObstacleSide(coneRightSide: ConeRightSide, side: ObstacleSide) {
    const x: Point = Point.IntervalIntersectsRay(side.Start, side.End, coneRightSide.Start, coneRightSide.Direction)
    if (x) {
      this.EnqueueEvent(this.CreateRightIntersectionEvent(coneRightSide, x, side.EndVertex))
      // Show(CurveFactory.CreateDiamond(3, 3, x));
    }
  }

  TryIntersectionOfConeLeftSideAndObstacleConeSide(coneLeftSide: ConeLeftSide, seg: BrokenConeSide) {
    const x: Point = Point.IntervalIntersectsRay(seg.start, seg.End, coneLeftSide.Start, coneLeftSide.Direction)
    if (x) {
      this.EnqueueEvent(new LeftIntersectionEvent(coneLeftSide, x, seg.EndVertex))
      // Show(CurveFactory.CreateDiamond(3, 3, x));
    }
  }

  TryIntersectionOfConeLeftSideAndObstacleSide(coneLeftSide: ConeLeftSide, side: ObstacleSide) {
    const x: Point = Point.IntervalIntersectsRay(side.Start, side.End, coneLeftSide.Start, coneLeftSide.Direction)
    if (x) {
      this.EnqueueEvent(new LeftIntersectionEvent(coneLeftSide, x, side.EndVertex))
      //    Show(CurveFactory.CreateDiamond(3, 3, x));
    }
  }

  // Show(curves: ICurve[], fn: string) {
  //   let l = Array.from(this.Obstacles).map((o) => DebugCurve.mkDebugCurveTWCI(200, 0.5, 'Blue', o))
  //   for (const s of this.rightConeSides) {
  //     l.push(DebugCurve.mkDebugCurveWCI(0.5, 'Brown', this.ExtendSegmentToZ(s)))
  //     if (s instanceof BrokenConeSide) l.push(DebugCurve.mkDebugCurveCI('Brown', LineSweeper.Diamond(s.start)))
  //     l.push(DebugCurve.mkDebugCurveWCI(0.5, 'Green', this.ExtendSegmentToZ(s.Cone.LeftSide)))
  //     if (s.Cone.LeftSide instanceof BrokenConeSide) l.push(DebugCurve.mkDebugCurveCI('Green', LineSweeper.Diamond(s.Cone.LeftSide.start)))
  //   }
  //   l.push(
  //     ...Array.from(this.visibilityGraph.Edges).map((edge) =>
  //       DebugCurve.mkDebugCurveTWCI(100, 0.1, 'Cyan', LineSegment.mkPP(edge.SourcePoint, edge.TargetPoint)),
  //     ),
  //   )

  //   l.push(...curves.map((c) => DebugCurve.mkDebugCurveCI('Red', c)))
  //   l.push(
  //     ...Array.from(this.eventQueue)
  //       .filter((e) => e instanceof RightIntersectionEvent)
  //       .map((e) => DebugCurve.mkDebugCurveCI('Black', LineSweeper.mkRightIntersDiamond(e.Site))),
  //   )
  //   SvgDebugWriter.dumpDebugCurves(fn, l)
  // }

  //         static BezierSeg BezierOnEdge(VisibilityEdge edge) {
  //             return new BezierSeg(edge.SourcePoint, 2.0 / 3.0 * edge.SourcePoint + 1.0 / 3.0 * edge.TargetPoint,
  //                 1.0 / 3.0 * edge.SourcePoint + 2.0 / 3.0 * edge.TargetPoint, edge.TargetPoint);
  //         }
  ExtendSegmentToZ(segment: ConeSide): ICurve {
    const den = segment.Direction.dot(this.SweepDirection)
    //Assert.assert(Math.Abs(den) > GeomConstants.distanceEpsilon);
    const t = (this.Z + 40 - segment.Start.dot(this.SweepDirection)) / den
    return LineSegment.mkPP(segment.Start, segment.Start.add(segment.Direction.mul(t)))
  }
  //         internal ICurve ExtendSegmentToZPlus1(ConeSide segment) {
  //             double den = segment.Direction * SweepDirection;
  //             Assert.assert(Math.Abs(den) > GeomConstants.distanceEpsilon);
  //             double t = (Z + 1 - segment.start * SweepDirection) / den;
  //             return new LineSegment(segment.start, segment.start + segment.Direction * t);
  //         }
  // #endif
  GoOverConesSeeingVertexEvent(vertexEvent: SweepEvent) {
    let rbNode = this.FindFirstSegmentInTheRightTreeNotToTheLeftOfVertex(vertexEvent)
    if (rbNode == null) {
      return
    }

    const coneRightSide = rbNode.item
    const cone = coneRightSide.Cone
    const leftConeSide = cone.LeftSide
    if (LineSweeper.VertexIsToTheLeftOfSegment(vertexEvent, leftConeSide)) {
      return
    }

    const visibleCones = [cone]
    this.coneSideComparer.SetOperand(leftConeSide)
    rbNode = this.leftConeSides.find(leftConeSide)
    if (rbNode == null) {
      //this.Show([CurveFactory.CreateDiamond(10, 10, vertexEvent.Site)], './tmp/bug.svg')
      const tmpZ = this.Z
      this.Z = Math.max(this.GetZP(leftConeSide.Start), this.PreviousZ)
      // we need to return to the past a little bit when the order was still correct
      this.coneSideComparer.SetOperand(leftConeSide)
      rbNode = this.leftConeSides.find(leftConeSide)
      this.Z = tmpZ
      // #if TEST_MSAGL
      // //                if (rbNode == null ) {
      //                     //GeometryGraph gg = CreateGraphFromObstacles();
      //                     //gg.Save("c:\\tmp\\bug");
      // //                    PrintOutLeftSegTree();
      // //                    System.Diagnostics.Debug.WriteLine(leftConeSide);
      // //                    ShowLeftTree(new Ellipse(3, 3, vertexEvent.Site));
      // //                    ShowRightTree(new Ellipse(3, 3, vertexEvent.Site));
      // //                }
      // #endif
    }

    // the following should not happen if the containment hierarchy is correct.
    // If containment is not correct it still should not result in a fatal error, just a funny looking route.
    // Assert.assert(rbNode!=null);
    if (rbNode == null) {
      // it is an emergency measure and should not happen
      rbNode = this.GetRbNodeEmergency(leftConeSide)
      if (rbNode == null) {
        return // the cone is not there! and it is a bug
      }
    }

    rbNode = this.leftConeSides.next(rbNode)
    while (rbNode != null && !LineSweeper.VertexIsToTheLeftOfSegment(vertexEvent, rbNode.item)) {
      visibleCones.push(rbNode.item.Cone)
      rbNode = this.leftConeSides.next(rbNode)
    }

    for (const visCone of visibleCones) this.AddEdgeAndRemoveCone(visCone, vertexEvent.Site)
  }

  GetRbNodeEmergency(leftConeSide: ConeSide): RBNode<ConeSide> {
    if (this.leftConeSides.count === 0) return null
    for (let node = this.leftConeSides.treeMinimum(); node != null; node = this.leftConeSides.next(node)) {
      if (node.item === leftConeSide) {
        return node
      }
    }

    return null
  }

  // #if TEST_MSAGL

  //             MessageId = "System.Int32.ToString")]
  //         internal static GeometryGraph CreateGraphFromObstacles(Array < Polyline > obstacles) {
  //             var gg = new GeometryGraph();
  //             foreach(var ob of obstacles) {
  //                 gg.Nodes.Add(new Node(ob.ToCurve()));
  //             }
  //             return gg;
  //         }

  //             "CA1303:Do not pass literals as localized parameters", MessageId = "System.Diagnostics.Debug.WriteLine(System.String)"
  //         )]
  //         void PrintOutLeftSegTree() {
  //             System.Diagnostics.Debug.WriteLine("Left cone segments########");
  //             foreach(var t of leftConeSides) {
  //                 var x = coneSideComparer.IntersectionOfSegmentAndSweepLine(t);
  //                 System.Diagnostics.Debug.WriteLine("{0} x={1}", t, x * DirectionPerp);
  //             }
  //             System.Diagnostics.Debug.WriteLine("##########end of left cone segments");
  //         }
  // #endif
  static VertexIsToTheLeftOfSegment(vertexEvent: SweepEvent, seg: ConeSide): boolean {
    return Point.getTriangleOrientation(seg.Start, seg.Start.add(seg.Direction), vertexEvent.Site) === TriangleOrientation.Counterclockwise
  }

  static VertexIsToTheRightOfSegment(vertexEvent: SweepEvent, seg: ConeSide): boolean {
    return Point.getTriangleOrientation(seg.Start, seg.Start.add(seg.Direction), vertexEvent.Site) === TriangleOrientation.Clockwise
  }

  FindFirstSegmentInTheRightTreeNotToTheLeftOfVertex(vertexEvent: SweepEvent): RBNode<ConeSide> {
    return this.rightConeSides.findFirst((s: ConeSide) => !LineSweeper.VertexIsToTheRightOfSegment(vertexEvent, s))
  }

  EnqueueRightVertexEvent(vertexEvent: RightVertexEvent) {
    if (this.GetZP(vertexEvent.Site.sub(vertexEvent.Vertex.prevOnPolyline.point)) > GeomConstants.tolerance) {
      // otherwise we enqueue the vertex twice; once as a LeftVertexEvent and once as a RightVertexEvent

      return
    }

    this.EnqueueEvent(vertexEvent)
  }

  invariant(): boolean {
    // if (this.leftConeSides.count !== this.rightConeSides.count) {
    //  return false
    // }
    for (const cs of this.leftConeSides) {
      if (cs.Removed) {
        return false
      }
    }
    for (const cs of this.rightConeSides) {
      if (cs.Removed) {
        return false
      }
    }
    // const lsSet = new Set<ConeSide>(this.leftConeSides)
    // const rsSet = new Set<ConeSide>(this.rightConeSides)
    // if (lsSet.size !== rsSet.size) return false
    // const cones = new Set<Cone>()
    // for (const ls of lsSet) {
    //  const cone = ls.Cone
    //  if (!rsSet.has(cone.RightSide)) return false
    //  cones.add(cone)
    // }
    // if (cones.size !== lsSet.size) return false
    // for (const rs of rsSet) {
    //  if (!cones.has(rs.Cone)) {
    //    return false
    //  }
    // }
    // for (const ls of lsSet) {
    //  if (!cones.has(ls.Cone)) {
    //    return false
    //  }
    // }
    return true
  }
}
