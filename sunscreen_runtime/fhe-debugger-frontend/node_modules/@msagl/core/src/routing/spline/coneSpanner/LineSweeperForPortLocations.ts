// Sweeps a given direction of cones and adds discovered edges to the graph.

import {Point, ICurve} from '../../..'
import {Polyline, GeomConstants, LineSegment} from '../../../math/geometry'
import {Ellipse} from '../../../math/geometry/ellipse'
import {TriangleOrientation} from '../../../math/geometry/point'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {RBNode} from '../../../math/RBTree/rbNode'
import {RBTree} from '../../../math/RBTree/rbTree'
import {LineSweeperBase} from '../../visibility/LineSweeperBase'
import {PortObstacleEvent} from '../../visibility/PortObstacleEvent'
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
import {PortLocationEvent} from './PortLocationEvent'
import {RightIntersectionEvent} from './RightIntersectionEvent'
import {RightObstacleSide} from './RightObstacleSide'
import {RightVertexEvent} from './RightVertexEvent'
import {SweepEvent} from './SweepEvent'
import {VertexEvent} from './VertexEvent'

// The cones can only start at ports here.
export class LineSweeperForPortLocations extends LineSweeperBase /* IConeSweeper */ {
  ConeRightSideDirection: Point

  ConeLeftSideDirection: Point

  coneSideComparer: ConeSideComparer

  visibilityGraph: VisibilityGraph

  rightConeSides: RBTree<ConeSide>

  leftConeSides: RBTree<ConeSide>

  constructor(
    obstacles: Array<Polyline>,
    direction: Point,
    coneRsDir: Point,
    coneLsDir: Point,
    visibilityGraph: VisibilityGraph,
    portLocations: Array<Point>,
  ) {
    super(obstacles, direction)
    this.visibilityGraph = visibilityGraph
    this.ConeRightSideDirection = coneRsDir
    this.ConeLeftSideDirection = coneLsDir
    this.coneSideComparer = new ConeSideComparer(this)
    this.leftConeSides = new RBTree<ConeSide>((a, b) => this.coneSideComparer.Compare(<ConeSide>a, <ConeSide>b))
    this.rightConeSides = new RBTree<ConeSide>((a, b) => this.coneSideComparer.Compare(<ConeSide>a, <ConeSide>b))
    this.PortLocations = portLocations
  }

  PortLocations: Array<Point>

  static Sweep(
    obstacles: Array<Polyline>,
    direction: Point,
    coneAngle: number,
    visibilityGraph: VisibilityGraph,
    portLocations: Array<Point>,
  ) {
    const cs = new LineSweeperForPortLocations(
      obstacles,
      direction,
      direction.rotate(-coneAngle / 2),
      direction.rotate(coneAngle / 2),
      visibilityGraph,
      portLocations,
    )
    cs.Calculate()
  }

  Calculate() {
    this.InitQueueOfEvents()
    for (const portLocation of this.PortLocations) super.EnqueueEvent(new PortLocationEvent(portLocation))
    while (this.EventQueue.Count > 0) {
      this.ProcessEvent(this.EventQueue.Dequeue())
    }
  }

  ProcessEvent(p: SweepEvent) {
    // ShowTrees(CurveFactory.CreateDiamond(3, 3, p.Site));
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
            const coneClosure = <ConeClosureEvent>p
            if (!coneClosure.ConeToClose.Removed) {
              this.RemoveCone(coneClosure.ConeToClose)
            }
          } else {
            if (p instanceof PortLocationEvent) {
              this.ProcessPortLocationEvent(p)
            } else {
              this.ProcessPointObstacleEvent(<PortObstacleEvent>p)
            }
          }

          this.Z = this.GetZS(p)
        }
      }
    }

    //     ShowTrees(CurveFactory.CreateEllipse(3,3,p.Site));
  }

  ProcessPointObstacleEvent(portObstacleEvent: PortObstacleEvent) {
    this.Z = this.GetZS(portObstacleEvent)
    this.GoOverConesSeeingVertexEvent(portObstacleEvent)
  }

  CreateConeOnPortLocation(sweepEvent: SweepEvent) {
    const cone = new Cone(sweepEvent.Site, this)
    const leftNode: RBNode<ConeSide> = this.InsertToTree(this.leftConeSides, (cone.LeftSide = new ConeLeftSide(cone)))
    const rightNode: RBNode<ConeSide> = this.InsertToTree(this.rightConeSides, (cone.RightSide = new ConeRightSide(cone)))
    this.LookForIntersectionWithConeRightSide(rightNode)
    this.LookForIntersectionWithConeLeftSide(leftNode)
  }

  ProcessPortLocationEvent(portEvent: PortLocationEvent) {
    this.Z = this.GetZS(portEvent)
    this.GoOverConesSeeingVertexEvent(portEvent)
    this.CreateConeOnPortLocation(portEvent)
  }

  ProcessLeftIntersectionEvent(leftIntersectionEvent: LeftIntersectionEvent) {
    if (leftIntersectionEvent.coneLeftSide.Removed === false) {
      if (Math.abs(this.GetZP(leftIntersectionEvent.EndVertex.point.sub(leftIntersectionEvent.Site))) < GeomConstants.distanceEpsilon) {
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
    const x = Point.RayIntersectsRayInteriors(brokenConeSide.start, brokenConeSide.Direction, otherSide.Start, otherSide.Direction)
    super.EnqueueEvent(new ConeClosureEvent(x, brokenConeSide.Cone))
  }

  ProcessRightIntersectionEvent(rightIntersectionEvent: RightIntersectionEvent) {
    // restore this.Z for the time being
    // this.Z = PreviousZ;
    if (rightIntersectionEvent.coneRightSide.Removed === false) {
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
    const coneLeftSide = <ConeLeftSide>rightSide.Cone.LeftSide
    if (coneLeftSide != null) {
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
    let node: RBNode<ConeSide> = tree.findFirst(
      (s) => Point.getTriangleOrientation(s.Start, s.Start.add(s.Direction), leftPoint) === TriangleOrientation.Counterclockwise,
    )

    if (node == null || Point.IntervalIntersectsRay(leftPoint, rightPoint, node.item.Start, node.item.Direction) == null) {
      return
    }

    const conesToRemove = new Array<Cone>()
    do {
      conesToRemove.push(node.item.Cone)
      node = tree.next(node)
    } while (node && Point.IntervalIntersectsRay(leftPoint, rightPoint, node.item.Start, node.item.Direction) !== undefined)

    for (const cone of conesToRemove) this.RemoveCone(cone)
  }

  ProcessVertexEvent(vertexEvent: VertexEvent) {
    this.Z = this.GetZS(vertexEvent)
    this.GoOverConesSeeingVertexEvent(vertexEvent)
    this.AddConeAndEnqueueEvents(vertexEvent)
  }

  // ReSharper disable UnusedMember.Local
  static EllipseOnVert(vertexEvent: SweepEvent): Ellipse {
    // ReSharper restore UnusedMember.Local
    return Ellipse.mkFullEllipseNNP(2, 2, vertexEvent.Site)
  }

  // ReSharper disable UnusedMember.Local
  static EllipseOnPolylinePoint(pp: PolylinePoint): Ellipse {
    // ReSharper restore UnusedMember.Local
    return Ellipse.mkFullEllipseNNP(2, 2, pp.point)
  }

  // ShowTrees(params curves: ICurve[]) {
  //    //  ReSharper restore UnusedMember.Local
  //    let l = Obstacles.Select(() => {  }, new DebugCurve(100, 1, "blue", c));
  //    l = l.Concat(this.rightConeSides.Select(() => {  }, new DebugCurve(200, 1, "brown", this.ExtendSegmentToZ(s))));
  //    l = l.Concat(this.leftConeSides.Select(() => {  }, new DebugCurve(200, 1, "gree", this.ExtendSegmentToZ(s))));
  //    l = l.Concat(curves.Select(() => {  }, new DebugCurve("red", c)));
  //    l = l.Concat(this.visibilityGraph.Edges.Select(() => {  }, new LineSegment(e.SourcePoint, e.TargetPoint)).Select(() => {  }, new DebugCurve("marine", c)));
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  // }

  // ShowLeftTree(params curves: ICurve[]) {
  //    let l = Obstacles.Select(() => {  }, new DebugCurve(c));
  //    l = l.Concat(this.leftConeSides.Select(() => {  }, new DebugCurve("brown", this.ExtendSegmentToZ(s))));
  //    l = l.Concat(curves.Select(() => {  }, new DebugCurve("red", c)));
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  // }

  // ShowRightTree(params curves: ICurve[]) {
  //    let l = Obstacles.Select(() => {  }, new DebugCurve(c));
  //    l = l.Concat(this.rightConeSides.Select(() => {  }, new DebugCurve("brown", this.ExtendSegmentToZ(s))));
  //    l = l.Concat(curves.Select(() => {  }, new DebugCurve("red", c)));
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  // }

  // Show(params curves: ICurve[]) {
  //    //  ReSharper restore UnusedMember.Global
  //    let l = Obstacles.Select(() => {  }, new DebugCurve(100, 1, "black", c));
  //    l = l.Concat(curves.Select(() => {  }, new DebugCurve(200, 1, "red", c)));
  //    //             foreach (var s of rightConeSides){
  //    //                 l.Add(ExtendSegmentToZ(s));
  //    //                 if (s is BrokenConeSide)
  //    //                     l.Add(Diamond(s.start));
  //    //                 l.Add(ExtendSegmentToZ(s.Cone.LeftSide));
  //    //             }
  //    l = l.Concat(this.visibilityGraph.Edges.Select(() => {  }, new LineSegment(edge.SourcePoint, edge.TargetPoint)).Select(() => {  }, new DebugCurve(100, 1, "blue", c)));
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  // }

  ExtendSegmentToZ(segment: ConeSide): ICurve {
    const den: number = this.GetZP(segment.Direction)
    //Assert.assert(Math.abs(den) > GeomConstants.distanceEpsilon)
    const t: number = (this.Z - this.GetZP(segment.Start)) / den
    return LineSegment.mkPP(segment.Start, segment.Start.add(segment.Direction.mul(t)))
  }

  AddConeAndEnqueueEvents(vertexEvent: VertexEvent) {
    const isleftVertexEvent = vertexEvent instanceof LeftVertexEvent

    if (isleftVertexEvent != null) {
      const leftVertexEvent = <LeftVertexEvent>vertexEvent

      const nextPoint: PolylinePoint = vertexEvent.Vertex.nextOnPolyline
      this.CloseConesAtLeftVertex(leftVertexEvent, nextPoint)
    } else {
      const isRightVertexEvent = vertexEvent instanceof RightVertexEvent
      if (isRightVertexEvent) {
        const nextPoint: PolylinePoint = vertexEvent.Vertex.prevOnPolyline
        this.CloseConesAtRightVertex(<RightVertexEvent>vertexEvent, nextPoint)
      } else {
        this.CloseConesAtLeftVertex(vertexEvent, vertexEvent.Vertex.nextOnPolyline)
        this.CloseConesAtRightVertex(vertexEvent, vertexEvent.Vertex.prevOnPolyline)
      }
    }
  }

  CloseConesAtRightVertex(rightVertexEvent: VertexEvent, nextVertex: PolylinePoint) {
    const prevSite: Point = rightVertexEvent.Vertex.nextOnPolyline.point
    const prevZ: number = this.GetZP(prevSite)
    if (prevZ <= this.Z && this.Z - prevZ < GeomConstants.distanceEpsilon) {
      this.RemoveConesClosedBySegment(prevSite, rightVertexEvent.Vertex.point)
    }

    const site: Point = rightVertexEvent.Site
    const coneLp: Point = site.add(this.ConeLeftSideDirection)
    const coneRp: Point = site.add(this.ConeRightSideDirection)
    const nextSite: Point = nextVertex.point
    // try to remove the right side
    //try to remove the right side
    if (this.GetZP(site.sub(prevSite)) > GeomConstants.distanceEpsilon)
      this.RemoveRightSide(new RightObstacleSide(rightVertexEvent.Vertex.nextOnPolyline))
    if (this.GetZP(nextSite) + GeomConstants.distanceEpsilon < this.GetZS(rightVertexEvent)) return
    if (!Point.PointToTheRightOfLineOrOnLine(nextSite, site, coneLp)) {
      //if (angle <= -coneAngle / 2) {
      //  CreateConeOnVertex(rightVertexEvent);
      if (Point.PointToTheLeftOfLineOrOnLine(nextSite.add(this.DirectionPerp), nextSite, site))
        this.EnqueueEventLocal(new RightVertexEvent(nextVertex))
      // TryEnqueueRighVertexEvent(nextVertex);
    } else if (Point.PointToTheLeftOfLineOrOnLine(nextSite, site, coneRp)) {
      //if (angle < coneAngle / 2) {
      this.CaseToTheLeftOfLineOrOnLineConeRp(rightVertexEvent, nextVertex)
    } else {
      if (this.GetZP(nextSite.sub(site)) > GeomConstants.distanceEpsilon) {
        this.LookForIntersectionOfObstacleSideAndLeftConeSide(rightVertexEvent.Site, nextVertex)
        this.InsertRightSide(new RightObstacleSide(rightVertexEvent.Vertex))
      }
      this.EnqueueEventLocal(new RightVertexEvent(nextVertex))
    }
  }

  CaseToTheLeftOfLineOrOnLineConeRp(rightVertexEvent: VertexEvent, nextVertex: PolylinePoint) {
    this.EnqueueEventLocal(new RightVertexEvent(nextVertex))
    // the obstacle side is inside of the cone
    // we need to create an obstacle left side segment instead of the left cone side
    //                var cone = new Cone(rightVertexEvent.Vertex.point, this);
    //                var obstacleSideSeg = new BrokenConeSide(cone.Apex, nextVertex, new ConeLeftSide(cone));
    //                cone.LeftSide = obstacleSideSeg;
    //                cone.RightSide = new ConeRightSide(cone);
    //                var rnode = InsertToTree(rightConeSides, cone.RightSide);
    //                LookForIntersectionWithConeRightSide(rnode);
    const lnode: RBNode<ConeSide> = this.leftConeSides.findFirst((side) =>
      LineSweeperForPortLocations.PointIsToTheLeftOfSegment(rightVertexEvent.Site, side),
    )
    this.FixConeLeftSideIntersections(rightVertexEvent.Vertex, nextVertex, lnode)
    if (this.GetZP(nextVertex.point.sub(rightVertexEvent.Site)) > GeomConstants.distanceEpsilon) {
      this.InsertRightSide(new RightObstacleSide(rightVertexEvent.Vertex))
    }
  }

  LookForIntersectionOfObstacleSideAndRightConeSide(obstacleSideStart: Point, obstacleSideVertex: PolylinePoint) {
    const node: RBNode<ConeSide> = this.GetLastNodeToTheLeftOfPointInRightSegmentTree(obstacleSideStart)
    if (node != null) {
      const isconeRightSide = node.item instanceof ConeRightSide
      if (isconeRightSide) {
        const x: Point = Point.IntervalIntersectsRay(
          obstacleSideStart,
          obstacleSideVertex.point,
          node.item.Start,
          this.ConeRightSideDirection,
        )

        if (x && this.SegmentIsNotHorizontal(x, obstacleSideVertex.point)) {
          super.EnqueueEvent(this.CreateRightIntersectionEvent(node.item, x, obstacleSideVertex))
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
    //  Math.abs(this.GetZP(obstacleSideVertex.point.sub(intersection))) >
    //    GeomConstants.distanceEpsilon,
    // )
    return new RightIntersectionEvent(coneRightSide, intersection, obstacleSideVertex)
  }

  GetLastNodeToTheLeftOfPointInRightSegmentTree(obstacleSideStart: Point): RBNode<ConeSide> {
    return this.rightConeSides.findLast((s) => LineSweeperForPortLocations.PointIsToTheRightOfSegment(obstacleSideStart, s))
  }

  LookForIntersectionOfObstacleSideAndLeftConeSide(obstacleSideStart: Point, obstacleSideVertex: PolylinePoint) {
    const node: RBNode<ConeSide> = this.GetFirstNodeToTheRightOfPoint(obstacleSideStart)
    //          ShowLeftTree(Box(obstacleSideStart));
    if (node == null) {
      return
    }

    const coneLeftSide = <ConeLeftSide>node.item
    if (coneLeftSide == null) {
      return
    }

    const x: Point = Point.IntervalIntersectsRay(
      obstacleSideStart,
      obstacleSideVertex.point,
      coneLeftSide.Start,
      this.ConeLeftSideDirection,
    )
    if (x) {
      super.EnqueueEvent(new LeftIntersectionEvent(coneLeftSide, x, obstacleSideVertex))
    }
  }

  GetFirstNodeToTheRightOfPoint(p: Point): RBNode<ConeSide> {
    return this.leftConeSides.findFirst((s) => LineSweeperForPortLocations.PointIsToTheLeftOfSegment(p, s))
  }

  static PointIsToTheLeftOfSegment(p: Point, seg: ConeSide): boolean {
    return Point.getTriangleOrientation(seg.Start, seg.Start.add(seg.Direction), p) === TriangleOrientation.Counterclockwise
  }

  static PointIsToTheRightOfSegment(p: Point, seg: ConeSide): boolean {
    return Point.getTriangleOrientation(seg.Start, seg.Start.add(seg.Direction), p) === TriangleOrientation.Clockwise
  }

  FixConeLeftSideIntersections(obstSideStart: PolylinePoint, obstSideEnd: PolylinePoint, rbNode: RBNode<ConeSide>) {
    if (rbNode != null) {
      const seg = rbNode.item
      if (seg instanceof ConeLeftSide) {
        const x = Point.IntervalIntersectsRay(obstSideStart.point, obstSideEnd.point, seg.Start, seg.Direction)
        if (x) {
          super.EnqueueEvent(new LeftIntersectionEvent(seg, x, obstSideEnd))
        }
      }
    }
  }

  InsertToTree(tree: RBTree<ConeSide>, coneSide: ConeSide): RBNode<ConeSide> {
    // Assert.assert(
    //  this.GetZP(coneSide.Direction) > GeomConstants.distanceEpsilon,
    // )
    this.coneSideComparer.SetOperand(coneSide)
    return tree.insert(coneSide)
  }

  CloseConesAtLeftVertex(leftVertexEvent: VertexEvent, nextVertex: PolylinePoint) {
    // close segments first
    const prevSite: Point = leftVertexEvent.Vertex.prevOnPolyline.point
    const prevZ: number = prevSite.dot(this.SweepDirection)
    if (prevZ <= this.Z && this.Z - prevZ < GeomConstants.distanceEpsilon) {
      // Show(
      //    new Ellipse(1, 1, prevSite),
      //    CurveFactory.CreateBox(2, 2, leftVertexEvent.Vertex.point));
      this.RemoveConesClosedBySegment(leftVertexEvent.Vertex.point, prevSite)
    }

    const site: Point = leftVertexEvent.Site
    const coneLp: Point = site.add(this.ConeLeftSideDirection)
    const coneRp: Point = site.add(this.ConeRightSideDirection)
    const nextSite: Point = nextVertex.point
    // SugiyamaLayoutSettings.Show(new LineSegment(site, coneLP), new LineSegment(site, coneRP), new LineSegment(site, nextSite));
    if (this.GetZP(site.sub(prevSite)) > GeomConstants.distanceEpsilon) {
      this.RemoveLeftSide(new LeftObstacleSide(leftVertexEvent.Vertex.prevOnPolyline))
    }

    if (Point.PointToTheRightOfLineOrOnLine(nextSite, site, site.add(this.DirectionPerp))) {
      // if (angle > Math.PI / 2)
      //   CreateConeOnVertex(leftVertexEvent); //it is the last left vertex on this obstacle
    } else if (!Point.PointToTheLeftOfLineOrOnLine(nextSite, site, coneRp)) {
      // if (angle >= coneAngle / 2) {
      // CreateConeOnVertex(leftVertexEvent);
      this.EnqueueEvent(new LeftVertexEvent(nextVertex))
      // we schedule LeftVertexEvent for a vertex with horizontal segment to the left on the top of the obstace
    } else if (!Point.PointToTheLeftOfLineOrOnLine(nextSite, site, coneLp)) {
      // if (angle >= -coneAngle / 2) {
      // we cannot completely obscure the cone here
      this.EnqueueEvent(new LeftVertexEvent(nextVertex))
      // the obstacle side is inside of the cone
      // we need to create an obstacle right side segment instead of the cone side
      //                var cone = new Cone(leftVertexEvent.Vertex.point, this);
      //                var rightSide = new BrokenConeSide(leftVertexEvent.Vertex.point, nextVertex,
      //                                                        new ConeRightSide(cone));
      //                cone.RightSide = rightSide;
      //                cone.LeftSide = new ConeLeftSide(cone);
      //                LookForIntersectionWithConeLeftSide(InsertToTree(leftConeSides, cone.LeftSide));
      const rbNode: RBNode<ConeSide> = this.rightConeSides.findLast((s) => LineSweeperForPortLocations.PointIsToTheRightOfSegment(site, s))
      this.FixConeRightSideIntersections(leftVertexEvent.Vertex, nextVertex, rbNode)
      if (this.GetZP(nextVertex.point.sub(leftVertexEvent.Site)) > GeomConstants.distanceEpsilon) {
        this.InsertLeftSide(new LeftObstacleSide(leftVertexEvent.Vertex))
      }
    } else {
      this.EnqueueEvent(new LeftVertexEvent(nextVertex))
      if (this.GetZP(nextVertex.point.sub(leftVertexEvent.Site)) > GeomConstants.distanceEpsilon) {
        // if( angle >- Pi/2
        // Assert.assert(angle > -Math.PI / 2);
        this.LookForIntersectionOfObstacleSideAndRightConeSide(leftVertexEvent.Site, nextVertex)
        this.InsertLeftSide(new LeftObstacleSide(leftVertexEvent.Vertex))
      }
    }
  }

  RemoveCone(cone: Cone) {
    //Assert.assert(cone.Removed === false)
    cone.Removed = true
    this.RemoveSegFromLeftTree(cone.LeftSide)
    this.RemoveSegFromRightTree(cone.RightSide)
  }

  RemoveSegFromRightTree(coneSide: ConeSide) {
    //   ShowRightTree();
    //Assert.assert(coneSide.Removed === false)
    this.coneSideComparer.SetOperand(coneSide)
    let b: RBNode<ConeSide> = this.rightConeSides.remove(coneSide)
    coneSide.Removed = true
    if (b == null) {
      const tmpZ: number = this.Z
      this.Z = Math.max(this.GetZP(coneSide.Start), this.Z - 0.01)
      // we need to return to the past a little bit when the order was still correct
      this.coneSideComparer.SetOperand(coneSide)
      b = this.rightConeSides.remove(coneSide)
      this.Z = tmpZ
    }

    //Assert.assert(b != null)
  }

  RemoveSegFromLeftTree(coneSide: ConeSide) {
    // Assert.assert(coneSide.Removed === false)
    coneSide.Removed = true
    this.coneSideComparer.SetOperand(coneSide)
    let b: RBNode<ConeSide> = this.leftConeSides.remove(coneSide)
    if (b == null) {
      const tmpZ: number = this.Z
      this.Z = Math.max(this.GetZP(coneSide.Start), this.Z - 0.01)
      this.coneSideComparer.SetOperand(coneSide)
      b = this.leftConeSides.remove(coneSide)
      this.Z = tmpZ
    }

    // Assert.assert(b != null)
  }

  FixConeRightSideIntersections(obstSideStartVertex: PolylinePoint, obstSideEndVertex: PolylinePoint, rbNode: RBNode<ConeSide>) {
    if (rbNode != null) {
      const seg = <ConeRightSide>rbNode.item
      if (seg != null) {
        const x: Point = Point.IntervalIntersectsRay(obstSideStartVertex.point, obstSideEndVertex.point, seg.Start, seg.Direction)

        if (x) {
          super.EnqueueEvent(this.CreateRightIntersectionEvent(seg, x, obstSideEndVertex))
        }
      }
    }
  }

  LookForIntersectionWithConeLeftSide(leftNode: RBNode<ConeSide>) {
    // Show(new Ellipse(1, 1, leftNode.item.start));
    const coneLeftSide = leftNode.item instanceof ConeLeftSide
    if (coneLeftSide) {
      // leftNode = leftSegmentTree.TreePredecessor(leftNode);
      // if (leftNode != null) {
      //    var seg = leftNode.item as ObstacleSideSegment;
      //    if (seg != null)
      //        TryIntersectionOfConeLeftSideAndObstacleConeSide(coneLeftSide, seg);
      // }
      const rightObstacleSide: RightObstacleSide = this.FindFirstObstacleSideToTheLeftOfPoint(leftNode.item.Start)
      if (rightObstacleSide != null) {
        this.TryIntersectionOfConeLeftSideAndObstacleSide(leftNode.item, rightObstacleSide)
      }
    } else {
      const seg = <BrokenConeSide>leftNode.item
      leftNode = this.leftConeSides.next(leftNode)
      if (leftNode != null) {
        if (leftNode instanceof ConeLeftSide) {
          this.TryIntersectionOfConeLeftSideAndObstacleConeSide(leftNode, seg)
        }
      }
    }
  }

  LookForIntersectionWithConeRightSide(rightNode: RBNode<ConeSide>) {
    // Show(new Ellipse(10, 5, rightNode.item.start));
    if (rightNode.item instanceof ConeRightSide) {
      // rightNode = rightSegmentTree.TreeSuccessor(rightNode);
      // if (rightNode != null) {
      //    var seg = rightNode.item as ObstacleSideSegment;
      //    if (seg != null)
      //        TryIntersectionOfConeRightSideAndObstacleConeSide(coneRightSide, seg);
      // }
      const leftObstacleSide: LeftObstacleSide = this.FindFirstObstacleSideToToTheRightOfPoint(rightNode.item.Start)
      if (leftObstacleSide != null) {
        this.TryIntersectionOfConeRightSideAndObstacleSide(rightNode.item, leftObstacleSide)
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
    const x: Point = Point.IntervalIntersectsRay(seg.start, seg.End, coneRightSide.Start, coneRightSide.Direction)
    if (x) {
      super.EnqueueEvent(this.CreateRightIntersectionEvent(coneRightSide, x, seg.EndVertex))
      // Show(CurveFactory.CreateDiamond(3, 3, x));
    }
  }

  TryIntersectionOfConeRightSideAndObstacleSide(coneRightSide: ConeRightSide, side: ObstacleSide) {
    const x: Point = Point.IntervalIntersectsRay(side.Start, side.End, coneRightSide.Start, coneRightSide.Direction)
    if (x) {
      super.EnqueueEvent(this.CreateRightIntersectionEvent(coneRightSide, x, side.EndVertex))
      // Show(CurveFactory.CreateDiamond(3, 3, x));
    }
  }

  TryIntersectionOfConeLeftSideAndObstacleConeSide(coneLeftSide: ConeLeftSide, seg: BrokenConeSide) {
    const x: Point = Point.IntervalIntersectsRay(seg.start, seg.End, coneLeftSide.Start, coneLeftSide.Direction)
    if (x) {
      super.EnqueueEvent(new LeftIntersectionEvent(coneLeftSide, x, seg.EndVertex))
      // Show(CurveFactory.CreateDiamond(3, 3, x));
    }
  }

  TryIntersectionOfConeLeftSideAndObstacleSide(coneLeftSide: ConeLeftSide, side: ObstacleSide) {
    const x: Point = Point.IntervalIntersectsRay(side.Start, side.End, coneLeftSide.Start, coneLeftSide.Direction)
    if (x) {
      super.EnqueueEvent(new LeftIntersectionEvent(coneLeftSide, x, side.EndVertex))
      //    Show(CurveFactory.CreateDiamond(3, 3, x));
    }
  }

  //        static int count;
  GoOverConesSeeingVertexEvent(vertexEvent: SweepEvent) {
    let rbNode: RBNode<ConeSide> = this.FindFirstSegmentInTheRightTreeNotToTheLeftOfVertex(vertexEvent)
    if (rbNode == null) {
      return
    }

    const coneRightSide: ConeSide = rbNode.item
    const cone: Cone = coneRightSide.Cone
    const leftConeSide: ConeSide = cone.LeftSide
    if (LineSweeperForPortLocations.VertexIsToTheLeftOfSegment(vertexEvent, leftConeSide)) {
      return
    }

    const visibleCones = [cone]
    this.coneSideComparer.SetOperand(leftConeSide)
    rbNode = this.leftConeSides.find(leftConeSide)
    if (rbNode == null) {
      const tmpZ: number = this.Z
      this.Z = Math.max(this.GetZP(leftConeSide.Start), this.PreviousZ)
      // we need to return to the past when the order was still correct
      this.coneSideComparer.SetOperand(leftConeSide)
      rbNode = this.leftConeSides.find(leftConeSide)
      this.Z = tmpZ
    }

    rbNode = this.leftConeSides.next(rbNode)
    while (rbNode != null && !LineSweeperForPortLocations.VertexIsToTheLeftOfSegment(vertexEvent, rbNode.item)) {
      visibleCones.push(rbNode.item.Cone)
      rbNode = this.leftConeSides.next(rbNode)
    }

    // Show(new Ellipse(1, 1, vertexEvent.Site));
    for (const c of visibleCones) {
      this.addEdge(c.Apex, vertexEvent.Site)
      this.RemoveCone(c)
    }
  }

  addEdge(a: Point, b: Point) {
    // Assert.assert(this.PortLocations.findIndex((p) => p.equal(a)) >= 0)
    const ab: VisibilityEdge = this.visibilityGraph.AddEdgePP(a, b)
    const av: VisibilityVertex = ab.Source
    // Assert.assert(av.point === a && ab.TargetPoint === b)
    // all edges adjacent to a which are different from ab
    const edgesToFix: VisibilityEdge[] = av.InEdges.filter((e) => e !== ab).concat(
      Array.from(av.OutEdges.allNodes()).filter((e) => e !== ab),
    )

    for (const edge of edgesToFix) {
      const c = (edge.Target === av ? edge.Source : edge.Target).point
      VisibilityGraph.RemoveEdge(edge)
      this.visibilityGraph.AddEdgePP(c, b)
    }
  }

  static VertexIsToTheLeftOfSegment(vertexEvent: SweepEvent, seg: ConeSide): boolean {
    return Point.getTriangleOrientation(seg.Start, seg.Start.add(seg.Direction), vertexEvent.Site) === TriangleOrientation.Counterclockwise
  }

  static VertexIsToTheRightOfSegment(vertexEvent: SweepEvent, seg: ConeSide): boolean {
    return Point.getTriangleOrientation(seg.Start, seg.Start.add(seg.Direction), vertexEvent.Site) === TriangleOrientation.Clockwise
  }

  FindFirstSegmentInTheRightTreeNotToTheLeftOfVertex(vertexEvent: SweepEvent): RBNode<ConeSide> {
    return this.rightConeSides.findFirst((s) => !LineSweeperForPortLocations.VertexIsToTheRightOfSegment(vertexEvent, s))
  }

  EnqueueEventLocal(vertexEvent: RightVertexEvent) {
    if (this.GetZP(vertexEvent.Site.sub(vertexEvent.Vertex.prevOnPolyline.point)) > GeomConstants.tolerance) {
      return
    }

    // otherwise we enqueue the vertex twice; once as a LeftVertexEvent and once as a RightVertexEvent
    super.EnqueueEvent(vertexEvent)
  }
}
