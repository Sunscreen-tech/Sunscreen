import {ICurve} from '../../math/geometry/icurve'
import {Point} from '../../math/geometry/point'
import {Port} from './port'

export class FloatingPort extends Port {
  curve: ICurve

  // a curve associated with the port

  // constructor

  public constructor(curve: ICurve, location: Point) {
    super()
    this.curve = this.curve
    this.location = location.clone()
  }

  location: Point

  // the location of the port

  get Location(): Point {
    return this.location
  }
  set Location(value: Point) {
    this.location = value
  }

  // translate the port location by delta

  public /* virtual */ Translate(delta: Point) {
    this.location = this.location.add(delta)
  }

  // the port's curve

  public get Curve(): ICurve {
    return this.curve
  }
  public set Curve(value: ICurve) {
    this.curve = value
  }
}
