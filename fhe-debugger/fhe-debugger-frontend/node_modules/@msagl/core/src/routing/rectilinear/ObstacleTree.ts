import {Point, Rectangle} from '../..'
import {Polyline, Curve, PointLocation, Direction, LineSegment, GeomConstants, CompassVector} from '../../math/geometry'
import {ConvexHull} from '../../math/geometry/convexHull'
import {IntersectionInfo} from '../../math/geometry/intersectionInfo'
import {HitTestBehavior} from '../../math/geometry/RTree/hitTestBehavior'
import {RectangleNode, mkRectangleNode, CreateRectNodeOnArrayOfRectNodes} from '../../math/geometry/RTree/rectangleNode'
import {CrossRectangleNodesSameType, CrossRectangleNodes} from '../../math/geometry/RTree/rectangleNodeUtils'
import {GetConnectedComponents} from '../../math/graphAlgorithms/ConnectedComponentCalculator'
import {mkGraphOnEdges} from '../../structs/basicGraphOnEdges'
import {closeDistEps} from '../../utils/compare'
import {IntPair} from '../../utils/IntPair'
import {IntPairSet} from '../../utils/IntPairSet'
import {flattenArray} from '../../utils/setOperations'
import {Shape} from '../shape'
import {GroupBoundaryCrossingMap} from './GroupBoundaryCrossingMap'
import {Obstacle} from './obstacle'
import {OverlapConvexHull} from './OverlapConvexHull'
import {PointAndCrossingsList} from './PointAndCrossingsList'
import {PointComparer} from './PointComparer'
import {ScanDirection} from './ScanDirection'
import {SpliceUtility} from './SpliceUtility'
import {StaticGraphUtility} from './StaticGraphUtility'

export class ObstacleTree {
  // Ignore one (always) or both (depending on location) of these obstacles on Obstacle hit testing.
  insideHitTestIgnoreObstacle1: Obstacle

  insideHitTestIgnoreObstacle2: Obstacle

  insideHitTestScanDirection: ScanDirection
  //   The root of the hierarchy.

  Root: RectangleNode<Obstacle, Point>

  get GraphBox(): Rectangle {
    return <Rectangle>this.Root.irect
  }

  // Map of sets of ancestors for each shape, for evaluating necessary group-boundary crossings.

  AncestorSets: Map<Shape, Set<Shape>>

  // Indicates whether we adjusted spatial ancestors due to blocked paths.

  SpatialAncestorsAdjusted: boolean

  // // The map of shapes to obstacles.

  private shapeIdToObstacleMap: Map<Shape, Obstacle>

  // // The map of all group boundary crossings for the current RestrictSegmentWithObstacles call.

  CurrentGroupBoundaryCrossingMap: GroupBoundaryCrossingMap = new GroupBoundaryCrossingMap()

  // The list of all obstacles (not just those in the Root, which may have accretions of obstacles in convex hulls).

  private allObstacles: Array<Obstacle>

  // For accreting obstacles for clumps or convex hulls.

  private overlapPairs = new IntPairSet()

  // Indicates whether one or more obstacles overlap.

  private hasOverlaps = false

  // Member to avoid unnecessary class creation just to do a lookup.

  private lookupIntPair: IntPair = new IntPair(-1, -1)

  //Create the tree hierarchy from the enumeration.

  Init(obstacles: Iterable<Obstacle>, ancestorSets: Map<Shape, Set<Shape>>, idToObstacleMap: Map<Shape, Obstacle>) {
    this.CreateObstacleListAndOrdinals(obstacles)
    this.AncestorSets = ancestorSets
    this.CreateRoot()
    this.shapeIdToObstacleMap = idToObstacleMap
  }

  private CreateObstacleListAndOrdinals(obstacles: Iterable<Obstacle>) {
    this.allObstacles = Array.from(obstacles)
    let scanlineOrdinal: number = Obstacle.FirstNonSentinelOrdinal
    for (const obstacle of this.allObstacles) {
      obstacle.Ordinal = scanlineOrdinal++
    }
  }

  private OrdinalToObstacle(index: number): Obstacle {
    /*Assert.assert(index >= Obstacle.FirstNonSentinelOrdinal, 'index too small')*/
    /*Assert.assert(
      index < this.allObstacles.length + Obstacle.FirstNonSentinelOrdinal,
      'index too large',
    )*/
    return this.allObstacles[index - Obstacle.FirstNonSentinelOrdinal]
  }

  // Create the root with overlapping non-rectangular obstacles converted to their convex hulls, for more reliable calculations.

  private CreateRoot() {
    this.Root = ObstacleTree.CalculateHierarchy(this.GetAllObstacles())
    if (!this.OverlapsExist()) {
      return
    }

    this.AccreteClumps()
    this.AccreteConvexHulls()
    this.GrowGroupsToAccommodateOverlaps()
    this.Root = ObstacleTree.CalculateHierarchy(this.GetAllObstacles().filter((obs) => obs.IsPrimaryObstacle))
  }

  private OverlapsExist(): boolean {
    if (this.Root == null) {
      return false
    }

    CrossRectangleNodesSameType<Obstacle, Point>(this.Root, this.Root, (a, b) => this.CheckForInitialOverlaps(a, b))
    return this.hasOverlaps
  }

  private OverlapPairAlreadyFound(a: Obstacle, b: Obstacle): boolean {
    // If we already found it then we'll have enqueued it in the reverse order.
    this.lookupIntPair.x = b.Ordinal
    this.lookupIntPair.y = a.Ordinal
    return this.overlapPairs.has(this.lookupIntPair)
  }

  private CheckForInitialOverlaps(a: Obstacle, b: Obstacle) {
    if (this.hasOverlaps) {
      return
    }

    const t = {bIsInsideA: false, aIsInsideB: false}
    if (ObstacleTree.ObstaclesIntersect(a, b, t)) {
      this.hasOverlaps = true
      return
    }

    if (!t.aIsInsideB && !t.bIsInsideA) {
      return
    }

    // One obstacle is inside the other.  If they're both groups, or a non-group is inside a group, nothing
    // further is needed; we process groups differently because we can go through their sides.
    if (a.IsGroup && b.IsGroup) {
      return
    }

    if ((a.IsGroup && t.bIsInsideA) || (b.IsGroup && t.aIsInsideB)) {
      return
    }

    this.hasOverlaps = true
  }

  private AccreteClumps() {
    // Clumps are only created once.  After that, as the result of convex hull creation, we may
    // overlap an obstacle of a clump, in which case we enclose the clump in the convex hull as well.
    // We only allow clumps of rectangular obstacles, to avoid angled sides in the scanline.
    this.AccumulateObstaclesForClumps()

    this.CreateClumps()
  }

  private AccreteConvexHulls() {
    // Convex-hull creation is transitive, because the created hull may overlap additional obstacles.
    for (;;) {
      this.AccumulateObstaclesForConvexHulls()
      if (!this.CreateConvexHulls()) {
        return
      }
    }
  }

  static CalculateHierarchy(obstacles: Iterable<Obstacle>): RectangleNode<Obstacle, Point> {
    const rectNodes = Array.from(obstacles).map((obs) => mkRectangleNode(obs, obs.VisibilityBoundingBox))
    return CreateRectNodeOnArrayOfRectNodes(rectNodes)
  }

  private AccumulateObstaclesForClumps() {
    this.overlapPairs.clear()
    const rectangularObstacles = ObstacleTree.CalculateHierarchy(this.GetAllObstacles().filter((obs) => !obs.IsGroup && obs.IsRectangle))
    if (rectangularObstacles == null) {
      return
    }

    CrossRectangleNodes(rectangularObstacles, rectangularObstacles, (a, b) => this.EvaluateOverlappedPairForClump(a, b))
  }

  private EvaluateOverlappedPairForClump(a: Obstacle, b: Obstacle) {
    /*Assert.assert(!a.IsGroup && !b.IsGroup, 'Groups should not come here')*/
    /*Assert.assert(
      a.IsRectangle && b.IsRectangle,
      'Only rectangles should come here',
    )*/
    if (a === b || this.OverlapPairAlreadyFound(a, b)) {
      return
    }

    const t = {bIsInsideA: false, aIsInsideB: false}

    if (!ObstacleTree.ObstaclesIntersect(a, b, t) && !t.aIsInsideB && !t.bIsInsideA) {
      return
    }

    this.overlapPairs.add(new IntPair(a.Ordinal, b.Ordinal))
  }

  private AccumulateObstaclesForConvexHulls() {
    this.overlapPairs.clear()
    const allPrimaryNonGroupObstacles = ObstacleTree.CalculateHierarchy(
      this.GetAllObstacles().filter((obs) => obs.IsPrimaryObstacle && !obs.IsGroup),
    )
    if (allPrimaryNonGroupObstacles == null) {
      return
    }

    CrossRectangleNodes(allPrimaryNonGroupObstacles, allPrimaryNonGroupObstacles, (a, b) => this.EvaluateOverlappedPairForConvexHull(a, b))
  }

  private EvaluateOverlappedPairForConvexHull(a: Obstacle, b: Obstacle) {
    /*Assert.assert(!a.IsGroup && !b.IsGroup, 'Groups should not come here')*/
    if (a === b || this.OverlapPairAlreadyFound(a, b)) {
      return
    }

    const t = {bIsInsideA: false, aIsInsideB: false}
    if (!ObstacleTree.ObstaclesIntersect(a, b, t) && !t.aIsInsideB && !t.bIsInsideA) {
      return
    }

    // If either is in a convex hull, those must be coalesced.
    if (!a.IsInConvexHull && !b.IsInConvexHull) {
      // If the obstacles are rectangles, we don't need to do anything (for this pair).
      if (a.IsRectangle && b.IsRectangle) {
        return
      }
    }

    this.overlapPairs.add(new IntPair(a.Ordinal, b.Ordinal))
    this.AddClumpToConvexHull(a)
    this.AddClumpToConvexHull(b)
    this.AddConvexHullToConvexHull(a)
    this.AddConvexHullToConvexHull(b)
  }

  GrowGroupsToAccommodateOverlaps() {
    // Group growth is transitive, because the created hull may overlap additional obstacles.
    for (;;) {
      this.AccumulateObstaclesForGroupOverlaps()
      if (!this.GrowGroupsToResolveOverlaps()) {
        return
      }
    }
  }

  private AccumulateObstaclesForGroupOverlaps() {
    const groupObstacles = ObstacleTree.CalculateHierarchy(this.GetAllObstacles().filter((obs) => obs.IsGroup))
    const allPrimaryObstacles = ObstacleTree.CalculateHierarchy(this.GetAllObstacles().filter((obs) => obs.IsPrimaryObstacle))
    if (groupObstacles == null || allPrimaryObstacles == null) {
      return
    }

    CrossRectangleNodes(groupObstacles, allPrimaryObstacles, (a, b) => this.EvaluateOverlappedPairForGroup(a, b))
  }

  private EvaluateOverlappedPairForGroup(a: Obstacle, b: Obstacle) {
    /*Assert.assert(a.IsGroup, 'Inconsistency in overlapping group enumeration')*/
    if (a === b || this.OverlapPairAlreadyFound(a, b)) {
      return
    }

    const t = {bIsInsideA: false, aIsInsideB: false}
    const curvesIntersect = ObstacleTree.ObstaclesIntersect(a, b, t)
    if (!curvesIntersect && !t.aIsInsideB && !t.bIsInsideA) {
      return
    }

    if (a.IsRectangle && b.IsRectangle) {
      // If these are already rectangles, we don't need to do anything here.  Non-group VisibilityPolylines
      // will not change by the group operations; we'll just grow the group if needed (if it is already
      // nonrectangular, either because it came in that way or because it has intersected a non-rectangle).
      // However, SparseVg needs to know about the overlap so it will create interior scansegments if the
      // obstacle is not otherwise overlapped.
      if (!b.IsGroup) {
        if (t.aIsInsideB || ObstacleTree.FirstRectangleContainsACornerOfTheOther(b.VisibilityBoundingBox, a.VisibilityBoundingBox)) {
          b.OverlapsGroupCorner = true
        }
      }

      return
    }

    if (!curvesIntersect) {
      // If the borders don't intersect, we don't need to do anything if both are groups or the
      // obstacle or convex hull is inside the group.  Otherwise we have to grow group a to encompass b.
      if (b.IsGroup || t.bIsInsideA) {
        return
      }
    }

    this.overlapPairs.add(new IntPair(a.Ordinal, b.Ordinal))
  }

  private static FirstRectangleContainsACornerOfTheOther(a: Rectangle, b: Rectangle): boolean {
    return a.contains(b.leftBottom) || a.contains(b.leftTop) || a.contains(b.rightTop) || a.contains(b.rightBottom)
  }

  private static FirstPolylineStartIsInsideSecondPolyline(first: Polyline, second: Polyline): boolean {
    return Curve.PointRelativeToCurveLocation(first.start, second) !== PointLocation.Outside
  }

  private AddClumpToConvexHull(obstacle: Obstacle) {
    if (obstacle.isOverlapped) {
      for (const sibling of obstacle.clump.filter((sib) => sib.Ordinal !== obstacle.Ordinal)) {
        this.overlapPairs.add(new IntPair(obstacle.Ordinal, sibling.Ordinal))
      }

      // Clear this now so any overlaps with other obstacles in the clump won't doubly insert.
      obstacle.clump = []
    }
  }

  private AddConvexHullToConvexHull(obstacle: Obstacle) {
    if (obstacle.IsInConvexHull) {
      for (const sibling of obstacle.ConvexHull.Obstacles.filter((sib) => sib.Ordinal !== obstacle.Ordinal)) {
        this.overlapPairs.add(new IntPair(obstacle.Ordinal, sibling.Ordinal))
      }

      // Clear this now so any overlaps with other obstacles in the ConvexHull won't doubly insert.
      obstacle.ConvexHull.Obstacles = []
    }
  }

  private CreateClumps() {
    const graph = mkGraphOnEdges(Array.from(this.overlapPairs.values()))
    const connectedComponents = GetConnectedComponents(graph)
    for (const component of connectedComponents) {
      // GetComponents returns at least one self-entry for each index - including the < FirstNonSentinelOrdinal ones.
      if (component.length === 1) {
        continue
      }

      const clump = component.map((i: number) => this.OrdinalToObstacle(i))
      for (const obstacle of clump) {
        obstacle.clump = clump
      }
    }
  }

  private CreateConvexHulls(): boolean {
    let found = false
    const graph = mkGraphOnEdges(Array.from(this.overlapPairs.values()))
    const connectedComponents = GetConnectedComponents(graph)
    for (const component of connectedComponents) {
      // GetComponents returns at least one self-entry for each index - including the < FirstNonSentinelOrdinal ones.
      if (component.length === 1) {
        continue
      }

      found = true
      const obstacles = component.map(this.OrdinalToObstacle)
      const points: Point[] = flattenArray(obstacles, (p) => p.VisibilityPolyline)

      const och = new OverlapConvexHull(ConvexHull.createConvexHullAsClosedPolyline(points), obstacles)
      for (const obstacle of obstacles) {
        obstacle.SetConvexHull(och)
      }
    }

    return found
  }

  private GrowGroupsToResolveOverlaps(): boolean {
    // This is one-at-a-time so not terribly efficient but there should be a very small number of such overlaps, if any.
    let found = false
    for (const pair of this.overlapPairs.values()) {
      found = true
      const a = this.OrdinalToObstacle(pair.x)
      const b = this.OrdinalToObstacle(pair.y)
      if (!ObstacleTree.ResolveGroupAndGroupOverlap(a, b)) {
        ObstacleTree.ResolveGroupAndObstacleOverlap(a, b)
      }
    }

    this.overlapPairs.clear()
    return found
  }

  private static ResolveGroupAndGroupOverlap(a: Obstacle, b: Obstacle): boolean {
    // For simplicity, pick the larger group and make grow its convex hull to encompass the smaller.
    if (!b.IsGroup) {
      return false
    }

    if (a.VisibilityPolyline.boundingBox.area > b.VisibilityPolyline.boundingBox.area) {
      ObstacleTree.ResolveGroupAndObstacleOverlap(a, b)
    } else {
      ObstacleTree.ResolveGroupAndObstacleOverlap(b, a)
    }

    return true
  }

  private static ResolveGroupAndObstacleOverlap(group: Obstacle, obstacle: Obstacle) {
    // Create a convex hull for the group which goes outside the obstacle (which may also be a group).
    // It must go outside the obstacle so we don't have coinciding angled sides in the scanline.
    let loosePolyline = obstacle.looseVisibilityPolyline
    ObstacleTree.GrowGroupAroundLoosePolyline(group, loosePolyline)
    // Due to rounding we may still report this to be close or intersecting; grow it again if so.
    const t = {bIsInsideA: false, aIsInsideB: false}
    while (ObstacleTree.ObstaclesIntersect(obstacle, group, t) || !t.aIsInsideB) {
      loosePolyline = Obstacle.CreateLoosePolyline(loosePolyline)
      ObstacleTree.GrowGroupAroundLoosePolyline(group, loosePolyline)
    }
  }

  private static GrowGroupAroundLoosePolyline(group: Obstacle, loosePolyline: Polyline) {
    const points = Array.from(group.VisibilityPolyline).concat(Array.from(loosePolyline))
    group.SetConvexHull(new OverlapConvexHull(ConvexHull.createConvexHullAsClosedPolyline(points), [group]))
  }

  static ObstaclesIntersect(a: Obstacle, b: Obstacle, t: {aIsInsideB: boolean; bIsInsideA: boolean}): boolean {
    if (Curve.CurvesIntersect(a.VisibilityPolyline, b.VisibilityPolyline)) {
      t.aIsInsideB = false
      t.bIsInsideA = false
      return true
    }

    t.aIsInsideB = ObstacleTree.FirstPolylineStartIsInsideSecondPolyline(a.VisibilityPolyline, b.VisibilityPolyline)
    t.bIsInsideA = !t.aIsInsideB && ObstacleTree.FirstPolylineStartIsInsideSecondPolyline(b.VisibilityPolyline, a.VisibilityPolyline)
    if (a.IsRectangle && b.IsRectangle) {
      // Rectangles do not require further evaluation.
      return false
    }

    if (ObstacleTree.ObstaclesAreCloseEnoughToBeConsideredTouching(a, b, t.aIsInsideB, t.bIsInsideA)) {
      t.aIsInsideB = false
      t.bIsInsideA = false
      return true
    }

    return false
  }

  private static ObstaclesAreCloseEnoughToBeConsideredTouching(
    a: Obstacle,
    b: Obstacle,
    aIsInsideB: boolean,
    bIsInsideA: boolean,
  ): boolean {
    // This is only called when the obstacle.VisibilityPolylines don't intersect, thus one is inside the other
    // or both are outside. If both are outside then either one's LooseVisibilityPolyline may be used.
    if (!aIsInsideB && !bIsInsideA) {
      return Curve.CurvesIntersect(a.looseVisibilityPolyline, b.VisibilityPolyline)
    }

    // Otherwise see if the inner one is close enough to the outer border to consider them touching.
    const innerLoosePolyline = aIsInsideB ? a.looseVisibilityPolyline : b.looseVisibilityPolyline
    const outerPolyline = aIsInsideB ? b.VisibilityPolyline : a.VisibilityPolyline

    for (const innerPoint of innerLoosePolyline) {
      if (Curve.PointRelativeToCurveLocation(innerPoint, outerPolyline) === PointLocation.Outside) {
        const outerParamPoint = Curve.ClosestPoint(outerPolyline, innerPoint)
        if (!Point.closeIntersections(innerPoint, outerParamPoint)) {
          return true
        }
      }
    }

    return false
  }

  //Add ancestors that are spatial parents - they may not be in the hierarchy, but we need to be
  //able to cross their boundaries if we're routing between obstacles on different sides of them.

  AdjustSpatialAncestors(): boolean {
    if (this.SpatialAncestorsAdjusted) {
      return false
    }

    // Add each group to the AncestorSet of any spatial children (duplicate Insert() is ignored).
    for (const group of this.GetAllGroups()) {
      const groupBox = group.VisibilityBoundingBox
      for (const obstacle of this.Root.GetNodeItemsIntersectingRectangle(groupBox)) {
        if (obstacle !== group && Curve.ClosedCurveInteriorsIntersect(obstacle.VisibilityPolyline, group.VisibilityPolyline)) {
          if (obstacle.IsInConvexHull) {
            /*Assert.assert(
              obstacle.IsPrimaryObstacle,
              'Only primary obstacles should be in the hierarchy',
            )*/
            for (const sibling of obstacle.ConvexHull.Obstacles) {
              this.AncestorSets.get(sibling.InputShape).add(group.InputShape)
            }
          }

          this.AncestorSets.get(obstacle.InputShape).add(group.InputShape)
        }
      }
    }

    // Remove any hierarchical ancestors that are not spatial ancestors.  Otherwise, when trying to route to
    // obstacles that *are* spatial children of such a non-spatial-but-hierarchical ancestor, we won't enable
    // crossing the boundary the first time and will always go to the full "activate all groups" path.  By
    // removing them here we not only get a better graph (avoiding some spurious crossings) but we're faster
    // both in path generation and Nudging.
    let nonSpatialGroups = new Array<Shape>()
    for (const child of this.Root.GetAllLeaves()) {
      const childBox = child.VisibilityBoundingBox
      // This has to be two steps because we can't modify the Set during enumeration.
      nonSpatialGroups = nonSpatialGroups.concat(
        Array.from(this.AncestorSets.get(child.InputShape)).filter(
          (anc) => !childBox.intersects(this.shapeIdToObstacleMap.get(anc).VisibilityBoundingBox),
        ),
      )

      for (const group of nonSpatialGroups) {
        this.AncestorSets.get(child.InputShape).delete(group)
      }

      nonSpatialGroups = []
    }

    this.SpatialAncestorsAdjusted = true
    return true
  }

  GetAllGroups(): Array<Obstacle> {
    return this.GetAllObstacles().filter((obs) => obs.IsGroup)
  }

  //Clear the internal state.

  Clear() {
    this.Root = null
    this.AncestorSets = null
  }

  // Create a LineSegment that contains the max visibility from startPoint in the desired direction.

  CreateMaxVisibilitySegment(startPoint: Point, dir: Direction, t: {pacList: PointAndCrossingsList}): LineSegment {
    const graphBoxBorderIntersect = StaticGraphUtility.RectangleBorderIntersect(this.GraphBox, startPoint, dir)
    if (PointComparer.GetDirections(startPoint, graphBoxBorderIntersect) === Direction.None) {
      t.pacList = null
      return LineSegment.mkPP(startPoint, startPoint)
    }

    const segment = this.RestrictSegmentWithObstacles(startPoint, graphBoxBorderIntersect)
    // Store this off before other operations which overwrite it.
    t.pacList = this.CurrentGroupBoundaryCrossingMap.GetOrderedListBetween(segment.start, segment.end)
    return segment
  }

  // Convenience functions that call through to RectangleNode.

  GetAllObstacles(): Array<Obstacle> {
    return this.allObstacles
  }

  // Returns a list of all primary obstacles - secondary obstacles inside a convex hull are not needed in the VisibilityGraphGenerator.

  GetAllPrimaryObstacles(): Iterable<Obstacle> {
    return this.Root.GetAllLeaves()
  }

  // Hit-testing.
  IntersectionIsInsideAnotherObstacle(
    sideObstacle: Obstacle,
    eventObstacle: Obstacle,
    intersect: Point,
    scanDirection: ScanDirection,
  ): boolean {
    this.insideHitTestIgnoreObstacle1 = eventObstacle
    this.insideHitTestIgnoreObstacle2 = sideObstacle
    this.insideHitTestScanDirection = scanDirection
    const obstacleNode: RectangleNode<Obstacle, Point> = this.Root.FirstHitNodeWithPredicate(
      intersect,
      this.InsideObstacleHitTest.bind(this),
    )
    return null != obstacleNode
  }

  PointIsInsideAnObstaclePD(intersect: Point, direction: Direction): boolean {
    return this.PointIsInsideAnObstacle(intersect, ScanDirection.GetInstance(direction))
  }

  PointIsInsideAnObstacle(intersect: Point, scanDirection: ScanDirection): boolean {
    this.insideHitTestIgnoreObstacle1 = null
    this.insideHitTestIgnoreObstacle2 = null
    this.insideHitTestScanDirection = scanDirection
    const obstacleNode: RectangleNode<Obstacle, Point> = this.Root.FirstHitNodeWithPredicate(
      intersect,
      this.InsideObstacleHitTest.bind(this),
    )
    return null != obstacleNode
  }

  InsideObstacleHitTest(location: Point, obstacle: Obstacle): HitTestBehavior {
    if (obstacle === this.insideHitTestIgnoreObstacle1 || obstacle === this.insideHitTestIgnoreObstacle2) {
      // It's one of the two obstacles we already know about.
      return HitTestBehavior.Continue
    }

    if (obstacle.IsGroup) {
      // Groups are handled differently from overlaps; we create ScanSegments (overlapped
      // if within a non-group obstacle, else non-overlapped), and turn on/off access across
      // the Group boundary vertices.
      return HitTestBehavior.Continue
    }

    if (!StaticGraphUtility.PointIsInRectangleInterior(location, obstacle.VisibilityBoundingBox)) {
      // // The point is on the obstacle boundary, not inside it.
      return HitTestBehavior.Continue
    }

    // Note: There are rounding issues using Curve.PointRelativeToCurveLocation at angled
    // obstacle boundaries, hence this function.
    const high: Point = StaticGraphUtility.RectangleBorderIntersect(
      obstacle.VisibilityBoundingBox,
      location,
      this.insideHitTestScanDirection.dir,
    ).add(this.insideHitTestScanDirection.DirectionAsPoint)
    const low: Point = StaticGraphUtility.RectangleBorderIntersect(
      obstacle.VisibilityBoundingBox,
      location,
      this.insideHitTestScanDirection.OppositeDirection,
    ).sub(this.insideHitTestScanDirection.DirectionAsPoint)
    const testSeg = LineSegment.mkPP(low, high)
    const xxs = Curve.getAllIntersections(testSeg, obstacle.VisibilityPolyline, true)
    // If this is an extreme point it can have one intersection, in which case we're either on the border
    // or outside; if it's a collinear flat boundary, there can be 3 intersections to this point which again
    // means we're on the border (and 3 shouldn't happen anymore with the curve intersection fixes and
    // PointIsInsideRectangle check above).  So the interesting case is that we have 2 intersections.
    if (2 === xxs.length) {
      const firstInt: Point = Point.RoundPoint(xxs[0].x)
      const secondInt: Point = Point.RoundPoint(xxs[1].x)
      // If we're on either intersection, we're on the border rather than inside.
      if (
        !PointComparer.EqualPP(location, firstInt) &&
        !PointComparer.EqualPP(location, secondInt) &&
        location.compareTo(firstInt) !== location.compareTo(secondInt)
      ) {
        // We're inside.  However, this may be an almost-flat side, in which case rounding
        // could have reported the intersection with the start or end of the same side and
        // a point somewhere on the interior of that side.  Therefore if both intersections
        // are on the same side (integral portion of the parameter), we consider location
        // to be on the border.  testSeg is always xxs[*].Segment0.
        /*Assert.assert(
          testSeg === xxs[0].seg0,
          'incorrect parameter ordering to GetAllIntersections',
        )*/
        if (!closeDistEps(Math.floor(xxs[0].par1), Math.floor(xxs[1].par1))) {
          return HitTestBehavior.Stop
        }
      }
    }

    return HitTestBehavior.Continue
  }

  SegmentCrossesAnObstacle(startPoint: Point, endPoint: Point): boolean {
    this.stopAtGroups = true
    this.wantGroupCrossings = false
    const obstacleIntersectSeg: LineSegment = this.RestrictSegmentPrivate(startPoint, endPoint)
    return !PointComparer.EqualPP(obstacleIntersectSeg.end, endPoint)
  }

  SegmentCrossesANonGroupObstacle(startPoint: Point, endPoint: Point): boolean {
    this.stopAtGroups = false
    this.wantGroupCrossings = false
    const obstacleIntersectSeg: LineSegment = this.RestrictSegmentPrivate(startPoint, endPoint)
    return !PointComparer.EqualPP(obstacleIntersectSeg.end, endPoint)
  }

  // TEST_MSAGL
  RestrictSegmentWithObstacles(startPoint: Point, endPoint: Point): LineSegment {
    this.stopAtGroups = false
    this.wantGroupCrossings = true
    return this.RestrictSegmentPrivate(startPoint, endPoint)
  }

  private RestrictSegmentPrivate(startPoint: Point, endPoint: Point): LineSegment {
    this.GetRestrictedIntersectionTestSegment(startPoint, endPoint)
    this.currentRestrictedRay = LineSegment.mkPP(startPoint, endPoint)
    this.restrictedRayLengthSquared = startPoint.sub(endPoint).lengthSquared
    this.CurrentGroupBoundaryCrossingMap.Clear()
    this.RecurseRestrictRayWithObstacles(this.Root)
    return this.currentRestrictedRay
  }

  private GetRestrictedIntersectionTestSegment(startPoint: Point, endPoint: Point) {
    // Due to rounding issues use a larger line span for intersection calculations.
    const segDir = PointComparer.GetDirections(startPoint, endPoint)
    const startX = Direction.West === segDir ? this.GraphBox.right : Direction.East === segDir ? this.GraphBox.left : startPoint.x
    const endX = Direction.West === segDir ? this.GraphBox.left : Direction.East === segDir ? this.GraphBox.right : endPoint.x
    const startY = Direction.South === segDir ? this.GraphBox.top * 2 : Direction.North === segDir ? this.GraphBox.bottom : startPoint.y
    const endY = Direction.South === segDir ? this.GraphBox.bottom : Direction.North === segDir ? this.GraphBox.top : startPoint.y
    this.restrictedIntersectionTestSegment = LineSegment.mkPP(new Point(startX, startY), new Point(endX, endY))
  }

  // Due to rounding at the endpoints of the segment on intersection calculations, we need to preserve the original full-length segment.
  restrictedIntersectionTestSegment: LineSegment

  currentRestrictedRay: LineSegment

  wantGroupCrossings: boolean

  stopAtGroups: boolean

  restrictedRayLengthSquared: number

  private RecurseRestrictRayWithObstacles(rectNode: RectangleNode<Obstacle, Point>) {
    // A lineSeg that moves along the boundary of an obstacle is not blocked by it.
    if (!StaticGraphUtility.RectangleInteriorsIntersect(this.currentRestrictedRay.boundingBox, <Rectangle>rectNode.irect)) {
      return
    }

    const obstacle: Obstacle = rectNode.UserData
    if (null != obstacle) {
      // Leaf node. Get the interior intersections.  Use the full-length original segment for the intersection calculation.
      const intersections = Curve.getAllIntersections(this.restrictedIntersectionTestSegment, obstacle.VisibilityPolyline, true)
      if (!obstacle.IsGroup || this.stopAtGroups) {
        this.LookForCloserNonGroupIntersectionToRestrictRay(intersections)
        return
      }

      if (this.wantGroupCrossings) {
        this.AddGroupIntersectionsToRestrictedRay(obstacle, intersections)
      }

      /*Assert.assert(rectNode.IsLeaf, 'RectNode with UserData is not a Leaf')*/
      return
    }

    // Not a leaf; recurse into children.
    this.RecurseRestrictRayWithObstacles(rectNode.Left)
    this.RecurseRestrictRayWithObstacles(rectNode.Right)
  }

  private LookForCloserNonGroupIntersectionToRestrictRay(intersections: Array<IntersectionInfo>) {
    let numberOfGoodIntersections = 0
    let closestIntersectionInfo: IntersectionInfo = null
    let localLeastDistSquared = this.restrictedRayLengthSquared
    const testDirection = PointComparer.GetDirections(
      this.restrictedIntersectionTestSegment.start,
      this.restrictedIntersectionTestSegment.end,
    )
    for (const intersectionInfo of intersections) {
      const intersect = Point.RoundPoint(intersectionInfo.x)

      const dirToIntersect = PointComparer.GetDirections(this.currentRestrictedRay.start, intersect)
      if (dirToIntersect === CompassVector.OppositeDir(testDirection)) {
        continue
      }

      numberOfGoodIntersections++
      if (Direction.None === dirToIntersect) {
        localLeastDistSquared = 0
        closestIntersectionInfo = intersectionInfo
        continue
      }

      const distSquared = intersect.sub(this.currentRestrictedRay.start).lengthSquared
      if (distSquared < localLeastDistSquared) {
        // Rounding may falsely report two intersections as different when they are actually "Close",
        // e.g. a horizontal vs. vertical intersection on a slanted edge.
        const rawDistSquared = intersectionInfo.x.sub(this.currentRestrictedRay.start).lengthSquared
        if (rawDistSquared < GeomConstants.squareOfDistanceEpsilon) {
          continue
        }

        localLeastDistSquared = distSquared
        closestIntersectionInfo = intersectionInfo
      }
    }

    if (null != closestIntersectionInfo) {
      // If there was only one intersection and it is quite close to an end, ignore it.
      // If there is more than one intersection, we have crossed the obstacle so we want it.
      if (numberOfGoodIntersections === 1) {
        const intersect = Point.RoundPoint(closestIntersectionInfo.x)
        if (
          Point.closeIntersections(intersect, this.currentRestrictedRay.start) ||
          Point.closeIntersections(intersect, this.currentRestrictedRay.end)
        ) {
          return
        }
      }

      this.restrictedRayLengthSquared = localLeastDistSquared
      this.currentRestrictedRay.end = SpliceUtility.MungeClosestIntersectionInfo(
        this.currentRestrictedRay.start,
        closestIntersectionInfo,
        !StaticGraphUtility.IsVerticalPP(this.currentRestrictedRay.start, this.currentRestrictedRay.end),
      )
    }
  }

  private AddGroupIntersectionsToRestrictedRay(obstacle: Obstacle, intersections: Array<IntersectionInfo>) {
    // We'll let the lines punch through any intersections with groups, but track the location so we can enable/disable crossing.
    for (const intersectionInfo of intersections) {
      const intersect = Point.RoundPoint(intersectionInfo.x)
      // Skip intersections that are past the end of the restricted segment (though there may still be some
      // there if we shorten it later, but we'll skip them later).
      const distSquared = intersect.sub(this.currentRestrictedRay.start).lengthSquared
      if (distSquared > this.restrictedRayLengthSquared) {
        continue
      }

      const dirTowardIntersect = PointComparer.GetDirections(this.currentRestrictedRay.start, this.currentRestrictedRay.end)
      const polyline = <Polyline>intersectionInfo.seg1
      // this is the second arg to GetAllIntersections
      const dirsOfSide = CompassVector.VectorDirection(polyline.derivative(intersectionInfo.par1))
      // // The derivative is always clockwise, so if the side contains the rightward rotation of the
      // direction from the ray origin, then we're hitting it from the inside; otherwise from the outside.
      let dirToInsideOfGroup = dirTowardIntersect
      if (0 !== (dirsOfSide & CompassVector.RotateRight(dirTowardIntersect))) {
        dirToInsideOfGroup = CompassVector.OppositeDir(dirToInsideOfGroup)
      }

      this.CurrentGroupBoundaryCrossingMap.AddIntersection(intersect, obstacle, dirToInsideOfGroup)
    }
  }
}
