import {Ellipse} from './ellipse'
import {Curve} from './curve'
import {Point} from './point'
import {LineSegment} from './lineSegment'
import {PlaneTransformation} from './planeTransformation'
import {ICurve} from './icurve'
import {Polyline} from '.'
type RoundedRectRadii = {
  radX: number
  radY: number
}

export class CurveFactory {
  static mkEllipse(rx: number, ry: number, center: Point): ICurve {
    return Ellipse.mkFullEllipseNNP(rx, ry, center)
  }
  static createParallelogram(width: number, height: number, center: Point): ICurve {
    const h = height / 2
    const w = width / 2
    const x = center.x
    const y = center.y
    const angle = (80 * Math.PI) / 180
    const deltax = h / Math.tan(angle)
    const poly = Polyline.mkClosedFromPoints([
      new Point(-w - deltax + x, -h + y),
      new Point(w + x, -h + y),
      new Point(w + x + deltax, h + y),
      new Point(-w + x, h + y),
    ])
    return poly
  }
  public static createHexagon(width: number, height: number, center: Point): ICurve {
    const h = height / 2
    const w = width / 2
    const x = center.x
    const y = center.y
    const poly = Polyline.mkClosedFromPoints([
      new Point(-w + x, -h + y),
      new Point(w + x, -h + y),
      new Point(w + (h + x), 0 + y),
      new Point(w + x, h + y),
      new Point(-w + x, h + y),
      new Point(-(w - h) + x, 0 + y),
    ])
    return poly
  }
  // This adds the padding to the edges around the inscribed rectangle of an octagon.
  static octagonPad = 1.0 / 4

  static createOctagon(width: number, height: number, center: Point): Polyline {
    const w: number = width / 2
    const h: number = height / 2
    const ps: Point[] = new Array(8)
    // Pad out horizontally
    ps[0] = new Point(w + CurveFactory.octagonPad * w, h - h * CurveFactory.octagonPad)
    ps[3] = new Point(ps[0].x * -1, ps[0].y)
    ps[4] = new Point(ps[3].x, ps[3].y * -1)
    ps[7] = new Point(ps[0].x, ps[0].y * -1)
    // Pad out vertically
    ps[1] = new Point(w - w * CurveFactory.octagonPad, h + h * CurveFactory.octagonPad)
    ps[2] = new Point(ps[1].x * -1, ps[1].y)
    ps[6] = new Point(ps[1].x, ps[1].y * -1)
    ps[5] = new Point(ps[2].x, ps[2].y * -1)
    for (let i = 0; i < 8; i++) {
      ps[i] = ps[i].add(center)
    }

    return Polyline.mkClosedFromPoints(ps)
  }
  public static createInvertedHouse(width: number, height: number, center: Point): ICurve {
    const shape: ICurve = CurveFactory.createHouse(width, height, center)
    return CurveFactory.rotateCurveAroundCenterByDegree(shape, center, 180)
  }
  public static createHouse(width: number, height: number, center: Point): ICurve {
    const w: number = width / 2
    const h: number = height / 2
    const x: number = center.x
    const y: number = center.y
    const c: Curve = new Curve()
    Curve.addLineSegmentCNNNN(c, x - w, y - h, x + w, y - h)
    Curve.continueWithLineSegmentNN(c, x + w, y + h)
    Curve.continueWithLineSegmentNN(c, x, y + 2 * h)
    Curve.continueWithLineSegmentNN(c, x - w, y + h)
    return Curve.closeCurve(c)
  }
  public static mkDiamond(width: number, height: number, center: Point): ICurve {
    const w: number = width
    const h: number = height
    const x: number = center.x
    const y: number = center.y
    const c: Curve = new Curve()
    const p: Point[] = [new Point(x, y - h), new Point(x + w, y), new Point(x, y + h), new Point(x - w, y)]
    c.addSegs([LineSegment.mkPP(p[0], p[1]), LineSegment.mkPP(p[1], p[2]), LineSegment.mkPP(p[2], p[3]), LineSegment.mkPP(p[3], p[0])])
    return c
  }
  static rotateCurveAroundCenterByDegree(curve: ICurve, center: Point, angle: number) {
    return CurveFactory.rotateCurveAroundCenterByRadian(curve, center, (angle * Math.PI) / 180)
  }

  static rotateCurveAroundCenterByRadian(curve: ICurve, center: Point, angle: number) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const transform = new PlaneTransformation(1, 0, center.x, 0, 1, center.y)
      .multiply(new PlaneTransformation(c, -s, 0, s, c, 0))
      .multiply(new PlaneTransformation(1, 0, -center.x, 0, 1, -center.y))
    return curve.transform(transform)
  }
  static mkCircle(radius: number, center: Point) {
    return Ellipse.mkCircle(radius, center)
  }
  static createRectangle(width: number, height: number, center: Point): Curve {
    const w = width / 2
    const h = height / 2
    const x = center.x
    const y = center.y
    const c = new Curve()
    const p = [new Point(x - w, y - h), new Point(x + w, y - h), new Point(x + w, y + h), new Point(x - w, y + h)]
    c.addSegs([LineSegment.mkPP(p[0], p[1]), LineSegment.mkPP(p[1], p[2]), LineSegment.mkPP(p[2], p[3]), LineSegment.mkPP(p[3], p[0])])
    return c
  }

  static isRoundedRect(ic: ICurve): RoundedRectRadii | undefined {
    if (!(ic instanceof Curve)) return
    const segs = ic.segs
    if (segs.length !== 8 && segs.length !== 4) return
    const full = segs.length === 8 ? true : false
    let radX: number
    let radY: number
    for (let k = 0; k < 4; k++) {
      const i = full ? 2 * k + 1 : k
      if (k === 0) {
        if (!(segs[i] instanceof Ellipse)) {
          return
        }
        const el = segs[i] as Ellipse
        radX = el.aAxis.length
        radY = el.bAxis.length
      } else {
        if (!(segs[i] instanceof Ellipse)) {
          return
        }
        const el = segs[i] as Ellipse
        if (radX !== el.aAxis.length || radY !== el.bAxis.length) return
      }
      // some more checks are missing!
    }
    return {
      radX: radX,
      radY: radY,
    }
  }

  static mkRectangleWithRoundedCorners(width: number, height: number, radX: number, radY: number, center: Point = new Point(0, 0)): Curve {
    if (radX === 0 || radY === 0) {
      return CurveFactory.createRectangle(width, height, center)
    }
    const c = new Curve()
    const w = width / 2
    if (radX > w / 2) radX = w / 2
    const h = height / 2
    if (radY > h / 2) radY = h / 2
    const x = center.x
    const y = center.y
    const ox = w - radX
    const oy = h - radY
    const top = y + h
    const bottom = y - h
    const left = x - w
    const right = x + w
    //ellipse's axises
    const a = new Point(radX, 0)
    const b = new Point(0, radY)

    if (ox > 0) c.addSegment(LineSegment.mkPP(new Point(x - ox, bottom), new Point(x + ox, bottom)))
    c.addSegment(Ellipse.mkEllipse(1.5 * Math.PI, 2 * Math.PI, a, b, x + ox, y - oy))
    if (oy > 0) c.addSegment(LineSegment.mkPP(new Point(right, y - oy), new Point(right, y + oy)))
    c.addSegment(Ellipse.mkEllipse(0, 0.5 * Math.PI, a, b, x + ox, y + oy))
    if (ox > 0) c.addSegment(LineSegment.mkPP(new Point(x + ox, top), new Point(x - ox, top)))
    c.addSegment(Ellipse.mkEllipse(0.5 * Math.PI, Math.PI, a, b, x - ox, y + oy))
    if (oy > 0) c.addSegment(LineSegment.mkPP(new Point(left, y + oy), new Point(left, y - oy)))
    c.addSegment(Ellipse.mkEllipse(Math.PI, 1.5 * Math.PI, a, b, x - ox, y - oy))
    return c
  }
}
