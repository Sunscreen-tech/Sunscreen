//
import {Point} from '../../math/geometry/point'
import {GeomConstants} from '../../math/geometry/geomConstants'
import {Polyline} from '../../math/geometry/polyline'
import {PolylinePoint} from '../../math/geometry/polylinePoint'
import {BinaryHeapWithComparer} from '../../structs/BinaryHeapWithComparer'
import {RBTree} from '../../math/RBTree/rbTree'
import {LeftObstacleSide} from '../spline/coneSpanner/LeftObstacleSide'
import {LowestVertexEvent} from '../spline/coneSpanner/LowestVertexEvent'
import {RightObstacleSide} from '../spline/coneSpanner/RightObstacleSide'
import {SweepEvent} from '../spline/coneSpanner/SweepEvent'
import {ObstacleSideComparer} from './ObstacleSideComparer'
import {PortObstacleEvent} from './PortObstacleEvent'
import {SegmentBase} from './SegmentBase'
import {PointSet} from '../../utils/PointSet'

export class LineSweeperBase {
  directionPerp: Point // sweep direction rotated 90 degrees clockwse

  eventQueue: BinaryHeapWithComparer<SweepEvent>

  LeftObstacleSideTree: RBTree<SegmentBase>

  ObstacleSideComparer: ObstacleSideComparer

  RightObstacleSideTree: RBTree<SegmentBase>

  protected Ports: PointSet

  public constructor(obstacles: Array<Polyline>, sweepDirection: Point) {
    this.Obstacles = obstacles ?? []
    this.SweepDirection = sweepDirection
    this.DirectionPerp = sweepDirection.rotate(-Math.PI / 2)
    this.EventQueue = new BinaryHeapWithComparer<SweepEvent>((a, b) => this.Compare(a, b))
    this.ObstacleSideComparer = new ObstacleSideComparer(this)
    this.LeftObstacleSideTree = new RBTree<SegmentBase>((a, b) => this.ObstacleSideComparer.Compare(a, b))
    this.RightObstacleSideTree = new RBTree<SegmentBase>((a, b) => this.ObstacleSideComparer.Compare(a, b))
  }

  protected get EventQueue(): BinaryHeapWithComparer<SweepEvent> {
    return this.eventQueue
  }
  protected set EventQueue(value: BinaryHeapWithComparer<SweepEvent>) {
    this.eventQueue = value
  }

  SweepDirection: Point

  // sweep direction rotated by 90 degrees clockwise

  protected get DirectionPerp(): Point {
    return this.directionPerp
  }
  protected set DirectionPerp(value: Point) {
    this.directionPerp = value
  }

  protected PreviousZ: number = Number.NEGATIVE_INFINITY

  z = Number.NEGATIVE_INFINITY

  public get Z(): number {
    return this.z
  }
  public set Z(value: number) {
    if (value > this.z + GeomConstants.tolerance) {
      this.PreviousZ = this.z
    }
    this.z = value
  }

  // protected virtual bool TreesAreCorrect() { return true; }
  Obstacles: Array<Polyline>

  protected GetZS(eve: SweepEvent): number {
    return this.SweepDirection.dot(eve.Site)
  }

  protected GetZP(point: Point): number {
    return this.SweepDirection.dot(point)
  }

  protected SegmentIsNotHorizontal(a: Point, b: Point): boolean {
    return Math.abs(a.sub(b).dot(this.SweepDirection)) > GeomConstants.distanceEpsilon
  }

  protected RemoveLeftSide(side: LeftObstacleSide) {
    this.ObstacleSideComparer.SetOperand(side)
    this.LeftObstacleSideTree.remove(side)
  }

  protected RemoveRightSide(side: RightObstacleSide) {
    this.ObstacleSideComparer.SetOperand(side)
    this.RightObstacleSideTree.remove(side)
  }

  protected InsertLeftSide(side: LeftObstacleSide) {
    this.ObstacleSideComparer.SetOperand(side)
    this.LeftObstacleSideTree.insert(side)
  }

  protected InsertRightSide(side: RightObstacleSide) {
    this.ObstacleSideComparer.SetOperand(side)
    this.RightObstacleSideTree.insert(side)
  }

  protected FindFirstObstacleSideToTheLeftOfPoint(point: Point): RightObstacleSide {
    const node = this.RightObstacleSideTree.findLast((s) => Point.pointToTheRightOfLineOrOnLine(point, s.Start, s.End))
    return node == null ? null : <RightObstacleSide>node.item
  }

  protected FindFirstObstacleSideToToTheRightOfPoint(point: Point): LeftObstacleSide {
    const node = this.LeftObstacleSideTree.findFirst((s) => !Point.pointToTheRightOfLineOrOnLine(point, s.Start, s.End))
    return node == null ? null : <LeftObstacleSide>node.item
  }

  protected EnqueueEvent(eve: SweepEvent) {
    /*Assert.assert(this.GetZP(eve.Site) >= this.PreviousZ)*/
    this.eventQueue.Enqueue(eve)
  }

  protected InitQueueOfEvents() {
    for (const obstacle of this.Obstacles) {
      this.EnqueueLowestPointsOnObstacles(obstacle)
    }
    if (this.Ports != null) {
      for (const point of this.Ports.values()) {
        this.EnqueueEvent(new PortObstacleEvent(point))
      }
    }
  }

  EnqueueLowestPointsOnObstacles(poly: Polyline) {
    const candidate: PolylinePoint = this.GetLowestPoint(poly)
    this.EnqueueEvent(new LowestVertexEvent(candidate))
  }

  GetLowestPoint(poly: Polyline): PolylinePoint {
    let candidate: PolylinePoint = poly.startPoint
    let pp: PolylinePoint = poly.startPoint.next
    for (; pp != null; pp = pp.next) {
      if (this.Less(pp.point, candidate.point)) {
        candidate = pp
      }
    }

    return candidate
  }

  // imagine that direction points up,
  // lower events have higher priorities,
  // for events at the same level events to the left have higher priority

  public Compare(a: SweepEvent, b: SweepEvent): number {
    const aSite: Point = a.Site
    const bSite: Point = b.Site
    return this.ComparePoints(/* ref */ aSite, /* ref */ bSite)
  }

  Less(a: Point, b: Point): boolean {
    return this.ComparePoints(/* ref */ a, /* ref */ b) < 0
  }

  ComparePoints(aSite: Point, bSite: Point): number {
    let aProjection = this.SweepDirection.dot(aSite)
    let bProjection = this.SweepDirection.dot(bSite)
    if (aProjection < bProjection) {
      return -1
    }

    if (aProjection > bProjection) {
      return 1
    }

    aProjection = this.directionPerp.dot(aSite)
    bProjection = this.directionPerp.dot(bSite)
    return aProjection < bProjection ? -1 : aProjection > bProjection ? 1 : 0
  }
}
