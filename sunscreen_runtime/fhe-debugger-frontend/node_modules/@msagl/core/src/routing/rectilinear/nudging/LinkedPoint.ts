import {Point} from '../../../math/geometry/point'
// import {CompassVector} from '../../../math/geometry/compassVector'

// represents a segment of a path
export class LinkedPoint {
  Point: Point
  Next: LinkedPoint

  constructor(point: Point) {
    this.Point = point
  }

  *GetEnumerator(): IterableIterator<Point> {
    let p: LinkedPoint
    for (p = this; p != null; p = p.Next) {
      yield p.Point
    }
  }

  get X(): number {
    return this.Point.x
  }

  get Y(): number {
    return this.Point.y
  }

  InsertVerts(i: number, j: number, points: Point[]) {
    for (j--; i < j; j--) {
      this.SetNewNext(points[j])
    }
  }

  public InsertVertsInReverse(i: number, j: number, points: Point[]) {
    for (i++; i < j; i++) {
      this.SetNewNext(points[i])
    }
  }

  SetNewNext(p: Point) {
    const nv = new LinkedPoint(p)
    const tmp = this.Next
    this.Next = nv
    nv.Next = tmp
    /*Assert.assert(CompassVector.IsPureDirectionPP(this.Point, this.Next.Point))*/
  }
}
