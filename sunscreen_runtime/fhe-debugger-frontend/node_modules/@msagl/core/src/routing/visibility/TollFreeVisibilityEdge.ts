import {VisibilityEdge} from './VisibilityEdge'
import {VisibilityVertex} from './VisibilityVertex'

export class TollFreeVisibilityEdge extends VisibilityEdge {
  static constructorVV(source: VisibilityVertex, target: VisibilityVertex): TollFreeVisibilityEdge {
    return new TollFreeVisibilityEdge(source, target, 0)
  }

  constructor(source: VisibilityVertex, target: VisibilityVertex, weight = 0) {
    super(source, target, weight)
  }
}
