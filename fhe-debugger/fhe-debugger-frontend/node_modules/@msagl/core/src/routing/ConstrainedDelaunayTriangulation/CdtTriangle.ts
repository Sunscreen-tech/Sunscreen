import {PointLocation, GeomConstants, LineSegment} from '../../math/geometry'
import {segmentsIntersect} from '../../math/geometry/lineSegment'
import {Point, TriangleOrientation} from '../../math/geometry/point'
import {Rectangle} from '../../math/geometry/rectangle'

import {CdtEdge} from './CdtEdge'
import {CdtSite} from './CdtSite'
import {ThreeArray} from './ThreeArray'

// a trianlge oriented counterclockwise
export class CdtTriangle {
  containsPoint(p: Point): boolean {
    return CdtTriangle.PointLocationForTriangle(p, this) !== PointLocation.Outside
  }
  static PointLocationForTriangle(p: Point, triangle: CdtTriangle): PointLocation {
    let seenBoundary = false
    for (let i = 0; i < 3; i++) {
      const area = Point.signedDoubledTriangleArea(p, triangle.Sites.getItem(i).point, triangle.Sites.getItem(i + 1).point)
      if (area < -GeomConstants.distanceEpsilon) {
        return PointLocation.Outside
      }

      if (area < GeomConstants.distanceEpsilon) {
        seenBoundary = true
      }
    }

    return seenBoundary ? PointLocation.Boundary : PointLocation.Inside
  }
  /** extend by eps the triangles edges before the test */
  intersectsLine(a: Point, b: Point, eps: number): boolean {
    if (CdtTriangle.PointLocationForTriangle(a, this) != PointLocation.Outside) return true
    if (CdtTriangle.PointLocationForTriangle(b, this) != PointLocation.Outside) return true

    for (const e of this.Edges) {
      if (this.abIntersectsTrianglSide(a, b, e)) return true
    }
    return false
  }
  // the edges
  public Edges: ThreeArray<CdtEdge> = new ThreeArray<CdtEdge>()

  // the sites
  public Sites: ThreeArray<CdtSite> = new ThreeArray<CdtSite>()

  private abIntersectsTrianglSide(a: Point, b: Point, e: CdtEdge) {
    return segmentsIntersect(a, b, e.lowerSite.point, e.upperSite.point)
  }

  static mkSSSD(a: CdtSite, b: CdtSite, c: CdtSite, createEdgeDelegate: (a: CdtSite, b: CdtSite) => CdtEdge) {
    const orientation = Point.getTriangleOrientation(a.point, b.point, c.point)
    const r = new CdtTriangle()
    switch (orientation) {
      case TriangleOrientation.Counterclockwise:
        r.FillCcwTriangle(a, b, c, createEdgeDelegate)
        break
      case TriangleOrientation.Clockwise:
        r.FillCcwTriangle(a, c, b, createEdgeDelegate)
        break
      default:
        throw new Error()
        break
    }
    return r
  }

  static mkSED(pi: CdtSite, edge: CdtEdge, createEdgeDelegate: (a: CdtSite, b: CdtSite) => CdtEdge) {
    const tri = new CdtTriangle()
    switch (Point.getTriangleOrientation(edge.upperSite.point, edge.lowerSite.point, pi.point)) {
      case TriangleOrientation.Counterclockwise:
        edge.CcwTriangle = tri
        tri.Sites.setItem(0, edge.upperSite)
        tri.Sites.setItem(1, edge.lowerSite)
        break
      case TriangleOrientation.Clockwise:
        edge.CwTriangle = tri
        tri.Sites.setItem(0, edge.lowerSite)
        tri.Sites.setItem(1, edge.upperSite)
        break
      default:
        throw new Error()
    }

    tri.Edges.setItem(0, edge)
    tri.Sites.setItem(2, pi)
    tri.CreateEdge(1, createEdgeDelegate)
    tri.CreateEdge(2, createEdgeDelegate)
    return tri
  }

  //
  static mkSSSEE(
    aLeft: CdtSite,
    aRight: CdtSite,
    bRight: CdtSite,
    a: CdtEdge,
    b: CdtEdge,
    createEdgeDelegate: (a: CdtSite, b: CdtSite) => CdtEdge,
  ) {
    /*Assert.assert(
      Point.getTriangleOrientation(aLeft.point, aRight.point, bRight.point) ==
        TriangleOrientation.Counterclockwise,
    )*/
    const tri = CdtTriangle.mkSSSD(aLeft, aRight, bRight, createEdgeDelegate)
    tri.Edges.setItem(0, a)
    tri.Edges.setItem(1, b)
    tri.BindEdgeToTriangle(aLeft, a)
    tri.BindEdgeToTriangle(aRight, b)
    tri.CreateEdge(2, createEdgeDelegate)
    return tri
  }

  // in the trianlge, which is always oriented counterclockwise, the edge starts at site
  BindEdgeToTriangle(site: CdtSite, edge: CdtEdge) {
    if (site === edge.upperSite) {
      edge.CcwTriangle = this
    } else {
      edge.CwTriangle = this
    }
  }

  // here a,b,c comprise a ccw triangle
  FillCcwTriangle(a: CdtSite, b: CdtSite, c: CdtSite, createEdgeDelegate: (a: CdtSite, b: CdtSite) => CdtEdge) {
    this.Sites.setItem(0, a)
    this.Sites.setItem(1, b)
    this.Sites.setItem(2, c)
    for (let i = 0; i < 3; i++) {
      this.CreateEdge(i, createEdgeDelegate)
    }
  }

  CreateEdge(i: number, createEdgeDelegate: (a: CdtSite, b: CdtSite) => CdtEdge) {
    const a = this.Sites.getItem(i)
    const b = this.Sites.getItem(i + 1)
    const edge: CdtEdge = createEdgeDelegate(a, b)
    this.Edges.setItem(i, edge)
    this.BindEdgeToTriangle(a, edge)
  }

  Contains(cdtSite: CdtSite): boolean {
    return this.Sites.has(cdtSite)
  }

  OppositeEdge(pi: CdtSite): CdtEdge {
    const index = this.Sites.index(pi)
    /*Assert.assert(index !== -1)*/
    return this.Edges.getItem(index + 1)
  }

  // #if TEST_MSAGL&&TEST_MSAGL
  //         // Returns a <see cref="T:System.String"/> that represents the current <see cref="T:System.Object"/>.
  //         // A <see cref="T:System.String"/> that represents the current <see cref="T:System.Object"/>.
  //         // <filterpriority>2</filterpriority>
  //         public override string ToString() {
  //             return String.Format("({0},{1},{2}", Sites[0], Sites[1], Sites[2]);
  //         }
  // #endif
  OppositeSite(cdtEdge: CdtEdge): CdtSite {
    const i = this.Edges.index(cdtEdge)
    return this.Sites.getItem(i + 2)
  }

  BoundingBox(): Rectangle {
    const rect: Rectangle = Rectangle.mkPP(this.Sites.getItem(0).point, this.Sites.getItem(1).point)
    rect.add(this.Sites.getItem(2).point)
    return rect
  }

  static mkSSSEED(
    aLeft: CdtSite,
    aRight: CdtSite,
    bRight: CdtSite,
    a: CdtEdge,
    b: CdtEdge,
    createEdgeDelegate: (a: CdtSite, b: CdtSite) => CdtEdge,
  ) {
    const t = new CdtTriangle()
    t.Sites.setItem(0, aLeft)
    t.Sites.setItem(1, aRight)
    t.Sites.setItem(2, bRight)
    t.Edges.setItem(0, a)
    t.Edges.setItem(1, b)
    t.BindEdgeToTriangle(aLeft, a)
    t.BindEdgeToTriangle(aRight, b)
    t.CreateEdge(2, createEdgeDelegate)
    return t
  }
  toString(): string {
    return this.Sites.getItem(0).toString() + ',' + this.Sites.getItem(1).toString() + ',' + this.Sites.getItem(2).toString()
  }
}
