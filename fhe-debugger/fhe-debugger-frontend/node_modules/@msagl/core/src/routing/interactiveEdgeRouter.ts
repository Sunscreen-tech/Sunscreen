// the router between nodes

import {ICurve, Rectangle, Point, GeomEdge, Assert} from '..'
import {CurvePort} from '../layout/core/curvePort'
import {FloatingPort} from '../layout/core/floatingPort'
import {HookUpAnywhereFromInsidePort} from '../layout/core/hookUpAnywhereFromInsidePort'
import {Polyline, LineSegment, Curve, PointLocation, GeomConstants} from '../math/geometry'
import {Ellipse} from '../math/geometry/ellipse'
import {IntersectionInfo} from '../math/geometry/intersectionInfo'
import {TriangleOrientation} from '../math/geometry/point'
import {PolylinePoint} from '../math/geometry/polylinePoint'
import {HitTestBehavior} from '../math/geometry/RTree/hitTestBehavior'
import {RectangleNode} from '../math/geometry/RTree/rectangleNode'
import {SmoothedPolyline} from '../math/geometry/smoothedPolyline'
import {InteractiveObstacleCalculator} from './interactiveObstacleCalculator'
import {SingleSourceMultipleTargetsShortestPathOnVisibilityGraph} from './SingleSourceMultipleTargetsShortestPathOnVisibilityGraph'
import {SingleSourceSingleTargetShortestPathOnVisibilityGraph} from './SingleSourceSingleTargetShortestPathOnVisibilityGraph'
import {ConeSpanner} from './spline/coneSpanner/ConeSpanner'
import {Polygon} from './visibility/Polygon'
import {TollFreeVisibilityEdge} from './visibility/TollFreeVisibilityEdge'
import {VisibilityGraph} from './visibility/VisibilityGraph'
import {VisibilityKind} from './visibility/VisibilityKind'
import {VisibilityVertex} from './visibility/VisibilityVertex'
import {Algorithm} from '../utils/algorithm'
import {Port} from '../layout/core/port'
import {InteractiveTangentVisibilityGraphCalculator} from './visibility/InteractiveTangentVisibilityGraphCalculator'
import {addRange} from '../utils/setOperations'
import {PointVisibilityCalculator} from './visibility/PointVisibilityCalculator'

import {BezierSeg} from '../math/geometry/bezierSeg'
import {CornerSite} from '../math/geometry/cornerSite'
import {PathOptimizer} from './spline/pathOptimizer'
// import {Assert} from '../utils/assert'
export class InteractiveEdgeRouter extends Algorithm {
  rerouteEdge(edge: GeomEdge) {
    if (edge.smoothedPolyline == null) {
      // TODO : can we do something here
      return
    }
    const poly: Polyline = Polyline.mkFromPoints(edge.smoothedPolyline)

    this.pathOptimizer.run(poly)
    edge.curve = this.pathOptimizer.poly.toCurve()
    // SvgDebugWriter.dumpDebugCurves('./tmp/edge' + debCount++ + '.svg', [
    //   DebugCurve.mkDebugCurveCI('Red', edge.source.boundaryCurve),
    //   DebugCurve.mkDebugCurveCI('Blue', edge.target.boundaryCurve),
    //   DebugCurve.mkDebugCurveTWCI(100, 1, 'Black', poly),
    //   DebugCurve.mkDebugCurveTWCI(100, 1, 'Red', loosePolyOfSource),
    //   DebugCurve.mkDebugCurveTWCI(100, 1, 'Blue', loosePolyOfTarget),
    //   DebugCurve.mkDebugCurveTWCI(200, 1.5, 'Magenta', edge.curve),
    // ])
  }
  pathOptimizer: PathOptimizer
  static constructorANNN(obstacles: ICurve[], padding: number, loosePadding: number, coneSpannerAngle: number): InteractiveEdgeRouter {
    return InteractiveEdgeRouter.constructorANNNB(obstacles, padding, loosePadding, coneSpannerAngle, false)
  }
  // the obstacles for routing
  obstacles_: Array<ICurve>
  targetVV: VisibilityVertex
  IgnoreTightPadding = true
  get Obstacles(): Array<ICurve> {
    return this.obstacles_
  }
  set Obstacles(value: Array<ICurve>) {
    this.obstacles_ = value
  }

  // the minimum angle between a node boundary curve and the edge
  // curve at the place where the edge curve intersects the node boundary
  enteringAngleBound_: number
  get EnteringAngleBound(): number {
    return this.enteringAngleBound_
  }
  set EnteringAngleBound(value: number) {
    this.enteringAngleBound_ = value
  }

  _sourceTightPolyline: Polyline

  get SourceTightPolyline(): Polyline {
    return this._sourceTightPolyline
  }
  set SourceTightPolyline(value: Polyline) {
    this._sourceTightPolyline = value
  }

  SourceLoosePolyline: Polyline
  targetTightPolyline: Polyline

  get TargetTightPolyline(): Polyline {
    return this.targetTightPolyline
  }
  set TargetTightPolyline(value: Polyline) {
    this.targetTightPolyline = value
  }

  targetLoosePolyline: Polyline

  get TargetLoosePolyline(): Polyline {
    return this.targetLoosePolyline
  }
  set TargetLoosePolyline(value: Polyline) {
    this.targetLoosePolyline = value
  }

  // RectangleNode<Polyline, Point> RootOfTightHierarchy {
  //    get { return this.obstacleCalculator.RootOfTightHierararchy; }
  // }
  activeRectangle: Rectangle = Rectangle.mkEmpty()

  visibilityGraph: VisibilityGraph

  get VisibilityGraph(): VisibilityGraph {
    return this.visibilityGraph
  }
  set VisibilityGraph(value: VisibilityGraph) {
    this.visibilityGraph = value
  }

  // Array<Polyline> activeTightPolylines = new Array<Polyline>();
  activePolygons: Array<Polygon> = new Array<Polygon>()

  alreadyAddedOrExcludedPolylines: Set<Polyline> = new Set<Polyline>()

  //    Dictionary<Point, Polyline> pointsToObstacles = new Dicitonary<Point, Polyline>();
  private sourcePort: Port

  // the port of the edge start

  get SourcePort(): Port {
    return this.sourcePort
  }
  set SourcePort(value: Port) {
    this.sourcePort = value
    if (this.sourcePort != null) {
      this.SourceTightPolyline = InteractiveEdgeRouter.GetFirstHitPolyline(
        this.sourcePort.Location,
        this.ObstacleCalculator.RootOfTightHierarchy,
      )
      if (this.sourcePort instanceof FloatingPort) {
        this.alreadyAddedOrExcludedPolylines.add(this.SourceLoosePolyline)
        // we need to exclude the loose polyline around the source port from the tangent visibily graph
        this.StartPointOfEdgeRouting = this.SourcePort.Location
      } else {
        const bp = <CurvePort>this.sourcePort
        this.StartPointOfEdgeRouting = this.TakeBoundaryPortOutsideOfItsLoosePolyline(bp.Curve, bp.Parameter, this.SourceLoosePolyline)
      }
    }
  }

  private targetPort: Port

  // the port of the edge end

  get TargetPort(): Port {
    return this.targetPort
  }
  set TargetPort(value: Port) {
    this.targetPort = value
  }

  // the curve should not come closer than Padding to the nodes

  TightPadding: number

  loosePadding: number

  // we further pad each node but not more than LoosePadding.

  get LoosePadding(): number {
    return this.loosePadding
  }
  set LoosePadding(value: number) {
    this.loosePadding = value
    if (this.ObstacleCalculator != null) {
      this.ObstacleCalculator.LoosePadding = value
    }
  }

  sourceVV: VisibilityVertex

  _polyline: Polyline

  get OffsetForPolylineRelaxing() {
    return this.TightPadding * 0.75
  }

  // The expected number of progress steps this algorithm will take.

  ExpectedProgressSteps: number

  targetIsInsideOfSourceTightPolyline: boolean

  sourceIsInsideOfTargetTightPolyline: boolean

  UseEdgeLengthMultiplier = false

  // if set to true the algorithm will try to shortcut a shortest polyline inner points

  UseInnerPolylingShortcutting = true

  // if set to true the algorithm will try to shortcut a shortest polyline start and end

  UsePolylineEndShortcutting = true

  AllowedShootingStraightLines = true

  startPointOfRouting_: Point
  get StartPointOfEdgeRouting(): Point {
    return this.startPointOfRouting_
  }
  set StartPointOfEdgeRouting(value: Point) {
    this.startPointOfRouting_ = value
  }

  ExtendVisibilityGraphToLocation(location: Point) {
    if (this.VisibilityGraph == null) {
      this.VisibilityGraph = new VisibilityGraph()
    }

    let addedPolygons: Array<Polygon> = null
    if (!this.activeRectangle.contains(location)) {
      if (this.activeRectangle.isEmpty) {
        this.activeRectangle = Rectangle.mkPP(this.SourcePort.Location, location)
      } else {
        this.activeRectangle.add(location)
      }

      addedPolygons = this.GetAddedPolygonesAndMaybeExtendActiveRectangle()
      for (const polygon of addedPolygons) {
        this.VisibilityGraph.AddHole(polygon.Polyline)
      }
    }

    if (addedPolygons == null || addedPolygons.length === 0) {
      if (this.targetVV != null) {
        this.VisibilityGraph.RemoveVertex(this.targetVV)
      }

      this.CalculateEdgeTargetVisibilityGraph(location)
    } else {
      this.RemovePointVisibilityGraphs()
      const visibilityGraphGenerator = new InteractiveTangentVisibilityGraphCalculator(
        addedPolygons,
        this.activePolygons,
        this.VisibilityGraph,
      )
      visibilityGraphGenerator.run()
      addRange(this.activePolygons, addedPolygons)
      this.CalculateEdgeTargetVisibilityGraph(location)
      this.CalculateSourcePortVisibilityGraph()
    }
  }

  RemovePointVisibilityGraphs() {
    if (this.targetVV != null) {
      this.VisibilityGraph.RemoveVertex(this.targetVV)
    }

    if (this.sourceVV != null) {
      this.VisibilityGraph.RemoveVertex(this.sourceVV)
    }
  }

  CalculateEdgeTargetVisibilityGraph(location: Point) {
    this.targetVV = PointVisibilityCalculator.CalculatePointVisibilityGraph(
      Array.from(this.GetActivePolylines()),
      this.VisibilityGraph,
      location,
      VisibilityKind.Tangent,
    )
  }

  CalculateSourcePortVisibilityGraph() {
    this.sourceVV = PointVisibilityCalculator.CalculatePointVisibilityGraph(
      Array.from(this.GetActivePolylines()),
      this.VisibilityGraph,
      this.StartPointOfEdgeRouting,
      VisibilityKind.Tangent,
    )
  }

  TakeBoundaryPortOutsideOfItsLoosePolyline(nodeBoundary: ICurve, parameter: number, loosePolyline: Polyline): Point {
    const location: Point = nodeBoundary.value(parameter)
    let tangent: Point = nodeBoundary
      .leftDerivative(parameter)
      .normalize()
      .add(nodeBoundary.rightDerivative(parameter).normalize())
      .normalize()
    if (
      Point.getTriangleOrientation(InteractiveEdgeRouter.PointInsideOfConvexCurve(nodeBoundary), location, location.add(tangent)) ==
      TriangleOrientation.Counterclockwise
    ) {
      tangent = tangent.mul(-1)
    }

    tangent = tangent.rotate(Math.PI / 2)
    const len: number = loosePolyline.boundingBox.diagonal
    let ls = LineSegment.mkPP(location, location.add(tangent.mul(len)))
    const p: Point = Curve.intersectionOne(ls, loosePolyline, false).x
    let del: Point = tangent.mul(p.sub(location).length / 2)
    // Point del = tangent * this.OffsetForPolylineRelaxing * 2;
    while (true) {
      ls = LineSegment.mkPP(location, p.add(del))
      let foundIntersectionsOutsideOfSource = false
      for (const ii of InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolylineLR(
        ls,
        this.ObstacleCalculator.RootOfLooseHierarchy,
      )) {
        if (ii.seg1 !== loosePolyline) {
          del = del.div(1.5)
          foundIntersectionsOutsideOfSource = true
          break
        }
      }

      if (!foundIntersectionsOutsideOfSource) {
        break
      }
    }

    return ls.end
  }

  static PointInsideOfConvexCurve(nodeBoundary: ICurve): Point {
    return nodeBoundary.value(0).add(nodeBoundary.value(1.5)).div(2)
    // a hack !!!!!!!!!!!!!!!!!!!!!!
  }

  // Point TakeSourcePortOutsideOfLoosePolyline() {
  //    CurvePort bp = SourcePort as CurvePort;
  //    ICurve nodeBoundary = bp.Node.BoundaryCurve;
  //    Point location = bp.Location;
  //    Point tangent = (nodeBoundary.LeftDerivative(bp.Parameter).Normalize() + nodeBoundary.RightDerivative(bp.Parameter).Normalize()).Normalize();
  //    if (Point.GetTriangleOrientation(bp.Node.Center, location, location + tangent) === TriangleOrientation.Counterclockwise)
  //        tangent = -tangent;
  //    tangent = tangent.Rotate(Math.PI / 2);
  //    Number len = this.sourceLoosePolyline.BoundingBox.Diagonal;
  //    Point portLocation = bp.Location;
  //    LineSegment ls = LineSegment.mkPP(portLocation, portLocation + len * tangent);
  //    Point p = Curve.GetAllIntersections(ls, this.SourceLoosePolyline, false)[0].x;
  //    Point del = tangent * this.OffsetForPolylineRelaxing * 2;
  //    while (true) {
  //        ls = LineSegment.mkPP(portLocation, p + del);
  //        bool foundIntersectionsOutsideOfSource = false;
  //        foreach (IntersectionInfo ii in IntersectionsOfLineAndRectangleNodeOverPolyline(ls, this.obstacleCalculator.RootOfLooseHierarchy))
  //            if (ii.seg1 !== this.SourceLoosePolyline) {
  //                del /= 1.5;
  //                foundIntersectionsOutsideOfSource = true;
  //                break;
  //            }
  //        if (!foundIntersectionsOutsideOfSource)
  //            break;
  //    }
  //    return ls.End;
  // }
  *GetActivePolylines(): IterableIterator<Polyline> {
    for (const polygon of this.activePolygons) {
      yield polygon.Polyline
    }
  }

  GetAddedPolygonesAndMaybeExtendActiveRectangle(): Array<Polygon> {
    const rect: Rectangle = this.activeRectangle
    const addedPolygones = new Array<Polygon>()
    let added: boolean
    do {
      added = false
      for (const loosePoly of this.ObstacleCalculator.RootOfLooseHierarchy.GetNodeItemsIntersectingRectangle(this.activeRectangle)) {
        if (!this.alreadyAddedOrExcludedPolylines.has(loosePoly)) {
          rect.addRec(loosePoly.boundingBox)
          addedPolygones.push(new Polygon(loosePoly))
          this.alreadyAddedOrExcludedPolylines.add(loosePoly)
          // we register the loose polyline in the set to not add it twice
          added = true
        }
      }

      if (added) {
        this.activeRectangle = rect
      }
    } while (added)

    return addedPolygones
  }

  PolylineSegmentIntersectsTightHierarchy(a: Point, b: Point): boolean {
    return this.PolylineIntersectsPolyRectangleNodeOfTightHierarchyPPR(a, b, this.ObstacleCalculator.RootOfTightHierarchy)
  }

  PolylineIntersectsPolyRectangleNodeOfTightHierarchyPPR(a: Point, b: Point, rect: RectangleNode<Polyline, Point>): boolean {
    return this.PolylineIntersectsPolyRectangleNodeOfTightHierarchy(LineSegment.mkPP(a, b), rect)
  }

  PolylineIntersectsPolyRectangleNodeOfTightHierarchy(ls: LineSegment, rect: RectangleNode<Polyline, Point>): boolean {
    if (!ls.boundingBox.intersects(<Rectangle>rect.irect)) {
      return false
    }

    if (rect.UserData != null) {
      for (const ii of Curve.getAllIntersections(ls, rect.UserData, false)) {
        if (ii.seg1 !== this.SourceTightPolyline && ii.seg1 !== this.TargetTightPolyline) {
          return true
        }

        if ((ii.seg1 === this.SourceTightPolyline && this.SourcePort) instanceof CurvePort) {
          return true
        }

        if ((ii.seg1 === this.TargetTightPolyline && this.TargetPort) instanceof CurvePort) {
          return true
        }
      }

      return false
    }

    return (
      this.PolylineIntersectsPolyRectangleNodeOfTightHierarchy(ls, rect.Left) ||
      this.PolylineIntersectsPolyRectangleNodeOfTightHierarchy(ls, rect.Right)
    )
  }

  static IntersectionsOfLineAndRectangleNodeOverPolylineLR(
    ls: LineSegment,
    rectNode: RectangleNode<Polyline, Point>,
  ): Array<IntersectionInfo> {
    const ret = new Array<IntersectionInfo>()
    InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolyline(ls, rectNode, ret)
    return ret
  }

  static IntersectionsOfLineAndRectangleNodeOverPolyline(
    ls: LineSegment,
    rectNode: RectangleNode<Polyline, Point>,
    listOfIntersections: Array<IntersectionInfo>,
  ) {
    if (rectNode == null) {
      return
    }

    if (!ls.boundingBox.intersects(<Rectangle>rectNode.irect)) {
      return
    }

    if (rectNode.UserData != null) {
      addRange(listOfIntersections, Curve.getAllIntersections(ls, rectNode.UserData, true))
      return
    }

    InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolyline(ls, rectNode.Left, listOfIntersections)
    InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolyline(ls, rectNode.Right, listOfIntersections)
  }

  LineCanBeAcceptedForRouting(ls: LineSegment): boolean {
    const sourceIsFloating: boolean = this.SourcePort instanceof FloatingPort
    const targetIsFloating: boolean = this.TargetPort instanceof FloatingPort
    if (!sourceIsFloating && !this.targetIsInsideOfSourceTightPolyline) {
      if (!this.InsideOfTheAllowedConeOfBoundaryPort(ls.end, <CurvePort>this.SourcePort)) {
        return false
      }
    }

    if (!targetIsFloating && this.TargetPort != null && !this.sourceIsInsideOfTargetTightPolyline) {
      if (!this.InsideOfTheAllowedConeOfBoundaryPort(ls.start, <CurvePort>this.TargetPort)) {
        return false
      }
    }

    const xx: Array<IntersectionInfo> = InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolylineLR(
      ls,
      this.ObstacleCalculator.RootOfTightHierarchy,
    )
    for (const ii of xx) {
      if (ii.seg1 === this.SourceTightPolyline) {
        continue
      }

      if (ii.seg1 === this.targetTightPolyline) {
        continue
      }

      return false
    }

    return true
  }

  InsideOfTheAllowedConeOfBoundaryPort(pointToTest: Point, port: CurvePort): boolean {
    const boundaryCurve: ICurve = port.Curve
    const curveIsClockwise: boolean = InteractiveObstacleCalculator.CurveIsClockwise(
      boundaryCurve,
      InteractiveEdgeRouter.PointInsideOfConvexCurve(boundaryCurve),
    )
    const portLocation: Point = port.Location
    const pointOnTheRightConeSide: Point = this.GetPointOnTheRightBoundaryPortConeSide(
      portLocation,
      boundaryCurve,
      curveIsClockwise,
      port.Parameter,
    )
    const pointOnTheLeftConeSide: Point = this.GetPointOnTheLeftBoundaryPortConeSide(
      portLocation,
      boundaryCurve,
      curveIsClockwise,
      port.Parameter,
    )
    return (
      Point.getTriangleOrientation(portLocation, pointOnTheRightConeSide, pointToTest) !== TriangleOrientation.Clockwise &&
      Point.getTriangleOrientation(portLocation, pointToTest, pointOnTheLeftConeSide) !== TriangleOrientation.Clockwise
    )
  }

  GetPointOnTheRightBoundaryPortConeSide(portLocation: Point, boundaryCurve: ICurve, curveIsClockwise: boolean, portParam: number): Point {
    const tan: Point = curveIsClockwise ? boundaryCurve.rightDerivative(portParam) : boundaryCurve.leftDerivative(portParam).neg()

    return portLocation.add(tan.rotate(this.EnteringAngleBound))
  }

  GetPointOnTheLeftBoundaryPortConeSide(portLocation: Point, boundaryCurve: ICurve, curveIsClockwise: boolean, portParam: number): Point {
    const tan: Point = curveIsClockwise ? boundaryCurve.leftDerivative(portParam).neg() : boundaryCurve.rightDerivative(portParam)
    return portLocation.add(tan.rotate(-this.EnteringAngleBound))
  }

  // ShowPolylineAndObstacles(params curves: ICurve[]) {
  //    //  ReSharper restore UnusedMember.Local
  //    let ls: Array<DebugCurve> = this.GetDebugCurves(curves);
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(ls);
  // }

  // GetDebugCurves(params curves: ICurve[]): Array<DebugCurve> {
  //    let ls = this.CreateListWithObstaclesAndPolyline(curves);
  //    // ls.AddRange(this.VisibilityGraph.Edges.Select(e => new DebugCurve(100,0.1, e is TollFreeVisibilityEdge?"red":"green", LineSegment.mkPP(e.SourcePoint, e.TargetPoint))));
  //    if ((this._sourceVisibilityVertex != null)) {
  //        ls.Add(new DebugCurve("red", CurveFactory.CreateDiamond(4, 4, this._sourceVisibilityVertex.point)));
  //    }

  //    if ((this.targetVisibilityVertex != null)) {
  //        ls.Add(new DebugCurve("purple", new Ellipse(4, 4, this.targetVisibilityVertex.Point)));
  //    }

  //    let anywerePort = (<HookUpAnywhereFromInsidePort>(this.targetPort));
  //    if ((anywerePort != null)) {
  //        ls.Add(new DebugCurve("purple", anywerePort.LoosePolyline));
  //    }

  //    return ls;
  // }

  // CreateListWithObstaclesAndPolyline(params curves: ICurve[]): Array<DebugCurve> {
  //    let ls = new Array<DebugCurve>(this.ObstacleCalculator.RootOfLooseHierarchy.GetAllLeaves().select(() => {  }, new DebugCurve(100, 0.01, "green", e)));
  //    ls.AddRange(curves.Select(() => {  }, new DebugCurve(100, 0.01, "red", c)));
  //    ls.AddRange(this.ObstacleCalculator.RootOfTightHierarchy.GetAllLeaves().select(() => {  }, new DebugCurve(100, 0.01, "blue", e)));
  //    //  ls.AddRange(visibilityGraph.Edges.Select(e => (ICurve) LineSegment.mkPP(e.SourcePoint, e.TargetPoint)));
  //    if ((this._polyline != null)) {
  //        ls.Add(new DebugCurve(100, 0.03, "blue", this._polyline));
  //    }

  //    return ls;
  // }

  // smoothing the corners of the polyline

  SmoothenCorners(edgePolyline: SmoothedPolyline) {
    let a: CornerSite = edgePolyline.headSite
    let corner: {b: CornerSite; c: CornerSite} = {b: null, c: null}
    // the corner other end
    while ((corner = Curve.findCorner(a))) {
      a = this.SmoothOneCorner(a, corner.c, corner.b)
    }
  }

  SmoothOneCorner(a: CornerSite, c: CornerSite, b: CornerSite): CornerSite {
    const mult = 1.5
    const kMin = 0.01
    let k = 0.5
    let seg: BezierSeg
    let v: number
    let u: number
    if (a.prev == null) {
      // this will allow to the segment to start from site "a"
      u = 2
      v = 1
    } else if (c.next == null) {
      u = 1
      v = 2
      // this will allow to the segment to end at site "c"
    } else {
      u = v = 1
    }

    do {
      seg = Curve.createBezierSeg(k * u, k * v, a, b, c)
      b.previouisBezierCoefficient = k * u
      b.nextBezierCoefficient = k * v
      k /= mult
    } while (distFromCornerToSeg() > this.loosePadding && k > kMin)
    k *= mult
    // that was the last k
    if (k < 0.5 && k > kMin) {
      // one time try a smoother seg
      k = 0.5 * (k + k * mult)
      seg = Curve.createBezierSeg(k * u, k * v, a, b, c)
      if (distFromCornerToSeg() > this.loosePadding) {
        b.previouisBezierCoefficient = k * u
        b.nextBezierCoefficient = k * v
      }
    }

    return b

    function distFromCornerToSeg(): number {
      const t = seg.closestParameter(b.point)
      return b.point.sub(seg.value(t)).length
    }
  }

  TryToRemoveInflectionsAndCollinearSegments(underlyingPolyline: SmoothedPolyline) {
    let progress = true
    const t: {s: CornerSite} = {s: null}
    while (progress) {
      progress = false
      for (t.s = underlyingPolyline.headSite; t.s != null && t.s.next != null; t.s = t.s.next) {
        if (t.s.turn * t.s.next.turn < 0) {
          progress = this.TryToRemoveInflectionEdge(t) || progress
        }
      }
    }
  }

  TryToRemoveInflectionEdge(t: {s: CornerSite}): boolean {
    if (!this.ObstacleCalculator.ObstaclesIntersectLine(t.s.prev.point, t.s.next.point)) {
      const a: CornerSite = t.s.prev
      // forget t.s
      const b: CornerSite = t.s.next
      a.next = b
      b.prev = a
      t.s = a
      return true
    }

    if (!this.ObstacleCalculator.ObstaclesIntersectLine(t.s.prev.point, t.s.next.next.point)) {
      // forget about t.s and t.s.Next
      const a: CornerSite = t.s.prev
      const b: CornerSite = t.s.next.next
      a.next = b
      b.prev = a
      t.s = a
      return true
    }

    if (!this.ObstacleCalculator.ObstaclesIntersectLine(t.s.point, t.s.next.next.point)) {
      // forget about t.s.Next
      const b: CornerSite = t.s.next.next
      t.s.next = b
      b.prev = t.s
      return true
    }

    return false
  }

  // internal Point TargetPoint {
  //    get {
  //        CurvePort tp = this.TargetPort as CurvePort;
  //        if (tp != null)
  //            return this.Target.BoundaryCurve[tp.Parameter];
  //        else
  //            return (this.TargetPort as FloatingPort).Location;
  //    }
  // }
  // internal Point SourcePoint {
  //    get {
  //        CurvePort sp = this.SourcePort as CurvePort;
  //        if (sp != null)
  //            return this.Source.BoundaryCurve[sp.Parameter];
  //        else
  //            return (this.SourcePort as FloatingPort).Location;
  //    }
  // }
  GetShortestPolyline(sourceVisVertex: VisibilityVertex, _targetVisVertex: VisibilityVertex): Polyline {
    this.CleanTheGraphForShortestPath()
    const pathCalc = new SingleSourceSingleTargetShortestPathOnVisibilityGraph(this.visibilityGraph, sourceVisVertex, _targetVisVertex)
    const path = pathCalc.GetPath(this.UseEdgeLengthMultiplier)
    if (path == null) {
      // ShowIsPassable(_sourceVisibilityVertex, _targetVisVertex);
      return null
    }

    // Assert.assert(path[0] === sourceVisVertex && path[path.length - 1] === _targetVisVertex)
    let ret = Polyline.mkFromPoints(Array.from(path).map((p) => p.point)).RemoveCollinearVertices()
    if (this.pathOptimizer) {
      this.pathOptimizer.run(ret)
      ret = this.pathOptimizer.poly
    }
    return ret
  }

  // private ShowIsPassable(sourceVisVertex: VisibilityVertex, targetVisVertex: VisibilityVertex) {
  //    let dd = new Array<DebugCurve>(this.visibilityGraph.Edges.Select(() => {  }, new DebugCurve(100, 0.5, "green", LineSegment.mkPP(e.SourcePoint, e.TargetPoint))));
  //    // TODO: Warning!!!, inline IF is not supported ?
  //    ((e.IsPassable == null )
  //                || e.IsPassable());
  //    "red";
  //    if ((sourceVisVertex != null)) {
  //        dd.Add(new DebugCurve(CurveFactory.CreateDiamond(3, 3, sourceVisVertex.point)));
  //    }

  //    if ((targetVisVertex != null)) {
  //        dd.Add(new DebugCurve(CurveFactory.CreateEllipse(3, 3, targetVisVertex.point)));
  //    }

  //    if ((this.Obstacles != null)) {
  //        dd.AddRange(this.Obstacles.Select(() => {  }, new DebugCurve(o)));
  //    }

  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(dd);
  // }

  CleanTheGraphForShortestPath() {
    this.visibilityGraph.ClearPrevEdgesTable()
  }

  // returns true if the nodes overlap or just positioned too close

  get OverlapsDetected(): boolean {
    return this.ObstacleCalculator.OverlapsDetected
  }

  ConeSpannerAngle: number

  get TightHierarchy(): RectangleNode<Polyline, Point> {
    return this.ObstacleCalculator.RootOfTightHierarchy
  }
  set TightHierarchy(value: RectangleNode<Polyline, Point>) {
    this.ObstacleCalculator.RootOfTightHierarchy = value
  }

  get LooseHierarchy(): RectangleNode<Polyline, Point> {
    return this.ObstacleCalculator.RootOfLooseHierarchy
  }
  set LooseHierarchy(value: RectangleNode<Polyline, Point>) {
    this.ObstacleCalculator.RootOfLooseHierarchy = value
  }

  UseSpanner: boolean
  CalculateObstacles() {
    this.ObstacleCalculator = new InteractiveObstacleCalculator(
      this.Obstacles,
      this.TightPadding,
      this.LoosePadding,
      this.IgnoreTightPadding,
    )
    this.ObstacleCalculator.Calculate()
  }

  public static constructorANNNB(
    obstacles: Array<ICurve>,
    padding: number,
    loosePadding: number,
    coneSpannerAngle: number,
    ignoreTightPadding: boolean,
  ): InteractiveEdgeRouter {
    const ier = new InteractiveEdgeRouter(null)
    ier.IgnoreTightPadding = ignoreTightPadding
    ier.EnteringAngleBound = 80 * (Math.PI / 180)
    ier.TightPadding = padding
    ier.LoosePadding = loosePadding
    if (coneSpannerAngle > 0) {
      Assert.assert(coneSpannerAngle > Math.PI / 180)
      Assert.assert(coneSpannerAngle <= 90 * (Math.PI / 180))
      ier.UseSpanner = true
      ier.ExpectedProgressSteps = ConeSpanner.GetTotalSteps(coneSpannerAngle)
    } else {
      ier.ExpectedProgressSteps = obstacles.length
    }

    ier.ConeSpannerAngle = coneSpannerAngle
    ier.Obstacles = obstacles
    ier.CalculateObstacles()
    return ier
  }

  RouteEdgeToLocation(targetLocation: Point): GeomEdge {
    this.TargetPort = new FloatingPort(<ICurve>null, targetLocation)
    // otherwise route edge to a port would be called
    this.TargetTightPolyline = null
    this.TargetLoosePolyline = null
    const edge = new GeomEdge(null)
    let ls = LineSegment.mkPP(this.SourcePort.Location, targetLocation)
    if (this.LineCanBeAcceptedForRouting(ls)) {
      this._polyline = new Polyline()
      this._polyline.addPoint(ls.start)
      this._polyline.addPoint(ls.end)
      edge.smoothedPolyline = SmoothedPolyline.mkFromPoints(this._polyline)
      edge.curve = edge.smoothedPolyline.createCurve()
      return edge
    }

    // can we do with just two line segments?
    if (this.SourcePort instanceof CurvePort) {
      ls = LineSegment.mkPP(this.StartPointOfEdgeRouting, targetLocation)
      if (
        InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolylineLR(ls, this.ObstacleCalculator.RootOfTightHierarchy).length ==
        0
      ) {
        this._polyline = new Polyline()
        this._polyline.addPoint(this.SourcePort.Location)
        this._polyline.addPoint(ls.start)
        this._polyline.addPoint(ls.end)
        edge.smoothedPolyline = SmoothedPolyline.mkFromPoints(this._polyline)
        edge.curve = edge.smoothedPolyline.createCurve()
        return edge
      }
    }

    this.ExtendVisibilityGraphToLocation(targetLocation)
    this._polyline = this.GetShortestPolyline(this.sourceVV, this.targetVV)
    if (this.SourcePort instanceof CurvePort) {
      this._polyline.PrependPoint(this.SourcePort.Location)
    }

    edge.smoothedPolyline = SmoothedPolyline.mkFromPoints(this._polyline)
    edge.curve = edge.smoothedPolyline.createCurve()
    return edge
  }

  // routes the edge to the port

  //

  RouteEdgeToPort(edgeTargetPort: Port, portLoosePolyline: Polyline, smooth: boolean, t: {smoothedPolyline: SmoothedPolyline}): ICurve {
    if (!this.ObstacleCalculator.IsEmpty()) {
      this.TargetPort = edgeTargetPort
      this.TargetTightPolyline = InteractiveEdgeRouter.GetFirstHitPolyline(
        edgeTargetPort.Location,
        this.ObstacleCalculator.RootOfTightHierarchy,
      )
      // Assert.assert(this.targetTightPolyline != null)
      if (edgeTargetPort instanceof CurvePort) {
        return this.RouteEdgeToBoundaryPort(portLoosePolyline, smooth, t)
      }

      return this.RouteEdgeToFloatingPortOfNode(portLoosePolyline, smooth, t)
    }

    if (this.sourcePort != null && this.targetPort != null) {
      t.smoothedPolyline = this.SmoothedPolylineFromTwoPoints(this.sourcePort.Location, this.targetPort.Location)
      return LineSegment.mkPP(this.sourcePort.Location, this.targetPort.Location)
    }

    return null
  }

  SmoothedPolylineFromTwoPoints(s: Point, e: Point): SmoothedPolyline {
    this._polyline = new Polyline()
    this._polyline.addPoint(s)
    this._polyline.addPoint(e)
    return SmoothedPolyline.mkFromPoints(this._polyline)
  }

  RouteEdgeToFloatingPortOfNode(portLoosePolyline: Polyline, smooth: boolean, t: {smoothedPolyline: SmoothedPolyline}): ICurve {
    if (this.sourcePort instanceof FloatingPort) {
      return this.RouteFromFloatingPortToFloatingPort(portLoosePolyline, smooth, t)
    }

    return this.RouteFromBoundaryPortToFloatingPort(portLoosePolyline, smooth, t)
  }

  RouteFromBoundaryPortToFloatingPort(targetPortLoosePolyline: Polyline, smooth: boolean, t: {smoothedPolyline: SmoothedPolyline}): ICurve {
    const sourcePortLocation: Point = this.SourcePort.Location
    const targetPortLocation: Point = this.targetPort.Location
    let ls = LineSegment.mkPP(sourcePortLocation, targetPortLocation)
    if (this.LineCanBeAcceptedForRouting(ls)) {
      t.smoothedPolyline = this.SmoothedPolylineFromTwoPoints(ls.start, ls.end)
      return ls
    }

    if (!this.targetIsInsideOfSourceTightPolyline) {
      // try a variant with two segments
      const takenOutPoint: Point = this.TakeBoundaryPortOutsideOfItsLoosePolyline(
        this.SourcePort.Curve,
        (<CurvePort>this.SourcePort).Parameter,
        this.SourceLoosePolyline,
      )
      ls = LineSegment.mkPP(takenOutPoint, targetPortLocation)
      if (this.LineAvoidsTightHierarchyLP(ls, targetPortLoosePolyline)) {
        t.smoothedPolyline = this.SmoothedPolylineFromTwoPoints(ls.start, ls.end)
        return ls
      }
    }

    // we need to route throw the visibility graph
    this.ExtendVisibilityGraphToLocationOfTargetFloatingPort(targetPortLoosePolyline)
    this._polyline = this.GetShortestPolyline(this.sourceVV, this.targetVV)
    const tmp: Polyline = this.SourceTightPolyline
    if (!this.targetIsInsideOfSourceTightPolyline) {
      this.SourceTightPolyline = null
    }

    this.SourceTightPolyline = tmp
    this._polyline.PrependPoint(sourcePortLocation)
    //  return this._polyline
    return this.SmoothCornersAndReturnCurve(smooth, t)
  }

  SmoothCornersAndReturnCurve(smooth: boolean, t: {smoothedPolyline: SmoothedPolyline}): ICurve {
    t.smoothedPolyline = SmoothedPolyline.mkFromPoints(this._polyline)
    if (smooth) {
      this.SmoothenCorners(t.smoothedPolyline)
    }

    return t.smoothedPolyline.createCurve()
  }

  RouteFromFloatingPortToFloatingPort(portLoosePolyline: Polyline, smooth: boolean, t: {smoothedPolyline: SmoothedPolyline}): ICurve {
    // route through the visibility graph
    this.ExtendVisibilityGraphToLocationOfTargetFloatingPort(portLoosePolyline)
    this._polyline = this.GetShortestPolyline(this.sourceVV, this.targetVV)
    if (this._polyline == null) {
      return null
    }

    t.smoothedPolyline = SmoothedPolyline.mkFromPoints(this._polyline)
    return this.SmoothCornersAndReturnCurve(smooth, t)
  }

  TryShortcutPolyPoint(pp: PolylinePoint): boolean {
    if (
      this.LineAvoidsTightHierarchyLPP(LineSegment.mkPP(pp.point, pp.next.next.point), this.SourceTightPolyline, this.targetTightPolyline)
    ) {
      // remove pp.Next
      pp.next = pp.next.next
      pp.next.prev = pp
      return true
    }

    return false
  }

  ExtendVisibilityGraphToLocationOfTargetFloatingPort(portLoosePolyline: Polyline) {
    if (this.VisibilityGraph == null) {
      this.VisibilityGraph = new VisibilityGraph()
    }

    let addedPolygons: Array<Polygon> = null
    const targetLocation: Point = this.targetPort.Location
    if (!this.activeRectangle.contains(targetLocation)) {
      if (this.activeRectangle.isEmpty) {
        this.activeRectangle = Rectangle.mkPP(this.SourcePort.Location, targetLocation)
      } else {
        this.activeRectangle.add(targetLocation)
      }

      addedPolygons = this.GetAddedPolygonesAndMaybeExtendActiveRectangle()
      for (const polygon of addedPolygons) {
        this.VisibilityGraph.AddHole(polygon.Polyline)
      }
    }

    if (addedPolygons == null) {
      if (this.targetVV != null) {
        this.VisibilityGraph.RemoveVertex(this.targetVV)
      }

      this.CalculateEdgeTargetVisibilityGraphForFloatingPort(targetLocation, portLoosePolyline)
      if (this.sourceVV == null) {
        this.CalculateSourcePortVisibilityGraph()
      }
    } else {
      this.RemovePointVisibilityGraphs()
      const visibilityGraphGenerator = new InteractiveTangentVisibilityGraphCalculator(
        addedPolygons,
        this.activePolygons,
        this.VisibilityGraph,
      )
      visibilityGraphGenerator.run()
      addRange(this.activePolygons, addedPolygons)
      this.CalculateEdgeTargetVisibilityGraphForFloatingPort(targetLocation, portLoosePolyline)
      this.CalculateSourcePortVisibilityGraph()
    }
  }

  CalculateEdgeTargetVisibilityGraphForFloatingPort(targetLocation: Point, targetLoosePoly: Polyline) {
    if (this.UseSpanner) {
      this.targetVV = this.AddTransientVisibilityEdgesForPort(targetLocation, targetLoosePoly)
    } else {
      this.targetVV = PointVisibilityCalculator.CalculatePointVisibilityGraph(
        this.GetActivePolylinesWithException(targetLoosePoly),
        this.VisibilityGraph,
        targetLocation,
        VisibilityKind.Tangent,
      )
    }
  }

  AddTransientVisibilityEdgesForPort(point: Point, loosePoly: Iterable<Point>): VisibilityVertex {
    let v: VisibilityVertex = this.GetVertex(point)
    if (v != null) {
      return v
    }
    v = this.visibilityGraph.AddVertexP(point)
    if (loosePoly != null)
      //if the edges have not been calculated do it in a quick and dirty mode
      for (const p of loosePoly) this.visibilityGraph.AddEdgeF(point, p, (a, b) => new TollFreeVisibilityEdge(a, b))
    else {
      v = PointVisibilityCalculator.CalculatePointVisibilityGraph(
        this.GetActivePolylines(),
        this.VisibilityGraph,
        point,
        VisibilityKind.Tangent,
      )
      // Assert.assert(v != null)
    }
    return v
  }

  GetVertex(point: Point): VisibilityVertex {
    let v: VisibilityVertex = this.visibilityGraph.FindVertex(point)
    if (v == null && this.LookForRoundedVertices) {
      v = this.visibilityGraph.FindVertex(Point.RoundPoint(point))
    }

    return v
  }

  LookForRoundedVertices = false

  ObstacleCalculator: InteractiveObstacleCalculator;

  *GetActivePolylinesWithException(targetLoosePoly: Polyline): IterableIterator<Polyline> {
    /*
return from polygon in activePolygons where polygon.Polyline !== targetLoosePoly select polygon.Polyline;
      */
    for (const polygon of this.activePolygons) {
      if (polygon.Polyline !== targetLoosePoly) yield polygon.Polyline
    }
  }

  RouteEdgeToBoundaryPort(portLoosePolyline: Polyline, smooth: boolean, t: {smoothedPolyline: SmoothedPolyline}): ICurve {
    this.TargetLoosePolyline = portLoosePolyline
    if (this.sourcePort instanceof FloatingPort) {
      return this.RouteFromFloatingPortToBoundaryPort(smooth, t)
    }

    return this.RouteFromBoundaryPortToBoundaryPort(smooth, t)
  }

  RouteFromBoundaryPortToBoundaryPort(smooth: boolean, t: {smoothedPolyline: SmoothedPolyline}): ICurve {
    const sourcePortLocation: Point = this.SourcePort.Location
    let curve: ICurve
    const targetPortLocation: Point = this.targetPort.Location
    let ls = LineSegment.mkPP(sourcePortLocation, targetPortLocation)
    if (this.LineCanBeAcceptedForRouting(ls)) {
      this._polyline = new Polyline()
      this._polyline.addPoint(ls.start)
      this._polyline.addPoint(ls.end)
      t.smoothedPolyline = this.SmoothedPolylineFromTwoPoints(ls.start, ls.end)
      curve = SmoothedPolyline.mkFromPoints(this._polyline).createCurve()
    } else {
      // try three variants with two segments
      const takenOutPoint: Point = this.TakeBoundaryPortOutsideOfItsLoosePolyline(
        this.targetPort.Curve,
        (<CurvePort>this.targetPort).Parameter,
        this.TargetLoosePolyline,
      )
      ls = LineSegment.mkPP(sourcePortLocation, takenOutPoint)
      if (
        this.InsideOfTheAllowedConeOfBoundaryPort(takenOutPoint, <CurvePort>this.SourcePort) &&
        this.LineAvoidsTightHierarchyLP(ls, this._sourceTightPolyline)
      ) {
        this._polyline = new Polyline()
        this._polyline.addPoint(ls.start)
        this._polyline.addPoint(ls.end)
        this._polyline.addPoint(targetPortLocation)
        curve = this.SmoothCornersAndReturnCurve(smooth, t)
      } else {
        ls = LineSegment.mkPP(this.StartPointOfEdgeRouting, targetPortLocation)
        if (
          this.InsideOfTheAllowedConeOfBoundaryPort(this.StartPointOfEdgeRouting, <CurvePort>this.TargetPort) &&
          this.LineAvoidsTightHierarchy(ls)
        ) {
          this._polyline = new Polyline()
          this._polyline.addPoint(sourcePortLocation)
          this._polyline.addPoint(ls.start)
          this._polyline.addPoint(ls.end)
          curve = this.SmoothCornersAndReturnCurve(smooth, t)
        } else {
          // we still can make the polyline with two segs when the port sticking segs are intersecting
          let x: Point
          if ((x = LineSegment.IntersectPPPP(sourcePortLocation, this.StartPointOfEdgeRouting, targetPortLocation, takenOutPoint))) {
            this._polyline = new Polyline()
            this._polyline.addPoint(sourcePortLocation)
            this._polyline.addPoint(x)
            this._polyline.addPoint(targetPortLocation)
            curve = this.SmoothCornersAndReturnCurve(smooth, t)
          } else if (Point.closeDistEps(this.StartPointOfEdgeRouting, takenOutPoint)) {
            this._polyline = new Polyline()
            this._polyline.addPoint(sourcePortLocation)
            this._polyline.addPoint(takenOutPoint)
            this._polyline.addPoint(targetPortLocation)
            curve = this.SmoothCornersAndReturnCurve(smooth, t)
          } else if (this.LineAvoidsTightHierarchy(LineSegment.mkPP(this.StartPointOfEdgeRouting, takenOutPoint))) {
            // can we do three segments?
            this._polyline = new Polyline()
            this._polyline.addPoint(sourcePortLocation)
            this._polyline.addPoint(this.StartPointOfEdgeRouting)
            this._polyline.addPoint(takenOutPoint)
            this._polyline.addPoint(targetPortLocation)
            curve = this.SmoothCornersAndReturnCurve(smooth, t)
          } else {
            this.ExtendVisibilityGraphToTargetBoundaryPort(takenOutPoint)
            this._polyline = this.GetShortestPolyline(this.sourceVV, this.targetVV)
            const r: {tmpTargetTight: Polyline} = {tmpTargetTight: null}
            const tmpSourceTight: Polyline = this.HideSourceTargetTightsIfNeeded(r)
            this.RecoverSourceTargetTights(tmpSourceTight, r.tmpTargetTight)
            this._polyline.PrependPoint(sourcePortLocation)
            this._polyline.addPoint(targetPortLocation)
            curve = this.SmoothCornersAndReturnCurve(smooth, t)
          }
        }
      }
    }

    return curve
  }

  RecoverSourceTargetTights(tmpSourceTight: Polyline, tmpTargetTight: Polyline) {
    this.SourceTightPolyline = tmpSourceTight
    this.TargetTightPolyline = tmpTargetTight
  }

  HideSourceTargetTightsIfNeeded(t: {tmpTargetTight: Polyline}): Polyline {
    const tmpSourceTight: Polyline = this.SourceTightPolyline
    t.tmpTargetTight = this.TargetTightPolyline
    this.TargetTightPolyline = null
    this.SourceTightPolyline = null
    return tmpSourceTight
  }

  LineAvoidsTightHierarchy(lineSegment: LineSegment): boolean {
    return (
      InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolylineLR(lineSegment, this.ObstacleCalculator.RootOfTightHierarchy)
        .length === 0
    )
  }

  RouteFromFloatingPortToBoundaryPort(smooth: boolean, r: {smoothedPolyline: SmoothedPolyline}): ICurve {
    const targetPortLocation: Point = this.targetPort.Location
    let ls: LineSegment
    if (this.InsideOfTheAllowedConeOfBoundaryPort(this.sourcePort.Location, <CurvePort>this.targetPort)) {
      ls = LineSegment.mkPP(this.SourcePort.Location, targetPortLocation)
      if (this.LineCanBeAcceptedForRouting(ls)) {
        r.smoothedPolyline = this.SmoothedPolylineFromTwoPoints(ls.start, ls.end)
        return ls
      }
    }

    const takenOutTargetPortLocation: Point = this.TakeBoundaryPortOutsideOfItsLoosePolyline(
      this.TargetPort.Curve,
      (<CurvePort>this.TargetPort).Parameter,
      this.TargetLoosePolyline,
    )
    // can we do with just two line segments?
    ls = LineSegment.mkPP(this.SourcePort.Location, takenOutTargetPortLocation)
    if (this.LineAvoidsTightHierarchyLP(ls, this._sourceTightPolyline)) {
      this._polyline = Polyline.mkFromPoints([ls.start, ls.end, targetPortLocation])
      r.smoothedPolyline = SmoothedPolyline.mkFromPoints(this._polyline)
      return r.smoothedPolyline.createCurve()
    }

    this.ExtendVisibilityGraphToTargetBoundaryPort(takenOutTargetPortLocation)
    this._polyline = this.GetShortestPolyline(this.sourceVV, this.targetVV)
    this._polyline.addPoint(targetPortLocation)
    const t: {smoothedPolyline: SmoothedPolyline} = {smoothedPolyline: null}
    return this.SmoothCornersAndReturnCurve(smooth, t)
  }

  LineAvoidsTightHierarchyLP(ls: LineSegment, polylineToExclude: Polyline): boolean {
    let lineIsGood = true
    for (const ii of InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolylineLR(
      ls,
      this.ObstacleCalculator.RootOfTightHierarchy,
    )) {
      if (ii.seg1 !== polylineToExclude) {
        lineIsGood = false
        break
      }
    }

    return lineIsGood
  }

  LineAvoidsTightHierarchyLPP(ls: LineSegment, polylineToExclude0: Polyline, polylineToExclude1: Polyline): boolean {
    let lineIsGood = true
    for (const ii of InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolylineLR(
      ls,
      this.ObstacleCalculator.RootOfTightHierarchy,
    )) {
      if (!(ii.seg1 === polylineToExclude0 || ii.seg1 === polylineToExclude1)) {
        lineIsGood = false
        break
      }
    }

    return lineIsGood
  }

  LineAvoidsTightHierarchyPPPP(a: Point, b: Point, polylineToExclude0: Polyline, polylineToExclude1: Polyline): boolean {
    return this.LineAvoidsTightHierarchyLPP(LineSegment.mkPP(a, b), polylineToExclude0, polylineToExclude1)
  }

  ExtendVisibilityGraphToTargetBoundaryPort(takenOutTargetPortLocation: Point) {
    let addedPolygons: Array<Polygon> = null
    if (this.VisibilityGraph == null) {
      this.VisibilityGraph = new VisibilityGraph()
    }

    if (
      !this.activeRectangle.contains(takenOutTargetPortLocation) ||
      !this.activeRectangle.containsRect(this.TargetLoosePolyline.boundingBox)
    ) {
      if (this.activeRectangle.isEmpty) {
        this.activeRectangle = this.TargetLoosePolyline.boundingBox.clone()
        this.activeRectangle.add(this.SourcePort.Location)
        this.activeRectangle.add(this.StartPointOfEdgeRouting)
        this.activeRectangle.add(takenOutTargetPortLocation)
      } else {
        this.activeRectangle.add(takenOutTargetPortLocation)
        this.activeRectangle.addRec(this.TargetLoosePolyline.boundingBox)
      }

      addedPolygons = this.GetAddedPolygonesAndMaybeExtendActiveRectangle()
      for (const polygon of addedPolygons) {
        this.VisibilityGraph.AddHole(polygon.Polyline)
      }
    }

    if (addedPolygons == null) {
      if (this.targetVV != null) {
        this.VisibilityGraph.RemoveVertex(this.targetVV)
      }

      this.CalculateEdgeTargetVisibilityGraph(takenOutTargetPortLocation)
    } else {
      this.RemovePointVisibilityGraphs()
      const visibilityGraphGenerator = new InteractiveTangentVisibilityGraphCalculator(
        addedPolygons,
        this.activePolygons,
        this.VisibilityGraph,
      )
      visibilityGraphGenerator.run()
      addRange(this.activePolygons, addedPolygons)
      this.CalculateEdgeTargetVisibilityGraph(takenOutTargetPortLocation)
      this.CalculateSourcePortVisibilityGraph()
    }
  }

  // returns the hit object

  GetHitLoosePolyline(point: Point): Polyline {
    if (this.ObstacleCalculator.IsEmpty() || this.ObstacleCalculator.RootOfLooseHierarchy == null) {
      return null
    }

    return InteractiveEdgeRouter.GetFirstHitPolyline(point, this.ObstacleCalculator.RootOfLooseHierarchy)
  }

  static GetFirstHitPolyline(point: Point, rectangleNode: RectangleNode<Polyline, Point>): Polyline {
    const rectNode: RectangleNode<Polyline, Point> = InteractiveEdgeRouter.GetFirstHitRectangleNode(point, rectangleNode)
    return rectNode ? rectNode.UserData : null
  }

  static GetFirstHitRectangleNode(point: Point, rectangleNode: RectangleNode<Polyline, Point>): RectangleNode<Polyline, Point> {
    if (rectangleNode == null) {
      return null
    }
    return rectangleNode.FirstHitNodeWithPredicate(point, (pnt, polyline) =>
      Curve.PointRelativeToCurveLocation(pnt, polyline) !== PointLocation.Outside ? HitTestBehavior.Stop : HitTestBehavior.Continue,
    )
  }

  //

  Clean() {
    this.TargetPort = null
    this.SourcePort = null
    this.SourceTightPolyline = null
    this.SourceLoosePolyline = null
    this.TargetLoosePolyline = null
    this.targetTightPolyline = null
    this.VisibilityGraph = null
    this.targetVV = null
    this.sourceVV = null
    this.activePolygons = []
    this.alreadyAddedOrExcludedPolylines.clear()
    this.activeRectangle.setToEmpty()
  }

  // setting source port and the loose polyline of the port

  SetSourcePortAndSourceLoosePolyline(port: Port, sourceLoosePolylinePar: Polyline) {
    this.SourceLoosePolyline = sourceLoosePolylinePar
    this.sourcePort = port
    if (this.sourcePort != null) {
      this.SourceTightPolyline = InteractiveEdgeRouter.GetFirstHitPolyline(
        this.sourcePort.Location,
        this.ObstacleCalculator.RootOfTightHierarchy,
      )
      if (this.sourcePort instanceof FloatingPort) {
        this.alreadyAddedOrExcludedPolylines.add(this.SourceLoosePolyline)
        // we need to exclude the loose polyline around the source port from the tangent visibily graph
        this.StartPointOfEdgeRouting = this.SourcePort.Location
      } else {
        this.StartPointOfEdgeRouting = this.TakeBoundaryPortOutsideOfItsLoosePolyline(
          this.SourcePort.Curve,
          (<CurvePort>this.sourcePort).Parameter,
          this.SourceLoosePolyline,
        )
      }
    }
  }

  run() {
    this.CalculateWholeTangentVisibilityGraph()
  }

  CalculateWholeTangentVisibilityGraph() {
    this.VisibilityGraph = new VisibilityGraph()
    this.CalculateWholeVisibilityGraphOnExistingGraph()
  }

  CalculateWholeVisibilityGraphOnExistingGraph() {
    this.activePolygons = Array.from(this.AllPolygons())
    for (const polylineLocal of this.ObstacleCalculator.LooseObstacles) {
      this.VisibilityGraph.AddHole(polylineLocal)
    }

    let visibilityGraphGenerator: Algorithm
    if (this.UseSpanner) {
      visibilityGraphGenerator = new ConeSpanner(this.ObstacleCalculator.LooseObstacles, this.VisibilityGraph)
    } else {
      visibilityGraphGenerator = new InteractiveTangentVisibilityGraphCalculator(
        new Array<Polygon>(),
        this.activePolygons,
        this.visibilityGraph,
      )
    }

    visibilityGraphGenerator.run()
  }

  RouteSplineFromPortToPortWhenTheWholeGraphIsReady(
    sourcePortLocal: Port,
    targetPortLocal: Port,
    smooth: boolean,
    t: {smoothedPolyline: SmoothedPolyline},
  ): ICurve {
    const reversed: boolean =
      (sourcePortLocal instanceof FloatingPort && targetPortLocal instanceof CurvePort) ||
      sourcePortLocal instanceof HookUpAnywhereFromInsidePort
    if (reversed) {
      const tmp: Port = sourcePortLocal
      sourcePortLocal = targetPortLocal
      targetPortLocal = tmp
    }

    this.sourcePort = sourcePortLocal
    this.targetPort = targetPortLocal
    this.FigureOutSourceTargetPolylinesAndActiveRectangle()
    let curve: ICurve = this.GetEdgeGeomByRouting(smooth, t)
    if (curve == null) {
      return null
    }

    this.targetVV = null
    this.sourceVV = null
    if (reversed) {
      curve = curve.reverse()
    }

    return curve
  }

  GetEdgeGeomByRouting(smooth: boolean, t: {smoothedPolyline: SmoothedPolyline}): ICurve {
    this.sourceIsInsideOfTargetTightPolyline =
      this.TargetTightPolyline == null ||
      Curve.PointRelativeToCurveLocation(this.sourcePort.Location, this.TargetTightPolyline) === PointLocation.Inside
    let curve: ICurve
    if (this.sourcePort instanceof CurvePort) {
      const curvePort = <CurvePort>this.sourcePort
      this.StartPointOfEdgeRouting = !this.targetIsInsideOfSourceTightPolyline
        ? this.TakeBoundaryPortOutsideOfItsLoosePolyline(curvePort.Curve, curvePort.Parameter, this.SourceLoosePolyline)
        : curvePort.Location

      this.CalculateSourcePortVisibilityGraph()

      const t: {smoothedPolyline: SmoothedPolyline} = {smoothedPolyline: null}
      if (this.targetPort instanceof CurvePort) {
        curve = this.RouteFromBoundaryPortToBoundaryPort(smooth, t)
      } else {
        curve = this.RouteFromBoundaryPortToFloatingPort(this.targetLoosePolyline, smooth, t)
      }
    } else if (this.targetPort instanceof FloatingPort) {
      this.ExtendVisibilityGraphFromFloatingSourcePort()
      // Assert.assert(this.sourceVV != null)
      // the edge has to be reversed to route from CurvePort to FloatingPort
      curve = this.RouteFromFloatingPortToFloatingPort(this.targetLoosePolyline, smooth, t)
    } else {
      // Assert.assert(this.targetPort instanceof HookUpAnywhereFromInsidePort)
      curve = this.RouteFromFloatingPortToAnywherePort(
        (<HookUpAnywhereFromInsidePort>this.targetPort).LoosePolyline,
        smooth,
        t,
        <HookUpAnywhereFromInsidePort>this.targetPort,
      )
    }

    return curve
  }

  RouteFromFloatingPortToAnywherePort(
    targetLoosePoly: Polyline,
    smooth: boolean,
    t: {smoothedPolyline: SmoothedPolyline},
    port: HookUpAnywhereFromInsidePort,
  ): ICurve {
    if (!port.Curve.boundingBox.contains(this.sourcePort.Location)) {
      t.smoothedPolyline = null
      return null
    }

    this.sourceVV = this.GetVertex(this.sourcePort.Location)
    this._polyline = this.GetShortestPolylineToMulitpleTargets(this.sourceVV, Array.from(this.Targets(targetLoosePoly)))
    if (this._polyline == null) {
      return null
    }

    this.FixLastPolylinePointForAnywherePort(port)
    if (port.HookSize > 0) {
      this.BuildHook(port)
    }

    return this.SmoothCornersAndReturnCurve(smooth, t)
  }

  BuildHook(port: HookUpAnywhereFromInsidePort) {
    const curve = port.Curve
    // creating a hook
    const ellipse = Ellipse.mkFullEllipseNNP(port.HookSize, port.HookSize, this._polyline.end)
    const intersections = Curve.getAllIntersections(curve, ellipse, true)
    // Assert.assert(intersections.length === 2)
    if (
      Point.getTriangleOrientation(intersections[0].x, this._polyline.end, this._polyline.endPoint.prev.point) ==
      TriangleOrientation.Counterclockwise
    ) {
      intersections.reverse()
    }

    // so the [0] point is to the left of the Polyline
    const polylineTangent = this._polyline.end.sub(this._polyline.endPoint.prev.point).normalize()
    const tan0 = curve.derivative(intersections[0].par0).normalize()
    const prj0 = tan0.dot(polylineTangent)
    if (Math.abs(prj0) < 0.2) {
      this.ExtendPolyline(tan0, intersections[0], polylineTangent, port)
    } else {
      const tan1 = curve.derivative(intersections[1].par0).normalize()
      const prj1 = tan1.dot(polylineTangent)
      if (prj1 < prj0) {
        this.ExtendPolyline(tan1, intersections[1], polylineTangent, port)
      } else {
        this.ExtendPolyline(tan0, intersections[0], polylineTangent, port)
      }
    }
  }

  ExtendPolyline(tangentAtIntersection: Point, x: IntersectionInfo, polylineTangent: Point, port: HookUpAnywhereFromInsidePort) {
    let normal = tangentAtIntersection.rotate(Math.PI / 2)
    if (normal.dot(polylineTangent) < 0) {
      normal = normal.neg()
    }

    const pointBeforeLast = x.x.add(normal.mul(port.HookSize))
    let pointAfterX: Point
    if (
      !(pointAfterX = Point.lineLineIntersection(
        pointBeforeLast,
        pointBeforeLast.add(tangentAtIntersection),
        this._polyline.end,
        this._polyline.end.add(polylineTangent),
      ))
    ) {
      return
    }

    this._polyline.addPoint(pointAfterX)
    this._polyline.addPoint(pointBeforeLast)
    this._polyline.addPoint(x.x)
  }

  FixLastPolylinePointForAnywherePort(port: HookUpAnywhereFromInsidePort) {
    while (true) {
      const lastPointInside: PolylinePoint = this.GetLastPointInsideOfCurveOnPolyline(port.Curve)
      lastPointInside.next.next = null
      this._polyline.endPoint = lastPointInside.next
      let dir = lastPointInside.next.point.sub(lastPointInside.point)
      dir = dir.normalize().mul(port.Curve.boundingBox.diagonal)
      // make it a long vector
      const dir0 = dir.rotate(port.AdjustmentAngle * -1)
      const dir1 = dir.rotate(port.AdjustmentAngle)
      const rx = Curve.intersectionOne(port.Curve, LineSegment.mkPP(lastPointInside.point, lastPointInside.point.add(dir0)), true)
      const lx = Curve.intersectionOne(port.Curve, LineSegment.mkPP(lastPointInside.point, lastPointInside.point.add(dir1)), true)
      if (rx == null || lx == null) {
        return
      }

      // this.ShowPolylineAndObstacles(Polyline, LineSegment.mkPP(lastPointInside.Point, lastPointInside.Point+dir0), LineSegment.mkPP(lastPointInside.Point, rerPoint+dir1), port.Curve);
      const trimmedCurve = InteractiveEdgeRouter.GetTrimmedCurveForHookingUpAnywhere(port.Curve, lastPointInside, rx, lx)
      const newLastPoint = trimmedCurve.value(trimmedCurve.closestParameter(lastPointInside.point))
      if (!this.LineAvoidsTightHierarchyLPP(LineSegment.mkPP(lastPointInside.point, newLastPoint), this.SourceTightPolyline, null)) {
        const xx = Curve.intersectionOne(port.Curve, LineSegment.mkPP(lastPointInside.point, lastPointInside.next.point), false)
        if (xx == null) {
          return
        }

        // this.ShowPolylineAndObstacles(Polyline, port.Curve);
        this._polyline.endPoint.point = xx.x
        break
      }

      this._polyline.endPoint.point = newLastPoint
      if (lastPointInside.prev == null || !this.TryShortcutPolyPoint(lastPointInside.prev)) {
        break
      }
    }
  }

  static GetTrimmedCurveForHookingUpAnywhere(
    curve: ICurve,
    lastPointInside: PolylinePoint,
    x0: IntersectionInfo,
    x1: IntersectionInfo,
  ): ICurve {
    const clockwise = Point.getTriangleOrientation(x1.x, x0.x, lastPointInside.point) === TriangleOrientation.Clockwise
    const rightX: number = x0.par0
    const leftX: number = x1.par0
    let tr1: ICurve
    let tr0: ICurve
    let ret: Curve
    if (clockwise) {
      if (rightX < leftX) {
        return curve.trim(rightX, leftX)
      }

      tr0 = curve.trim(rightX, curve.parEnd)
      tr1 = curve.trim(curve.parStart, leftX)
      ret = new Curve()
      return ret.addSegs([tr0, tr1])
    }

    if (leftX < rightX) {
      return curve.trim(leftX, rightX)
    }

    tr0 = curve.trim(leftX, curve.parEnd)
    tr1 = curve.trim(curve.parStart, rightX)
    ret = new Curve()
    return ret.addSegs([tr0, tr1])
  }

  GetLastPointInsideOfCurveOnPolyline(curve: ICurve): PolylinePoint {
    for (let p = this._polyline.endPoint.prev; p != null; p = p.prev) {
      if (p.prev == null) {
        return p
      }

      if (Curve.PointRelativeToCurveLocation(p.point, curve) === PointLocation.Inside) {
        return p
      }
    }

    throw new Error()
  }

  GetShortestPolylineToMulitpleTargets(sourceVisVertex: VisibilityVertex, targets: Array<VisibilityVertex>): Polyline {
    this.CleanTheGraphForShortestPath()
    // ShowPolylineAndObstacles(targets.Select(t=>new Ellipse(3,3,t.Point)).ToArray());
    const pathCalc = new SingleSourceMultipleTargetsShortestPathOnVisibilityGraph(sourceVisVertex, targets, this.VisibilityGraph)
    // { dd = ShowPolylineAndObstacles };
    const path = pathCalc.GetPath()
    if (path == null) {
      return null
    }

    // Assert.assert(((from(path).first() === sourceVisVertex)
    //                && targets.contains(path.last())));
    const ret = new Polyline()
    for (const v of path) {
      ret.addPoint(v.point)
    }

    return ret.RemoveCollinearVertices()
  }

  Targets(targetLoosePoly: Polyline): Array<VisibilityVertex> {
    return Array.from(targetLoosePoly).map((p) => this.visibilityGraph.FindVertex(p))
  }

  ExtendVisibilityGraphFromFloatingSourcePort() {
    const fp = <FloatingPort>this.sourcePort
    // Assert.assert(this.sourcePort instanceof FloatingPort)
    this.StartPointOfEdgeRouting = fp.Location
    if (this.UseSpanner) {
      this.sourceVV = this.AddTransientVisibilityEdgesForPort(this.sourcePort.Location, this.SourceLoosePolyline)
    } else {
      this.sourceVV = PointVisibilityCalculator.CalculatePointVisibilityGraph(
        Array.from(this.GetActivePolylines()).filter((p) => p !== this.SourceLoosePolyline),
        this.VisibilityGraph,
        this.StartPointOfEdgeRouting,
        VisibilityKind.Tangent,
      )
    }
  }

  FigureOutSourceTargetPolylinesAndActiveRectangle() {
    let p = this.sourcePort.Curve.value(this.sourcePort.Curve.parStart)
    this._sourceTightPolyline = InteractiveEdgeRouter.GetFirstHitPolyline(p, this.ObstacleCalculator.RootOfTightHierarchy)
    this.SourceLoosePolyline = InteractiveEdgeRouter.GetFirstHitPolyline(p, this.ObstacleCalculator.RootOfLooseHierarchy)
    p = this.targetPort.Curve.value(this.targetPort.Curve.parStart)
    this.targetTightPolyline = InteractiveEdgeRouter.GetFirstHitPolyline(p, this.ObstacleCalculator.RootOfTightHierarchy)
    this.targetLoosePolyline = InteractiveEdgeRouter.GetFirstHitPolyline(p, this.ObstacleCalculator.RootOfLooseHierarchy)
    this.activeRectangle = Rectangle.mkPP(
      new Point(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY),
      new Point(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
    )
  }

  *AllPolygons(): IterableIterator<Polygon> {
    for (const p of this.ObstacleCalculator.LooseObstacles) {
      yield new Polygon(p)
    }
  }

  //

  GetVisibilityGraph(): VisibilityGraph {
    return this.VisibilityGraph
  }

  // ShowObstaclesAndVisGraph() {
  //    let obs = this.ObstacleCalculator.LooseObstacles.Select(() => {  }, new DebugCurve(100, 1, "blue", o));
  //    let edges = this.visibilityGraph.Edges.Select(() => {  }, new DebugCurve(70, 1, (e instanceof  "red"), LineSegment.mkPP(e.SourcePoint, e.TargetPoint)));
  //    // TODO: Warning!!!, inline IF is not supported ?
  //    TransientVisibilityEdge;
  //    "green";
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(obs.Concat(edges));
  // }

  AddActivePolygons(polygons: Array<Polygon>) {
    addRange(this.activePolygons, polygons)
  }

  ClearActivePolygons() {
    this.activePolygons = []
  }
}
