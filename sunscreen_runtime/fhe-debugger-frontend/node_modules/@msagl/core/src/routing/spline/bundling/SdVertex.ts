import {Point} from '../../..'
import {CdtTriangle} from '../../ConstrainedDelaunayTriangulation/CdtTriangle'
import {VisibilityVertex} from '../../visibility/VisibilityVertex'
import {SdBoneEdge} from './SdBoneEdge'

export class SdVertex {
  VisibilityVertex: VisibilityVertex

  InBoneEdges: Array<SdBoneEdge> = new Array<SdBoneEdge>()

  OutBoneEdges: Array<SdBoneEdge> = new Array<SdBoneEdge>()

  get Prev(): SdVertex {
    if (this.PrevEdge == null) {
      return null
    }
    return this.PrevEdge.Source === this ? this.PrevEdge.Target : this.PrevEdge.Source
  }

  PrevEdge: SdBoneEdge

  constructor(visibilityVertex: VisibilityVertex) {
    this.VisibilityVertex = visibilityVertex
  }

  Triangle: CdtTriangle

  IsSourceOfRouting: boolean
  IsTargetOfRouting: boolean

  get Point(): Point {
    return this.VisibilityVertex.point
  }

  cost: number

  get Cost(): number {
    if (this.IsSourceOfRouting) {
      return this.cost
    }
    return this.Prev == null ? Number.POSITIVE_INFINITY : this.cost
  }
  set Cost(value: number) {
    this.cost = value
  }

  public SetPreviousToNull() {
    this.PrevEdge = null
  }
}
