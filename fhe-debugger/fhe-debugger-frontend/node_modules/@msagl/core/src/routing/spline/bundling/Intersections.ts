// Check intersections between hubs and obstacles with kd-tree

import {Point} from '../../..'
import {Polyline, PointLocation, Curve, GeomConstants, LineSegment} from '../../../math/geometry'
import {RectangleNode} from '../../../math/geometry/RTree/rectangleNode'

import {uniteSets} from '../../../utils/setOperations'
import {BundlingSettings} from '../../BundlingSettings'
import {MetroGraphData} from './MetroGraphData'
import {Station} from './Station'

export class Intersections {
  metroGraphData: MetroGraphData

  bundlingSettings: BundlingSettings

  obstaclesToIgnoreLambda: (s: Station) => Set<Polyline>

  // represents loose or tight hierarchy
  obstacleTree: RectangleNode<Polyline, Point>

  public constructor(
    metroGraphData: MetroGraphData,
    bundlingSettings: BundlingSettings,
    obstacleTree: RectangleNode<Polyline, Point>,
    obstaclesToIgnore: (s: Station) => Set<Polyline>,
  ) {
    this.metroGraphData = metroGraphData
    this.obstaclesToIgnoreLambda = obstaclesToIgnore
    this.bundlingSettings = bundlingSettings
    this.obstacleTree = obstacleTree
  }

  ObstaclesToIgnoreForBundle(u: Station, v: Station): Set<Polyline> {
    if (u != null && v != null) {
      return uniteSets(this.obstaclesToIgnoreLambda(u), this.obstaclesToIgnoreLambda(v))
    }

    if (u == null && v == null) {
      return new Set<Polyline>()
    }

    if (u != null) {
      return this.obstaclesToIgnoreLambda(u)
    } else {
      return this.obstaclesToIgnoreLambda(v)
    }
  }

  HubAvoidsObstaclesSPNBA(node: Station, center: Point, upperBound: number, t: {touchedObstacles: Array<[Polyline, Point]>}): boolean {
    const md = {minimalDistance: upperBound}
    return Intersections.IntersectCircleWithTree(
      this.obstacleTree,
      center,
      upperBound,
      this.obstaclesToIgnoreLambda(node),
      t.touchedObstacles,
      md,
    )
  }

  HubAvoidsObstaclesPNS__(center: Point, upperBound: number, obstaclesToIgnore: Set<Polyline>): boolean {
    const t = {touchedObstacles: Array<[Polyline, Point]>()}
    const md = {minimalDistance: 0}
    return this.HubAvoidsObstaclesPNSTT(center, upperBound, obstaclesToIgnore, t, md)
  }

  GetMinimalDistanceToObstacles(node: Station, nodePosition: Point, upperBound: number): number {
    const touchedObstacles: Array<[Polyline, Point]> = new Array<[Polyline, Point]>()
    const t = {minimalDistance: upperBound}
    if (
      !Intersections.IntersectCircleWithTree(
        this.obstacleTree,
        nodePosition,
        upperBound,
        this.obstaclesToIgnoreLambda(node),
        touchedObstacles,
        t,
      )
    ) {
      return 0
    }

    return t.minimalDistance
  }

  HubAvoidsObstaclesPNSTT(
    center: Point,
    upperBound: number,
    obstaclesToIgnore: Set<Polyline>,
    t: {touchedObstacles: Array<[Polyline, Point]>},
    m: {minimalDistance: number},
  ): boolean {
    t.touchedObstacles = new Array<[Polyline, Point]>()
    m.minimalDistance = upperBound
    return Intersections.IntersectCircleWithTree(this.obstacleTree, center, upperBound, obstaclesToIgnore, t.touchedObstacles, m)
  }

  static containingPoly: Polyline // debug: TODO remove later
  // Computes the intersection between the hub and obstacles
  // Returns false iff the center is inside of an obstacle, which is not ignored
  static IntersectCircleWithTree(
    node: RectangleNode<Polyline, Point>,
    center: Point,
    radius: number,
    obstaclesToIgnore: Set<Polyline>,
    touchedObstacles: Array<[Polyline, Point]>,
    t: {minimalDistance: number},
  ): boolean {
    if (!node.irect.contains_point_radius(center, radius)) {
      return true
    }

    if (node.UserData == null) {
      let res: boolean = Intersections.IntersectCircleWithTree(node.Left, center, radius, obstaclesToIgnore, touchedObstacles, t)
      if (!res) {
        return false
      }

      res = Intersections.IntersectCircleWithTree(node.Right, center, radius, obstaclesToIgnore, touchedObstacles, t)
      if (!res) {
        return false
      }
    } else {
      const obstacle: Polyline = node.UserData
      if (obstaclesToIgnore.has(obstacle)) {
        return true
      }

      const pl: PointLocation = Curve.PointRelativeToCurveLocation(center, obstacle)
      if (pl !== PointLocation.Outside) {
        Intersections.containingPoly = obstacle
        return false
      }

      const touchPoint: Point = obstacle.value(obstacle.closestParameter(center))
      const dist: number = touchPoint.sub(center).length
      if (dist <= radius) {
        touchedObstacles.push([obstacle, touchPoint])
      }

      t.minimalDistance = Math.min(dist, t.minimalDistance)
    }

    return true
  }

  static Create4gon(apex: Point, baseCenter: Point, width1: number, width2: number): Polyline {
    let norm = baseCenter.sub(apex).normalize()
    norm = new Point(norm.y, norm.x * -1)
    return Polyline.mkFromPoints([
      apex.add(norm.mul(width1 / 2)),
      apex.sub(norm.mul(width1 / 2)),
      baseCenter.sub(norm.mul(width2 / 2)),
      baseCenter.add(norm.mul(width2 / 2)),
    ])
  }
}
//#if TEST_MSAGL && TEST_MSAGL

// check the validness of the drawing:
//    // 1. hubs are not inside loose obstacles
//    // 2. bundles do not cross loose obstacles
//    // <
//     bool HubPositionsAreOK() {
//        //check polylines
//        foreach(var line of metroGraphData.Metrolines) {
//            var poly = line.Polyline;
//            foreach(var p of poly.PolylinePoints)
//            Assert.assert(metroGraphData.PointToStations.ContainsKey(p.point));
//        }

//        foreach(var station of metroGraphData.Stations) {

//            if (!station.IsRealNode && !HubAvoidsObstacles(station.Position, 0, obstaclesToIgnore(station))) {
//                if (LayoutAlgorithmSettings.ShowDebugCurvesEnumeration != null) {
//                    HubDebugger.ShowHubs(metroGraphData, bundlingSettings, station);
//                    ShowStationWithObstaclesToIgnore(station, obstacleTree.AllHitItems(station.Position));
//                }
//                return false;
//            }
//            //bundles
//            foreach(var adj of station.Neighbors) {
//                if (Point.closeDistEps(adj.Position, station.Position))
//                    return false;

//                if (!EdgeIsLegal(station, adj, station.Position, adj.Position)) {
//                    if (LayoutAlgorithmSettings.ShowDebugCurvesEnumeration != null) {
//                        //debug visualization
//                        var l = new Array<DebugCurve>();
//                        //foreach (var st of metroGraphData.Stations) {
//                        //    l.Add(new DebugCurve(100, 0.5, "grey", st.BoundaryCurve));
//                        //}
//                        foreach(var poly of obstaclesToIgnore(station)) {
//                            l.Add(new DebugCurve(100, 5, "green", poly));
//                        }

//                        foreach(var obstacle of obstacleTree.GetAllLeaves()) {
//                            l.Add(new DebugCurve(100, 1, "red", obstacle));
//                        }

//                        l.Add(new DebugCurve(1, "blue", station.BoundaryCurve));
//                        l.Add(new DebugCurve(1, "blue", adj.BoundaryCurve));

//                        l.Add(new DebugCurve(1, "blue", new LineSegment(adj.Position, adj.Neighbors.First().Position)));
//                        l.Add(new DebugCurve(1, "blue", new LineSegment(station.Position, adj.Position)));

//                        LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
//                        //end debug visualization
//                        return false;
//                    }
//                }
//            }
//        }

//        return true;
//    }

//    void ShowStationWithObstaclesToIgnore(Station station, Array < Polyline > allHitItems) {
//        var l = new Array<DebugCurve>();
//        foreach(var poly of allHitItems) {
//            l.Add(new DebugCurve(100, 0.5, "brown", poly));
//        }
//        if (obstaclesToIgnore(station) != null)
//            foreach(var poly of obstaclesToIgnore(station))
//        l.Add(new DebugCurve(100, 1, "red", poly));

//        foreach(var obstacle of obstacleTree.GetAllLeaves())
//        l.Add(new DebugCurve(50, 0.1, "green", obstacle));

//        l.Add(new DebugCurve(0.1, "blue", new Ellipse(1, 1, station.Position)));

//        LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
//    }

//    // edge doesn't cross obstacles
//    // NOTE: use method in CdtIntersection insetad!
//    // <
//    bool EdgeIsLegal(Station stationA, Station stationB, Point a, Point b) {
//        var crossings = InteractiveEdgeRouter.IntersectionsOfLineAndRectangleNodeOverPolyline(new LineSegment(a, b), obstacleTree);
//        Set < Polyline > obstaclesToIgnoreForBundle = ObstaclesToIgnoreForBundle(stationA, stationB);
//        if (crossings.Count < 0) {
//            var l = new Array<DebugCurve>();
//            var crossingSet = new Set<ICurve>(crossings.Select(ii => ii.Segment1));
//            l.AddRange(crossingSet.Select(p => new DebugCurve(100, 1, "red", p)));
//            l.AddRange(obstaclesToIgnoreForBundle.Select(p => new DebugCurve(100, 0.5, "green", p)));
//            LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
//        }
//        return crossings.All(intersectionInfo => obstaclesToIgnoreForBundle.Contains((Polyline)intersectionInfo.Segment1));
//    }
// #endif
// }
