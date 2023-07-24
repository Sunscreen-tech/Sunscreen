import {Point} from '../..'
import {GeomConstants} from '../../math/geometry'
import {LinearSystem2} from '../../math/geometry/linearSystem'
import {TriangleOrientation} from '../../math/geometry/point'

import {Diagonal} from './Diagonal'

export class ActiveDiagonalComparerWithRay {
  pointOnTheRay: Point

  get PointOnTangentAndInsertedDiagonal(): Point {
    return this.pointOnTheRay
  }
  set PointOnTangentAndInsertedDiagonal(value: Point) {
    this.pointOnTheRay = value
  }

  public Compare(x: Diagonal, y: Diagonal): number {
    // Assert.assert(ActiveDiagonalComparerWithRay.BelongsToTheDiagonal(this.PointOnTangentAndInsertedDiagonal, x.Start, x.End))
    if (!x.Start.equal(y.Start)) {
      switch (Point.getTriangleOrientation(this.PointOnTangentAndInsertedDiagonal, y.Start, y.End)) {
        case TriangleOrientation.Counterclockwise:
          return -1
        default:
          return 1
      }
    } else {
      return 0
    }
  }

  static BelongsToTheDiagonal(IntersectionOfTheRayAndInsertedEdge: Point, start: Point, end: Point): boolean {
    return Point.closeDistEps(
      IntersectionOfTheRayAndInsertedEdge,
      Point.ClosestPointAtLineSegment(IntersectionOfTheRayAndInsertedEdge, start, end),
    )
  }

  static IntersectDiagonalWithRay(pivot: Point, pointOnRay: Point, diagonal: Diagonal): Point {
    const ray: Point = pointOnRay.sub(pivot)
    const source: Point = diagonal.Start
    const target: Point = diagonal.End
    // let x(t-s)+s is on the ray, then for some y we x(t-s)+s=y*ray+pivot, or x(t-s)-y*ray=pivot-s
    const result = LinearSystem2.solve(
      target.x - source.x,
      ray.x * -1,
      pivot.x - source.x,
      target.y - source.y,
      ray.y * -1,
      pivot.y - source.y,
    )
    // Assert.assert(result && -GeomConstants.tolerance <= result.x && result.x <= 1 + GeomConstants.tolerance)
    return pivot.add(ray.mul(result.y))
  }
}
