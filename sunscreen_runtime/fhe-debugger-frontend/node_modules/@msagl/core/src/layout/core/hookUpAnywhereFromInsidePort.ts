// This port is for an edge connecting a node inside of the curve going out of the curve and creating a hook to
// connect to the curve

import {ICurve, Point} from '../..'
import {Polyline} from '../../math/geometry'
import {Port} from './port'

export class HookUpAnywhereFromInsidePort extends Port {
  curve: () => ICurve

  adjustmentAngle: number = Math.PI / 10

  mk(boundaryCurve: () => ICurve, hookSize: number): HookUpAnywhereFromInsidePort {
    const ret = new HookUpAnywhereFromInsidePort(boundaryCurve)
    ret.HookSize = hookSize
    return ret
  }

  constructor(boundaryCurve: () => ICurve) {
    super()
    this.curve = boundaryCurve
    this.location = this.curve().start
  }

  location: Point

  // returns a point on the boundary curve

  get Location(): Point {
    return this.location
  }

  // Gets the boundary curve of the port.

  get Curve(): ICurve {
    return this.curve()
  }

  SetLocation(p: Point) {
    this.location = p
  }

  LoosePolyline: Polyline
  // We are trying to correct the last segment of the polyline by make it perpendicular to the Port.Curve.
  // For this purpose we trim the curve by the cone of the angle 2*adjustment angle and project the point before the last of the polyline to this curve.

  get AdjustmentAngle(): number {
    return this.adjustmentAngle
  }
  set AdjustmentAngle(value: number) {
    this.adjustmentAngle = value
  }

  hookSize = 9

  // the size of the self-loop
  get HookSize(): number {
    return this.hookSize
  }
  set HookSize(value: number) {
    this.hookSize = value
  }
}
