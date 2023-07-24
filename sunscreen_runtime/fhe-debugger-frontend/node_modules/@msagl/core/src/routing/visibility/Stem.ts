import {String} from 'typescript-string-operations'
import {PolylinePoint} from '../../math/geometry/polylinePoint'

// represents a chunk of a hole boundary
export class Stem {
  private start: PolylinePoint

  get Start(): PolylinePoint {
    return this.start
  }
  set Start(value: PolylinePoint) {
    this.start = value
  }

  private end: PolylinePoint

  get End(): PolylinePoint {
    return this.end
  }
  set End(value: PolylinePoint) {
    this.end = value
  }

  constructor(start: PolylinePoint, end: PolylinePoint) {
    //Assert.assert(start.polyline === end.polyline)
    this.start = start
    this.end = end
  }

  *Sides(): IterableIterator<PolylinePoint> {
    let v: PolylinePoint = this.start
    while (v !== this.end) {
      const side: PolylinePoint = v
      yield side
      v = side.nextOnPolyline
    }
  }

  MoveStartClockwise(): boolean {
    if (this.Start !== this.End) {
      this.Start = this.Start.nextOnPolyline
      return true
    }

    return false
  }

  toString(): string {
    return String.Format('Stem({0},{1})', this.Start, this.End)
  }
}
