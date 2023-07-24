import {Point} from './../../math/geometry/point'

import {String} from 'typescript-string-operations'
import {VisibilityVertex} from './VisibilityVertex'
// import {Assert} from '../../utils/assert'
// an edge connecting two VisibilityVertices
export class VisibilityEdge {
  LengthMultiplier = 1

  static u = new Point(545.833, 840.458)
  static v = new Point(606.1667261889578, 786.2917261889578)

  static closeuv(s: VisibilityVertex, t: VisibilityVertex) {
    return Point.closeDistEps(s.point, VisibilityEdge.u, 0.1) && Point.closeDistEps(t.point, VisibilityEdge.v, 0.1)
  }

  constructor(s: VisibilityVertex, t: VisibilityVertex, weight = 1) {
    // Assert.assert(!source.point.equal(target.point), 'Self-edges are not allowed')
    // Assert.assert(!(VisibilityEdge.closeuv(s, t) || VisibilityEdge.closeuv(t, s)))
    this.Source = s
    this.Target = t
    this.Weight = weight
  }

  Weight: number
  static DefaultWeight = 1

  IsPassable: () => boolean

  // edge source point
  public get SourcePoint(): Point {
    return this.Source.point
  }

  // edge target point
  public get TargetPoint(): Point {
    return this.Target.point
  }

  Source: VisibilityVertex
  Target: VisibilityVertex

  get Length(): number {
    return this.SourcePoint.sub(this.TargetPoint).length * this.LengthMultiplier
  }

  toString(): string {
    return String.Format('{0}->{1} ({2})', this.Source, this.Target, this.Weight)
  }

  ReversedClone(): VisibilityEdge {
    return new VisibilityEdge(this.Target, this.Source)
  }

  Clone(): VisibilityEdge {
    return new VisibilityEdge(this.Source, this.Target)
  }
}
