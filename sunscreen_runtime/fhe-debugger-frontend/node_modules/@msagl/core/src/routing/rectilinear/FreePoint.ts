// This is a point on a path that is not associated with an obstacle, such as
// a port for the end of a dragged path, or a waypoint.

import {Point, Rectangle, CompassVector, Direction, LineSegment} from '../../math/geometry'

import {VisibilityEdge} from '../visibility/VisibilityEdge'
import {VisibilityVertex} from '../visibility/VisibilityVertex'
import {PointAndCrossingsList} from './PointAndCrossingsList'
import {PointComparer} from './PointComparer'
import {ScanSegment} from './ScanSegment'
import {StaticGraphUtility} from './StaticGraphUtility'
import {TransientGraphUtility} from './TransientGraphUtility'
type SegmentAndCrossings = [LineSegment, PointAndCrossingsList]

export class FreePoint {
  // The VisibilityVertex for this path point; created if it does not already exist.
  Vertex: VisibilityVertex

  get Point(): Point {
    return this.Vertex.point
  }

  IsOverlapped: boolean

  get InitialWeight(): number {
    return this.IsOverlapped ? ScanSegment.OverlappedWeight : ScanSegment.NormalWeight
  }

  OutOfBoundsDirectionFromGraph: Direction

  get IsOutOfBounds(): boolean {
    return Direction.None !== this.OutOfBoundsDirectionFromGraph
  }

  private maxVisibilitySegmentsAndCrossings: SegmentAndCrossings[] = new Array(4)

  // Called if we must create the vertex.
  constructor(transUtil: TransientGraphUtility, point: Point) {
    this.OutOfBoundsDirectionFromGraph = Direction.None
    this.GetVertex(transUtil, point)
  }

  GetVertex(transUtil: TransientGraphUtility, point: Point) {
    this.Vertex = transUtil.FindOrAddVertex(point)
  }

  // Adds an edge from this.Vertex to a (possibly new) vertex at an intersection with an
  // existing Edge that adjoins the point.  We take 'dir' as an input parameter for edge
  // extension because we may be on the edge so can't calculate the direction.
  AddEdgeToAdjacentEdge(
    transUtil: TransientGraphUtility,
    targetEdge: VisibilityEdge,
    dirToExtend: Direction,
    limitRect: Rectangle,
  ): VisibilityVertex {
    const targetIntersect: Point = StaticGraphUtility.SegmentIntersectionEP(targetEdge, this.Point)
    let targetVertex: VisibilityVertex = transUtil.VisGraph.FindVertex(targetIntersect)
    if (null != targetVertex) {
      this.AddToAdjacentVertex(transUtil, targetVertex, dirToExtend, limitRect)
    } else {
      targetVertex = transUtil.AddEdgeToTargetEdge(this.Vertex, targetEdge, targetIntersect)
    }

    this.ExtendEdgeChain(transUtil, targetVertex, dirToExtend, limitRect)
    return targetVertex
  }

  AddToAdjacentVertex(transUtil: TransientGraphUtility, targetVertex: VisibilityVertex, dirToExtend: Direction, limitRect: Rectangle) {
    if (!PointComparer.EqualPP(this.Point, targetVertex.point)) {
      transUtil.FindOrAddEdge(this.Vertex, targetVertex, this.InitialWeight)
    }

    this.ExtendEdgeChain(transUtil, targetVertex, dirToExtend, limitRect)
  }

  ExtendEdgeChain(transUtil: TransientGraphUtility, targetVertex: VisibilityVertex, dirToExtend: Direction, limitRect: Rectangle) {
    // Extend the edge chain to the opposite side of the limit rectangle.
    // StaticGraphUtility.Assert((PointComparer.Equal(this.Point, targetVertex.point)
    //                || (PointComparer.GetPureDirectionVV(this.Point, targetVertex.point) === dirToExtend)), "input dir does not match with to-targetVertex direction", transUtil.ObstacleTree, transUtil.VisGraph);
    let extendOverlapped = this.IsOverlapped
    if (extendOverlapped) {
      // The initial vertex we connected to may be on the border of the enclosing obstacle,
      // or of another also-overlapped obstacle.  If the former, we turn off overlap now.
      extendOverlapped = transUtil.ObstacleTree.PointIsInsideAnObstaclePD(targetVertex.point, dirToExtend)
    }

    // If we're inside an obstacle's boundaries we'll never extend past the end of the obstacle
    // due to encountering the boundary from the inside.  So start the extension at targetVertex.
    const segmentAndCrossings: SegmentAndCrossings = this.GetSegmentAndCrossings(
      this.IsOverlapped ? targetVertex : this.Vertex,
      dirToExtend,
      transUtil,
    )

    transUtil.ExtendEdgeChainVRLPB(targetVertex, limitRect, segmentAndCrossings[0], segmentAndCrossings[1], extendOverlapped)
  }

  private GetSegmentAndCrossings(
    startVertex: VisibilityVertex,
    dirToExtend: Direction,
    transUtil: TransientGraphUtility,
  ): SegmentAndCrossings {
    const dirIndex = CompassVector.ToIndex(dirToExtend)
    let segmentAndCrossings = this.maxVisibilitySegmentsAndCrossings[dirIndex]
    if (segmentAndCrossings == null) {
      const t: {pacList: PointAndCrossingsList} = {pacList: null}
      const maxVisibilitySegment = transUtil.ObstacleTree.CreateMaxVisibilitySegment(startVertex.point, dirToExtend, t)
      segmentAndCrossings = [maxVisibilitySegment, t.pacList]
      this.maxVisibilitySegmentsAndCrossings[dirIndex] = segmentAndCrossings
    } else {
      // For a waypoint this will be a target and then a source, so there may be a different lateral edge to
      // connect to. In that case make sure we are consistent in directions - back up the start point if needed.
      if (PointComparer.GetDirections(startVertex.point, segmentAndCrossings[0].start) === dirToExtend) {
        segmentAndCrossings[0].start = startVertex.point
      }
    }

    return segmentAndCrossings
  }

  MaxVisibilityInDirectionForNonOverlappedFreePoint(dirToExtend: Direction, transUtil: TransientGraphUtility): Point {
    /*Assert.assert(
      !this.IsOverlapped,
      'Do not precalculate overlapped obstacle visibility as we should extend from the outer target vertex instead',
    )*/
    const segmentAndCrossings: SegmentAndCrossings = this.GetSegmentAndCrossings(this.Vertex, dirToExtend, transUtil)
    return segmentAndCrossings[0].end
  }

  AddOobEdgesFromGraphCorner(transUtil: TransientGraphUtility, cornerPoint: Point) {
    const dirs: Direction = PointComparer.GetDirections(cornerPoint, this.Vertex.point)
    const cornerVertex: VisibilityVertex = transUtil.VisGraph.FindVertex(cornerPoint)
    // For waypoints we want to be able to enter in both directions.
    transUtil.ConnectVertexToTargetVertex(cornerVertex, this.Vertex, dirs & (Direction.North | Direction.South), ScanSegment.NormalWeight)
    transUtil.ConnectVertexToTargetVertex(cornerVertex, this.Vertex, dirs & (Direction.East | Direction.West), ScanSegment.NormalWeight)
  }

  RemoveFromGraph() {
    // Currently all transient removals and edge restorations are done by TransientGraphUtility itself.
    this.Vertex = null
  }

  public toString(): string {
    return this.Vertex.toString()
  }
}
