// Creates the convex hull of a set of points following "Computational Geometry, second edition" of O'Rourke

import {GeomConstants} from './geomConstants'
import {Point, TriangleOrientation} from './point'
import {Polyline} from './polyline'

type HullPoint = {point: Point; deleted: boolean; stamp: number}
type HullStack = {point: Point; next: HullStack}
export class ConvexHull {
  hullPoints: HullPoint[]

  pivot: Point

  stack: HullStack

  stamp = 0

  constructor(bodyPoints: Iterable<Point>) {
    this.SetPivotAndAllocateHullPointsArray(bodyPoints)
  }

  SetPivotAndAllocateHullPointsArray(bodyPoints: Iterable<Point>) {
    this.pivot = new Point(0, Number.MAX_SAFE_INTEGER)
    // set Y to a very big value
    let pivotIndex = -1
    let n = 0
    for (const point of bodyPoints) {
      if (point.y < this.pivot.y) {
        this.pivot = point
        pivotIndex = n
      } else if (point.y === this.pivot.y) {
        if (point.x > this.pivot.x) {
          this.pivot = point
          pivotIndex = n
        }
      }

      n++
    }

    if (n >= 1) {
      this.hullPoints = new Array(n - 1)
      // we will not copy the pivot into the hull points
      n = 0
      for (const point of bodyPoints) {
        if (n !== pivotIndex) {
          this.hullPoints[n++] = {
            point: point,
            deleted: false,
            stamp: this.stamp++,
          }
        } else {
          pivotIndex = -1
        }
      }
      // forget where the pivot was
    }
  }

  get StackTopPoint(): Point {
    return this.stack.point
  }

  get StackSecondPoint(): Point {
    return this.stack.next.point
  }

  // calculates the convex hull of the given set of points

  static *CalculateConvexHull(pointsOfTheBody: Iterable<Point>): IterableIterator<Point> {
    const convexHull = new ConvexHull(pointsOfTheBody)
    for (const p of convexHull.Calculate()) yield p
  }

  *Calculate(): IterableIterator<Point> {
    if (this.pivot.y === Number.MAX_SAFE_INTEGER) {
      return
    }

    if (this.hullPoints.length === 0) {
      yield this.pivot
      return
    }

    this.SortAllPointsWithoutPivot()
    this.Scan()
    for (const p of this.EnumerateStack()) {
      yield p
    }
  }

  *EnumerateStack(): IterableIterator<Point> {
    let stackCell: HullStack = this.stack
    while (stackCell != null) {
      yield stackCell.point
      stackCell = stackCell.next
    }
  }

  Scan() {
    let i = 0
    while (this.hullPoints[i].deleted) {
      i++
    }

    this.stack = {point: this.pivot, next: null}
    this.Push(i++)
    if (i < this.hullPoints.length) {
      if (!this.hullPoints[i].deleted) {
        this.Push(i++)
      } else {
        i++
      }
    }

    while (i < this.hullPoints.length) {
      if (!this.hullPoints[i].deleted) {
        if (this.LeftTurn(i)) {
          this.Push(i++)
        } else {
          this.Pop()
        }
      } else {
        i++
      }
    }

    // cleanup the end
    while (this.StackHasMoreThanTwoPoints() && !this.LeftTurnToPivot()) {
      this.Pop()
    }
  }

  LeftTurnToPivot(): boolean {
    return Point.getTriangleOrientation(this.StackSecondPoint, this.StackTopPoint, this.pivot) === TriangleOrientation.Counterclockwise
  }

  StackHasMoreThanTwoPoints(): boolean {
    return this.stack.next != null && this.stack.next.next != null
  }

  Pop() {
    this.stack = this.stack.next
  }

  LeftTurn(i: number): boolean {
    if (this.stack.next == null) {
      return true
    }

    // there is only one point in the stack
    const orientation = Point.getTriangleOrientationWithIntersectionEpsilon(
      this.StackSecondPoint,
      this.StackTopPoint,
      this.hullPoints[i].point,
    )
    if (orientation === TriangleOrientation.Counterclockwise) {
      return true
    }

    if (orientation === TriangleOrientation.Clockwise) {
      return false
    }

    return this.BackSwitchOverPivot(this.hullPoints[i].point)
  }

  BackSwitchOverPivot(point: Point): boolean {
    // we know here that there at least two points in the stack but it has to be exaclty two
    if (this.stack.next.next != null) {
      return false
    }

    /*Assert.assert(this.StackSecondPoint === this.pivot)*/
    return this.StackTopPoint.x > this.pivot.x + GeomConstants.distanceEpsilon && point.x < this.pivot.x - GeomConstants.distanceEpsilon
  }

  Push(p: number) {
    this.stack = {point: this.hullPoints[p].point, next: this.stack}
  }

  SortAllPointsWithoutPivot() {
    this.hullPoints.sort(hullPointComparer(this.pivot))
  }

  static createConvexHullAsClosedPolyline(points: Iterable<Point>): Polyline {
    const convexHull = Polyline.mkClosedFromPoints(Array.from(ConvexHull.CalculateConvexHull(points)))
    // #if (TEST_MSAGL)
    // for (let point of points) {
    //    if ((Curve.PointRelativeToCurveLocation(point, convexHull) === PointLocation.Outside)) {
    //        let hullPoint = convexHull[convexHull.closestParameter(point)];
    //        //  This can be too restrictive if very close points are put into the hull.  It is probably
    //        //  better to clean up in the caller before doing this, but this assert can also be relaxed.
    //        Assert.assert(ApproximateComparer.Close(point, hullPoint, (ApproximateComparer.IntersectionEpsilon * 20)), String.Format("not CloseIntersections: initial point {0}, hull point {1}", point, hullPoint));
    //    }

    // }

    // #endif
    // // TEST_MSAGL
    return convexHull
  }
}

// note that this function can change "deleted" member for collinear points

function hullPointComparer(pivot: Point): (i: HullPoint, j: HullPoint) => number {
  return (i: HullPoint, j: HullPoint) => {
    if (i === j) {
      return 0
    }

    if (i == null) {
      return -1
    }

    if (j == null) {
      return 1
    }

    switch (Point.getTriangleOrientationWithIntersectionEpsilon(pivot, i.point, j.point)) {
      case TriangleOrientation.Counterclockwise:
        return -1
        break
      case TriangleOrientation.Clockwise:
        return 1
        break
      case TriangleOrientation.Collinear:
        // because of the double point error pi and pj can be on different sizes of the pivot on the horizontal line passing through the pivot, or rather just above it
        const piDelX = i.point.x - pivot.x
        const pjDelX = j.point.x - pivot.x
        if (piDelX > GeomConstants.distanceEpsilon && pjDelX < -GeomConstants.distanceEpsilon) {
          return -1
        }

        if (piDelX < -GeomConstants.distanceEpsilon && pjDelX > GeomConstants.distanceEpsilon) {
          return 1
        }

        // here i and j cannot be on the different sides of the pivot because of the choice of the pivot
        // delete the one that is closer to the pivot.
        const pi = i.point.sub(pivot)
        const pj = j.point.sub(pivot)
        const iMinJ = pi.l1 - pj.l1
        if (iMinJ < 0) {
          i.deleted = true
          return -1
        }

        if (iMinJ > 0) {
          j.deleted = true
          return 1
        }

        // points are the same, leave the one with the smallest stamp
        if (i.stamp > j.stamp) {
          i.deleted = true
        } else {
          j.deleted = true
        }

        return 0
    }

    throw new Error()
  }
}
