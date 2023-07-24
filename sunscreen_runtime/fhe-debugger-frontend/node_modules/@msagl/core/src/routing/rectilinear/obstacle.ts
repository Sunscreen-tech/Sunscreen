import {Port} from '../../layout/core/port'
import {CompassVector} from '../../math/geometry/compassVector'
import {Curve} from '../../math/geometry/curve'
import {GeomConstants} from '../../math/geometry/geomConstants'
import {Point, TriangleOrientation} from '../../math/geometry/point'
import {Polyline} from '../../math/geometry/polyline'
import {PolylinePoint} from '../../math/geometry/polylinePoint'
import {Rectangle} from '../../math/geometry/rectangle'

import {substractSets} from '../../utils/setOperations'
import {InteractiveEdgeRouter} from '../interactiveEdgeRouter'
import {InteractiveObstacleCalculator} from '../interactiveObstacleCalculator'
import {Shape} from '../shape'
import {LowObstacleSide, HighObstacleSide} from './BasicObstacleSide'
import {OverlapConvexHull} from './OverlapConvexHull'
import {ScanDirection} from './ScanDirection'

export class Obstacle {
  static readonly FirstSentinelOrdinal = 1

  static readonly FirstNonSentinelOrdinal = 10
  private _PaddedPolyline: Polyline
  public get PaddedPolyline(): Polyline {
    return this._PaddedPolyline
  }
  public set PaddedPolyline(value: Polyline) {
    this._PaddedPolyline = value
  }
  IsRectangle: boolean
  InputShape: Shape
  Ports: Set<Port>
  ConvexHull: OverlapConvexHull
  OverlapsGroupCorner: boolean
  private _looseVisibilityPolyline: Polyline
  public get looseVisibilityPolyline(): Polyline {
    if (this._looseVisibilityPolyline == null) {
      this._looseVisibilityPolyline = Obstacle.CreateLoosePolyline(this.VisibilityPolyline)
    }
    return this._looseVisibilityPolyline
  }
  public set looseVisibilityPolyline(value: Polyline) {
    this._looseVisibilityPolyline = value
  }

  GetPortChanges(t: {addedPorts: Set<Port>; removedPorts: Set<Port>}): boolean {
    t.addedPorts = substractSets(this.InputShape.Ports, this.Ports)
    t.removedPorts = substractSets(this.Ports, this.InputShape.Ports)
    if (0 === t.addedPorts.size && 0 === t.removedPorts.size) {
      return false
    }

    this.Ports = new Set<Port>(this.InputShape.Ports)
    return true
  }
  get IsInConvexHull() {
    return this.ConvexHull != null
  }
  get IsGroup(): boolean {
    return this.InputShape != null && this.InputShape.IsGroup
  }
  get VisibilityBoundingBox(): Rectangle {
    return this.VisibilityPolyline.boundingBox
  }

  get VisibilityPolyline(): Polyline {
    return this.ConvexHull != null ? this.ConvexHull.Polyline : this.PaddedPolyline
  }

  static CreateSentinel(a: Point, b: Point, scanDir: ScanDirection, scanlineOrdinal: number): Obstacle {
    const sentinel = Obstacle.mk(a, b, scanlineOrdinal)
    sentinel.CreateInitialSides(sentinel.PaddedPolyline.startPoint, scanDir)
    return sentinel
  }

  ActiveLowSide: LowObstacleSide
  ActiveHighSide: HighObstacleSide

  CreateInitialSides(startPoint: PolylinePoint, scanDir: ScanDirection) {
    /*Assert.assert(
      this.ActiveLowSide == null  && this.ActiveHighSide == null ,
      'Cannot call SetInitialSides when sides are already set',
    )*/
    this.ActiveLowSide = new LowObstacleSide(this, startPoint, scanDir)
    this.ActiveHighSide = new HighObstacleSide(this, startPoint, scanDir)
    if (scanDir.IsFlatS(this.ActiveHighSide)) {
      // No flat sides in the scanline; we'll do lookahead processing in the scanline to handle overlaps
      // with existing segments, and normal neighbor handling will take care of collinear OpenVertexEvents.
      this.ActiveHighSide = new HighObstacleSide(this, this.ActiveHighSide.EndVertex, scanDir)
    }
  }
  constructor(shape: Shape, padding: number) {
    if (shape == null) {
      return
    }
    this.PaddedPolyline = InteractiveObstacleCalculator.PaddedPolylineBoundaryOfNode(shape.BoundaryCurve, padding)

    Obstacle.RoundVerticesAndSimplify(this.PaddedPolyline)
    this.IsRectangle = this.IsPolylineRectangle()

    this.InputShape = shape
    this.Ports = new Set<Port>(this.InputShape.Ports)
  }

  static mk(a: Point, b: Point, scanlineOrdinal: number) {
    const obs = new Obstacle(null, 0)
    obs.PaddedPolyline = Polyline.mkClosedFromPoints([Point.RoundPoint(a), Point.RoundPoint(b)])
    obs.Ordinal = scanlineOrdinal
    return obs
  }
  private IsPolylineRectangle(): boolean {
    if (this.PaddedPolyline.count !== 4) {
      return false
    }

    let ppt = this.PaddedPolyline.startPoint
    let nextPpt = ppt.nextOnPolyline
    let dir = CompassVector.VectorDirectionPP(ppt.point, nextPpt.point)
    if (!CompassVector.IsPureDirection(dir)) {
      return false
    }

    do {
      ppt = nextPpt
      nextPpt = ppt.nextOnPolyline
      const nextDir = CompassVector.DirectionFromPointToPoint(ppt.point, nextPpt.point)
      // We know the polyline is clockwise.
      if (nextDir !== CompassVector.RotateRight(dir)) {
        return false
      }

      dir = nextDir
    } while (ppt !== this.PaddedPolyline.startPoint)

    return true
  }

  static RoundVerticesAndSimplify(polyline: Polyline) {
    /*Assert.assert(polyline.isClockwise(), 'Polyline is not clockwise')*/
    /*Assert.assert(polyline.closed)*/
    // Following creation of the padded border, round off the vertices for consistency
    // in later operations (intersections and event ordering).
    let ppt: PolylinePoint = polyline.startPoint
    do {
      ppt.point = Point.RoundPoint(ppt.point)
      ppt = ppt.nextOnPolyline
    } while (ppt !== polyline.startPoint)

    Obstacle.RemoveCloseAndCollinearVerticesInPlace(polyline)
    // We've modified the points so the BoundingBox may have changed; force it to be recalculated.
    polyline.setInitIsRequired()
    // Verify that the polyline is still clockwise.
    /*Assert.assert(
      polyline.isClockwise(),
      'Polyline is not clockwise after RoundVertices',
    )*/
  }
  // A single convex hull is shared by all obstacles contained by it and we only want one occurrence of that
  // convex hull's polyline in the visibility graph generation.
  get IsPrimaryObstacle(): boolean {
    return this.ConvexHull == null || this === this.ConvexHull.PrimaryObstacle
  }
  static RemoveCloseAndCollinearVerticesInPlace(polyline: Polyline): Polyline {
    const epsilon = GeomConstants.intersectionEpsilon * 10
    for (let pp: PolylinePoint = polyline.startPoint.next; pp != null; pp = pp.next) {
      if (Point.close(pp.prev.point, pp.point, epsilon)) {
        if (pp.next == null) {
          polyline.RemoveEndPoint()
        } else {
          pp.prev.next = pp.next
          pp.next.prev = pp.prev
        }
      }
    }

    if (Point.close(polyline.start, polyline.end, epsilon)) {
      polyline.RemoveStartPoint()
    }

    polyline = polyline.RemoveCollinearVertices()

    if (
      polyline.endPoint.prev != null &&
      polyline.endPoint.prev !== polyline.startPoint &&
      Point.getTriangleOrientation(polyline.endPoint.prev.point, polyline.end, polyline.start) === TriangleOrientation.Collinear
    ) {
      polyline.RemoveEndPoint()
    }

    if (
      polyline.startPoint.next != null &&
      polyline.endPoint.prev !== polyline.startPoint &&
      Point.getTriangleOrientation(polyline.end, polyline.start, polyline.startPoint.next.point) === TriangleOrientation.Collinear
    ) {
      polyline.RemoveStartPoint()
    }

    polyline.setInitIsRequired()
    return polyline
  }
  // The ScanLine uses this as a final tiebreaker.  It is set on InitializeEventQueue rather than in
  // AddObstacle to avoid a possible wraparound issue if a lot of obstacles are added/removed.
  // For sentinels, 1/2 are left/right, 3/4 are top/bottom. 0 is invalid during scanline processing.
  Ordinal: number
  clump: Array<Obstacle>
  get isOverlapped() {
    return this.clump !== undefined && this.clump.length > 0
  }
  get IsSentinel() {
    return this.InputShape == null
  }

  IsInSameClump(other: Obstacle): boolean {
    return this.isOverlapped && this.clump === other.clump
  }

  Close() {
    this.ActiveLowSide = null
    this.ActiveHighSide = null
  }
  SetConvexHull(hull: OverlapConvexHull) {
    // This obstacle may have been in a rectangular obstacle or clump that was now found to overlap with a non-rectangular obstacle.
    this.clump = null
    this.IsRectangle = false
    this.ConvexHull = hull
    this.looseVisibilityPolyline = null
  }
  static CreateLoosePolyline(polyline: Polyline): Polyline {
    const loosePolyline = InteractiveObstacleCalculator.CreatePaddedPolyline(polyline, GeomConstants.intersectionEpsilon * 10)
    Obstacle.RoundVerticesAndSimplify(loosePolyline)
    return loosePolyline
  }
  get IsTransparentAncestor(): boolean {
    return this.InputShape == null ? false : this.InputShape.IsTransparent
  }
  set IsTransparentAncestor(value: boolean) {
    this.InputShape.IsTransparent = value
  }
}
