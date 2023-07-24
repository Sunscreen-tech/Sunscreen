import {GeomEdge} from '../../../layout/core/geomEdge'
import {HookUpAnywhereFromInsidePort} from '../../../layout/core/hookUpAnywhereFromInsidePort'
import {Port} from '../../../layout/core/port'
import {ICurve} from '../../../math/geometry/icurve'
import {Point} from '../../../math/geometry/point'
import {Polyline} from '../../../math/geometry/polyline'
import {Rectangle} from '../../../math/geometry/rectangle'
import {CreateRectNodeOnArrayOfRectNodes, mkRectangleNode, RectangleNode} from '../../../math/geometry/RTree/rectangleNode'
import {CrossRectangleNodes} from '../../../math/geometry/RTree/rectangleNodeUtils'
import {GenericBinaryHeapPriorityQueue} from '../../../structs/genericBinaryHeapPriorityQueue'

import {addToMapOfSets} from '../../../utils/setOperations'
import {BundlingSettings} from '../../BundlingSettings'
import {ClusterBoundaryPort} from '../../ClusterBoundaryPort'
import {Cdt} from '../../ConstrainedDelaunayTriangulation/Cdt'
import {CdtEdge} from '../../ConstrainedDelaunayTriangulation/CdtEdge'
import {CdtTriangle} from '../../ConstrainedDelaunayTriangulation/CdtTriangle'
import {Shape} from '../../shape'
import {Polygon} from '../../visibility/Polygon'
import {VisibilityGraph} from '../../visibility/VisibilityGraph'
import {VisibilityVertex} from '../../visibility/VisibilityVertex'
import {CdtThreader} from './CdtThreader'
import {SdBoneEdge} from './SdBoneEdge'
import {SdVertex} from './SdVertex'

export class SdShortestPath {
  VisibilityGraph: VisibilityGraph

  MakeTransparentShapesOfEdgeGeometry: (eg: GeomEdge) => Array<Shape>

  BundlingSettings: BundlingSettings

  geomEdges: GeomEdge[]

  ObstacleHierarchy: RectangleNode<Polyline, Point>

  vertexArray: SdVertex[]

  cdt: Cdt

  Gates: Set<CdtEdge>

  EdgesToRoutes: Map<GeomEdge, Array<SdBoneEdge>> = new Map<GeomEdge, Array<SdBoneEdge>>()

  EdgesToRouteSources: Map<GeomEdge, SdVertex> = new Map<GeomEdge, SdVertex>()

  CurrentEdgeGeometry: GeomEdge

  VisibilityVerticesToSdVerts: Map<VisibilityVertex, SdVertex>

  LengthCoefficient: number

  Queue: GenericBinaryHeapPriorityQueue<SdVertex>

  LowestCostToTarget: number

  ClosestTargetVertex: SdVertex

  capacityOverlowPenaltyMultiplier: number

  sourceLoosePoly: Polyline

  targetLoosePoly: Polyline

  constructor(makeTransparentShapesOfEdgeGeometryAndGetTheShapes: (e: GeomEdge) => Array<Shape>, cdt: Cdt, gates: Set<CdtEdge>) {
    this.MakeTransparentShapesOfEdgeGeometry = makeTransparentShapesOfEdgeGeometryAndGetTheShapes
    this.cdt = cdt
    this.Gates = gates
  }

  CreateGraphElements() {
    for (const sdVertex of this.vertexArray) {
      const vv = sdVertex.VisibilityVertex
      for (const vEdge of vv.InEdges) {
        const boneEdge = new SdBoneEdge(
          vEdge,
          this.VisibilityVerticesToSdVerts.get(vEdge.Source),
          this.VisibilityVerticesToSdVerts.get(vEdge.Target),
        )
        const otherSdVertex = this.VisibilityVerticesToSdVerts.get(vEdge.Source)
        sdVertex.InBoneEdges.push(boneEdge)
        otherSdVertex.OutBoneEdges.push(boneEdge)
      }
    }
  }

  CreateRoutingGraph() {
    this.vertexArray = []
    this.VisibilityVerticesToSdVerts = new Map<VisibilityVertex, SdVertex>()
    for (const v of this.VisibilityGraph.Vertices()) {
      const sdVert = new SdVertex(v)
      this.vertexArray.push(sdVert)
      this.VisibilityVerticesToSdVerts.set(v, sdVert)
    }

    this.CreateGraphElements()
  }

  // routing of the edges minimizing (ink+path length+capacity penalty)
  RouteEdges() {
    this.Initialize()
    this.RestoreCapacities()
    for (const geomEdge of this.geomEdges) {
      this.EdgesToRoutes.set(geomEdge, this.RouteEdge(geomEdge))
    }

    this.RerouteEdges()

    for (const geomEdge of this.geomEdges) this.SetEdgeGeometryCurve(geomEdge)
  }

  SetEdgeGeometryCurve(geomEdge: GeomEdge) {
    const poly = new Polyline()
    let curV = this.EdgesToRouteSources.get(geomEdge)
    poly.addPoint(curV.Point)
    for (const edge of this.EdgesToRoutes.get(geomEdge)) {
      if (edge.SourcePoint.equal(curV.Point)) {
        poly.addPoint(edge.TargetPoint)
        curV = edge.Target
      } else {
        poly.addPoint(edge.SourcePoint)
        curV = edge.Source
      }
    }

    geomEdge.curve = poly
    const isClusterSourcePort = geomEdge.sourcePort instanceof ClusterBoundaryPort
    if (isClusterSourcePort) SdShortestPath.ExtendPolylineStartToClusterBoundary(poly, (<ClusterBoundaryPort>geomEdge.sourcePort).Curve)

    const isClusterTargetPort = geomEdge.targetPort instanceof ClusterBoundaryPort
    if (isClusterTargetPort) SdShortestPath.ExtendPolylineEndToClusterBoundary(poly, (<ClusterBoundaryPort>geomEdge.targetPort).Curve)
  }

  static ExtendPolylineEndToClusterBoundary(poly: Polyline, curve: ICurve) {
    const par = curve.closestParameter(poly.end)
    poly.addPoint(curve.value(par))
  }

  static ExtendPolylineStartToClusterBoundary(poly: Polyline, curve: ICurve) {
    const par = curve.closestParameter(poly.start)
    poly.PrependPoint(curve.value(par))
  }

  RerouteEdges() {
    this.RestoreCapacities()
    for (const geomEdge of this.geomEdges) {
      const newRoute = this.RerouteEdge(geomEdge)
      this.EdgesToRoutes.set(geomEdge, newRoute)
    }
  }

  RestoreCapacities() {
    if (this.cdt != null) {
      this.cdt.RestoreEdgeCapacities()
    }
  }

  // Reroute edge
  RerouteEdge(geomEdge: GeomEdge): Array<SdBoneEdge> {
    const route = this.EdgesToRoutes.get(geomEdge)

    for (const edge of route) edge.RemoveOccupiedEdge()

    return this.RouteEdge(geomEdge)
  }

  RouteEdge(geomEdge: GeomEdge): Array<SdBoneEdge> {
    this.CurrentEdgeGeometry = geomEdge
    for (let i = 0; i < this.vertexArray.length; i++) {
      const sdv = this.vertexArray[i]
      sdv.SetPreviousToNull()
      sdv.IsTargetOfRouting = sdv.IsSourceOfRouting = false
    }

    const transparentShapes = this.MakeTransparentShapesOfEdgeGeometry(geomEdge)
    const ret = this.RouteEdgeWithGroups()
    for (const shape of transparentShapes) shape.IsTransparent = false
    return ret
  }

  RouteEdgeWithGroups(): Array<SdBoneEdge> {
    for (let i = 0; i < 2; i++) {
      this.SetLengthCoefficient()
      this.Queue = new GenericBinaryHeapPriorityQueue<SdVertex>()
      this.sourceLoosePoly = this.SetPortVerticesAndObstacles(this.CurrentEdgeGeometry.sourcePort, true)
      this.targetLoosePoly = this.SetPortVerticesAndObstacles(this.CurrentEdgeGeometry.targetPort, false)
      const ret: Array<SdBoneEdge> = this.RouteOnKnownSourceTargetVertices(
        this.CurrentEdgeGeometry.targetPort.Location.sub(this.CurrentEdgeGeometry.sourcePort.Location).normalize(),
        i === 0,
      )
      if (ret != null) {
        return ret
      }

      for (let j = 0; j < this.vertexArray.length; j++) {
        this.vertexArray[j].SetPreviousToNull()
      }
    }

    // SplineRouter.ShowVisGraph('./tmp/badVis.svg', this.VisibilityGraph, Array.from(this.ObstacleHierarchy.GetAllLeaves()), null, [
    //  LineSegment.mkPP(this.CurrentEdgeGeometry.sourcePort.Location, this.CurrentEdgeGeometry.targetPort.Location),
    // ])
    throw new Error()
  }

  RouteOnKnownSourceTargetVertices(pathDirection: Point, lookingForMonotonePath: boolean): Array<SdBoneEdge> {
    this.LowestCostToTarget = Number.POSITIVE_INFINITY
    this.ClosestTargetVertex = null
    while (this.Queue.count > 0) {
      const hu = {priority: 0}
      const bestNode: SdVertex = this.Queue.DequeueAndGetPriority(hu)
      if (hu.priority >= this.LowestCostToTarget) {
        continue
      }

      // update the rest
      for (let i = 0; i < bestNode.OutBoneEdges.length; i++) {
        const outBoneEdge = bestNode.OutBoneEdges[i]
        if (outBoneEdge.IsPassable) {
          this.ProcessOutcomingBoneEdge(bestNode, outBoneEdge, pathDirection, lookingForMonotonePath)
        }
      }

      for (let i = 0; i < bestNode.InBoneEdges.length; i++) {
        const inBoneEdge = bestNode.InBoneEdges[i]
        if (inBoneEdge.IsPassable) {
          this.ProcessIncomingBoneEdge(bestNode, inBoneEdge, pathDirection, lookingForMonotonePath)
        }
      }
    }

    return this.GetPathAndUpdateRelatedCosts()
  }

  ProcessOutcomingBoneEdge(v: SdVertex, outBoneEdge: SdBoneEdge, pathDirection: Point, lookingForMonotonePath: boolean) {
    //Assert.assert(v === outBoneEdge.Source)
    if (lookingForMonotonePath && pathDirection.dot(outBoneEdge.TargetPoint.sub(outBoneEdge.SourcePoint)) < 0) {
      return
    }

    this.ProcessBoneEdge(v, outBoneEdge.Target, outBoneEdge)
  }

  ProcessIncomingBoneEdge(v: SdVertex, inBoneEdge: SdBoneEdge, pathDirection: Point, lookingForMonotonePath: boolean) {
    //Assert.assert(v === inBoneEdge.Target)
    if (lookingForMonotonePath && pathDirection.dot(inBoneEdge.SourcePoint.sub(inBoneEdge.TargetPoint)) < 0) {
      return
    }

    this.ProcessBoneEdge(v, inBoneEdge.Source, inBoneEdge)
  }

  ProcessBoneEdge(v: SdVertex, queueCandidate: SdVertex, boneEdge: SdBoneEdge) {
    const newCost: number = this.GetEdgeAdditionalCost(boneEdge, v.Cost)
    if (queueCandidate.Cost <= newCost) {
      return
    }

    queueCandidate.Cost = newCost
    queueCandidate.PrevEdge = boneEdge
    if (this.Queue.ContainsElement(queueCandidate)) {
      this.Queue.DecreasePriority(queueCandidate, newCost)
    } else {
      if (queueCandidate.IsTargetOfRouting) {
        let costToTarget = 0
        if (this.CurrentEdgeGeometry.targetPort instanceof ClusterBoundaryPort) {
          costToTarget = this.LengthCoefficient * queueCandidate.Point.sub(this.CurrentEdgeGeometry.targetPort.Location).length
        }

        if (newCost + costToTarget < this.LowestCostToTarget) {
          this.LowestCostToTarget = newCost + costToTarget
          this.ClosestTargetVertex = queueCandidate
        }

        return
        // do not enqueue the target vertices
      }

      this.Enqueue(queueCandidate)
    }
  }

  GetPathAndUpdateRelatedCosts(): Array<SdBoneEdge> {
    // restore the path by moving backwards
    let current = this.ClosestTargetVertex
    if (current == null) {
      return null
    }

    const result = new Array<SdBoneEdge>()
    while (current.PrevEdge != null) {
      result.push(current.PrevEdge)
      this.RegisterPathInBoneEdge(current.PrevEdge)
      current = current.Prev
    }

    this.EdgesToRouteSources.set(this.CurrentEdgeGeometry, current)
    result.reverse()
    //Assert.assert(result.length > 0)
    return result
  }

  RegisterPathInBoneEdge(boneEdge: SdBoneEdge) {
    boneEdge.AddOccupiedEdge()
    if (this.cdt != null && this.BundlingSettings.CapacityOverflowCoefficient !== 0) {
      this.UpdateResidualCostsOfCrossedCdtEdges(boneEdge)
    }
  }

  UpdateResidualCostsOfCrossedCdtEdges(boneEdge: SdBoneEdge) {
    for (const cdtEdge of boneEdge.CrossedCdtEdges) {
      if (this.AdjacentToSourceOrTarget(cdtEdge)) continue
      if (cdtEdge.ResidualCapacity === cdtEdge.Capacity) {
        cdtEdge.ResidualCapacity -= this.BundlingSettings.edgeWidthShrinkCoeff * this.CurrentEdgeGeometry.lineWidth
      } else {
        cdtEdge.ResidualCapacity -= this.BundlingSettings.ActualEdgeWidth(this.CurrentEdgeGeometry)
      }
    }
  }

  H(v: SdVertex): number {
    return v.Cost + this.LengthCoefficient * v.Point.sub(this.CurrentEdgeGeometry.targetPort.Location).length
  }

  GetEdgeAdditionalCost(boneEdge: SdBoneEdge, previousCost: number): number {
    const len = boneEdge.TargetPoint.sub(boneEdge.SourcePoint).length
    return (
      this.LengthCoefficient * len +
      previousCost +
      (boneEdge.IsOccupied ? 0 : this.BundlingSettings.InkImportance * len) +
      this.CapacityOverflowCost(boneEdge)
    )
  }

  CapacityOverflowCost(boneEdge: SdBoneEdge): number {
    if (this.cdt == null || this.BundlingSettings.CapacityOverflowCoefficient === 0) return 0
    let ret = 0
    for (const cdtEdge of this.CrossedCdtEdgesOfBoneEdge(boneEdge)) {
      ret += this.CostOfCrossingCdtEdgeLocal(
        this.capacityOverlowPenaltyMultiplier,
        this.BundlingSettings,
        this.CurrentEdgeGeometry,
        cdtEdge,
      )
    }
    return ret
  }

  CrossedCdtEdgesOfBoneEdge(boneEdge: SdBoneEdge): Array<CdtEdge> {
    if (boneEdge.CrossedCdtEdges != null) return Array.from(boneEdge.CrossedCdtEdges)
    return Array.from((boneEdge.CrossedCdtEdges = this.ThreadBoneEdgeThroughCdt(boneEdge)))
  }

  ThreadBoneEdgeThroughCdt(boneEdge: SdBoneEdge): Set<CdtEdge> {
    const start = boneEdge.SourcePoint
    const currentTriangle = boneEdge.Source.Triangle
    //Assert.assert(Cdt.PointIsInsideOfTriangle(start, currentTriangle))
    const crossedEdges = new Set<CdtEdge>()
    const end = boneEdge.TargetPoint
    if (Cdt.PointIsInsideOfTriangle(end, currentTriangle)) {
      return crossedEdges
    }

    const threader = new CdtThreader(currentTriangle, start, end)
    while (threader.MoveNext()) {
      const piercedEdge: CdtEdge = threader.CurrentPiercedEdge
      //Assert.assert(piercedEdge != null)
      if (this.Gates.has(piercedEdge)) {
        crossedEdges.add(piercedEdge)
      }
    }

    // if(ddd(boneEdge))
    // CdtSweeper.ShowFront(Cdt.GetTriangles(),null,new []{new LineSegment(boneEdge.SourcePoint,boneEdge.TargetPoint)}, crossedEdges.Select(e=>new LineSegment(e.upperSite.point,e.lowerSite.point)));
    return crossedEdges
  }

  // TODO: method incorrect since id doesn't check AdjacentToSourceOrTarget condition
  static CostOfCrossingCdtEdge(
    capacityOverflMult: number,
    bundlingSettings: BundlingSettings,
    currentEdgeGeometry: GeomEdge,
    e: CdtEdge,
  ): number {
    let w = currentEdgeGeometry.lineWidth * bundlingSettings.edgeWidthShrinkCoeff
    if (e.Capacity !== e.ResidualCapacity) {
      w += bundlingSettings.EdgeSeparation * bundlingSettings.edgeWidthShrinkCoeff
    }

    const del = e.ResidualCapacity - w
    if (del >= 0) {
      return 0
    }

    return -del * capacityOverflMult
  }

  CostOfCrossingCdtEdgeLocal(
    capacityOverflMult: number,
    bundlingSettings: BundlingSettings,
    currentEdgeGeometry: GeomEdge,
    e: CdtEdge,
  ): number {
    if (this.AdjacentToSourceOrTarget(e)) {
      return 0
    }

    return SdShortestPath.CostOfCrossingCdtEdge(capacityOverflMult, bundlingSettings, currentEdgeGeometry, e)
  }

  AdjacentToSourceOrTarget(e: CdtEdge): boolean {
    return (
      e.upperSite.Owner === this.sourceLoosePoly ||
      e.lowerSite.Owner === this.sourceLoosePoly ||
      e.upperSite.Owner === this.targetLoosePoly ||
      e.lowerSite.Owner === this.targetLoosePoly
    )
  }

  SetLengthCoefficient() {
    const idealEdgeLength: number = this.GetIdealDistanceBetweenSourceAndTarget(this.CurrentEdgeGeometry)
    this.LengthCoefficient = this.BundlingSettings.PathLengthImportance / idealEdgeLength
  }

  GetIdealDistanceBetweenSourceAndTarget(geomEdge: GeomEdge): number {
    return geomEdge.sourcePort.Location.sub(geomEdge.targetPort.Location).length
  }

  SetPortVerticesAndObstacles(port: Port, sources: boolean): Polyline {
    let poly: Polyline
    if (port instanceof ClusterBoundaryPort) {
      const cbport = port as ClusterBoundaryPort
      //SplineRouter.ShowVisGraph(this.VisibilityGraph, this.ObstacleHierarchy.GetAllLeaves(), null, new[]{cbport.LoosePolyline});
      poly = cbport.LoosePolyline
      for (const point of poly) {
        let initialCost = 0
        if (sources) {
          //we prefer paths starting from the center of the group
          initialCost = this.LengthCoefficient * point.sub(this.CurrentEdgeGeometry.sourcePort.Location).length
        }
        this.AddAndEnqueueVertexToEnds(point, sources, initialCost)
      }
    } else {
      if (port instanceof HookUpAnywhereFromInsidePort) {
        const anywherePort = port as HookUpAnywhereFromInsidePort
        poly = anywherePort.LoosePolyline
        for (const point of poly) this.AddAndEnqueueVertexToEnds(point, sources, 0)
      } else {
        this.AddAndEnqueueVertexToEnds(port.Location, sources, 0)
        const polys = Array.from(this.ObstacleHierarchy.GetNodeItemsIntersectingRectangle(port.Curve.boundingBox))
        let mindiag = polys[0].boundingBox.diagonal
        poly = polys[0]
        for (let i = 1; i < polys.length; i++) {
          const pl = polys[i]
          const diag = pl.boundingBox.diagonal
          if (diag < mindiag) {
            mindiag = diag
            poly = pl
          }
        }
      }
    }
    return poly
  }

  Enqueue(simpleSdVertex: SdVertex) {
    this.Queue.Enqueue(simpleSdVertex, this.H(simpleSdVertex))
  }

  AddAndEnqueueVertexToEnds(point: Point, isSource: boolean, initialCost: number) {
    const v = this.FindVertex(point)
    const sdVert = this.VisibilityVerticesToSdVerts.get(v)
    if (isSource) {
      sdVert.IsSourceOfRouting = true
      sdVert.Cost = initialCost
      this.Enqueue(sdVert)
    } else {
      sdVert.IsTargetOfRouting = true
    }
  }

  FindVertex(p: Point): VisibilityVertex {
    return this.VisibilityGraph.FindVertex(p) // in the C# version there is a backup search with rounding
  }

  Initialize() {
    this.CreateRoutingGraph()
    if (this.cdt != null) {
      this.capacityOverlowPenaltyMultiplier = SdShortestPath.CapacityOverflowPenaltyMultiplier(this.BundlingSettings)
      this.SetVertexTriangles()
      this.CalculateCapacitiesOfTrianglulation()
    }
  }

  CalculateCapacitiesOfTrianglulation() {
    for (const e of this.Gates) SdShortestPath.CalculateCdtEdgeCapacityForEdge(e)
  }

  static CalculateCdtEdgeCapacityForEdge(e: CdtEdge) {
    if (e.constrained || e.CwTriangle == null || e.CcwTriangle == null) {
      return
    }

    // this is a convex hull edge or an obstacle edge
    const startPoly = <Polyline>e.upperSite.Owner
    const endPoly = <Polyline>e.lowerSite.Owner
    if (startPoly !== endPoly) {
      // e.Capacity = Polygon.Distance(new Polygon(startPoly), new Polygon(endPoly)); //todo: cache this
      // e.Capacity = (e.upperSite.point - e.lowerSite.point).length;
      const distA: number = Polygon.DistancePoint(new Polygon(startPoly), e.lowerSite.point)
      const distB: number = Polygon.DistancePoint(new Polygon(endPoly), e.upperSite.point)
      e.Capacity = (distA + distB) / 2
    }

    // else - it is a diagonal of an obstacle, do not care
  }

  SetVertexTriangles() {
    const triangleTree = CreateRectNodeOnArrayOfRectNodes(
      Array.from(this.cdt.GetTriangles()).map((t) => mkRectangleNode(t, t.BoundingBox())),
    )
    const vertexTree = CreateRectNodeOnArrayOfRectNodes(this.vertexArray.map((v) => mkRectangleNode(v, Rectangle.mkOnPoints([v.Point]))))

    CrossRectangleNodes(triangleTree, vertexTree, (a, b) => this.TryToAssigenTriangleToVertex(a, b))
  }

  TryToAssigenTriangleToVertex(triangle: CdtTriangle, vertex: SdVertex) {
    if (vertex.Triangle != null) {
      return
    }

    if (Cdt.PointIsInsideOfTriangle(vertex.Point, triangle)) {
      vertex.Triangle = triangle
    }
  }

  static CapacityOverflowPenaltyMultiplier(bundlingSettings: BundlingSettings): number {
    return bundlingSettings.CapacityOverflowCoefficient * (bundlingSettings.PathLengthImportance + bundlingSettings.InkImportance)
  }

  // compute cdt edges crossed by paths
  FillCrossedCdtEdges(crossedCdtEdges: Map<GeomEdge, Set<CdtEdge>>) {
    for (const geometryEdge of this.geomEdges) {
      this.sourceLoosePoly = this.SetPortVerticesAndObstacles(geometryEdge.sourcePort, true)
      this.targetLoosePoly = this.SetPortVerticesAndObstacles(geometryEdge.targetPort, false)

      //crossedCdtEdges.Add(geometryEdge, new Set<CdtEdge>());
      for (const boneEdge of this.EdgesToRoutes.get(geometryEdge)) {
        for (const cdtEdge of this.CrossedCdtEdgesOfBoneEdge(boneEdge)) {
          if (this.AdjacentToSourceOrTarget(cdtEdge)) continue
          addToMapOfSets(crossedCdtEdges, geometryEdge, cdtEdge)
        }
      }
    }
  }
}
