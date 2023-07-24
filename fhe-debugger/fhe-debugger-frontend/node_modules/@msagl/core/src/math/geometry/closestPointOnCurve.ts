import {Point} from './point'
import {ICurve} from './icurve'
import {GeomConstants} from './geomConstants'
export class ClosestPointOnCurve {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static closestPoint(curve: ICurve, a: Point, hint: number, low: number, high: number): number {
    const numberOfIterationsMax = 5
    const numberOfOverShootsMax = 5
    let t = hint

    let numberOfIteration = 0
    let numberOfOvershoots = 0
    let dt: number
    let abort = false
    do {
      const c = curve.value(t)
      const ct = curve.derivative(t)
      const ctt = curve.secondDerivative(t)

      const secondDerivative = ct.dot(ct) + c.sub(a).dot(ctt)

      if (Math.abs(secondDerivative) < GeomConstants.tolerance) return t

      dt = c.sub(a).dot(ct.div(secondDerivative))

      t -= dt

      if (t > high + GeomConstants.tolerance) {
        t = high
        numberOfOvershoots++
      } else if (t < low - GeomConstants.tolerance) {
        t = low
        numberOfOvershoots++
      }
      numberOfIteration++
    } while (
      Math.abs(dt) > GeomConstants.tolerance &&
      !(abort = numberOfIteration >= numberOfIterationsMax || numberOfOvershoots >= numberOfOverShootsMax)
    )

    //may be the initial value was just fine
    if (abort && curve.value(hint).sub(a).length < GeomConstants.distanceEpsilon) t = hint

    return t
  }
}
