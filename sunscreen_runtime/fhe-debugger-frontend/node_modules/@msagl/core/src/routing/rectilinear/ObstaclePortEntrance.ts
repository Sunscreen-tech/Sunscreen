import {String} from 'typescript-string-operations'
import {Point, Rectangle, CompassVector, Curve, PointLocation, Direction, GeomConstants, LineSegment, Polyline} from '../../math/geometry'
import {RectangleNode} from '../../math/geometry/RTree/rectangleNode'

import {VisibilityVertex} from '../visibility/VisibilityVertex'
import {Obstacle} from './obstacle'
import {ObstaclePort} from './ObstaclePort'
import {ObstacleTree} from './ObstacleTree'
import {PointAndCrossingsList} from './PointAndCrossingsList'
import {PointComparer} from './PointComparer'
import {ScanDirection} from './ScanDirection'
import {ScanSegment} from './ScanSegment'
import {StaticGraphUtility} from './StaticGraphUtility'
import {TransientGraphUtility} from './TransientGraphUtility'
export class ObstaclePortEntrance {
  ObstaclePort: ObstaclePort
  get Obstacle(): Obstacle {
    return this.ObstaclePort.Obstacle
  }

  // The intersection point on the obstacle border (e.g. intersection with a port point, or
  // midpoint of PortEntry) and the direction from that point to find the outer vertex.
  UnpaddedBorderIntersect: Point
  OutwardDirection: Direction
  VisibilityBorderIntersect: Point

  IsOverlapped = false

  get InitialWeight(): number {
    return this.IsOverlapped ? ScanSegment.OverlappedWeight : ScanSegment.NormalWeight
  }

  private unpaddedToPaddedBorderWeight: number = ScanSegment.NormalWeight

  get IsCollinearWithPort(): boolean {
    return CompassVector.IsPureDirection(PointComparer.GetDirections(this.VisibilityBorderIntersect, this.ObstaclePort.Location))
  }

  // The line segment from VisibilityBorderIntersect to the first obstacle it hits.
  MaxVisibilitySegment: LineSegment

  private pointAndCrossingsList: PointAndCrossingsList

  get IsVertical(): boolean {
    return StaticGraphUtility.IsVertical(this.MaxVisibilitySegment)
  }

  // If the port has entrances that are collinear, don't do the optimization for non-collinear ones.
  get WantVisibilityIntersection(): boolean {
    return !this.IsOverlapped && this.CanExtend && (!this.ObstaclePort.HasCollinearEntrances || this.IsCollinearWithPort)
  }

  get CanExtend(): boolean {
    return PointComparer.GetDirections(this.MaxVisibilitySegment.start, this.MaxVisibilitySegment.end) !== Direction.None
  }

  constructor(oport: ObstaclePort, unpaddedBorderIntersect: Point, outDir: Direction, obstacleTree: ObstacleTree) {
    this.ObstaclePort = oport
    this.UnpaddedBorderIntersect = unpaddedBorderIntersect
    this.OutwardDirection = outDir
    // Get the padded intersection.
    const lineSeg = LineSegment.mkPP(
      this.UnpaddedBorderIntersect,
      StaticGraphUtility.RectangleBorderIntersect(oport.Obstacle.VisibilityBoundingBox, this.UnpaddedBorderIntersect, outDir),
    )
    const xxs = Curve.getAllIntersections(lineSeg, oport.Obstacle.VisibilityPolyline, true)
    /*Assert.assert(1 === xxs.length, 'Expected one intersection')*/
    this.VisibilityBorderIntersect = Point.RoundPoint(xxs[0].x)
    const t = {pacList: <PointAndCrossingsList>null}
    this.MaxVisibilitySegment = obstacleTree.CreateMaxVisibilitySegment(this.VisibilityBorderIntersect, this.OutwardDirection, t)
    this.pointAndCrossingsList = t.pacList
    // Groups are never in a clump (overlapped) but they may still have their port entrance overlapped.
    if (this.Obstacle.isOverlapped || (this.Obstacle.IsGroup && !this.Obstacle.IsInConvexHull)) {
      this.IsOverlapped = obstacleTree.IntersectionIsInsideAnotherObstacle(
        null,
        this.Obstacle,
        this.VisibilityBorderIntersect,
        ScanDirection.GetInstance(this.OutwardDirection),
      )
      if (!this.Obstacle.IsGroup || this.IsOverlapped || this.InteriorEdgeCrossesObstacle(obstacleTree)) {
        this.unpaddedToPaddedBorderWeight = ScanSegment.OverlappedWeight
      }
    }

    if (this.Obstacle.IsInConvexHull && this.unpaddedToPaddedBorderWeight === ScanSegment.NormalWeight) {
      this.SetUnpaddedToPaddedBorderWeightFromHullSiblingOverlaps(obstacleTree)
    }
  }

  private SetUnpaddedToPaddedBorderWeightFromHullSiblingOverlaps(obstacleTree: ObstacleTree) {
    if (this.Obstacle.IsGroup ? this.InteriorEdgeCrossesObstacle(obstacleTree) : this.InteriorEdgeCrossesConvexHullSiblings()) {
      this.unpaddedToPaddedBorderWeight = ScanSegment.OverlappedWeight
    }
  }

  private InteriorEdgeCrossesObstacle(obstacleTree: ObstacleTree): boolean {
    // File Test: Nudger_Overlap4
    // Use the VisibilityBoundingBox for groups because those are what the tree consists of.
    const rect = Rectangle.mkPP(this.UnpaddedBorderIntersect, this.VisibilityBorderIntersect)
    return this.InteriorEdgeCrossesObstacleRFI(
      rect,
      (obs) => obs.VisibilityPolyline,
      Array.from(obstacleTree.Root.GetLeafRectangleNodesIntersectingRectangle(rect))
        .filter((node: RectangleNode<Obstacle, Point>) => !node.UserData.IsGroup && node.UserData !== this.Obstacle)
        .map((node: RectangleNode<Obstacle, Point>) => node.UserData),
    )
  }

  private InteriorEdgeCrossesConvexHullSiblings(): boolean {
    // There is no RectangleNode tree that includes convex hull non-primary siblings, so we just iterate;
    // this will only be significant to perf in extremely overlapped cases that we are not optimizing for.
    const rect = Rectangle.mkPP(this.UnpaddedBorderIntersect, this.VisibilityBorderIntersect)
    return this.InteriorEdgeCrossesObstacleRFI(
      rect,
      (obs) => obs.PaddedPolyline,
      this.Obstacle.ConvexHull.Obstacles.filter((obs) => obs !== this.Obstacle),
    )
  }

  private InteriorEdgeCrossesObstacleRFI(
    rect: Rectangle,
    whichPolylineToUse: (o: Obstacle) => Polyline,
    candidates: Array<Obstacle>,
  ): boolean {
    let lineSeg: LineSegment = null
    for (const blocker of candidates) {
      const blockerPolyline = whichPolylineToUse(blocker)
      if (!StaticGraphUtility.RectangleInteriorsIntersect(rect, blockerPolyline.boundingBox)) {
        continue
      }
      lineSeg = lineSeg ?? LineSegment.mkPP(this.UnpaddedBorderIntersect, this.VisibilityBorderIntersect)

      const xx = Curve.intersectionOne(lineSeg, blockerPolyline, /* liftIntersection:*/ false)
      if (xx != null) {
        return true
      }

      if (PointLocation.Outside !== Curve.PointRelativeToCurveLocation(this.UnpaddedBorderIntersect, blockerPolyline)) {
        return true
      }
    }

    return false
  }

  get HasGroupCrossings(): boolean {
    return this.pointAndCrossingsList != null && this.pointAndCrossingsList.Count() > 0
  }

  HasGroupCrossingBeforePoint(point: Point): boolean {
    if (!this.HasGroupCrossings) {
      return false
    }

    const pac = StaticGraphUtility.IsAscending(this.OutwardDirection) ? this.pointAndCrossingsList.First : this.pointAndCrossingsList.Last
    return PointComparer.GetDirections(this.MaxVisibilitySegment.start, pac.Location) === PointComparer.GetDirections(pac.Location, point)
  }

  AddToAdjacentVertex(transUtil: TransientGraphUtility, targetVertex: VisibilityVertex, limitRect: Rectangle, routeToCenter: boolean) {
    let borderVertex: VisibilityVertex = transUtil.VisGraph.FindVertex(this.VisibilityBorderIntersect)
    if (borderVertex != null) {
      this.ExtendEdgeChain(transUtil, borderVertex, borderVertex, limitRect, routeToCenter)
      return
    }

    // There is no vertex at VisibilityBorderIntersect, so create it and link it to targetVertex.
    // Note: VisibilityBorderIntersect may === targetIntersect if that is on our border, *and*
    // targetIntersect may be on the border of a touching obstacle, in which case this will splice
    // into or across the adjacent obstacle, which is consistent with "touching is overlapped".
    // So we don't use UnpaddedBorderIntersect as prevPoint when calling ExtendEdgeChain.
    // VisibilityBorderIntersect may be rounded just one Curve.DistanceEpsilon beyond the ScanSegment's
    // perpendicular coordinate; e.g. our X may be targetIntersect.X + Curve.DistanceEpsilon, thereby
    // causing the direction from VisibilityBorderIntersect to targetIntersect to be W instead of E.
    // So use the targetIntersect if they are close enough; they will be equal for flat borders, and
    // otherwise the exact value we use only needs be "close enough" to the border.  (We can't use
    // CenterVertex as the prevPoint because that could be an impure direction).
    // Update: With the change to carry MaxVisibilitySegment within the PortEntrance, PortManager finds
    // targetVertex between VisibilityBorderIntersect and MaxVisibilitySegment.End, so this should no longer
    // be able to happen.
    // See RectilinearTests.PaddedBorderIntersectMeetsIncomingScanSegment for an example of what happens
    // when VisibilityBorderIntersect is on the incoming ScanSegment (it jumps out above with borderVertex found).
    if (this.OutwardDirection === PointComparer.GetDirections(targetVertex.point, this.VisibilityBorderIntersect)) {
      /*Assert.assert(
        false,
        'Unexpected reversed direction between VisibilityBorderIntersect and targetVertex',
      )*/
      // ReSharper disable HeuristicUnreachableCode
      this.VisibilityBorderIntersect = targetVertex.point
      borderVertex = targetVertex
      // ReSharper restore HeuristicUnreachableCode
    } else {
      borderVertex = transUtil.FindOrAddVertex(this.VisibilityBorderIntersect)
      transUtil.FindOrAddEdge(borderVertex, targetVertex, this.InitialWeight)
    }

    this.ExtendEdgeChain(transUtil, borderVertex, targetVertex, limitRect, routeToCenter)
  }

  ExtendEdgeChain(
    transUtil: TransientGraphUtility,
    paddedBorderVertex: VisibilityVertex,
    targetVertex: VisibilityVertex,
    limitRect: Rectangle,
    routeToCenter: boolean,
  ) {
    // Extend the edge chain to the opposite side of the limit rectangle.
    transUtil.ExtendEdgeChainVRLPB(targetVertex, limitRect, this.MaxVisibilitySegment, this.pointAndCrossingsList, this.IsOverlapped)
    // In order for Nudger to be able to map from the (near-) endpoint vertex to a PortEntry, we must
    // always connect a vertex at UnpaddedBorderIntersect to the paddedBorderVertex, even if routeToCenter.
    const unpaddedBorderVertex = transUtil.FindOrAddVertex(this.UnpaddedBorderIntersect)
    transUtil.FindOrAddEdge(unpaddedBorderVertex, paddedBorderVertex, this.unpaddedToPaddedBorderWeight)
    if (routeToCenter) {
      // Link the CenterVertex to the vertex at UnpaddedBorderIntersect.
      transUtil.ConnectVertexToTargetVertex(this.ObstaclePort.CenterVertex, unpaddedBorderVertex, this.OutwardDirection, this.InitialWeight)
    }
  }

  public toString(): string {
    return String.Format(
      '{0} {1}~{2} {3}',
      this.ObstaclePort.Location,
      this.UnpaddedBorderIntersect,
      this.VisibilityBorderIntersect,
      this.OutwardDirection,
    )
  }
}
