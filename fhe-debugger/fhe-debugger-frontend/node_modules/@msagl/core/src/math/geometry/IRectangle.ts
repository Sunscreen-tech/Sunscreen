// here P can be a Point, or a number
// IRectangle<Point> corresponds to Rectangle
// IRectangle<number> corresponds to Interval
export interface IRectangle<P> {
  add(point: P): void

  add_rect(rectangle: IRectangle<P>): IRectangle<P>

  contains_point(point: P): boolean

  contains_rect(rect: IRectangle<P>): boolean

  intersection_rect(rectangle: IRectangle<P>): IRectangle<P>

  intersects_rect(rectangle: IRectangle<P>): boolean

  area: number

  contains_point_radius(p: P, radius: number): boolean
}
