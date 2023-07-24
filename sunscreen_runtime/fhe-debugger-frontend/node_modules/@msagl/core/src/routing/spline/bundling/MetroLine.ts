import {Polyline} from '../../../math/geometry'

// holds the data of a path
export class Metroline {
  Width: number

  Length: number

  IdealLength: number
  Polyline: Polyline

  Index: number

  constructor(polyline: Polyline, width: number, sourceAndTargetLoosePolys: () => [Polyline, Polyline], index: number) {
    this.Width = width
    this.Polyline = polyline
    this.sourceAndTargetLoosePolylines = sourceAndTargetLoosePolys
    this.Index = index
  }

  UpdateLengths() {
    let l = 0
    for (let p = this.Polyline.startPoint; p.next != null; p = p.next) {
      l += p.next.point.sub(p.point).length
    }

    this.Length = l
    this.IdealLength = this.Polyline.end.sub(this.Polyline.start).length
  }

  sourceAndTargetLoosePolylines: () => [Polyline, Polyline]
}
