import {ICurve} from '../../math/geometry/icurve'
import {Point} from '../../math/geometry/point'

export abstract class Port {
  // Gets the point associated with the port.
  abstract get Location(): Point
  abstract set Location(value: Point)

  // Gets the boundary curve of the port.
  abstract get Curve(): ICurve
  abstract set Curve(value: ICurve)
}
