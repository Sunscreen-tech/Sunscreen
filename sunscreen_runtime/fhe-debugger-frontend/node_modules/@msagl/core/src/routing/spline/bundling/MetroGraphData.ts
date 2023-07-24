// Wrapper for geometry graph with coinciding edges:
//  'real' nodes stand for edge ends (source,target)
//  'virtual' nodes stand for polyline control points
//
//  'real' edges are original graph edges

import {Port} from '../../../layout/core/port'
import {Stack} from 'stack-typescript'
import {GeomEdge, Point} from '../../..'
import {Polyline, Curve, PointLocation} from '../../../math/geometry'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {RectangleNode} from '../../../math/geometry/RTree/rectangleNode'

import {PointMap} from '../../../utils/PointMap'
import {PointSet} from '../../../utils/PointSet'
import {BundlingSettings} from '../../BundlingSettings'
import {Cdt, createCDTOnPolylineRectNode} from '../../ConstrainedDelaunayTriangulation/Cdt'
import {CdtIntersections} from './CdtIntersections'
import {Intersections} from './Intersections'
import {Metroline} from './MetroLine'
import {MetroNodeInfo} from './MetroNodeInfo'
import {Station} from './Station'
import {StationEdgeInfo} from './StationEdgeInfo'
import {addToMapOfSets, setIntersection} from '../../../utils/setOperations'
import {closeDistEps, compareNumbersDistEps} from '../../../utils/compare'
import {IntersectionCache} from './IntersectionCache'
import {TupleMap} from './tupleMap'

//  'virtual' edges are polyline segments
export class MetroGraphData {
  Stations: Array<Station>

  // info on the edges passing through a couple
  edgeInfoDictionary: TupleMap<Station, Station, StationEdgeInfo>

  // current ink
  ink: number

  // Edges
  metrolines: Array<Metroline>

  //  position -> (node)
  PointToStations: PointMap<Station>

  regularEdges: GeomEdge[]

  //  objects to check crossings and calculate distances
  looseIntersections: Intersections

  tightIntersections: Intersections

  //  objects to check crossings and calculate distances
  cdtIntersections: CdtIntersections

  EdgeLooseEnterable: Map<GeomEdge, Set<Polyline>>

  EdgeTightEnterable: Map<GeomEdge, Set<Polyline>>
  LoosePolylineOfPort: (p: Port) => Polyline

  // triangulation
  cdt: Cdt
  bundlingSettings: BundlingSettings
  constructor(
    regularEdges: GeomEdge[],
    looseTree: RectangleNode<Polyline, Point>,
    tightTree: RectangleNode<Polyline, Point>,
    bundlingSettings: BundlingSettings,
    cdt: Cdt,
    edgeLooseEnterable: Map<GeomEdge, Set<Polyline>>,
    edgeTightEnterable: Map<GeomEdge, Set<Polyline>>,
    loosePolylineOfPort: (p: Port) => Polyline,
  ) {
    this.bundlingSettings = bundlingSettings
    // Assert.assert(cdt != null);
    this.regularEdges = regularEdges
    if (cdt != null) {
      this.cdt = cdt
    } else {
      this.cdt = createCDTOnPolylineRectNode(looseTree)
    }

    this.EdgeLooseEnterable = edgeLooseEnterable
    this.EdgeTightEnterable = edgeTightEnterable
    this.LoosePolylineOfPort = loosePolylineOfPort
    this.looseIntersections = new Intersections(this, bundlingSettings, looseTree, (station) => station.getELP())
    this.tightIntersections = new Intersections(this, bundlingSettings, tightTree, (station) => station.EnterableTightPolylines)
    this.cdtIntersections = new CdtIntersections(this, bundlingSettings)
    this.Initialize(false)
  }

  get Ink(): number {
    return this.ink
  }

  get Edges(): GeomEdge[] {
    return this.regularEdges
  }

  VirtualStations(): Array<Station> {
    return Array.from(this.Stations).filter((s) => !s.IsReal)
  }

  get Metrolines(): Array<Metroline> {
    return this.metrolines
  }

  get LooseTree(): RectangleNode<Polyline, Point> {
    return this.looseIntersections.obstacleTree
  }

  get TightTree(): RectangleNode<Polyline, Point> {
    return this.tightIntersections.obstacleTree
  }

  *VirtualEdges(): IterableIterator<[Station, Station]> {
    for (const k of this.edgeInfoDictionary.keys()) yield k
  }

  // number of real edges passing the edge uv
  RealEdgeCount(u: Station, v: Station): number {
    const couple: [Station, Station] = u.SerialNumber < v.SerialNumber ? [u, v] : [v, u]
    const cw = this.edgeInfoDictionary.get(couple[0], couple[1])
    if (cw) return cw.Count
    return 0
  }

  // real edges passing the node
  MetroNodeInfosOfNode(node: Station): Array<MetroNodeInfo> {
    return node.MetroNodeInfos
  }

  // real edges passing the edge uv
  GetIjInfo(u: Station, v: Station): StationEdgeInfo {
    const couple: [Station, Station] = u.SerialNumber < v.SerialNumber ? [u, v] : [v, u]
    return this.edgeInfoDictionary.get(couple[0], couple[1])
  }

  // Move node to the specified position
  MoveNode(node: Station, newPosition: Point) {
    const oldPosition: Point = node.Position
    this.PointToStations.deleteP(oldPosition)
    this.PointToStations.set(newPosition, node)
    node.Position = newPosition
    //move curves
    for (const metroNodeInfo of this.MetroNodeInfosOfNode(node)) metroNodeInfo.PolyPoint.point = newPosition

    // update lengths
    for (const e of this.MetroNodeInfosOfNode(node)) {
      const metroLine = e.Metroline
      const prev = e.PolyPoint.prev.point
      const succ = e.PolyPoint.next.point
      metroLine.Length +=
        succ.sub(newPosition).length + prev.sub(newPosition).length - succ.sub(oldPosition).length - prev.sub(oldPosition).length
    }
    // update ink
    for (const adj of node.Neighbors) this.ink += newPosition.sub(adj.Position).length - oldPosition.sub(adj.Position).length

    // update neighbors order
    this.SortNeighbors(node)
    for (const adj of node.Neighbors) this.SortNeighbors(adj)
  }

  GetWidthSSN(u: Station, v: Station, edgeSeparation: number): number {
    const couple: [Station, Station] = u.SerialNumber < v.SerialNumber ? [u, v] : [v, u]
    const cw = this.edgeInfoDictionary.get(couple[0], couple[1])
    return cw ? cw.Width + (cw.Count - 1) * edgeSeparation : 0
  }

  GetWidthAN(metrolines: Array<Metroline>, edgeSeparation: number): number {
    let width = 0
    for (const metroline of metrolines) {
      width += metroline.Width
    }
    const count = metrolines.length
    width += count > 0 ? (count - 1) * edgeSeparation : 0
    //Debug.Assert(GeomConstants.GreaterOrEqual(width, 0));
    return width
  }

  // Initialize data
  Initialize(initTightTree: boolean) {
    // TimeMeasurer.DebugOutput("bundle graph data initializing...");
    this.SimplifyRegularEdges()
    this.InitializeStationData()
    this.InitializeEdgeData()
    this.InitializeVirtualGraph()
    this.InitializeEdgeNodeInfo(initTightTree)
    this.InitializeCdtInfo()
    //            Assert.assert(looseIntersections.HubPositionsAreOK());
    //          Assert.assert(tightIntersections.HubPositionsAreOK());
  }

  // remove self-cycles
  SimplifyRegularEdges() {
    for (const edge of this.regularEdges) {
      this.SimplifyRegularEdge(edge)
    }
  }

  // change the polyline by removing cycles
  SimplifyRegularEdge(edge: GeomEdge) {
    const polyline: Polyline = <Polyline>edge.curve
    const stack = new Stack<Point>()
    const seen = new PointSet()
    for (let p = polyline.endPoint; p != null; p = p.prev) {
      const v = p.point
      if (seen.has(p.point)) {
        let pp = p.next
        do {
          const u = stack.top
          if (!u.equal(v)) {
            seen.delete(u)
            stack.pop()
            pp = pp.next
          } else break
        } while (true)

        pp.prev = p.prev
        pp.prev.next = pp
      } else {
        stack.push(v)
        seen.add(v)
      }
    }
  }

  InitializeStationData() {
    this.Stations = []
    //create indexes
    this.PointToStations = new PointMap<Station>()
    for (const edge of this.regularEdges) {
      const poly = <Polyline>edge.curve
      this.ProcessPolylinePoints(poly)
    }
  }

  ProcessPolylinePoints(poly: Polyline): void {
    let p = poly.startPoint
    this.RegisterStation(p, true)
    for (p = p.next; p !== poly.endPoint; p = p.next) {
      this.RegisterStation(p, false)
    }

    this.RegisterStation(p, true)
  }

  RegisterStation(pp: PolylinePoint, isRealNode: boolean): void {
    if (!this.PointToStations.has(pp.point)) {
      const station: Station = new Station(this.Stations.length, isRealNode, pp.point)
      this.PointToStations.set(pp.point, station)
      this.Stations.push(station)
    } else {
      //  #if(TEST_MSAGL && TEST_MSAGL)
      //  const s = this.PointToStations[pp.point]
      //  Assert.assert(s.IsRealNode === isRealNode)
      //  #endif
    }
  }

  InitializeEdgeData() {
    this.metrolines = new Array<Metroline>()
    for (let i = 0; i < this.regularEdges.length; i++) {
      const geomEdge: GeomEdge = this.regularEdges[i]
      this.InitEdgeData(geomEdge, i)
    }
  }

  InitEdgeData(geomEdge: GeomEdge, index: number) {
    const metroEdge = new Metroline(
      <Polyline>geomEdge.curve,
      this.bundlingSettings.ActualEdgeWidth(geomEdge),
      this.EdgeSourceAndTargetFunc(geomEdge),
      index,
    )
    this.metrolines.push(metroEdge)
    this.PointToStations.get(metroEdge.Polyline.start).BoundaryCurve = geomEdge.sourcePort.Curve
    this.PointToStations.get(metroEdge.Polyline.end).BoundaryCurve = geomEdge.targetPort.Curve
  }

  EdgeSourceAndTargetFunc(geomEdge: GeomEdge): () => [Polyline, Polyline] {
    return () => <[Polyline, Polyline]>[this.LoosePolylineOfPort(geomEdge.sourcePort), this.LoosePolylineOfPort(geomEdge.targetPort)]
  }

  /**   Initialize graph comprised of stations and their neighbors */
  InitializeVirtualGraph() {
    const neighbors = new Map<Station, Set<Station>>()
    for (const metroline of this.metrolines) {
      let u = this.PointToStations.get(metroline.Polyline.start)
      let v: Station
      for (let p = metroline.Polyline.startPoint; p.next != null; p = p.next, u = v) {
        v = this.PointToStations.get(p.next.point)
        addToMapOfSets(neighbors, u, v)
        addToMapOfSets(neighbors, v, u)
      }
    }

    for (const s of this.Stations) {
      s.Neighbors = Array.from(neighbors.get(s))
    }
  }

  GetUnorderedIjInfo(i: Station, j: Station): StationEdgeInfo {
    return i.SerialNumber < j.SerialNumber ? this.GetCreateOrderedIjInfo(i, j) : this.GetCreateOrderedIjInfo(j, i)
  }
  static closedeb(u: Station, v: Station) {
    return u.Position.sub(new Point(360.561, 428.416)).length < 0.1 && v.Position.sub(new Point(414.281, 440.732)).length < 0.1
  }

  GetCreateOrderedIjInfo(i: Station, j: Station): StationEdgeInfo {
    //Assert.assert(i.SerialNumber < j.SerialNumber)
    let cw: StationEdgeInfo = this.edgeInfoDictionary.get(i, j)
    if (cw) {
      return cw
    }
    // if (MetroGraphData.closedeb(i, j) || MetroGraphData.closedeb(j, i)) {
    //  console.log(this)
    // }
    cw = new StationEdgeInfo()
    this.edgeInfoDictionary.set(i, j, cw)
    return cw
  }

  InitializeEdgeNodeInfo(initTightTree: boolean) {
    this.edgeInfoDictionary = new TupleMap<Station, Station, StationEdgeInfo>()
    this.InitAllMetroNodeInfos(initTightTree)
    this.SortAllNeighbors()
    this.InitEdgeIjInfos()
    this.ink = 0
    for (const edge of this.VirtualEdges()) {
      this.ink += edge[0].Position.sub(edge[1].Position).length
    }
  }

  InitAllMetroNodeInfos(initTightTree: boolean) {
    for (let i = 0; i < this.metrolines.length; i++) {
      const metroline = this.metrolines[i]
      this.InitMetroNodeInfos(metroline)
      this.InitNodeEnterableLoosePolylines(metroline, this.regularEdges[i])
      if (initTightTree) {
        this.InitNodeEnterableTightPolylines(metroline, this.regularEdges[i])
      }

      metroline.UpdateLengths()
    }
  }

  InitMetroNodeInfos(metroline: Metroline) {
    for (let pp = metroline.Polyline.startPoint; pp != null; pp = pp.next) {
      const station: Station = this.PointToStations.get(pp.point)
      station.MetroNodeInfos.push(new MetroNodeInfo(metroline, station, pp))
    }
  }

  InitNodeEnterableLoosePolylines(metroline: Metroline, regularEdge: GeomEdge) {
    //If we have groups, EdgeLooseEnterable are precomputed.
    const metrolineEnterable = this.EdgeLooseEnterable != null ? this.EdgeLooseEnterable.get(regularEdge) : new Set<Polyline>()

    for (let p = metroline.Polyline.startPoint.next; p != null && p.next != null; p = p.next) {
      const v = this.PointToStations.get(p.point)
      if (v.getELP() != null) v.setELP(setIntersection(v.getELP(), metrolineEnterable))
      else v.setELP(new Set<Polyline>(metrolineEnterable))
    }

    this.AddLooseEnterableForMetrolineStartEndPoints(metroline)
  }

  AddLooseEnterableForMetrolineStartEndPoints(metroline: Metroline) {
    this.AddLooseEnterableForEnd(metroline.Polyline.start)
    this.AddLooseEnterableForEnd(metroline.Polyline.end)
  }

  AddTightEnterableForMetrolineStartEndPoints(metroline: Metroline) {
    this.AddTightEnterableForEnd(metroline.Polyline.start)
    this.AddTightEnterableForEnd(metroline.Polyline.end)
  }

  cachedEnterableLooseForEnd: PointMap<Set<Polyline>> = new PointMap<Set<Polyline>>()

  AddLooseEnterableForEnd(point: Point) {
    const station = this.PointToStations.get(point)
    if (!this.cachedEnterableLooseForEnd.has(point)) {
      for (const poly of this.LooseTree.AllHitItems_(point))
        if (Curve.PointRelativeToCurveLocation(point, poly) === PointLocation.Inside) station.AddEnterableLoosePolyline(poly)

      this.cachedEnterableLooseForEnd.set(point, station.getELP())
    } else {
      station.setELP(this.cachedEnterableLooseForEnd.get(point))
    }
  }

  AddTightEnterableForEnd(point: Point) {
    const station = this.PointToStations.get(point)
    for (const poly of this.TightTree.AllHitItems_(point))
      if (Curve.PointRelativeToCurveLocation(point, poly) === PointLocation.Inside) {
        station.AddEnterableTightPolyline(poly)
      }
  }

  InitNodeEnterableTightPolylines(metroline: Metroline, regularEdge: GeomEdge) {
    //If we have groups, EdgeTightEnterable are precomputed.
    const metrolineEnterable = this.EdgeTightEnterable != null ? this.EdgeTightEnterable.get(regularEdge) : new Set<Polyline>()

    for (let p = metroline.Polyline.startPoint.next; p != null && p.next != null; p = p.next) {
      const v = this.PointToStations.get(p.point)
      const nodeEnterable = v.EnterableTightPolylines
      if (nodeEnterable != null) v.EnterableTightPolylines = setIntersection(nodeEnterable, metrolineEnterable)
      else v.EnterableTightPolylines = new Set<Polyline>(metrolineEnterable)
    }

    this.AddTightEnterableForMetrolineStartEndPoints(metroline)
  }

  SortAllNeighbors() {
    // counter-clockwise sorting
    for (const station of this.Stations) this.SortNeighbors(station)
  }

  SortNeighbors(station: Station) {
    // nothing to sort
    if (station.Neighbors.length <= 2) {
      return
    }

    const pivot: Point = station.Neighbors[0].Position
    const center: Point = station.Position
    station.Neighbors.sort((u: Station, v: Station) =>
      getOrientationOf3Vectors(pivot.sub(center), u.Position.sub(center), v.Position.sub(center)),
    )
  }

  InitEdgeIjInfos() {
    for (const metroLine of this.metrolines) {
      const poly = metroLine.Polyline
      let u = this.PointToStations.get(poly.start)
      let v: Station
      for (let p = metroLine.Polyline.startPoint; p.next != null; p = p.next, u = v) {
        v = this.PointToStations.get(p.next.point)
        const info = this.GetUnorderedIjInfo(u, v)
        info.Width += metroLine.Width
        info.Metrolines.push(metroLine)
      }
    }
  }

  InitializeCdtInfo() {
    const cdtTree = this.cdt.getRectangleNodeOnTriangles()
    for (const station of this.Stations) {
      station.cdtTriangle = cdtTree.FirstHitNodeWithPredicate(station.Position, IntersectionCache.testPointInside).UserData
      //Debug.Assert(station.CdtTriangle != null);
    }
  }

  PointIsAcceptableForEdge(metroline: Metroline, point: Point): boolean {
    if (this.LoosePolylineOfPort == null) {
      return true
    }

    const polys = metroline.sourceAndTargetLoosePolylines()
    return (
      Curve.PointRelativeToCurveLocation(point, polys[0]) === PointLocation.Outside &&
      Curve.PointRelativeToCurveLocation(point, polys[1]) === PointLocation.Outside
    )
  }
}
/**  computes orientation of three vectors with a common source
     (compare the polar angles of v1 and v2 with respect to v0)
      return -1 if the orientation is v0 v1 v2
               1 if the orientation is v0 v2 v1
               0  if v1 and v2 are collinear and codirectinal */
export function getOrientationOf3Vectors(v0: Point, v1: Point, v2: Point): number {
  const xp2: number = Point.crossProduct(v0, v2)
  const dotp2: number = v0.dot(v2)
  const xp1: number = Point.crossProduct(v0, v1)
  const dotp1: number = v0.dot(v1)
  // v1 is collinear with v0
  if (closeDistEps(xp1, 0) && GreaterOrEqual(dotp1, 0)) {
    if (closeDistEps(xp2, 0) && GreaterOrEqual(dotp2, 0)) {
      return 0
    }

    return 1
  }

  // v2 is collinear with v0
  if (closeDistEps(xp2, 0) && GreaterOrEqual(dotp2, 0)) {
    return -1
  }

  if (closeDistEps(xp1, 0) || closeDistEps(xp2, 0) || xp1 * xp2 > 0) {
    // both on same side of v0, compare to each other
    return compareNumbersDistEps(Point.crossProduct(v2, v1), 0)
  }

  // vectors "less than" zero degrees are actually large, near 2 pi
  return -compareNumbersDistEps(Math.sign(xp1), 0)
}

export function GreaterOrEqual(numberA: number, numberB: number) {
  return compareNumbersDistEps(numberA, numberB) >= 0
}
