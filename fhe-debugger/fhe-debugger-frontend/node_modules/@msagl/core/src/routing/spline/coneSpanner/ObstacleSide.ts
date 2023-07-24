import {Point} from '../../../math/geometry/point'
import {Polyline} from '../../../math/geometry/polyline'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {SegmentBase} from '../../visibility/SegmentBase'

export abstract class ObstacleSide extends SegmentBase {
  StartVertex: PolylinePoint

  Init(sv: PolylinePoint) {
    this.StartVertex = sv
  }

  constructor(startVertex: PolylinePoint) {
    super()
    this.Init(startVertex)
  }

  abstract get EndVertex(): PolylinePoint
  get Polyline(): Polyline {
    return this.StartVertex.polyline
  }

  get Start(): Point {
    return this.StartVertex.point
  }

  get End(): Point {
    return this.EndVertex.point
  }

  //

  // public  ToString(): string {
  //    let typeString: string = this.GetType().ToString();
  //    let lastDotLoc: number = typeString.LastIndexOf('.');
  //    if ((lastDotLoc >= 0)) {
  //        typeString = typeString.Substring((lastDotLoc + 1));
  //    }

  //    return (typeString + (" ["
  //        + (this.start.ToString() + (" -> "
  //            + (this.End.ToString() + "]")))));
  // }
}
