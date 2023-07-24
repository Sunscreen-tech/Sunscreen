import {Point, TriangleOrientation} from './point'
export class CornerSite {
  // the coeffiecient used to calculate the first and the second control points of the
  // Bezier segment for the fillet at the site
  previouisBezierCoefficient = 0.5
  // the coeffiecient used to calculate the third and the fourth control points of the
  // Bezier segment for the fillet at the site
  nextBezierCoefficient = 0.5

  // the coefficient tells how tight the segment fits to the segment after the site; the formula is kNext * c + (1 - kNext) * b
  previousTangentCoefficient = 1.0 / 3

  nextTangentCoefficient = 1.0 / 3
  point: Point

  prev: CornerSite

  next: CornerSite
  static mkSiteP(sitePoint: Point): CornerSite {
    const s = new CornerSite()
    s.point = sitePoint
    return s
  }

  static mkSiteSP(previousSite: CornerSite, sitePoint: Point): CornerSite {
    const s = new CornerSite()
    s.point = sitePoint
    s.prev = previousSite
    previousSite.next = s
    return s
  }

  static mkSiteSPS(previousSite: CornerSite, sitePoint: Point, nextSite: CornerSite): CornerSite {
    const s = new CornerSite()
    s.prev = previousSite
    s.point = sitePoint
    s.next = nextSite

    previousSite.next = s
    nextSite.prev = s
    return s
  }

  get turn(): TriangleOrientation {
    if (this.next == null || this.prev == null) return 0
    return Point.getTriangleOrientation(this.prev.point, this.point, this.next.point)
  }

  clone(): CornerSite {
    const s = new CornerSite()
    s.previouisBezierCoefficient = this.previouisBezierCoefficient
    s.point = this.point
    return s
  }
}
