// If two paths intersect then insert the intersection point as a vertex into both paths.
// Remove path self loops. Merge paths between the crossings if they have multiple crossings.
// If a path passes through a vertex of another path then insert this vertex into the first path.

import {Point} from '../../../math/geometry/point'
import {Direction} from '../../../math/geometry/direction'
import {GeomConstants} from '../../../math/geometry/geomConstants'
import {LinkedPoint} from './LinkedPoint'
import {LinkedPointSplitter} from './LinkedPointSplitter'
import {Path} from './Path'
import {PathMerger} from './PathMerger'
import {PointByDelegateComparer} from './PointByDelegateComparer'
import {closeDistEps} from '../../../utils/compare'
import {SortedMap} from '@esfx/collections-sortedmap'

type PointProjection = (p: Point) => number

export class PathRefiner {
  static RefinePaths(paths: Array<Path>, mergePaths: boolean) {
    PathRefiner.AdjustPaths(paths)
    const pathsToFirstLinkedVertices = PathRefiner.CreatePathsToFirstLinkedVerticesMap(paths)

    PathRefiner.Refine(Array.from(pathsToFirstLinkedVertices.values()))
    PathRefiner.CrossVerticalAndHorizontalSegs(pathsToFirstLinkedVertices.values())
    PathRefiner.ReconstructPathsFromLinkedVertices(pathsToFirstLinkedVertices)
    if (mergePaths) {
      new PathMerger(paths).MergePaths()
    }
  }

  // make sure that every two different points of paths are separated by at least 10e-6

  static AdjustPaths(paths: Array<Path>) {
    for (const path of paths) {
      path.PathPoints = PathRefiner.AdjustPathPoints(<Array<Point>>path.PathPoints)
    }
  }

  static AdjustPathPoints(points: Array<Point>): Array<Point> {
    if (!points || points.length === 0) return
    const arr = []

    let p: Point = Point.RoundPoint(points[0])
    arr.push(p)
    for (let i = 1; i < points.length; i++) {
      const np = Point.RoundPoint(points[i])
      if (!p.equal(np)) {
        p = np
        arr.push(p)
      }
    }
    return arr
  }

  static CrossVerticalAndHorizontalSegs(pathsFirstLinked: Iterable<LinkedPoint>) {
    const horizontalPoints = new Array<LinkedPoint>()
    const verticalPoints = new Array<LinkedPoint>()
    for (const pnt of pathsFirstLinked) {
      for (let p = pnt; p.Next != null; p = p.Next) {
        if (closeDistEps(p.Point.x, p.Next.Point.x)) {
          verticalPoints.push(p)
        } else {
          horizontalPoints.push(p)
        }
      }
    }

    new LinkedPointSplitter(horizontalPoints, verticalPoints).SplitPoints()
  }

  static ReconstructPathsFromLinkedVertices(pathsToPathLinkedPoints: Map<Path, LinkedPoint>) {
    for (const [k, v] of pathsToPathLinkedPoints) {
      k.PathPoints = v
    }
  }

  static Refine(pathFirstPoints: Array<LinkedPoint>) {
    PathRefiner.RefineInDirection(Direction.North, pathFirstPoints)
    PathRefiner.RefineInDirection(Direction.East, pathFirstPoints)
  }

  // refines all segments that are parallel to "direction"

  static *groupByProj(proj: (a: Point) => number, linkedPointsInDirection: LinkedPoint[]): IterableIterator<Array<LinkedPoint>> {
    const map = new Map<number, Array<LinkedPoint>>()
    for (const lp of linkedPointsInDirection) {
      const p = proj(lp.Point)
      let arr = map.get(p)
      if (!arr) {
        arr = new Array<LinkedPoint>()
        map.set(p, arr)
      }
      arr.push(lp)
    }
    for (const v of map.values()) {
      yield v
    }
  }

  static RefineInDirection(direction: Direction, pathFirstPoints: Iterable<LinkedPoint>) {
    const t: {
      projectionToPerp: PointProjection
      projectionToDirection: PointProjection
    } = {
      projectionToPerp: undefined,
      projectionToDirection: undefined,
    }
    PathRefiner.GetProjectionsDelegates(direction, t)
    const linkedPointsInDirection = Array.from(PathRefiner.GetAllLinkedVertsInDirection(t.projectionToPerp, pathFirstPoints))
    const colliniarBuckets = PathRefiner.groupByProj(t.projectionToPerp, linkedPointsInDirection)
    for (const pathLinkedPointBucket of colliniarBuckets) {
      PathRefiner.RefineCollinearBucket(pathLinkedPointBucket, t.projectionToDirection)
    }
  }

  static GetProjectionsDelegates(
    direction: Direction,
    t: {
      projectionToPerp: PointProjection
      projectionToDirection: PointProjection
    },
  ) {
    if (direction === Direction.East) {
      t.projectionToDirection = (p) => p.x
      t.projectionToPerp = (p) => p.y
    } else {
      t.projectionToPerp = (p) => p.x
      t.projectionToDirection = (p) => p.y
    }
  }

  static *GetAllLinkedVertsInDirection(
    projectionToPerp: PointProjection,
    initialVerts: Iterable<LinkedPoint>,
  ): IterableIterator<LinkedPoint> {
    for (const vert of initialVerts) {
      for (let v = vert; v.Next != null; v = v.Next) {
        if (closeDistEps(projectionToPerp(v.Point), projectionToPerp(v.Next.Point))) {
          yield v
        }
      }
    }
  }

  // refine vertices belonging to a bucket;
  // pathLinkedVertices belong to a line parallel to the direction of the refinement

  static RefineCollinearBucket(pathLinkedVertices: Iterable<LinkedPoint>, projectionToDirection: PointProjection) {
    const dict = new SortedMap<Point, number>(new PointByDelegateComparer(projectionToDirection))
    for (const pathLinkedPoint of pathLinkedVertices) {
      if (!dict.has(pathLinkedPoint.Point)) {
        dict.set(pathLinkedPoint.Point, 0)
      }

      if (!dict.has(pathLinkedPoint.Next.Point)) {
        dict.set(pathLinkedPoint.Next.Point, 0)
      }
    }

    const arrayOfPoints = new Array(dict.size)
    let i = 0
    for (const point of dict.keys()) {
      arrayOfPoints[i++] = point
    }

    for (i = 0; i < arrayOfPoints.length; i++) {
      dict.set(arrayOfPoints[i], i)
    }

    for (const pathLinkedVertex of pathLinkedVertices) {
      i = dict.get(pathLinkedVertex.Point)
      const j: number = dict.get(pathLinkedVertex.Next.Point)
      if (Math.abs(j - i) > 1) {
        PathRefiner.InsertPoints(pathLinkedVertex, arrayOfPoints, i, j)
      }
    }
  }

  static InsertPoints(pathLinkedVertex: LinkedPoint, arrayOfPoints: Point[], i: number, j: number) {
    if (i < j) {
      pathLinkedVertex.InsertVerts(i, j, arrayOfPoints)
    } else {
      pathLinkedVertex.InsertVertsInReverse(j, i, arrayOfPoints)
    }
  }

  static CreatePathsToFirstLinkedVerticesMap(edgePaths: Iterable<Path>): Map<Path, LinkedPoint> {
    const dict = new Map<Path, LinkedPoint>()
    for (const path of edgePaths) {
      dict.set(path, PathRefiner.CreateLinkedVertexOfEdgePath(path))
    }

    return dict
  }

  static CreateLinkedVertexOfEdgePath(path: Path): LinkedPoint {
    const arr = path.PathPoints as Point[]
    let pathPoint = new LinkedPoint(arr[0])
    const first = pathPoint
    for (let i = 1; i < arr.length; i++) {
      pathPoint.Next = new LinkedPoint(arr[i])
      pathPoint = pathPoint.Next
    }
    return first
  }
}
