import {CompassVector} from '../../math/geometry/compassVector'
import {Point} from '../../math/geometry/point'
import {VisibilityVertex} from '../visibility/VisibilityVertex'
import {VertexEntry} from './VertexEntry'

export class VisibilityVertexRectilinear extends VisibilityVertex {
  constructor(point: Point) {
    super(point)
  }

  VertexEntries: VertexEntry[]
  SetVertexEntry(entry: VertexEntry) {
    if (this.VertexEntries == null) {
      this.VertexEntries = new Array(4)
    }

    this.VertexEntries[CompassVector.ToIndex(entry.Direction)] = entry
  }

  RemoveVertexEntries() {
    this.VertexEntries = null
  }
}
