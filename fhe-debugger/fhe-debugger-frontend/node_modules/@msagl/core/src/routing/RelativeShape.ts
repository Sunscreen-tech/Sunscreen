// A shape wrapping an ICurve delegate, providing additional information.

import {GeomNode} from '../layout/core'
import {ICurve} from '../math/geometry'
import {Shape} from './shape'

export class RelativeShape extends Shape {
  // The curve of the shape.
  node: GeomNode
  public get BoundaryCurve(): ICurve {
    return this.node.boundaryCurve
  }
  public set BoundaryCurve(value: ICurve) {
    if (value) throw new Error('Cannot set BoundaryCurve directly for RelativeShape')
  }

  curveDelegate: () => ICurve

  // Constructor taking the ID and the curve delegate for the shape.

  constructor(node: GeomNode) {
    super(null)
    this.node = node
  }
}
