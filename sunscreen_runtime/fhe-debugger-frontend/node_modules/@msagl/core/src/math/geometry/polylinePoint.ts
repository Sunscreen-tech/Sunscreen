import {Point} from './point'
import {Polyline} from './polyline'
export class PolylinePoint {
  private _point: Point
  public get point(): Point {
    return this._point
  }
  public set point(value: Point) {
    this._point = value
  }

  private _next: PolylinePoint = null
  public get next(): PolylinePoint {
    return this._next
  }

  public set next(value: PolylinePoint) {
    this._next = value
  }
  prev: PolylinePoint = null
  polyline: Polyline

  get nextOnPolyline(): PolylinePoint {
    return this.polyline.next(this)
  }
  get prevOnPolyline(): PolylinePoint {
    return this.polyline.prev(this)
  }

  //
  getNext(): PolylinePoint {
    return this.next
  }

  setNext(nVal: PolylinePoint) {
    this.next = nVal
    if (this.polyline != null) this.polyline.setInitIsRequired()
  }

  //
  getPrev() {
    return this.prev
  }
  setPrev(prevVal: PolylinePoint) {
    this.prev = prevVal
    if (this.polyline != null) this.polyline.setInitIsRequired()
  }

  static mkFromPoint(p: Point) {
    const pp = new PolylinePoint()
    pp.point = p
    return pp
  }
}
