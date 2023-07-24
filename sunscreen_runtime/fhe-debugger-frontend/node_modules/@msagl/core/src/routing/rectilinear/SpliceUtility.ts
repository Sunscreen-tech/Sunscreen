import {GeomConstants} from '../../math/geometry/geomConstants'
import {IntersectionInfo} from '../../math/geometry/intersectionInfo'
import {Point} from '../../math/geometry/point'
import {Rectangle} from '../../math/geometry/rectangle'

export class SpliceUtility {
  // Most of the original contents of this file have been subsumed into ObstacleTree and TransientGraphUtility.
  static MungeClosestIntersectionInfo(rayOrigin: Point, closestIntersection: IntersectionInfo, isHorizontal: boolean): Point {
    const bbox: Rectangle = closestIntersection.seg1.boundingBox
    const closest: Point = Point.RoundPoint(closestIntersection.x).clone()
    return isHorizontal
      ? new Point(SpliceUtility.MungeIntersect(rayOrigin.x, closest.x, bbox.left, bbox.right), closest.y)
      : new Point(closest.x, SpliceUtility.MungeIntersect(rayOrigin.y, closest.y, bbox.bottom, bbox.top))
  }

  // Make sure that we intersect the object space.
  static MungeIntersect(site: number, intersect: number, start: number, end: number): number {
    if (site < intersect) {
      const min: number = Math.min(start, end)
      if (intersect < min) {
        intersect = min
      }
    } else if (site > intersect) {
      const max: number = Math.max(start, end)
      if (intersect > max) {
        intersect = max
      }
    }

    return Point.RoundDouble(intersect)
  }
}
