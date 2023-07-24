// single source single target rectilinear path

import {Point} from '../../math/geometry/point'
import {CompassVector} from '../../math/geometry/compassVector'
import {Direction} from '../../math/geometry/direction'
import {GenericBinaryHeapPriorityQueue} from '../../structs/genericBinaryHeapPriorityQueue'
import {RBTree} from '../../math/RBTree/rbTree'

import {closeDistEps, compareNumbers} from '../../utils/compare'
import {VisibilityEdge} from '../visibility/VisibilityEdge'
import {VisibilityVertex} from '../visibility/VisibilityVertex'
import {VertexEntry} from './VertexEntry'
import {VisibilityVertexRectilinear} from './VisibilityVertexRectiline'

class NextNeighbor {
  Vertex: VisibilityVertexRectilinear

  Weight: number

  constructor() {
    this.Clear()
  }

  Set(v: VisibilityVertexRectilinear, w: number) {
    this.Vertex = v
    this.Weight = w
  }

  Clear() {
    this.Vertex = null
    this.Weight = Number.NaN
  }
}

export class SsstRectilinearPath {
  LengthImportance: number

  BendsImportance: number

  // Only bends importance needs to be public.
  static DefaultBendPenaltyAsAPercentageOfDistance = 4

  Target: VisibilityVertexRectilinear

  Source: VisibilityVertexRectilinear

  EntryDirectionsToTarget: Direction

  private upperBoundOnCost: number

  private sourceCostAdjustment: number

  private targetCostAdjustment: number

  // The cost of the path calculation

  private CombinedCost(length: number, numberOfBends: number): number {
    return this.LengthImportance * length + this.BendsImportance * numberOfBends
  }

  private TotalCostFromSourceToVertex(length: number, numberOfBends: number): number {
    return this.CombinedCost(length, numberOfBends) + this.sourceCostAdjustment
  }

  // The priority queue for path extensions.

  private queue: GenericBinaryHeapPriorityQueue<VertexEntry>

  // The list of vertices we've visited for all paths.

  private visitedVertices: Array<VisibilityVertexRectilinear>

  // For consistency and speed, path extensions impose an ordering as in the paper:  straight, right, left.  We
  // enqueue entries in the reverse order of preference so the latest timestamp will be the preferred direction.
  // Thus straight-ahead neighbors are in slot 2, right in slot 1, left in slot 0.  (If the target happens
  // to be to the Left, then the heuristic lookahead score will override the Right preference).

  // The next neighbors to extend the path to from the current vertex.

  private readonly nextNeighbors = [new NextNeighbor(), new NextNeighbor(), new NextNeighbor()]

  public constructor() {
    this.LengthImportance = 1
    this.BendsImportance = 1
  }

  private InitPath(sourceVertexEntries: VertexEntry[], source: VisibilityVertexRectilinear, target: VisibilityVertexRectilinear): boolean {
    if (source === target || !this.InitEntryDirectionsAtTarget(target)) {
      return false
    }

    this.Target = target
    this.Source = source
    const cost: number = this.TotalCostFromSourceToVertex(0, 0) + this.HeuristicDistanceFromVertexToTarget(source.point, Direction.None)
    if (cost >= this.upperBoundOnCost) {
      return false
    }

    // This path starts lower than upperBoundOnCost, so create our structures and process it.
    this.queue = new GenericBinaryHeapPriorityQueue<VertexEntry>(compareNumbers)
    this.visitedVertices = [source]
    if (sourceVertexEntries == null) {
      this.EnqueueInitialVerticesFromSource(cost)
    } else {
      this.EnqueueInitialVerticesFromSourceEntries(sourceVertexEntries)
    }

    return this.queue.count > 0
  }

  private InitEntryDirectionsAtTarget(vert: VisibilityVertex): boolean {
    this.EntryDirectionsToTarget = Direction.None
    // This routine is only called once so don't worry about optimizing foreach.
    for (const edge of vert.OutEdges) {
      this.EntryDirectionsToTarget = this.EntryDirectionsToTarget | CompassVector.DirectionFromPointToPoint(edge.TargetPoint, vert.point)
    }

    for (const edge of vert.InEdges) {
      this.EntryDirectionsToTarget = this.EntryDirectionsToTarget | CompassVector.DirectionFromPointToPoint(edge.SourcePoint, vert.point)
    }

    // If this returns false then the target is isolated.
    return this.EntryDirectionsToTarget !== Direction.None
  }

  private static IsInDirs(direction: Direction, dirs: Direction): boolean {
    return direction === (direction & dirs)
  }

  MultistageAdjustedCostBound(bestCost: number): number {
    // Allow an additional bend's cost for intermediate stages so we don't jump out early.
    return Number.isFinite(bestCost) ? bestCost + this.BendsImportance : bestCost
  }

  // estimation from below for the distance

  private HeuristicDistanceFromVertexToTarget(point: Point, entryDirToVertex: Direction): number {
    const vectorToTarget: Point = this.Target.point.sub(point)
    if (closeDistEps(vectorToTarget.x, 0) && closeDistEps(vectorToTarget.y, 0)) {
      // We are at the target.
      return this.targetCostAdjustment
    }

    const dirToTarget: Direction = CompassVector.VectorDirection(vectorToTarget)
    let numberOfBends: number
    if (entryDirToVertex === Direction.None) {
      entryDirToVertex = Direction.East | (Direction.North | (Direction.West | Direction.South))
      numberOfBends = this.GetNumberOfBends(entryDirToVertex, dirToTarget)
    } else {
      numberOfBends = this.GetNumberOfBends(entryDirToVertex, dirToTarget)
    }

    return this.CombinedCost(SsstRectilinearPath.ManhattanDistance(point, this.Target.point), numberOfBends) + this.targetCostAdjustment
  }

  private GetNumberOfBends(entryDirToVertex: Direction, dirToTarget: Direction): number {
    return CompassVector.IsPureDirection(dirToTarget)
      ? this.GetNumberOfBendsForPureDirection(entryDirToVertex, dirToTarget)
      : SsstRectilinearPath.GetBendsForNotPureDirection(dirToTarget, entryDirToVertex, this.EntryDirectionsToTarget)
  }

  private GetNumberOfBendsForPureDirection(entryDirToVertex: Direction, dirToTarget: Direction): number {
    if ((dirToTarget & entryDirToVertex) === dirToTarget) {
      if (SsstRectilinearPath.IsInDirs(dirToTarget, this.EntryDirectionsToTarget)) {
        return 0
      }

      if (
        SsstRectilinearPath.IsInDirs(SsstRectilinearPath.Left(dirToTarget), this.EntryDirectionsToTarget) ||
        SsstRectilinearPath.IsInDirs(SsstRectilinearPath.Right(dirToTarget), this.EntryDirectionsToTarget)
      ) {
        return 2
      }

      return 4
    }

    return this.GetNumberOfBendsForPureDirection(SsstRectilinearPath.AddOneTurn[<number>entryDirToVertex], dirToTarget) + 1
  }

  private static GetBendsForNotPureDirection(
    dirToTarget: Direction,
    entryDirToVertex: Direction,
    entryDirectionsToTarget: Direction,
  ): number {
    const a: Direction = dirToTarget & entryDirToVertex
    if (a === Direction.None) {
      return (
        SsstRectilinearPath.GetBendsForNotPureDirection(
          dirToTarget,
          SsstRectilinearPath.AddOneTurn[<number>entryDirToVertex],
          entryDirectionsToTarget,
        ) + 1
      )
    }

    const b: Direction = dirToTarget & entryDirectionsToTarget
    if (b === Direction.None) {
      return (
        SsstRectilinearPath.GetBendsForNotPureDirection(
          dirToTarget,
          entryDirToVertex,
          SsstRectilinearPath.AddOneTurn[<number>entryDirectionsToTarget],
        ) + 1
      )
    }

    return (a | b) === dirToTarget ? 1 : 2
  }

  private static AddOneTurn: Direction[] = [
    Direction.None, //Directions. None-> None
    Direction.North | Direction.East | Direction.West, // 1=N -> N,E,W
    Direction.North | Direction.East | Direction.South, // 2 =E->E|N|S
    15, // 3 =E|N->E|N|S
    Direction.East | Direction.South | Direction.West, // 4 =S->E|S|W
    15, // 5 =E|N->E|N|S|W
    15, //6 - S|E
    15, //7
    13, //8=W
    15, //9
    15, //10
    15, //11
    15, //12
    15, //13
    15, //14
    15, //15
  ]

  private static Left(direction: Direction): Direction {
    switch (direction) {
      case Direction.None:
        return Direction.None
        break
      case Direction.North:
        return Direction.West
        break
      case Direction.East:
        return Direction.North
        break
      case Direction.South:
        return Direction.East
        break
      case Direction.West:
        return Direction.South
        break
      default:
        throw new Error('direction')
        break
    }
  }

  private static Right(direction: Direction): Direction {
    switch (direction) {
      case Direction.None:
        return Direction.None
        break
      case Direction.North:
        return Direction.East
        break
      case Direction.East:
        return Direction.South
        break
      case Direction.South:
        return Direction.West
        break
      case Direction.West:
        return Direction.North
        break
      default:
        throw new Error('direction')
        break
    }
  }

  static RestorePathV(t: {entry: VertexEntry}): Array<Point> {
    return SsstRectilinearPath.RestorePath(t, null)
  }

  static RestorePath(t: {entry: VertexEntry}, firstVertexInStage: VisibilityVertex): Array<Point> {
    if (t.entry == null) {
      return []
    }

    const list = new Array<Point>()
    let skippedCollinearEntry = false
    let lastEntryDir: Direction = Direction.None
    while (true) {
      // Reduce unnecessary AxisEdge creations in Nudger by including only bend points, not points in the middle of a segment.
      if (lastEntryDir === t.entry.Direction) {
        skippedCollinearEntry = true
      } else {
        skippedCollinearEntry = false
        list.push(t.entry.Vertex.point)
        lastEntryDir = t.entry.Direction
      }

      const previousEntry = t.entry.PreviousEntry
      if (previousEntry == null || t.entry.Vertex === firstVertexInStage) {
        break
      }

      t.entry = previousEntry
    }

    if (skippedCollinearEntry) {
      list.push(t.entry.Vertex.point)
    }

    list.reverse()
    return list
  }

  private QueueReversedEntryToNeighborVertexIfNeeded(bestEntry: VertexEntry, entryFromNeighbor: VertexEntry, weight: number) {
    // If we have a lower-cost path from bestEntry to entryFromNeighbor.PreviousVertex than the cost of entryFromNeighbor,
    // or bestEntry has degree 1 (it is a dead-end), enqueue a path in the opposite direction (entryFromNeighbor will probably
    // never be extended from this point).
    const t = {numberOfBends: 0, length: 0}
    const neigVer = entryFromNeighbor.PreviousVertex
    const dirToNeighbor = SsstRectilinearPath.GetLengthAndNumberOfBendsToNeighborVertex(bestEntry, neigVer, weight, t)
    if (
      this.CombinedCost(t.length, t.numberOfBends) < this.CombinedCost(entryFromNeighbor.Length, entryFromNeighbor.NumberOfBends) ||
      bestEntry.Vertex.Degree === 1
    ) {
      const cost =
        this.TotalCostFromSourceToVertex(t.length, t.numberOfBends) + this.HeuristicDistanceFromVertexToTarget(neigVer.point, dirToNeighbor)
      this.EnqueueEntry(bestEntry, neigVer, t.length, t.numberOfBends, cost)
    }
  }

  private UpdateEntryToNeighborVertexIfNeeded(bestEntry: VertexEntry, neigEntry: VertexEntry, weight: number) {
    const t = {
      numberOfBends: 0,
      length: 0,
    }
    const dirToNeighbor = SsstRectilinearPath.GetLengthAndNumberOfBendsToNeighborVertex(bestEntry, neigEntry.Vertex, weight, t)
    if (this.CombinedCost(t.length, t.numberOfBends) < this.CombinedCost(neigEntry.Length, neigEntry.NumberOfBends)) {
      const newCost =
        this.TotalCostFromSourceToVertex(t.length, t.numberOfBends) +
        this.HeuristicDistanceFromVertexToTarget(neigEntry.Vertex.point, dirToNeighbor)
      neigEntry.ResetEntry(bestEntry, t.length, t.numberOfBends, newCost)
      this.queue.DecreasePriority(neigEntry, newCost)
    }
  }

  private CreateAndEnqueueEntryToNeighborVertex(bestEntry: VertexEntry, neigVer: VisibilityVertexRectilinear, weight: number) {
    const t = {numberOfBends: 0, length: 0}
    const dirToNeighbor = SsstRectilinearPath.GetLengthAndNumberOfBendsToNeighborVertex(bestEntry, neigVer, weight, t)
    const cost =
      this.TotalCostFromSourceToVertex(t.length, t.numberOfBends) + this.HeuristicDistanceFromVertexToTarget(neigVer.point, dirToNeighbor)
    if (cost < this.upperBoundOnCost) {
      if (neigVer.VertexEntries == null) {
        this.visitedVertices.push(neigVer)
      }

      this.EnqueueEntry(bestEntry, neigVer, t.length, t.numberOfBends, cost)
    }
  }

  private EnqueueEntry(bestEntry: VertexEntry, neigVer: VisibilityVertexRectilinear, length: number, numberOfBends: number, cost: number) {
    const entry = new VertexEntry(neigVer, bestEntry, length, numberOfBends, cost)
    neigVer.SetVertexEntry(entry)
    this.queue.Enqueue(entry, entry.Cost)
  }

  private static GetLengthAndNumberOfBendsToNeighborVertex(
    prevEntry: VertexEntry,
    vertex: VisibilityVertex,
    weight: number,
    t: {numberOfBends: number; length: number},
  ): Direction {
    t.length = prevEntry.Length + SsstRectilinearPath.ManhattanDistance(prevEntry.Vertex.point, vertex.point) * weight
    const directionToVertex: Direction = CompassVector.DirectionFromPointToPoint(prevEntry.Vertex.point, vertex.point)
    t.numberOfBends = prevEntry.NumberOfBends
    if (prevEntry.Direction !== Direction.None && directionToVertex !== prevEntry.Direction) {
      t.numberOfBends++
    }

    return directionToVertex
  }

  static ManhattanDistance(a: Point, b: Point): number {
    return Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
  }

  GetPathWithCost(
    sourceVertexEntries: VertexEntry[],
    source: VisibilityVertexRectilinear,
    adjustmentToSourceCost: number,
    targetVertexEntries: VertexEntry[],
    target: VisibilityVertexRectilinear,
    adjustmentToTargetCost: number,
    priorBestCost: number,
  ): VertexEntry {
    this.upperBoundOnCost = priorBestCost
    this.sourceCostAdjustment = adjustmentToSourceCost
    this.targetCostAdjustment = adjustmentToTargetCost
    if (!this.InitPath(sourceVertexEntries, source, target)) {
      return null
    }

    while (this.queue.count > 0) {
      const bestEntry = this.queue.Dequeue()
      const bestVertex = bestEntry.Vertex
      if (bestVertex === this.Target) {
        if (targetVertexEntries == null) {
          this.Cleanup()
          return bestEntry
        }

        // We'll never get a duplicate entry direction here; we either relaxed the cost via UpdateEntryToNeighborIfNeeded
        // before we dequeued it, or it was closed.  So, we simply remove the direction from the valid target entry directions
        // and if we get to none, we're done.  We return a null path until the final stage.
        bestEntry.Direction
        if (this.EntryDirectionsToTarget === Direction.None) {
          let i = 0
          for (const t of this.Target.VertexEntries) {
            targetVertexEntries[i++] = t
          }
          this.Cleanup()
          return null
        }

        this.upperBoundOnCost = Math.min(this.MultistageAdjustedCostBound(bestEntry.Cost), this.upperBoundOnCost)
        continue
      }

      // It's safe to close this after removing it from the queue.  Any updateEntryIfNeeded that changes it must come
      // while it is still on the queue; it is removed from the queue only if it has the lowest cost path, and we have
      // no negative path weights, so any other path that might try to extend to it after this cannot have a lower cost.
      bestEntry.IsClosed = true
      // PerfNote: Array.ForEach is optimized, but don't use .Where.
      for (const bendNeighbor of this.nextNeighbors) {
        bendNeighbor.Clear()
      }

      const preferredBendDir = SsstRectilinearPath.Right(bestEntry.Direction)
      this.ExtendPathAlongInEdges(bestEntry, bestVertex.InEdges, preferredBendDir)
      this.ExtendPathAlongOutEdges(bestEntry, bestVertex.OutEdges, preferredBendDir)
      for (const bendNeighbor of this.nextNeighbors) {
        if (bendNeighbor.Vertex != null) {
          this.ExtendPathToNeighborVertex(bestEntry, bendNeighbor.Vertex, bendNeighbor.Weight)
        }
      }
    }

    // Either there is no path to the target, or we have abandoned the path due to exceeding priorBestCost.
    if (targetVertexEntries != null && this.Target.VertexEntries != null) {
      for (let i = 0; i < this.Target.VertexEntries.length; i++) {
        targetVertexEntries[i] = this.Target.VertexEntries[i]
      }
    }
    this.Cleanup()
    return null
  }

  private ExtendPathAlongInEdges(bestEntry: VertexEntry, edges: Iterable<VisibilityEdge>, preferredBendDir: Direction) {
    // Iteration is faster than foreach and much faster than .Where.
    for (const edge of edges) {
      this.ExtendPathAlongEdge(bestEntry, edge, true, preferredBendDir)
    }
  }

  private ExtendPathAlongOutEdges(bestEntry: VertexEntry, edges: RBTree<VisibilityEdge>, preferredBendDir: Direction) {
    // Avoid GetEnumerator overhead.
    let outEdgeNode = edges.isEmpty() ? null : edges.treeMinimum()
    for (; outEdgeNode != null; outEdgeNode = edges.next(outEdgeNode)) {
      this.ExtendPathAlongEdge(bestEntry, outEdgeNode.item, false, preferredBendDir)
    }
  }

  private ExtendPathAlongEdge(bestEntry: VertexEntry, edge: VisibilityEdge, isInEdges: boolean, preferredBendDir: Direction) {
    if (!SsstRectilinearPath.IsPassable(edge)) {
      return
    }

    // This is after the initial source vertex so PreviousEntry won't be null.
    const neigVer = isInEdges ? <VisibilityVertexRectilinear>edge.Source : edge.Target
    if (neigVer === bestEntry.PreviousVertex) {
      // For multistage paths, the source may be a waypoint outside the graph boundaries that is collinear
      // with both the previous and next points in the path; in that case it may have only one degree.
      // For other cases, we just ignore it and the path will be abandoned.
      if (bestEntry.Vertex.Degree > 1 || bestEntry.Vertex !== this.Source) {
        return
      }

      this.ExtendPathToNeighborVertex(bestEntry, <VisibilityVertexRectilinear>neigVer, edge.Weight)
      return
    }

    // Enqueue in reverse order of preference per comments on NextNeighbor class.
    const neigDir = CompassVector.DirectionFromPointToPoint(bestEntry.Vertex.point, neigVer.point)
    let nextNeighbor = this.nextNeighbors[2]
    if (neigDir !== bestEntry.Direction) {
      nextNeighbor = this.nextNeighbors[neigDir === preferredBendDir ? 1 : 0]
    }

    /*Assert.assert(nextNeighbor.Vertex == null , 'bend neighbor already exists')*/
    nextNeighbor.Set(<VisibilityVertexRectilinear>neigVer, edge.Weight)
  }

  private EnqueueInitialVerticesFromSource(cost: number) {
    const bestEntry = new VertexEntry(this.Source, null, 0, 0, cost)
    bestEntry.IsClosed = true
    // This routine is only called once so don't worry about optimizing foreach.where
    for (const edge of this.Source.OutEdges) {
      if (!SsstRectilinearPath.IsPassable(edge)) continue

      this.ExtendPathToNeighborVertex(bestEntry, <VisibilityVertexRectilinear>edge.Target, edge.Weight)
    }

    for (const edge of this.Source.InEdges) {
      if (!SsstRectilinearPath.IsPassable(edge)) continue
      this.ExtendPathToNeighborVertex(bestEntry, <VisibilityVertexRectilinear>edge.Source, edge.Weight)
    }
  }

  private EnqueueInitialVerticesFromSourceEntries(sourceEntries: VertexEntry[]) {
    for (const entry of sourceEntries) {
      if (entry != null) {
        this.queue.Enqueue(entry, entry.Cost)
      }
    }
  }

  private ExtendPathToNeighborVertex(bestEntry: VertexEntry, neigVer: VisibilityVertexRectilinear, weight: number) {
    const dirToNeighbor = CompassVector.DirectionFromPointToPoint(bestEntry.Vertex.point, neigVer.point)
    const neigEntry = neigVer.VertexEntries != null ? neigVer.VertexEntries[CompassVector.ToIndex(dirToNeighbor)] : null
    if (neigEntry == null) {
      if (!this.CreateAndEnqueueReversedEntryToNeighborVertex(bestEntry, neigVer, weight)) {
        this.CreateAndEnqueueEntryToNeighborVertex(bestEntry, neigVer, weight)
      }
    } else if (!neigEntry.IsClosed) {
      this.UpdateEntryToNeighborVertexIfNeeded(bestEntry, neigEntry, weight)
    }
  }

  private CreateAndEnqueueReversedEntryToNeighborVertex(
    bestEntry: VertexEntry,
    neigVer: VisibilityVertexRectilinear,
    weight: number,
  ): boolean {
    // VertexEntries is null for the initial source. Otherwise, if there is already a path into bestEntry's vertex
    // from neigVer, we're turning back on the path; therefore we have already enqueued the neighbors of neigVer.
    // However, the path cost includes both path length to the current point and the lookahead; this means that we
    // may now be coming into the neigVer from the opposite side with an equal score to the previous entry, but
    // the new path may be going toward the target while the old one (from neigVer to bestEntry) went away from
    // the target.  So, if we score better going in the opposite direction, enqueue bestEntry->neigVer; ignore
    // neigVer->bestEntry as it probably won't be extended again.
    if (bestEntry.Vertex.VertexEntries != null) {
      const dirFromNeighbor = CompassVector.DirectionFromPointToPoint(neigVer.point, bestEntry.Vertex.point)
      const entryFromNeighbor = bestEntry.Vertex.VertexEntries[CompassVector.ToIndex(dirFromNeighbor)]
      if (entryFromNeighbor != null) {
        /*Assert.assert(
          entryFromNeighbor.PreviousVertex === neigVer,
          'mismatch in turnback PreviousEntry',
        )*/
        /*Assert.assert(
          entryFromNeighbor.PreviousEntry.IsClosed,
          'turnback PreviousEntry should be closed',
        )*/
        this.QueueReversedEntryToNeighborVertexIfNeeded(bestEntry, entryFromNeighbor, weight)
        return true
      }
    }

    return false
  }

  private static IsPassable(edge: VisibilityEdge): boolean {
    return edge.IsPassable == null || edge.IsPassable()
  }

  private Cleanup() {
    for (const v of this.visitedVertices) {
      v.RemoveVertexEntries()
    }

    this.visitedVertices = []
    this.queue = null
    // this.TestClearIterations()
  }
}
