// an utility class to keep different polylines created around a shape

import {Polyline} from '../math/geometry'
import {Shape} from './shape'

export class TightLooseCouple {
  private tightPoly: Polyline
  get TightPolyline(): Polyline {
    return this.tightPoly
  }
  set TightPolyline(value: Polyline) {
    this.tightPoly = value
  }

  LooseShape: Shape

  static mk(tightPolyline: Polyline, looseShape: Shape, distance: number): TightLooseCouple {
    const ret = new TightLooseCouple()
    ret.TightPolyline = tightPolyline
    ret.LooseShape = looseShape
    ret.Distance = distance
    return ret
  }

  // the loose polyline has been created with this distance
  Distance: number
  toString(): string {
    return (
      (this.TightPolyline == null ? 'null' : this.TightPolyline.toString().substring(0, 5)) +
      ',' +
      (this.LooseShape == null ? 'null' : this.LooseShape.toString().substring(0, 5))
    )
  }
}
