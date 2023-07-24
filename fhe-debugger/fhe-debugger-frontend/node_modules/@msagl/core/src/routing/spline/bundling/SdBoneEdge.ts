import {Point} from '../../../math/geometry/point'
import {CdtEdge} from '../../ConstrainedDelaunayTriangulation/CdtEdge'
import {VisibilityEdge} from '../../visibility/VisibilityEdge'
import {SdVertex} from './SdVertex'

//    [DebuggerDisplay("({SourcePoint.x},{SourcePoint.y})->({TargetPoint.x},{TargetPoint.y})")]
export class SdBoneEdge {
  VisibilityEdge: VisibilityEdge

  Source: SdVertex

  Target: SdVertex

  numberOfPassedPaths = 0

  constructor(visibilityEdge: VisibilityEdge, source: SdVertex, target: SdVertex) {
    this.VisibilityEdge = visibilityEdge
    this.Source = source
    this.Target = target
  }

  get TargetPoint(): Point {
    return this.Target.Point
  }

  get SourcePoint(): Point {
    return this.Source.Point
  }

  get IsOccupied(): boolean {
    return this.numberOfPassedPaths > 0
  }

  CrossedCdtEdges: Set<CdtEdge>

  get IsPassable(): boolean {
    return (
      this.Target.IsTargetOfRouting ||
      this.Source.IsSourceOfRouting ||
      this.VisibilityEdge.IsPassable == null ||
      this.VisibilityEdge.IsPassable()
    )
  }

  AddOccupiedEdge() {
    this.numberOfPassedPaths++
  }

  RemoveOccupiedEdge() {
    this.numberOfPassedPaths--
    /*Assert.assert(this.numberOfPassedPaths >= 0)*/
  }
}
