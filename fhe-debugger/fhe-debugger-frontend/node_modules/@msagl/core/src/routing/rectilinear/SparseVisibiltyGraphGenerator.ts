// Scan direction is parallel to the sweepline which moves in the perpendicular direction;
// i.e. scan direction is "sideways" along the sweepline.  We do several passes, following Clarkson et al.,
// "Rectilinear shortest paths through polygonal obstacles in O(n (log n)2) time" (checked into the enlistment).
//   1.  Enumerate all obstacles and load their extreme vertex coordinate projections to the perpendicular axis.
//   2.  Run a scanline (in each direction) that:
//      a.  Accumulates the vertices and generates obstacle-related Steiner points.
//      b.  Generates the ScanSegments.
//   3.  Iterate in parallel along the ScanSegments and *VertexPoints to determine the sparse intersections
//       by binary division, as in the paper.
//   4.  Finally we create the VisibilityVertices and VisibilityEdges along each ScanSegment from its
//       list of intersections.
// Differences from the paper largely are due to the paper's creation of non-orthogonal edges along
// obstacle sides; instead, we create orthogonal edges to the lateral sides of the obstacle's bounding
// box. Also, we support overlapped obstacles (interior edges are weighted, as in the non-sparse

import {Direction} from '../../math/geometry/direction'
import {Point} from '../../math/geometry/point'
import {Rectangle} from '../../math/geometry/rectangle'
import {RBNode} from '../../math/RBTree/rbNode'

import {comparePointsYFirst} from '../../utils/compare'
import {PointSet} from '../../utils/PointSet'
import {SweepEvent} from '../spline/coneSpanner/SweepEvent'
import {AxisCoordinateEvent} from './AxisCoordinateEvent'
import {BasicObstacleSide, LowObstacleSide} from './BasicObstacleSide'
import {BasicReflectionEvent} from './basicReflectionEvent'
import {BasicVertexEvent} from './BasicVertexEvent'
import {Obstacle} from './obstacle'
import {OpenVertexEvent} from './OpenVertexEvent'
import {PointComparer} from './PointComparer'
import {ScanDirection} from './ScanDirection'
import {ScanSegment} from './ScanSegment'
import {ScanSegmentTree} from './ScanSegmentTree'
import {ScanSegmentVector} from './ScanSegmentVector'
import {ScanSegmentVectorItem} from './ScanSegmentVectorItem'
import {StaticGraphUtility} from './StaticGraphUtility'
import {VisibilityGraphGenerator} from './VisibilityGraphGenerator'

// implementation) and groups.
export class SparseVisibilityGraphGenerator extends VisibilityGraphGenerator {
  // The points of obstacle vertices encountered on horizontal scan.

  private horizontalVertexPoints = new PointSet()

  // The points of obstacle vertices encountered on vertical scan.

  private verticalVertexPoints: PointSet = new PointSet()

  // The Steiner points generated at the bounding box of obstacles.
  // These help ensure that we can "go around" the obstacle, as with the non-orthogonal edges in the paper.

  private boundingBoxSteinerPoints: PointSet = new PointSet()

  // Accumulates distinct vertex projections to the X axis during sweep.

  private xCoordAccumulator: Set<number> = new Set<number>()

  // Accumulates distinct vertex projections to the Y axis during sweep.

  private yCoordAccumulator: Set<number> = new Set<number>()

  // ScanSegment vector locations on the Y axis; final array after sweep.

  private horizontalScanSegmentVector: ScanSegmentVector

  // ScanSegment vector locations on the X axis; final array after sweep.

  private verticalScanSegmentVector: ScanSegmentVector

  // The index from a coordinate to a horizontal vector slot.

  private horizontalCoordMap: Map<number, number> = new Map<number, number>()

  // The index from a point to a vertical vector slot.

  private verticalCoordMap: Map<number, number> = new Map<number, number>()

  // The index from a coordinate to a vector slot on the axis we are intersecting to.

  private perpendicularCoordMap: Map<number, number>

  // The segment vector we are intersecting along.

  private parallelSegmentVector: ScanSegmentVector

  // The segment vector we are intersecting to.

  private perpendicularSegmentVector: ScanSegmentVector

  // The comparer for points along the horizontal or vertical axis.

  currentAxisPointComparer: (a: Point, b: Point) => number
  constructor() {
    super(/* wantReflections:*/ false)
  }

  Clear() {
    super.Clear()
    this.Cleanup()
  }

  private Cleanup() {
    this.horizontalVertexPoints.clear()
    this.verticalVertexPoints.clear()
    this.boundingBoxSteinerPoints.clear()
    this.xCoordAccumulator.clear()
    this.yCoordAccumulator.clear()
    this.horizontalCoordMap.clear()
    this.verticalCoordMap.clear()
  }

  // Generate the visibility graph along which edges will be routed.

  GenerateVisibilityGraph() {
    this.AccumulateVertexCoords()
    this.CreateSegmentVectorsAndPopulateCoordinateMaps()
    this.RunScanLineToCreateSegmentsAndBoundingBoxSteinerPoints()
    this.GenerateSparseIntersectionsFromVertexPoints()
    this.CreateScanSegmentTrees()
    this.Cleanup()
  }

  AccumulateVertexCoords() {
    // Unlike the paper we only generate lines for extreme vertices (i.e. on the horizontal pass we
    // don't generate a horizontal vertex projection to the Y axis for a vertex that is not on the top
    // or bottom of the obstacle).  So we can just use the bounding box.
    for (const obstacle of this.ObstacleTree.GetAllObstacles()) {
      this.xCoordAccumulator.add(obstacle.VisibilityBoundingBox.left)
      this.xCoordAccumulator.add(obstacle.VisibilityBoundingBox.right)
      this.yCoordAccumulator.add(obstacle.VisibilityBoundingBox.top)
      this.yCoordAccumulator.add(obstacle.VisibilityBoundingBox.bottom)
    }
  }

  private CreateSegmentVectorsAndPopulateCoordinateMaps() {
    this.horizontalScanSegmentVector = new ScanSegmentVector(this.yCoordAccumulator, true)
    this.verticalScanSegmentVector = new ScanSegmentVector(this.xCoordAccumulator, false)
    for (let slot = 0; slot < this.horizontalScanSegmentVector.Length; slot++) {
      this.horizontalCoordMap.set(this.horizontalScanSegmentVector.Item(slot).Coord, slot)
    }

    for (let slot = 0; slot < this.verticalScanSegmentVector.Length; slot++) {
      this.verticalCoordMap.set(this.verticalScanSegmentVector.Item(slot).Coord, slot)
    }
  }

  private RunScanLineToCreateSegmentsAndBoundingBoxSteinerPoints() {
    // Do a scanline pass to create scan segments that span the entire height/width of the graph
    // (mixing overlapped with free segments as needed) and generate the type-2 Steiner points.
    super.GenerateVisibilityGraph()
    this.horizontalScanSegmentVector.ScanSegmentsComplete()
    this.verticalScanSegmentVector.ScanSegmentsComplete()
    this.xCoordAccumulator.clear()
    this.yCoordAccumulator.clear()
  }

  InitializeEventQueue(scanDir: ScanDirection) {
    super.InitializeEventQueue(scanDir)
    this.SetVectorsAndCoordMaps(scanDir)
    this.AddAxisCoordinateEvents(scanDir)
  }

  private AddAxisCoordinateEvents(scanDir: ScanDirection) {
    // Normal event ordering will apply - and will thus order the ScanSegments created in the vectors.
    if (scanDir.IsHorizontal) {
      for (const coord of this.yCoordAccumulator) {
        this.eventQueue.Enqueue(
          new AxisCoordinateEvent(new Point(this.ObstacleTree.GraphBox.left - SparseVisibilityGraphGenerator.SentinelOffset, coord)),
        )
      }

      return
    }

    for (const coord of this.xCoordAccumulator) {
      this.eventQueue.Enqueue(
        new AxisCoordinateEvent(new Point(coord, this.ObstacleTree.GraphBox.bottom - SparseVisibilityGraphGenerator.SentinelOffset)),
      )
    }
  }

  ProcessCustomEvent(evt: SweepEvent) {
    if (!this.ProcessAxisCoordinate(evt)) {
      this.ProcessCustomEvent(evt)
    }
  }

  private ProcessAxisCoordinate(evt: SweepEvent): boolean {
    if (evt instanceof AxisCoordinateEvent) {
      this.CreateScanSegmentsOnAxisCoordinate((<AxisCoordinateEvent>evt).Site)
      return true
    }

    return false
  }

  InsertPerpendicularReflectionSegment(start: Point, end: Point): boolean {
    /*Assert.assert(
      false,
      'base.wantReflections is false in Sparse mode so this should never be called',
    )*/
    // ReSharper disable HeuristicUnreachableCode
    return false
    // ReSharper restore HeuristicUnreachableCode
  }

  InsertParallelReflectionSegment(
    start: Point,
    end: Point,
    eventObstacle: Obstacle,
    lowNborSide: BasicObstacleSide,
    highNborSide: BasicObstacleSide,
    action: BasicReflectionEvent,
  ): boolean {
    /*Assert.assert(
      false,
      'base.wantReflections is false in Sparse mode so this should never be called',
    )*/
    // ReSharper disable HeuristicUnreachableCode
    return false
    // ReSharper restore HeuristicUnreachableCode
  }

  protected ProcessVertexEvent(
    lowSideNode: RBNode<BasicObstacleSide>,
    highSideNode: RBNode<BasicObstacleSide>,
    vertexEvent: BasicVertexEvent,
  ) {
    const vertexPoints = this.ScanDirection.IsHorizontal ? this.horizontalVertexPoints : this.verticalVertexPoints
    vertexPoints.add(vertexEvent.Site)
    // For easier reading...
    const lowNborSide = this.LowNeighborSides.LowNeighbor.item
    const highNborSide = this.HighNeighborSides.HighNeighbor.item
    const highDir = this.ScanDirection.Dir
    const lowDir = this.ScanDirection.OppositeDirection
    // Generate the neighbor side intersections, regardless of overlaps; these are the type-2 Steiner points.
    const lowSteiner = this.ScanLineIntersectSide(vertexEvent.Site, lowNborSide)
    const highSteiner = this.ScanLineIntersectSide(vertexEvent.Site, highNborSide)
    // Add the intersections at the neighbor bounding boxes if the intersection is not at a sentinel.
    // Go in the opposite direction from the neighbor intersection to find the border between the Steiner
    // point and vertexEvent.Site (unless vertexEvent.Site is inside the bounding box).
    if (this.ObstacleTree.GraphBox.contains(lowSteiner)) {
      const bboxIntersectBeforeLowSteiner = StaticGraphUtility.RectangleBorderIntersect(
        lowNborSide.Obstacle.VisibilityBoundingBox,
        lowSteiner,
        highDir,
      )
      if (PointComparer.IsPureLower(bboxIntersectBeforeLowSteiner, vertexEvent.Site)) {
        this.boundingBoxSteinerPoints.add(bboxIntersectBeforeLowSteiner)
      }
    }

    if (this.ObstacleTree.GraphBox.contains(highSteiner)) {
      const bboxIntersectBeforeHighSteiner = StaticGraphUtility.RectangleBorderIntersect(
        highNborSide.Obstacle.VisibilityBoundingBox,
        highSteiner,
        lowDir,
      )
      if (PointComparer.IsPureLower(vertexEvent.Site, bboxIntersectBeforeHighSteiner)) {
        this.boundingBoxSteinerPoints.add(bboxIntersectBeforeHighSteiner)
      }
    }

    // Add the corners of the bounding box of the vertex obstacle, if they are visible to the event site.
    // This ensures that we "go around" the obstacle, as with the non-orthogonal edges in the paper.
    const t = {lowCorner: <Point>undefined, highCorner: <Point>undefined}
    SparseVisibilityGraphGenerator.GetBoundingCorners(
      lowSideNode.item.Obstacle.VisibilityBoundingBox,
      vertexEvent instanceof OpenVertexEvent,
      this.ScanDirection.IsHorizontal,
      t,
    )
    if (PointComparer.IsPureLower(lowSteiner, t.lowCorner) || lowNborSide.Obstacle.IsInSameClump(vertexEvent.Obstacle)) {
      vertexPoints.add(t.lowCorner)
    }

    if (PointComparer.IsPureLower(t.highCorner, highSteiner) || highNborSide.Obstacle.IsInSameClump(vertexEvent.Obstacle)) {
      vertexPoints.add(t.highCorner)
    }
  }

  private static GetBoundingCorners(
    boundingBox: Rectangle,
    isLowSide: boolean,
    isHorizontal: boolean,
    t: {lowCorner: Point; /* out */ highCorner: Point},
  ) {
    if (isLowSide) {
      t.lowCorner = boundingBox.leftBottom
      t.highCorner = isHorizontal ? boundingBox.rightBottom : boundingBox.leftTop
      return
    }

    t.lowCorner = isHorizontal ? boundingBox.leftTop : boundingBox.rightBottom
    t.highCorner = boundingBox.rightTop
  }

  private CreateScanSegmentsOnAxisCoordinate(site: Point) {
    this.CurrentGroupBoundaryCrossingMap.Clear()
    // Iterate the ScanLine and create ScanSegments.  There will always be at least the two sentinel sides.
    const sideNode = this.scanLine.Lowest()
    let nextNode = this.scanLine.NextHighR(sideNode)
    let overlapDepth = 0
    let start = site
    let isInsideOverlappedObstacle = false
    for (; null != nextNode; nextNode = this.scanLine.NextHighR(nextNode)) {
      if (this.SkipSide(start, nextNode.item)) {
        continue
      }

      if (nextNode.item.Obstacle.IsGroup) {
        // Do not create internal group crossings in non-overlapped obstacles.
        if (overlapDepth === 0 || isInsideOverlappedObstacle) {
          this.HandleGroupCrossing(site, nextNode.item)
        }

        continue
      }

      const isLowSide = nextNode.item instanceof LowObstacleSide
      if (isLowSide) {
        if (overlapDepth > 0) {
          overlapDepth++
          continue
        }

        // We are not overlapped, so create a ScanSegment from the previous side intersection to the
        // intersection with the side in nextNode.Item.
        start = this.CreateScanSegment(start, nextNode.item, ScanSegment.NormalWeight)
        this.CurrentGroupBoundaryCrossingMap.Clear()
        overlapDepth = 1
        isInsideOverlappedObstacle = nextNode.item.Obstacle.isOverlapped
        continue
      }

      // This is a HighObstacleSide.  If we've got overlap nesting, decrement the depth.
      /*Assert.assert(overlapDepth > 0, 'Overlap depth must be positive')*/
      overlapDepth++
      if (overlapDepth > 0) {
        continue
      }

      // If we are not within an overlapped obstacle, don't bother creating the overlapped ScanSegment
      // as there will never be visibility connecting to it.
      start =
        nextNode.item.Obstacle.isOverlapped || nextNode.item.Obstacle.OverlapsGroupCorner
          ? this.CreateScanSegment(start, nextNode.item, ScanSegment.OverlappedWeight)
          : this.ScanLineIntersectSide(start, nextNode.item)
      this.CurrentGroupBoundaryCrossingMap.Clear()
      isInsideOverlappedObstacle = false
    }

    // The final piece.
    const end = this.ScanDirection.IsHorizontal
      ? new Point(this.ObstacleTree.GraphBox.right + SparseVisibilityGraphGenerator.SentinelOffset, start.y)
      : new Point(start.x, this.ObstacleTree.GraphBox.top + SparseVisibilityGraphGenerator.SentinelOffset)

    this.parallelSegmentVector.CreateScanSegment(
      start,
      end,
      ScanSegment.NormalWeight,
      this.CurrentGroupBoundaryCrossingMap.GetOrderedListBetween(start, end),
    )
    this.parallelSegmentVector.ScanSegmentsCompleteForCurrentSlot()
  }

  private HandleGroupCrossing(site: Point, groupSide: BasicObstacleSide) {
    if (!this.ScanLineCrossesObstacle(site, groupSide.Obstacle)) {
      return
    }

    // Here we are always going left-to-right.  As in base.SkipToNeighbor, we don't stop traversal for groups,
    // neither do we create overlapped edges (unless we're inside a non-group obstacle).  Instead we turn
    // the boundary crossing on or off based on group membership at ShortestPath-time.  Even though this is
    // the sparse VG, we always create these edges at group boundaries so we don't skip over them.
    const dirToInsideOfGroup: Direction =
      groupSide instanceof LowObstacleSide ? this.ScanDirection.Dir : this.ScanDirection.OppositeDirection
    const intersect = this.ScanLineIntersectSide(site, groupSide)
    const crossing = this.CurrentGroupBoundaryCrossingMap.AddIntersection(intersect, groupSide.Obstacle, dirToInsideOfGroup)
    // The vertex crossing the edge is perpendicular to the group boundary.  A rectilinear group will also have
    // an edge parallel to that group boundary that includes the point of that crossing vertex; therefore we must
    // split that non-crossing edge at that vertex.
    this.AddPerpendicularCoordForGroupCrossing(intersect)
    // Similarly, the crossing edge's opposite vertex may be on a perpendicular segment.
    const interiorPoint = crossing.GetInteriorVertexPoint(intersect)
    this.AddPerpendicularCoordForGroupCrossing(interiorPoint)
  }

  private AddPerpendicularCoordForGroupCrossing(intersect: Point) {
    const nonCrossingPerpSlot = this.FindPerpendicularSlot(intersect, 0)
    if (-1 !== nonCrossingPerpSlot) {
      this.perpendicularSegmentVector.Item(nonCrossingPerpSlot).AddPendingPerpendicularCoord(this.parallelSegmentVector.CurrentSlot.Coord)
    }
  }

  private SkipSide(start: Point, side: BasicObstacleSide): boolean {
    if (side.Obstacle.IsSentinel) {
      return true
    }

    // Skip sides of obstacles that we do not actually pass through.
    const bbox = side.Obstacle.VisibilityBoundingBox
    if (this.ScanDirection.IsHorizontal) {
      return start.y === bbox.bottom || start.y === bbox.top
    }

    return start.x === bbox.left || start.x === bbox.right
  }

  private CreateScanSegment(start: Point, side: BasicObstacleSide, weight: number): Point {
    const end = this.ScanLineIntersectSide(start, side)
    if (start !== end) {
      this.parallelSegmentVector.CreateScanSegment(
        start,
        end,
        weight,
        this.CurrentGroupBoundaryCrossingMap.GetOrderedListBetween(start, end),
      )
    }

    return end
  }

  private GenerateSparseIntersectionsFromVertexPoints() {
    this.VisibilityGraph = SparseVisibilityGraphGenerator.NewVisibilityGraph()
    // Generate the sparse intersections between ScanSegments based upon the ordered vertexPoints.
    this.GenerateSparseIntersectionsAlongHorizontalAxis()
    this.GenerateSparseIntersectionsAlongVerticalAxis()
    this.ConnectAdjoiningScanSegments()
    // Now each segment has the coordinates all of its intersections, so create the visibility graph.
    this.horizontalScanSegmentVector.CreateSparseVerticesAndEdges(this.VisibilityGraph)
    this.verticalScanSegmentVector.CreateSparseVerticesAndEdges(this.VisibilityGraph)
  }

  private GenerateSparseIntersectionsAlongHorizontalAxis() {
    this.currentAxisPointComparer = comparePointsYFirst

    const vertexPoints = Array.from(this.horizontalVertexPoints.values()).sort(this.currentAxisPointComparer)

    const bboxSteinerPoints = Array.from(this.boundingBoxSteinerPoints.values()).sort(this.currentAxisPointComparer)
    this.ScanDirection = ScanDirection.HorizontalInstance
    this.SetVectorsAndCoordMaps(this.ScanDirection)
    this.GenerateSparseIntersections(vertexPoints, bboxSteinerPoints)
  }

  private GenerateSparseIntersectionsAlongVerticalAxis() {
    this.currentAxisPointComparer = (a, b) => a.compareTo(b)
    const vertexPoints = Array.from(this.verticalVertexPoints.values()).sort(this.currentAxisPointComparer)

    const bboxSteinerPoints = Array.from(this.boundingBoxSteinerPoints.values()).sort(this.currentAxisPointComparer)
    this.ScanDirection = ScanDirection.VerticalInstance
    this.SetVectorsAndCoordMaps(this.ScanDirection)
    this.GenerateSparseIntersections(vertexPoints, bboxSteinerPoints)
  }

  private SetVectorsAndCoordMaps(scanDir: ScanDirection) {
    if (scanDir.IsHorizontal) {
      this.parallelSegmentVector = this.horizontalScanSegmentVector
      this.perpendicularSegmentVector = this.verticalScanSegmentVector
      this.perpendicularCoordMap = this.verticalCoordMap
    } else {
      this.parallelSegmentVector = this.verticalScanSegmentVector
      this.perpendicularSegmentVector = this.horizontalScanSegmentVector
      this.perpendicularCoordMap = this.horizontalCoordMap
    }
  }

  private ConnectAdjoiningScanSegments() {
    // Ensure there is a vertex at the end/start point of two ScanSegments; these will always differ in overlappedness.
    this.horizontalScanSegmentVector.ConnectAdjoiningSegmentEndpoints()
    this.verticalScanSegmentVector.ConnectAdjoiningSegmentEndpoints()
  }

  private GenerateSparseIntersections(vertexPoints: Array<Point>, bboxSteinerPoints: Array<Point>) {
    this.perpendicularSegmentVector.ResetForIntersections()
    this.parallelSegmentVector.ResetForIntersections()
    // Position the enumerations to the first point.
    let i = 1
    const steinerPointsCounter = {j: 0}
    for (const item of this.parallelSegmentVector.Items()) {
      for (;;) {
        if (!item.CurrentSegment.ContainsPoint(vertexPoints[i])) {
          // Done accumulating intersections for the current segment; move to the next segment.
          if (
            !this.AddSteinerPointsToInterveningSegments(vertexPoints[i], bboxSteinerPoints, steinerPointsCounter, item) ||
            !item.TraverseToSegmentContainingPoint(vertexPoints[i])
          ) {
            // Done with this vectorItem, move to the next item.
            break
          }
        }

        this.AddPointsToCurrentSegmentIntersections(bboxSteinerPoints, steinerPointsCounter, item)
        this.GenerateIntersectionsFromVertexPointForCurrentSegment(vertexPoints[i], item)
        if (item.PointIsCurrentEndAndNextStart(vertexPoints[i])) {
          // MoveNext will always return true because the test to enter this block returned true.
          item.MoveNext()
          /*Assert.assert(
            item.HasCurrent,
            'MoveNext ended before EndAndNextStart',
          )*/
          continue
        }

        if (++i >= vertexPoints.length) {
          // No more vertexPoints; we're done.

          return
        }
      }
    }

    // We should have exited in the "no more vertexPoints" case above.
    /*Assert.assert(false, 'Mismatch in points and segments')*/
  }

  private AddSteinerPointsToInterveningSegments(
    currentVertexPoint: Point,
    bboxSteinerPoints: Array<Point>,
    t: {j: number},
    item: ScanSegmentVectorItem,
  ): boolean {
    // With overlaps, we may have bboxSteinerPoints on segments that do not contain vertices.
    while (t.j < bboxSteinerPoints.length && this.currentAxisPointComparer(bboxSteinerPoints[t.j], currentVertexPoint) === -1) {
      if (!item.TraverseToSegmentContainingPoint(bboxSteinerPoints[t.j])) {
        // Done with this vectorItem, move to the next item.
        return false
      }

      this.AddPointsToCurrentSegmentIntersections(bboxSteinerPoints, t, item)
    }

    return true
  }

  private AddPointsToCurrentSegmentIntersections(pointsToAdd: Array<Point>, t: {j: number}, parallelItem: ScanSegmentVectorItem) {
    // The first Steiner point should be in the segment, unless we have a non-orthogonal or overlapped or both situation
    // that results in no Steiner points having been generated, or Steiner points being generated on a segment that has
    // the opposite overlap state from the segment containing the corresponding vertex.
    for (; t.j < pointsToAdd.length && parallelItem.CurrentSegment.ContainsPoint(pointsToAdd[t.j]); t.j++) {
      const steinerSlot: number = this.FindPerpendicularSlot(pointsToAdd[t.j], 0)
      this.AddSlotToSegmentIntersections(parallelItem, steinerSlot)
    }
  }

  private GenerateIntersectionsFromVertexPointForCurrentSegment(site: Point, parallelItem: ScanSegmentVectorItem) {
    const perpStartSlot: number = this.FindPerpendicularSlot(parallelItem.CurrentSegment.Start, 1)
    const perpEndSlot: number = this.FindPerpendicularSlot(parallelItem.CurrentSegment.End, -1)
    const siteSlot: number = this.FindPerpendicularSlot(site, 0)
    // See comments in FindIntersectingSlot; we don't add non-extreme vertices in the perpendicular direction
    // so in some heavily-overlapped scenarios, we may not have any intersections within this scan segment.
    if (perpStartSlot >= perpEndSlot) {
      return
    }

    this.AddSlotToSegmentIntersections(parallelItem, perpStartSlot)
    this.AddSlotToSegmentIntersections(parallelItem, perpEndSlot)
    if (siteSlot > perpStartSlot && siteSlot < perpEndSlot) {
      this.AddSlotToSegmentIntersections(parallelItem, siteSlot)
      this.AddBinaryDivisionSlotsToSegmentIntersections(parallelItem, perpStartSlot, siteSlot, perpEndSlot)
    }
  }

  // These are called when the site may not be in the vector.
  private FindPerpendicularSlot(site: Point, directionIfMiss: number): number {
    return SparseVisibilityGraphGenerator.FindIntersectingSlot(
      this.perpendicularSegmentVector,
      this.perpendicularCoordMap,
      site,
      directionIfMiss,
    )
  }

  private static FindIntersectingSlot(
    segmentVector: ScanSegmentVector,
    coordMap: Map<number, number>,
    site: Point,
    directionIfMiss: number,
  ): number {
    const coord = segmentVector.GetParallelCoord(site)
    const slot = coordMap.get(coord)
    if (slot !== undefined) {
      return slot
    }

    // There are a few cases where the perpCoord is not in the map:
    // 1.  The first ScanSegment in a slot will have a Start at the sentinel, which is before the first
    //     perpendicular segment; similarly, the last ScanSegment in a slot will have an out-of-range End.
    // 2.  Sequences of overlapped/nonoverlapped scan segments that pass through obstacles.  Their start
    //     and end points are not in vertexPoints because they were not vertex-derived, so we find the
    //     closest bracketing coordinates that are in the vectors.
    // 3.  Non-extreme vertices in the perpendicular direction (e.g. for a triangle, we add the X's of
    //     the left and right to the coords, but not of the top).
    // 4.  Non-rectilinear group side intersections.
    return directionIfMiss === 0 ? -1 : segmentVector.FindNearest(coord, directionIfMiss)
  }

  private AddSlotToSegmentIntersections(parallelItem: ScanSegmentVectorItem, perpSlot: number) {
    const perpItem: ScanSegmentVectorItem = this.perpendicularSegmentVector.Item(perpSlot)
    parallelItem.CurrentSegment.AddSparseVertexCoord(perpItem.Coord)
    perpItem.AddPerpendicularCoord(parallelItem.Coord)
  }

  private AddBinaryDivisionSlotsToSegmentIntersections(
    parallelItem: ScanSegmentVectorItem,
    startSlot: number,
    siteSlot: number,
    endSlot: number,
  ) {
    // The input parameters' slots have already been added to the segment's coords.
    // If there was no object to the low or high side, then the start or end slot was already
    // the graphbox max (0 or perpSegmentVector.Length, respectively).  So start dividing.
    let low = 0
    let high: number = this.perpendicularSegmentVector.Length - 1
    // Terminate when we are one away because we don't have an edge from a point to itself.
    while (high - low > 1) {
      const mid: number = low + Math.floor((high - low) / 2)
      // We only use the half of the graph that the site is in, so arbitrarily decide that it is
      // in the lower half if it is at the midpoint.
      if (siteSlot <= mid) {
        high = mid
        if (siteSlot < high && high <= endSlot) {
          this.AddSlotToSegmentIntersections(parallelItem, high)
        }

        continue
      }

      low = mid
      if (siteSlot > low && low >= startSlot) {
        this.AddSlotToSegmentIntersections(parallelItem, low)
      }
    }
  }

  // Create the ScanSegmentTrees that functions as indexes for port-visibility splicing.
  private CreateScanSegmentTrees() {
    SparseVisibilityGraphGenerator.CreateScanSegmentTree(this.horizontalScanSegmentVector, this.HorizontalScanSegments)
    SparseVisibilityGraphGenerator.CreateScanSegmentTree(this.verticalScanSegmentVector, this.VerticalScanSegments)
  }

  private static CreateScanSegmentTree(segmentVector: ScanSegmentVector, segmentTree: ScanSegmentTree) {
    for (const item of segmentVector.Items()) {
      for (let segment = item.FirstSegment; segment != null; segment = segment.NextSegment) {
        if (segment.HasVisibility()) {
          segmentTree.InsertUnique(segment)
        }
      }
    }
  }
}
