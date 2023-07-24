import {GeomConstants} from '../../math/geometry/geomConstants'
import {LinearSystem2} from '../../math/geometry/linearSystem'
import {Point, TriangleOrientation} from '../../math/geometry/point'
import {PolylinePoint} from '../../math/geometry/polylinePoint'

export class ActiveEdgeComparerWithRay {
  pivot: Point

  get Pivot() {
    return this.pivot
  }
  set Pivot(value: Point) {
    this.pivot = value
  }

  pointOnTheRay: Point

  get IntersectionOfTheRayAndInsertedEdge() {
    return this.pointOnTheRay
  }
  set IntersectionOfTheRayAndInsertedEdge(value: Point) {
    this.pointOnTheRay = value
  }

  Compare(x: PolylinePoint, y: PolylinePoint) {
    //Assert.assert(this.IntersectionPointBelongsToTheInsertedEdge(x))

    switch (Point.getTriangleOrientation(this.IntersectionOfTheRayAndInsertedEdge, y.point, y.nextOnPolyline.point)) {
      case TriangleOrientation.Counterclockwise:
        return -1
      default:
        return 1
    }
  }

  IntersectionPointBelongsToTheInsertedEdge(x: PolylinePoint): boolean {
    const a = x.point.sub(this.IntersectionOfTheRayAndInsertedEdge)
    const b = x.nextOnPolyline.point.sub(this.IntersectionOfTheRayAndInsertedEdge)
    return Math.abs(a.x * b.y - b.x * a.y) < GeomConstants.distanceEpsilon
  }

  IntersectEdgeWithRayPPP(source: Point, target: Point, ray: Point): Point {
    //let x(t-s)+s is on the ray, then for some y we x(t-s)+s=y*ray+pivot, or x(t-s)-y*ray=pivot-s
    const result = LinearSystem2.solve(
      target.x - source.x,
      -ray.x,
      this.Pivot.x - source.x,
      target.y - source.y,
      -ray.y,
      this.Pivot.y - source.y,
    )
    if (!(-GeomConstants.tolerance <= result.x && result.x <= 1 + GeomConstants.tolerance)) throw new Error()
    if (!result) throw new Error()

    return this.Pivot.add(ray.mul(result.y))
  }

  IntersectEdgeWithRay(side: PolylinePoint, ray: Point): Point {
    return this.IntersectEdgeWithRayPPP(side.point, side.nextOnPolyline.point, ray)
  }

  static constructorPP(pivot: Point, pointOnTheRay: Point) {
    const r = new ActiveEdgeComparerWithRay()
    r.pivot = pivot
    r.pointOnTheRay = pointOnTheRay
    return r
  }
}
