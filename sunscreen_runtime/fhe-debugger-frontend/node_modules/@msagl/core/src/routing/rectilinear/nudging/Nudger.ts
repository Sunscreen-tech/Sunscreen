import {Point} from '../../../math/geometry/point'
import {ICurve} from '../../../math/geometry/icurve'
import {Rectangle} from '../../../math/geometry/rectangle'
import {UniformOneDimensionalSolver} from '../../../math/projectionSolver/UniformOneDimensionalSolver'
import {Port} from '../../../layout/core/port'
import {CompassVector} from '../../../math/geometry/compassVector'
import {Curve, PointLocation} from '../../../math/geometry/curve'
import {DebugCurve} from '../../../math/geometry/debugCurve'
import {Direction} from '../../../math/geometry/direction'
import {GeomConstants} from '../../../math/geometry/geomConstants'
import {LineSegment} from '../../../math/geometry/lineSegment'
import {Polyline} from '../../../math/geometry/polyline'

import {closeDistEps} from '../../../utils/compare'
import {Shape} from '../../shape'
import {SegmentBase} from '../../visibility/SegmentBase'
import {VisibilityEdge} from '../../visibility/VisibilityEdge'
import {VisibilityGraph} from '../../visibility/VisibilityGraph'
import {AxisEdge} from './AxisEdge'
import {CombinatorialNudger} from './CombinatorialNudger'
import {FreeSpaceFinder} from './FreeSpaceFinder'
import {LongestNudgedSegment} from './LongestNudgedSegment'
import {Path} from './Path'
import {PathEdge} from './PathEdge'
import {PathRefiner} from './PathRefiner'
import {StaircaseRemover} from './StaircaseRemover'
import {HitTestBehavior} from '../../../math/geometry/RTree/hitTestBehavior'
import {CreateRectNodeOnArrayOfRectNodes, mkRectangleNode, RectangleNode} from '../../../math/geometry/RTree/rectangleNode'
import {GeomEdge} from '../../..'
type PointProjection = (p: Point) => number
// following paper "Orthogonal Connector Routing"
export class Nudger {
  get HasGroups(): boolean {
    return null != this.HierarchyOfGroups && this.HierarchyOfGroups.Count > 0
  }

  axisEdgesToObstaclesTheyOriginatedFrom: Map<AxisEdge, Polyline>

  Paths: Array<Path>
  Obstacles: Array<Polyline>

  PathVisibilityGraph: VisibilityGraph
  //  "nudges" paths to decrease the number of intersections and stores the results inside WidePaths of "paths"
  // paths through the graph
  // two parallel paths should be separated by this distance if it is feasible
  // polygonal convex obstacles organized  of a tree; the obstacles here are padded original obstacles
  //

  constructor(paths: Array<Path>, cornerFitRad: number, obstacles: Array<Polyline>, ancestorsSets: Map<Shape, Set<Shape>>) {
    this.AncestorsSets = ancestorsSets
    this.HierarchyOfGroups = CreateRectNodeOnArrayOfRectNodes(
      Array.from(ancestorsSets.keys())
        .filter((shape) => shape.IsGroup)
        .map((group) => mkRectangleNode(group, group.BoundingBox)),
      /*from(ancestorsSets.keys())
        .where((shape) => shape.IsGroup)
        .select((group) => mkRectangleNode(group, group.BoundingBox))
        .toArray(),*/
    )
    this.Obstacles = obstacles
    this.EdgeSeparation = 2 * cornerFitRad
    this.Paths = paths
    this.HierarchyOfObstacles = CreateRectNodeOnArrayOfRectNodes(obstacles.map((p) => mkRectangleNode(p, p.boundingBox)))
    this.MapPathsToTheirObstacles()
  }

  AncestorsSets: Map<Shape, Set<Shape>>

  MapPathsToTheirObstacles() {
    this.PathToObstacles = new Map<Path, [Polyline, Polyline]>()
    for (const path of this.Paths) {
      this.MapPathToItsObstacles(path)
    }
  }

  MapPathToItsObstacles(path: Path) {
    if (!path.PathPoints || (<Point[]>path.PathPoints).length === 0) return
    const fr = path.PathPoints as Array<Point>
    const startNode = this.HierarchyOfObstacles.FirstHitNodeWithPredicate(fr[0], Nudger.ObstacleTest)
    const endNode = this.HierarchyOfObstacles.FirstHitNodeWithPredicate(fr[fr.length - 1], Nudger.ObstacleTest)
    if (null != startNode && null != endNode) {
      this.PathToObstacles.set(path, [startNode.UserData, endNode.UserData])
    }
  }

  static ObstacleTest(pnt: Point, polyline: Polyline): HitTestBehavior {
    return Curve.PointRelativeToCurveLocation(pnt, polyline) !== PointLocation.Outside ? HitTestBehavior.Stop : HitTestBehavior.Continue
  }

  HierarchyOfObstacles: RectangleNode<Polyline, Point>

  HierarchyOfGroups: RectangleNode<Shape, Point>

  Calculate(direction: Direction, mergePaths: boolean) {
    this.NudgingDirection = direction
    PathRefiner.RefinePaths(this.Paths, mergePaths)
    this.GetPathOrdersAndPathGraph()
    this.MapAxisEdgesToTheirObstacles()
    this.DrawPaths()
  }

  MapAxisEdgesToTheirObstacles() {
    this.axisEdgesToObstaclesTheyOriginatedFrom = new Map<AxisEdge, Polyline>()
    for (const path of this.Paths) {
      this.MapPathEndAxisEdgesToTheirObstacles(path)
    }

    // The assignment above was too greedy. An edge belonging to interiour edges of some path can be marked by mistake.
    for (const path of this.Paths) {
      this.UmmapPathInteriourFromStrangerObstacles(path)
    }
  }

  UmmapPathInteriourFromStrangerObstacles(path: Path) {
    const firstUnmappedEdge = this.FindFirstUnmappedEdge(path)
    if (firstUnmappedEdge == null) {
      return
    }

    const lastUnmappedEdge = this.FindLastUnmappedEdge(path)
    for (let edge = firstUnmappedEdge; edge != null && edge !== lastUnmappedEdge; edge = edge.Next) {
      this.axisEdgesToObstaclesTheyOriginatedFrom.delete(edge.AxisEdge)
    }
  }

  FindLastUnmappedEdge(path: Path): PathEdge {
    for (let edge = path.LastEdge; edge != null; edge = edge.Prev) {
      if (edge.AxisEdge.Direction !== this.NudgingDirection) {
        return edge
      }
    }

    return null
  }

  FindFirstUnmappedEdge(path: Path): PathEdge {
    for (let edge = path.FirstEdge; edge != null; edge = edge.Next) {
      if (edge.AxisEdge.Direction !== this.NudgingDirection) {
        return edge
      }
    }

    return null
  }

  MapPathEndAxisEdgesToTheirObstacles(path: Path) {
    const coupleOfObstacles = this.PathToObstacles.get(path)
    if (coupleOfObstacles) {
      this.ProcessThePathStartToMapAxisEdgesToTheirObstacles(path, coupleOfObstacles[0])
      this.ProcessThePathEndToMapAxisEdgesToTheirObstacles(path, coupleOfObstacles[1])
    }
  }

  ProcessThePathEndToMapAxisEdgesToTheirObstacles(path: Path, endPolyline: Polyline) {
    for (
      let edge = path.LastEdge;
      edge != null && CompassVector.DirectionsAreParallel(edge.Direction, this.NudgingDirection);
      edge = edge.Prev
    ) {
      this.axisEdgesToObstaclesTheyOriginatedFrom.set(edge.AxisEdge, endPolyline)
    }
  }

  ProcessThePathStartToMapAxisEdgesToTheirObstacles(path: Path, startPolyline: Polyline) {
    for (
      let edge = path.FirstEdge;
      edge != null && CompassVector.DirectionsAreParallel(edge.Direction, this.NudgingDirection);
      edge = edge.Next
    ) {
      this.axisEdgesToObstaclesTheyOriginatedFrom.set(edge.AxisEdge, startPolyline)
    }

    // possible bug here because an edge might ignore two obstacles if it connects them
  }

  GetPathOrdersAndPathGraph() {
    const combinatorialNudger = new CombinatorialNudger(this.Paths)
    this.PathOrders = combinatorialNudger.GetOrder()
    this.PathVisibilityGraph = combinatorialNudger.PathVisibilityGraph
  }

  NudgingDirection: Direction

  static GetCurvesForShow(paths: Iterable<Path>, obstacles: Iterable<Polyline>): ICurve[] {
    const ret = new Array<ICurve>()
    for (const path of paths) {
      const poly = new Polyline()
      for (const point of <Array<Point>>path.PathPoints) {
        poly.addPoint(point)
      }

      ret.push(poly)
    }

    return ret.concat(Array.from(obstacles))
  }

  DrawPaths() {
    this.SetWidthsOfArrowheads()
    this.CreateLongestNudgedSegments()
    this.FindFreeSpaceInDirection(<Array<AxisEdge>>Array.from(this.PathVisibilityGraph.Edges))
    this.MoveLongestSegsIdealPositionsInsideFeasibleIntervals()
    this.PositionShiftedEdqges()
  }

  SetWidthsOfArrowheads() {
    for (const edgePath of this.Paths) {
      Nudger.SetWidthsOfArrowheadsForEdge(edgePath)
    }
  }

  static SetWidthsOfArrowheadsForEdge(path: Path) {
    const edgeGeom = path.GeomEdge
    if (edgeGeom.targetArrowhead != null) {
      const pathEdge: PathEdge = path.LastEdge
      pathEdge.Width = Math.max(edgeGeom.targetArrowhead.width, pathEdge.Width)
    }

    if (edgeGeom.sourceArrowhead != null) {
      const pathEdge: PathEdge = path.FirstEdge
      pathEdge.Width = Math.max(edgeGeom.sourceArrowhead.width, pathEdge.Width)
    }
  }

  EdgeSeparation: number
  PositionShiftedEdqges() {
    this.Solver = new UniformOneDimensionalSolver(this.EdgeSeparation)
    for (let i = 0; i < this.LongestNudgedSegs.length; i++) {
      this.CreateVariablesOfLongestSegment(this.LongestNudgedSegs[i])
    }

    this.CreateConstraintsOfTheOrder()

    this.CreateConstraintsBetweenLongestSegments()
    this.Solver.SolveByRegularSolver()
    this.ShiftPathEdges()
  }

  MoveLongestSegsIdealPositionsInsideFeasibleIntervals() {
    for (let i = 0; i < this.LongestNudgedSegs.length; i++) {
      const seg = this.LongestNudgedSegs[i]
      Nudger.MoveLongestSegIdealPositionsInsideFeasibleInterval(seg)
    }
  }

  static MoveLongestSegIdealPositionsInsideFeasibleInterval(seg: LongestNudgedSegment) {
    if (seg.IsFixed) {
      return
    }

    const leftBound = seg.GetLeftBound()
    const rightBound = seg.GetRightBound()
    if (seg.IdealPosition < leftBound) {
      seg.IdealPosition = leftBound
    } else if (seg.IdealPosition > rightBound) {
      seg.IdealPosition = rightBound
    }
  }

  ShiftPathEdges() {
    for (const path of this.Paths) {
      path.PathPoints = this.GetShiftedPoints(path)
    }
  }

  GetShiftedPoints(path: Path): Array<Point> {
    return Nudger.RemoveSwitchbacksAndMiddlePoints(this.GetShiftedPointsSimple(path))
  }

  // sometimes we have very small mistakes  of the positions that have to be fixed

  static Rectilinearise(a: Point, b: Point): Point {
    if (a.x === b.x || a.y === b.y) return b
    const dx = Math.abs(a.x - b.x)
    const dy = Math.abs(a.y - b.y)
    return dx < dy ? new Point(a.x, b.y) : new Point(b.x, a.y)
  }

  GetShiftedPointsSimple(path: Path): Array<Point> {
    const ret = []
    const edge = path.FirstEdge
    ret.push(this.ShiftedPoint(edge.Source, edge.LongestNudgedSegment))
    for (const e of path.PathEdges()) {
      ret.push(this.ShiftedEdgePositionOfTarget(e))
    }
    return ret
  }

  ShiftedEdgePositionOfTarget(e: PathEdge): Point {
    return e.LongestNudgedSegment != null || e.Next == null
      ? this.ShiftedPoint(e.Target, e.LongestNudgedSegment)
      : this.ShiftedPoint(e.Next.Source, e.Next.LongestNudgedSegment)
  }

  ShiftedPoint(point: Point, segment: LongestNudgedSegment): Point {
    if (segment == null) {
      return point
    }

    const t = this.Solver.GetVariablePosition(segment.Id)
    return this.NudgingDirection === Direction.North ? new Point(t, point.y) : new Point(point.x, -t)
  }

  // static ShowPathsFromPoints(paths: Array<Path>, enumerable: Array<Polyline>) {
  //    let dd = new Array<DebugCurve>();
  //    if ((enumerable != null)) {
  //        dd=dd.concat(Nudger.GetObstacleBoundaries(enumerable, "grey"));
  //    }

  //    let i: number = 0;
  //    for (let p  of paths) {
  //        dd = dd.concat(Nudger.PathDebugCurvesFromPoints(p, DebugCurve.colors[Math.min(DebugCurve.colors.length, i++)]));
  //    }

  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(dd);
  // }

  // static PathDebugCurvesFromPoints(path: Path, color: string): Array<DebugCurve> {
  //    const let startWidth: number = 0.01;
  //    const let endWidth: number = 3;
  //    let pts = path.PathPoints.toArray();
  //    let delta: number = ((endWidth - startWidth)
  //                / (pts.length - 1));
  //    for (let i: number = 0; (i
  //                < (pts.length - 1)); i++) {
  //        yield;
  //    }

  //    return new DebugCurve((startWidth
  //                    + (delta * i)), color, new LineSegment(pts[i], pts[(i + 1)]));
  // }

  // static ShowParamPaths(s: Point, e: Point, params paths: Path[]) {
  //    Nudger.ShowOrderedPaths(null, paths, s, e);
  // }

  // //         ReSharper disable UnusedMember.Local
  // static ShowOrderedPaths(obstacles: Array<Polyline>, paths: Array<Path>, s: Point, e: Point) {
  //    //            ReSharper restore UnusedMember.Local
  //    let colors: string[] = [
  //            "red",
  //            "green",
  //            "blue",
  //            "violet",
  //            "rose",
  //            "black"];
  //    const let startWidth: number = 0.001;
  //    const let endWidth: number = 0.1;
  //    let dd = new Array<DebugCurve>();
  //    if ((obstacles != null)) {
  //        dd.AddRange(Nudger.GetObstacleBoundaries(obstacles, "grey"));
  //    }

  //    let i: number = 0;
  //    for (let path  of paths) {
  //        dd.AddRange(Nudger.GetTestPathAsDebugCurve(startWidth, endWidth, colors[Math.min((colors.length - 1), i++)], path));
  //    }

  //    let ell = new DebugCurve(1, "black", new Ellipse(0.01, 0.01, s));
  //    dd.Add(ell);
  //    dd.Add(new DebugCurve(1, "black", new Ellipse(0.02, 0.02, e)));
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(dd.concat(Nudger.GetObstacleBoundaries(obstacles, "lightblue")));
  // }

  // static GetTestPathAsDebugCurve(startWidth: number, endWidth: number, color: string, path: Path): Array<DebugCurve> {
  //    if ((path.PathEdges.Count() > 0)) {
  //        let count: number = path.PathEdges.Count();
  //        let deltaW: number = ((endWidth - startWidth)
  //                    / (count - 1));
  //        // TODO: Warning!!!, inline IF is not supported ?
  //        (count > 1);
  //        1;
  //        // if count ==1 the value of deltaW does not matter
  //        let i: number = 0;
  //        for (let e  of path.PathEdges) {
  //            yield;
  //        }

  //        return new DebugCurve(150, (startWidth
  //                        + (deltaW
  //                        * (i + 1))), color, new LineSegment(e.Source, e.Target));
  //    }
  //    else {
  //        let count: number = path.PathPoints.count();
  //        let pts = path.PathPoints.toArray();
  //        let deltaW = ((endWidth - startWidth)
  //                    / (count - 1));
  //        // TODO: Warning!!!, inline IF is not supported ?
  //        (count > 1);
  //        1;
  //        // if count ==1 the value of deltaW does not matter
  //        for (let i: number = 0; (i
  //                    < (count - 1)); i++) {
  //            yield;
  //        }

  //        return new DebugCurve(150, (startWidth
  //                        + (deltaW * i)), color, new LineSegment(pts[i], pts[(i + 1)]));
  //    }

  // }

  // static GetTestEdgePathAsDebugCurves(startWidth: number, endWidth: number, color: string, path: Path): Array<DebugCurve> {
  //    let count: number = path.PathPoints.count();
  //    let deltaW: number = ((endWidth - startWidth)
  //                / (count - 1));
  //    // TODO: Warning!!!, inline IF is not supported ?
  //    (count > 1);
  //    1;
  //    // if count ==1 the value of deltaW does not matter
  //    let points = path.PathPoints.toArray();
  //    for (let i: number = 0; (i
  //                < (points.length - 1)); i++) {
  //        yield;
  //    }

  //    return new DebugCurve(125, (startWidth
  //                    + (deltaW * i)), color, new LineSegment(points[i], points[(i + 1)]));
  // }

  // static GetEdgePathFromPathEdgesAsDebugCurves(startWidth: number, endWidth: number, color: string, path: Path): Array<DebugCurve> {
  //    let points = path.PathPoints.toArray();
  //    let count: number = points.length;
  //    let deltaW: number = ((endWidth - startWidth)
  //                / (count - 1));
  //    // TODO: Warning!!!, inline IF is not supported ?
  //    (count > 1);
  //    1;
  //    // if count ==1 the value of deltaW does not matter
  //    for (let i: number = 0; (i
  //                < (points.length - 1)); i++) {
  //        yield;
  //    }

  //    return new DebugCurve(120, (startWidth
  //                    + (deltaW * i)), color, new LineSegment(points[i], points[(i + 1)]));
  // }

  // // ReSharper disable UnusedMember.Local
  // static ShowEdgePaths(obstacles: Array<Polyline>, edgePaths: Array<Path>) {
  //    //  ReSharper restore UnusedMember.Local
  //    let debCurves: Array<DebugCurve> = Nudger.GetDebCurvesOfPaths(obstacles, edgePaths);
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(debCurves);
  // }

  // static GetDebCurvesOfPaths(enumerable: Array<Polyline>, edgePaths: Array<Path>): Array<DebugCurve> {
  //    let debCurves = Nudger.GetObstacleBoundaries(enumerable, "black");
  //    let i: number = 0;
  //    for (let edgePath  of edgePaths) {
  //        debCurves.AddRange(Nudger.GetTestEdgePathAsDebugCurves(0.2, 4, DebugCurve.colors[((i + 1)
  //                            % DebugCurve.colors.length)], edgePath));
  //    }

  //    return debCurves;
  // }

  // static ShowPathsInLoop(enumerable: Array<Polyline>, edgePaths: Array<Path>, point: Point) {
  //    for (let edgePath  of edgePaths.where(() => {  }, (((path.PathPoints.First() - point).Length < 1)
  //                    || ((path.PathPoints.Last() - point).Length < 1)))) {
  //        let debCurves = Nudger.GetObstacleBoundaries(enumerable, "black");
  //        debCurves.AddRange(Nudger.GetTestEdgePathAsDebugCurves(0.1, 4, "red", edgePath));
  //        LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(debCurves);
  //    }

  // }

  // // ReSharper disable UnusedMember.Local

  // ShowLongSegsWithIdealPositions(dir: Direction) {
  //    //  ReSharper restore UnusedMember.Local
  //    let debCurves = Nudger.GetObstacleBoundaries(this.Obstacles, "black");
  //    let i: number = 0;
  //    debCurves.AddRange(this.LongestNudgedSegs.Select(() => {  }, Nudger.DebugCurveOfLongSeg(ls, DebugCurve.colors[i++, Percent, DebugCurve.colors.length], dir)));
  //    DebugCurveCollection.WriteToFile(debCurves, "c:/tmp/longSegs");
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(debCurves);
  // }

  // static DebugCurveOfLongSeg(ls: LongestNudgedSegment, s: string, dir: Direction): DebugCurve {
  //    return new DebugCurve(1, s, Nudger.LineSegOfLongestSeg(ls, dir));
  // }

  static LineSegOfLongestSeg(ls: LongestNudgedSegment, dir: Direction): ICurve {
    const projectionToDir = dir === Direction.East ? (p: Point) => p.x : (p: Point) => p.y

    const mm = {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY}
    for (const edge of ls.Edges) {
      Nudger.UpdateMinMaxWithPoint(mm, projectionToDir, edge.Source)
      Nudger.UpdateMinMaxWithPoint(mm, projectionToDir, edge.Target)
    }

    return dir === Direction.East
      ? new LineSegment(mm.min, -ls.IdealPosition, mm.max, -ls.IdealPosition)
      : new LineSegment(ls.IdealPosition, mm.min, ls.IdealPosition, mm.max)
  }

  static UpdateMinMaxWithPoint(mm: {min: number; max: number}, projectionToDir: PointProjection, point: Point) {
    const p: number = projectionToDir(point)
    if (mm.min > p) {
      mm.min = p
    }

    if (mm.max < p) {
      mm.max = p
    }
  }

  // ShowPathsDebug(edgePaths: Array<Path>) {
  //    let debCurves = Nudger.GetObstacleBoundaries(this.Obstacles, "black");
  //    let i: number = 0;
  //    for (let edgePath  of edgePaths) {
  //        debCurves.AddRange(Nudger.GetEdgePathFromPathEdgesAsDebugCurves(0.01, 0.4, DebugCurve.colors[((i + 1)
  //                            % DebugCurve.colors.length)], edgePath));
  //    }

  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(debCurves);
  // }

  // static PathDebugCurves(path: Path, color: string): Array<DebugCurve> {
  //    let d = path.PathEdges.Select(() => {  }, new DebugCurve(70, 0.5, color, new LineSegment(e.Source, e.Target)));
  //    return d.Concat(Nudger.MarkPathVerts(path));
  // }

  // private static MarkPathVerts(path: Path): Array<DebugCurve> {
  //    let first: boolean = true;
  //    let p = new Point();
  //    for (let p0  of path.PathPoints) {
  //        if (first) {
  //            yield;
  //            return new DebugCurve(200, 1, "violet", CurveFactory.CreateDiamond(5, 5, p0));
  //            first = false;
  //        }
  //        else {
  //            yield;
  //        }

  //        return new DebugCurve(100, 0.5, "brown", CurveFactory.CreateEllipse(1.5, 1.5, p0));
  //        p = p0;
  //    }

  //    yield;
  //    return new DebugCurve(200, 1, "green", CurveFactory.CreateDiamond(3, 3, p));
  // }

  // static PathDebugCurvesFromPoint(path: Path): Array<DebugCurve> {
  //    let l = new Array<Point>(path.PathPoints);
  //    for (let i: number = 0; (i
  //                < (l.Count - 1)); i++) {
  //        yield;
  //    }

  //    return new DebugCurve(4, "red", new LineSegment(l[i], l[(i + 1)]));
  // }

  //
  // ReSharper disable UnusedMember.Local
  //        void ShowEdgesOfEdgePath(Path path){
  // ReSharper restore UnusedMember.Local
  //            string[] colors = {"red", "brown", "purple"};
  //            const double w0 = 1;
  //            const double w1 = 3;
  //            double dw = (w1 - w0)/path.OrientedSubpaths.Count;
  //            int i = 0;
  //            var dc = new Array<DebugCurve>();
  //            foreach (var s  of path.OrientedSubpaths){
  //                dc.AddRange(SubpathDebugCurves(w0 + dw*i, colors[Math.Min(i++, colors.Length - 1)], s));
  //            }
  //            LayoutAlgorithmSettings.ShowDebugCurves(dc.ToArray());
  //        }
  //
  //        static Array<DebugCurve> SubpathDebugCurves(double w, string color, OrientedSubpath subpath){
  //            return subpath.LinkedPath.Select(e => new DebugCurve(w, color, new LineSegment(e.Source.Point, e.Target.Point)));
  //        }
  // static GetObstacleBoundaries(obstacles: Array<Polyline>, color: string): Array<DebugCurve> {
  //    let debugCurves = new Array<DebugCurve>();
  //    if ((obstacles != null)) {
  //        debugCurves.AddRange(obstacles.select(() => {  }, new DebugCurve(50, 0.3, color, poly)));
  //    }

  //    return debugCurves;
  // }

  CreateConstraintsBetweenLongestSegments() {
    for (const segment of this.LongestNudgedSegs) {
      this.CreateConstraintsBetweenLongestSegmentsForSegment(segment)
    }
  }

  CreateConstraintsBetweenLongestSegmentsForSegment(segment: LongestNudgedSegment) {
    const rightNeighbors = new Set<LongestNudgedSegment>()
    for (const pathEdge of segment.Edges) {
      const axisEdge = pathEdge.AxisEdge
      if (axisEdge != null) {
        for (const rightNeiAxisEdge of axisEdge.RightNeighbors) {
          for (const longSeg of rightNeiAxisEdge.LongestNudgedSegments) {
            rightNeighbors.add(longSeg)
          }
        }
      }
    }

    for (const seg of rightNeighbors) {
      this.ConstraintTwoLongestSegs(segment, seg)
    }
  }

  CreateConstraintsOfTheOrder() {
    for (const kv of this.PathOrders) {
      if (Nudger.ParallelToDirection(kv[0], this.NudgingDirection)) {
        this.CreateConstraintsOfThePathOrder(kv[1])
      }
    }
  }

  static ParallelToDirection(edge: VisibilityEdge, direction: Direction): boolean {
    switch (direction) {
      case Direction.North:
      case Direction.South:
        return closeDistEps(edge.SourcePoint.x, edge.TargetPoint.x)
        break
      default:
        return closeDistEps(edge.SourcePoint.y, edge.TargetPoint.y)
        break
    }
  }

  CreateConstraintsOfThePathOrder(pathOrder: Array<PathEdge>) {
    let prevEdge: PathEdge = null
    for (const pathEdge of pathOrder.filter((p) => p.LongestNudgedSegment != null)) {
      if (prevEdge != null) {
        this.ConstraintTwoLongestSegs(prevEdge.LongestNudgedSegment, pathEdge.LongestNudgedSegment)
      }

      prevEdge = pathEdge
    }
  }

  ConstraintTwoLongestSegs(prevSeg: LongestNudgedSegment, seg: LongestNudgedSegment) {
    if (!prevSeg.IsFixed || !seg.IsFixed) {
      this.Solver.AddConstraint(prevSeg.Id, seg.Id)
    }
  }

  Solver: UniformOneDimensionalSolver

  CreateVariablesOfLongestSegment(segment: LongestNudgedSegment) {
    if (!segment.IsFixed) {
      const leftBound = segment.GetLeftBound()
      const rightBound = segment.GetRightBound()
      if (leftBound >= rightBound) {
        // don't move the segment from the way it was generated
        this.Solver.AddFixedVariable(segment.Id, Nudger.SegmentPosition(segment, this.NudgingDirection))
        segment.IsFixed = true
      } else {
        this.Solver.AddVariableNNNN(
          segment.Id,
          Nudger.SegmentPosition(segment, this.NudgingDirection),
          segment.IdealPosition,
          segment.Width,
        )
        //           Assert.assert(leftBound + Curve.DistanceEpsilon < rightBound); //this assert does not hold for overlaps
        if (leftBound !== Number.NEGATIVE_INFINITY) {
          this.Solver.SetLowBound(leftBound, segment.Id)
        }

        if (rightBound !== Number.POSITIVE_INFINITY) {
          this.Solver.SetUpperBound(segment.Id, rightBound)
        }
      }
    } else {
      this.Solver.AddFixedVariable(segment.Id, Nudger.SegmentPosition(segment, this.NudgingDirection))
    }
  }

  static SegmentPosition(segment: SegmentBase, direction: Direction): number {
    return direction === Direction.North ? segment.Start.x : -segment.Start.y
  }

  // ReSharper disable UnusedMember.Local
  // ShowSegmentBounds(segment: LongestNudgedSegment) {
  //    //  ReSharper restore UnusedMember.Local
  //    let dd = Nudger.GetObstacleBoundaries(this.Obstacles, "black");
  //    let segtop = segment.Edges.Max(() => {  }, Math.max(e.Source.Y, e.Target.Y));
  //    let segbottom = segment.Edges.Min(() => {  }, Math.min(e.Source.Y, e.Target.Y));
  //    let segx = segment.Start.x;
  //    let seg = new DebugCurve(80, 1, "brown", new LineSegment(new Point(segx, segbottom), new Point(segx, segtop)));
  //    let leftbound = new DebugCurve(80, 1, "red", new LineSegment(new Point(segment.GetLeftBound(), segbottom), new Point(segment.GetLeftBound(), segtop)));
  //    let rightbound = new DebugCurve(80, 1, "green", new LineSegment(new Point(segment.GetRightBound(), segbottom), new Point(segment.GetRightBound(), segtop)));
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(dd.concat(new, [));
  //    seg;
  //    leftbound;
  //    rightbound;
  // }

  // // ReSharper disable UnusedMember.Local

  // ShowSegment(segment: LongestNudgedSegment) {
  //    //  ReSharper restore UnusedMember.Local
  //    let dd = Nudger.GetObstacleBoundaries(this.Obstacles, "black");
  //    let segtop = segment.Edges.Max(() => {  }, Math.max(e.Source.Y, e.Target.Y));
  //    let segbottom = segment.Edges.Min(() => {  }, Math.min(e.Source.Y, e.Target.Y));
  //    let segx = segment.Start.x;
  //    let seg = new DebugCurve(80, 1, "brown", new LineSegment(new Point(segx, segbottom), new Point(segx, segtop)));
  //    LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(dd.concat(new, [));
  //    seg;
  // }

  LongestNudgedSegs: Array<LongestNudgedSegment>

  PathOrders: Map<AxisEdge, Array<PathEdge>>

  // maps each path to the pair of obstacles; the first element of the pair is
  // where the path starts and the second where the path ends
  PathToObstacles: Map<Path, [Polyline, Polyline]>

  FindFreeSpaceInDirection(axisEdges: Array<AxisEdge>) {
    this.BoundAxisEdgesByRectsKnownInAdvance()
    const freeSpaceFinder = new FreeSpaceFinder(
      this.NudgingDirection,
      this.Obstacles,
      this.axisEdgesToObstaclesTheyOriginatedFrom,
      this.PathOrders,
      axisEdges,
    )
    freeSpaceFinder.FindFreeSpace()
  }

  BoundAxisEdgesByRectsKnownInAdvance() {
    for (const path of this.Paths) {
      if (this.HasGroups) {
        this.BoundPathByMinCommonAncestors(path)
      }

      this.BoundAxisEdgesAdjacentToSourceAndTargetOnEdge(path)
    }
  }

  BoundPathByMinCommonAncestors(path: Path) {
    for (const sh of this.GetMinCommonAncestors(path.GeomEdge)) {
      const rect = sh.BoundingBox
      for (const e of path.PathEdges()) {
        const edge = e.AxisEdge
        if (edge.Direction === this.NudgingDirection) {
          this.BoundAxisEdgeByRect(rect, edge)
        }
      }
    }
  }

  GetMinCommonAncestors(edge: GeomEdge): Iterable<Shape> {
    if (this.PortToShapes == null) {
      this.PortToShapes = Nudger.MapPortsToShapes(this.AncestorsSets.keys())
    }

    const commonAncestors = IntersectSets(this.AncestorsForPort(edge.sourcePort), this.AncestorsForPort(edge.targetPort))
    return Array.from(commonAncestors).filter((anc) => !anc.Children.some((child) => commonAncestors.has(child)))
  }

  PortToShapes: Map<Port, Shape>

  AncestorsForPort(port: Port): Set<Shape> {
    const shape: Shape = this.PortToShapes.get(port)
    if (shape) {
      return this.AncestorsSets.get(shape)
    }

    // This is a FreePort or Waypoint; return all spatial parents.
    return new Set<Shape>(this.HierarchyOfGroups.AllHitItems(Rectangle.mkPP(port.Location, port.Location), null))
  }

  BoundAxisEdgeAdjacentToObstaclePort(port: Port, axisEdge: AxisEdge) {
    if (port.Curve == null) {
      this.BoundAxisByPoint(port.Location, axisEdge)
    } else if (port.Curve.boundingBox.contains(port.Location)) {
      this.BoundAxisEdgeByRect(port.Curve.boundingBox, axisEdge)
    }
  }

  BoundAxisByPoint(point: Point, axisEdge: AxisEdge) {
    if (axisEdge != null && axisEdge.Direction === this.NudgingDirection) {
      if (this.NudgingDirection === Direction.North) {
        axisEdge.BoundFromLeft(point.x)
        axisEdge.BoundFromRight(point.x)
      } else {
        axisEdge.BoundFromLeft(-point.y)
        axisEdge.BoundFromRight(-point.y)
      }
    }
  }

  BoundAxisEdgesAdjacentToSourceAndTargetOnEdge(path: Path) {
    this.BoundAxisEdgeAdjacentToObstaclePort(path.GeomEdge.sourcePort, path.FirstEdge.AxisEdge)
    this.BoundAxisEdgeAdjacentToObstaclePort(path.GeomEdge.targetPort, path.LastEdge.AxisEdge)
  }

  BoundAxisEdgeByRect(rectangle: Rectangle, axisEdge: AxisEdge) {
    if (axisEdge != null && axisEdge.Direction === this.NudgingDirection) {
      if (this.NudgingDirection === Direction.North) {
        axisEdge.BoundFromLeft(rectangle.left)
        axisEdge.BoundFromRight(rectangle.right)
      } else {
        axisEdge.BoundFromLeft(rectangle.top * -1)
        axisEdge.BoundFromRight(rectangle.bottom * -1)
      }
    }
  }

  CreateLongestNudgedSegments() {
    const projectionToPerp = this.NudgingDirection === Direction.East ? (p: Point) => -p.y : (p: Point) => p.x

    this.LongestNudgedSegs = new Array<LongestNudgedSegment>()
    for (let i = 0; i < this.Paths.length; i++) {
      this.CreateLongestNudgedSegmentsForPath(this.Paths[i], projectionToPerp)
    }
  }

  CreateLongestNudgedSegmentsForPath(path: Path, projectionToPerp: PointProjection) {
    // ShowEdgesOfEdgePath(path);
    this.GoOverPathAndCreateLongSegs(path)
    Nudger.CalculateIdealPositionsForLongestSegs(path, projectionToPerp)
  }

  static CalculateIdealPositionsForLongestSegs(path: Path, projectionToPerp: PointProjection) {
    let currentLongSeg: LongestNudgedSegment = null
    let ret: LongestNudgedSegment = null
    let prevOffset: number = projectionToPerp(path.Start)
    for (const edge of path.PathEdges()) {
      if (edge.LongestNudgedSegment != null) {
        currentLongSeg = edge.LongestNudgedSegment
        if (ret != null) {
          let t: number
          Nudger.SetIdealPositionForSeg(ret, (t = projectionToPerp(ret.start)), prevOffset, projectionToPerp(currentLongSeg.Start))
          prevOffset = t
          ret = null
        }
      } else if (currentLongSeg != null) {
        ret = currentLongSeg
        currentLongSeg = null
      }
    }

    if (ret != null) {
      Nudger.SetIdealPositionForSeg(ret, projectionToPerp(ret.Start), prevOffset, projectionToPerp(path.End))
    } else if (currentLongSeg != null) {
      currentLongSeg.IdealPosition = projectionToPerp(currentLongSeg.Start)
    }
  }

  static SetIdealPositionForSeg(segment: LongestNudgedSegment, segPosition: number, offset0: number, offset1: number) {
    const max = Math.max(offset0, offset1)
    const min = Math.min(offset0, offset1)
    if (min + GeomConstants.distanceEpsilon < segPosition) {
      if (segPosition < max) {
        segment.IdealPosition = 0.5 * (max + min)
      } else {
        segment.IdealPosition = max
      }
    } else {
      segment.IdealPosition = min
    }
  }

  GoOverPathAndCreateLongSegs(path: Path) {
    let currentLongestSeg: LongestNudgedSegment = null
    const oppositeDir = CompassVector.OppositeDir(this.NudgingDirection)
    for (const edge of path.PathEdges()) {
      const edgeDir = edge.Direction
      if (edgeDir === this.NudgingDirection || edgeDir === oppositeDir) {
        if (currentLongestSeg == null) {
          edge.LongestNudgedSegment = currentLongestSeg = new LongestNudgedSegment(this.LongestNudgedSegs.length)
          this.LongestNudgedSegs.push(currentLongestSeg)
        } else {
          edge.LongestNudgedSegment = currentLongestSeg
        }

        if (edge.IsFixed) {
          currentLongestSeg.IsFixed = true
        }
      } else {
        // the edge is perpendicular to "direction"
        edge.LongestNudgedSegment = null
        currentLongestSeg = null
      }
    }
  }

  static BuildPolylineForPath(path: Path): Iterable<Point> {
    const t = {points: (path.PathPoints as Array<Point>).map((p) => p.clone())}
    Nudger.ExtendPolylineToPorts(t, path)
    /* for (let i = 0; i < t.points.length - 1; i++) {
// Assert.assert(
        CompassVector.IsPureDirectionPP(t.points[i], t.points[i + 1]),
      )
    }*/

    return t.points
  }

  static ExtendPolylineToPorts(t: {points: Point[]}, path: Path) {
    Nudger.ExtendPolylineToSourcePort(t, path.GeomEdge.sourcePort.Location)
    Nudger.ExtendPolylineToTargetPort(t, path.GeomEdge.targetPort.Location)
    // In some overlapped cases where the source or target vertex used for the path
    // coincides with the target or source port location, we can end up with a single-point
    // path.  In that case, we just force a straightline path.
    if (t.points.length < 2) {
      t.points = new Array(2)
      t.points[0] = path.GeomEdge.sourcePort.Location
      t.points[1] = path.GeomEdge.targetPort.Location
    }
  }

  static ExtendPolylineToTargetPort(t: {points: Point[]}, location: Point) {
    const n: number = t.points.length - 1
    const dir = CompassVector.VectorDirectionPP(t.points[n - 1], t.points[n])
    if (Nudger.ProjectionsAreClose(t.points[n - 1], dir, location)) {
      // it might be that the last point on polyline is at the port already
      // then we just drop the last point
      t.points = t.points.slice(0, n)
      return
    }

    const p = t.points[n]
    if (dir === Direction.East || dir === Direction.West) {
      t.points[n] = new Point(location.x, p.y)
    } else {
      t.points[n] = new Point(p.x, location.y)
    }
  }

  static ProjectionsAreClose(a: Point, dir: Direction, b: Point): boolean {
    if (dir === Direction.East || dir === Direction.West) {
      return closeDistEps(a.x, b.x)
    }

    return closeDistEps(a.y, b.y)
  }

  static ExtendPolylineToSourcePort(t: {points: Point[]}, location: Point) {
    const dir = CompassVector.VectorDirectionPP(t.points[0], t.points[1])
    if (Nudger.ProjectionsAreClose(t.points[1], dir, location)) {
      // it might be that the second point on polyline is at the port already
      // then we just drop the first point
      t.points = t.points.slice(1)
      return
    }

    const p = t.points[0]
    if (dir === Direction.East || dir === Direction.West) {
      t.points[0] = new Point(location.x, p.y)
    } else {
      t.points[0] = new Point(p.x, location.y)
    }
  }

  static RemoveSwitchbacksAndMiddlePoints(points: Array<Point>): Array<Point> {
    const ret = []

    let a = points[0]
    ret.push(a)
    let b: Point = points[1]
    let prevDir = CompassVector.VectorDirectionPP(a, b)
    let i = 1
    while (++i < points.length) {
      const dir = CompassVector.VectorDirectionPP(b, points[i])
      if (!(dir === prevDir || CompassVector.OppositeDir(dir) === prevDir || dir === Direction.None)) {
        if (!Point.closeDistEps(a, b)) {
          // make sure that we are not returning the same point twice
          ret.push((a = Nudger.Rectilinearise(a, b)))
        }
        prevDir = dir
      }
      b = points[i]
    }

    if (!Point.closeDistEps(a, b)) {
      ret.push(Nudger.Rectilinearise(a, b))
    }
    return ret
  }

  // this function defines the final path coordinates
  // the set of paths, point sequences
  // the radius of the arc inscribed into the path corners
  // an enumeration of padded obstacles
  //
  //
  // <returns>the mapping of the path to its modified path</returns>
  static NudgePaths(
    paths: Array<Path>,
    cornerFitRadius: number,
    paddedObstacles: Array<Polyline>,
    ancestorsSets: Map<Shape, Set<Shape>>,
    removeStaircases: boolean,
  ) {
    if (paths.length === 0) {
      return
    }

    const nudger = new Nudger(paths, cornerFitRadius, paddedObstacles, ancestorsSets)
    nudger.Calculate(Direction.North, true)
    nudger.Calculate(Direction.East, false)
    nudger.Calculate(Direction.North, false)
    if (removeStaircases) {
      nudger.RemoveStaircases()
    }

    for (const path of paths) {
      path.GeomEdge.curve = Polyline.mkFromPoints(Nudger.BuildPolylineForPath(path))
    }
  }

  RemoveStaircases() {
    StaircaseRemover.RemoveStaircases(this.Paths, this.HierarchyOfObstacles)
  }

  static MapPortsToShapes(listOfShapes: Iterable<Shape>): Map<Port, Shape> {
    const portToShapes = new Map<Port, Shape>()
    for (const shape of listOfShapes) {
      for (const port of shape.Ports) {
        portToShapes.set(port, shape)
      }
    }

    return portToShapes
  }

  // ShowPathsDebug(edgePaths: Iterable<Path>, fn: string) {
  //  const debCurves = GetObstacleBoundaries(this.Obstacles, 'black')
  //  const i = 0
  //  for (const edgePath of edgePaths) {
  //    for (const c of Nudger.GetEdgePathFromPathEdgesAsDebugCurves(
  //      0.1,
  //      1.0,
  //      DebugCurve.colors[(i + 1) % DebugCurve.colors.length],
  //      edgePath,
  //    )) {
  //      debCurves.push(c)
  //    }
  //  }

  //  SvgDebugWriter.dumpDebugCurves(fn, debCurves)
  // }
  static *GetEdgePathFromPathEdgesAsDebugCurves(
    startWidth: number,
    endWidth: number,
    color: string,
    path: Path,
  ): IterableIterator<DebugCurve> {
    const points = path.ArrayOfPathPoints()
    const count: number = points.length
    const deltaW: number = count > 1 ? (endWidth - startWidth) / (count - 1) : 1
    // if count ==1 the value of deltaW does not matter
    for (let i = 0; i < points.length - 1; i++) {
      yield DebugCurve.mkDebugCurveTWCI(200, startWidth + deltaW * i, color, LineSegment.mkPP(points[i], points[i + 1]))
    }
  }
}

// function GetObstacleBoundaries(
//  obstacles: Array<Polyline>,
//  color: string,
// ): Array<DebugCurve> {
//  const debugCurves = new Array<DebugCurve>()
//  if (obstacles != null) {
//    for (const o of obstacles)
//      debugCurves.push(DebugCurve.mkDebugCurveTWCI(50, 0.3, color, o))
//  }
//  return debugCurves
// }

function IntersectSets<T>(a: Set<T>, b: Set<T>) {
  const r = new Set<T>()
  if (a.size < b.size) {
    for (const x of a) if (b.has(x)) r.add(x)
  } else {
    for (const x of b) if (a.has(x)) r.add(x)
  }
  return r
}
