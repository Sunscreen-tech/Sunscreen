import {Point} from './point'
import {Polyline} from './polyline'
import {GeomConstants} from './geomConstants'
import {IRectangle} from './IRectangle'
import {closeDistEps} from '../../utils/compare'
import {PlaneTransformation} from './planeTransformation'

export class Size {
  pad(padW: number): any {
    this.width += padW * 2
  }
  width: number
  height: number
  /** creates a square if called with width only */
  constructor(width: number, height = width) {
    this.width = width
    this.height = height
  }
}
export type RectJSON = {left: number; right: number; top: number; bottom: number}

export class Rectangle implements IRectangle<Point> {
  /** this function will not work correctly for transformations that are not translations, or rotations by n*90, or a combination of those */
  transform(m: PlaneTransformation): Rectangle {
    return Rectangle.mkPP(m.multiplyPoint(this.leftTop), m.multiplyPoint(this.rightBottom))
  }
  translate(m: Point): Rectangle {
    return Rectangle.mkSizeCenter(this.size, this.center.add(m))
  }
  /** Returns true iff the rectangles are geometrically identical */
  equal(bbox: Rectangle): boolean {
    return this.left_ === bbox.left && this.right_ === bbox.right && this.top_ === bbox.top && this.bottom_ === bbox.bottom
  }
  /** Returns true iff the rectangles are distEpsilon close */
  equalEps(bbox: Rectangle): boolean {
    return (
      closeDistEps(this.left_, bbox.left) &&
      closeDistEps(this.right_, bbox.right) &&
      closeDistEps(this.top_, bbox.top) &&
      closeDistEps(this.bottom_, bbox.bottom)
    )
  }
  /** make a rectangle with the given size and center */
  static mkSizeCenter(size: Size, center: Point): Rectangle {
    const w = size.width / 2
    const h = size.height / 2
    return new Rectangle({
      left: center.x - w,
      right: center.x + w,
      bottom: center.y - h,
      top: center.y + h,
    })
  }
  left_: number
  bottom_: number
  right_: number
  top_: number

  constructor(t: RectJSON) {
    this.left_ = t.left
    this.right_ = t.right
    this.top_ = t.top
    this.bottom = t.bottom
  }

  add_rect(rectangle: IRectangle<Point>): IRectangle<Point> {
    return this.addRec(rectangle as unknown as Rectangle)
  }
  contains_point(point: Point): boolean {
    return this.contains(point)
  }
  contains_rect(rect: IRectangle<Point>): boolean {
    return this.containsRect(rect as Rectangle)
  }
  intersection_rect(rectangle: IRectangle<Point>): IRectangle<Point> {
    return this.intersection(rectangle as Rectangle)
  }
  intersects_rect(rectangle: IRectangle<Point>): boolean {
    return this.intersects(rectangle as Rectangle)
  }
  unite(b: IRectangle<Point>): IRectangle<Point> {
    return Rectangle.rectangleOfTwo(this, b as Rectangle)
  }
  contains_point_radius(p: Point, radius: number): boolean {
    return this.containsWithPadding(p, radius)
  }
  // returns true if r intersect this rectangle
  intersects(rectangle: Rectangle): boolean {
    return this.intersectsOnX(rectangle) && this.intersectsOnY(rectangle)
  }

  // intersection (possibly empty) of rectangles
  intersection(rectangle: Rectangle): Rectangle {
    if (!this.intersects(rectangle)) {
      const intersection = Rectangle.mkEmpty()
      intersection.setToEmpty()
      return intersection
    }
    const l = Math.max(this.left, rectangle.left)
    const r = Math.min(this.right, rectangle.right)
    const b = Math.max(this.bottom, rectangle.bottom)
    const t = Math.min(this.top, rectangle.top)
    return new Rectangle({left: l, bottom: b, right: r, top: t})
  }

  // the center of the bounding box
  get center(): Point {
    return this.leftTop.add(this.rightBottom).mul(0.5)
  }
  set center(value: Point) {
    const cen = this.leftTop.add(this.rightBottom).mul(0.5)
    const shift = value.sub(cen)
    this.leftTop = this.leftTop.add(shift)
    this.rightBottom = this.rightBottom.add(shift)
  }

  intersectsOnY(r: Rectangle): boolean {
    if (r.bottom_ > this.top_ + GeomConstants.distanceEpsilon) return false

    if (r.top_ < this.bottom_ - GeomConstants.distanceEpsilon) return false

    return true
  }

  intersectsOnX(r: Rectangle): boolean {
    if (r.left > this.right_ + GeomConstants.distanceEpsilon) return false

    if (r.right < this.left_ - GeomConstants.distanceEpsilon) return false

    return true
  }

  // creates an empty rectangle
  static mkEmpty() {
    return new Rectangle({left: 0, right: -1, bottom: 0, top: -1})
  }

  get left() {
    return this.left_
  }
  set left(value: number) {
    this.left_ = value
    this.onUpdated()
  }

  get right() {
    return this.right_
  }
  set right(value: number) {
    this.right_ = value
    this.onUpdated()
  }

  get top() {
    return this.top_
  }
  set top(value: number) {
    this.top_ = value
    this.onUpdated()
  }

  get bottom() {
    return this.bottom_
  }
  set bottom(value: number) {
    this.bottom_ = value
    this.onUpdated()
  }

  get leftBottom() {
    return new Point(this.left_, this.bottom_)
  }
  set leftBottom(value) {
    this.left_ = value.x
    this.bottom = value.y
  }

  get rightTop() {
    return new Point(this.right_, this.top_)
  }
  set rightTop(value) {
    this.right_ = value.x
    this.top_ = value.y
  }

  get leftTop() {
    return new Point(this.left_, this.top_)
  }
  set leftTop(value: Point) {
    this.left_ = value.x
    this.top_ = value.y
  }

  get rightBottom() {
    return new Point(this.right_, this.bottom_)
  }
  set rightBottom(value) {
    this.right_ = value.x
    this.bottom = value.y
  }

  /* eslint-disable  @typescript-eslint/no-empty-function */
  protected onUpdated(): void {}

  // create a box of two points
  static mkPP(point0: Point, point1: Point) {
    const r = new Rectangle({
      left: point0.x,
      right: point0.x,
      top: point0.y,
      bottom: point0.y,
    })
    r.add(point1)
    return r
  }

  // create rectangle from a point
  static rectangleOnPoint(p: Point) {
    return new Rectangle({left: p.x, right: p.x, top: p.y, bottom: p.y})
  }

  static mkLeftBottomSize(left: number, bottom: number, sizeF: Size) {
    const right = left + sizeF.width
    const top = bottom + sizeF.height
    return new Rectangle({left: left, right: right, top: top, bottom: bottom})
  }

  // create a box on points (x0,y0), (x1,y1)
  static getRectangleOnCoords(x0: number, y0: number, x1: number, y1: number) {
    const r = new Rectangle({left: x0, bottom: y0, right: x0, top: y0})
    r.add(new Point(x1, y1))
    return r
  }

  // Create rectangle that is the bounding box of the given points
  static mkOnPoints(points: Iterable<Point>): Rectangle {
    const r = Rectangle.mkEmpty()
    for (const p of points) {
      r.add(p)
    }
    return r
  }

  // Create rectangle that is the bounding box of the given Rectangles
  static mkOnRectangles(rectangles: Iterable<Rectangle>) {
    const r = Rectangle.mkEmpty()
    for (const p of rectangles) {
      r.addRecSelf(p)
    }
    return r
  }

  // the width of the rectangle
  get width() {
    return this.right_ - this.left_
  }
  set width(value: number) {
    const hw = value / 2.0
    const cx = (this.left_ + this.right_) / 2.0
    this.left_ = cx - hw
    this.right_ = cx + hw
  }

  // returns true if the rectangle has negative width
  isEmpty(): boolean {
    return this.right < this.left
  }

  // makes the rectangle empty
  setToEmpty() {
    this.left = 0
    this.right = -1
  }

  // height of the rectangle
  get height() {
    return this.top_ - this.bottom_
  }
  set height(value) {
    const hw = value / 2.0
    const cx = (this.top_ + this.bottom_) / 2.0
    this.top_ = cx + hw
    this.bottom = cx - hw
  }

  // rectangle containing both a and b
  static rectangleOfTwo(a: Rectangle, b: Rectangle) {
    const r = new Rectangle({
      left: a.left_,
      right: a.right_,
      top: a.top_,
      bottom: a.bottom_,
    })
    r.addRecSelf(b)
    return r
  }

  // contains with padding
  containsWithPadding(point: Point, padding: number): boolean {
    return (
      this.left_ - padding - GeomConstants.distanceEpsilon <= point.x &&
      point.x <= this.right_ + padding + GeomConstants.distanceEpsilon &&
      this.bottom_ - padding - GeomConstants.distanceEpsilon <= point.y &&
      point.y <= this.top_ + padding + GeomConstants.distanceEpsilon
    )
  }

  // Rectangle area
  get area() {
    return (this.right_ - this.left_) * (this.top_ - this.bottom_)
  }

  // adding a point to the rectangle
  add(point: Point) {
    if (!this.isEmpty()) {
      if (this.left_ > point.x) this.left_ = point.x

      if (this.top_ < point.y) this.top_ = point.y

      if (this.right_ < point.x) this.right_ = point.x

      if (this.bottom_ > point.y) this.bottom = point.y
    } else {
      this.left_ = this.right_ = point.x
      this.top_ = this.bottom = point.y
    }
  }

  // adding rectangle
  addRecSelf(rectangle: Rectangle) {
    this.add(rectangle.leftTop)
    this.add(rectangle.rightBottom)
  }

  // adding rectangle
  addRec(rectangle: Rectangle): Rectangle {
    const ret = this.clone()
    ret.add(rectangle.leftTop)
    ret.add(rectangle.rightBottom)
    return ret
  }

  /**  Returns the translated clone of the specified rectangle */
  static translate(rectangle: Rectangle, delta: Point): Rectangle {
    const r = rectangle.clone()
    r.center = rectangle.center.add(delta)
    return r
  }

  /**  Returns a new Rectangle which is the transform the input rectangle */
  static transform(rectangle: Rectangle, m: PlaneTransformation): Rectangle {
    return Rectangle.mkPP(m.multiplyPoint(rectangle.leftTop), m.multiplyPoint(rectangle.rightBottom))
  }

  // returns true if the rectangle contains the point
  contains(point: Point): boolean {
    return this.containsWithPadding(point, 0)
  }

  // returns true if this rectangle compconstely contains the specified rectangle
  containsRect(rect: Rectangle): boolean {
    return this.contains(rect.leftTop) && this.contains(rect.rightBottom)
  }

  // returns true if this rectangle compconstely contains the specified rectangle
  containsRectWithPadding(rect: Rectangle, padding: number): boolean {
    return this.containsWithPadding(rect.leftTop, padding) && this.containsWithPadding(rect.rightBottom, padding)
  }

  // return the length of the diagonal
  get diagonal() {
    return Math.sqrt(this.width * this.width + this.height * this.height)
  }

  // pad the rectangle horizontally by the given padding
  padWidth(padding: number) {
    this.left -= padding
    this.right += padding
  }

  // pad the rectangle vertically by the given padding
  padHeight(padding: number) {
    this.top += padding
    this.bottom -= padding
  }

  // pad the rectangle by the given padding
  pad(padding: number): void {
    if (padding < -this.width / 2) padding = -this.width / 2
    if (padding < -this.height / 2) padding = -this.height / 2
    this.padWidth(padding)
    this.padHeight(padding)
  }

  // Pad the rectangle by the given amount on each side
  padEverywhere(margins: {left: number; bottom: number; right: number; top: number}) {
    this.left -= margins.left
    this.right += margins.right
    this.bottom -= margins.bottom
    this.top += margins.top
  }

  // Returns the intersection of two rectangles.
  static intersect(rect1: Rectangle, rect2: Rectangle): Rectangle {
    if (rect1.intersects(rect2))
      return Rectangle.mkPP(
        new Point(Math.max(rect1.left, rect2.left), Math.max(rect1.bottom, rect2.bottom)),
        new Point(Math.min(rect1.right, rect2.right), Math.min(rect1.top, rect2.top)),
      )
    return Rectangle.mkEmpty()
  }

  perimeter(): Polyline {
    const poly = new Polyline()
    poly.addPoint(this.leftTop)
    poly.addPoint(this.rightTop)
    poly.addPoint(this.rightBottom)
    poly.addPoint(this.leftBottom)
    poly.closed = true
    return poly
  }

  scaleAroundCenter(scale: number) {
    this.width = this.width * scale
    this.height = this.height * scale
  }

  clone(): Rectangle {
    return new Rectangle({left: this.left, right: this.right, top: this.top, bottom: this.bottom})
  }

  // gets or sets the Size

  get size(): Size {
    return new Size(this.width, this.height)
  }
  set size(value: Size) {
    this.width = value.width
    this.height = value.height
  }

  // constructor with Size and center
  static creatRectangleWithSize(size: Size, center: Point) {
    const w = size.width / 2
    const left = center.x - w
    const right = center.x + w
    const h = size.height / 2
    const bottom = center.y - h
    const top = center.y + h
    return new Rectangle({left: left, right: right, top: top, bottom: bottom})
  }

  // adding a point with a Size
  addPointWithSize(size: Size, point: Point) {
    const w = size.width / 2
    const h = size.height / 2

    this.add(new Point(point.x - w, point.y - h))
    this.add(new Point(point.x + w, point.y - h))
    this.add(new Point(point.x - w, point.y + h))
    this.add(new Point(point.x + w, point.y + h))
  }
}
