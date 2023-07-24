import {CompassVector} from '../../math/geometry/compassVector'
import {Direction} from '../../math/geometry/direction'
import {VisibilityVertexRectilinear} from './VisibilityVertexRectiline'

export class VertexEntry {
  // A class that records an entry from a specific direction for a vertex.

  // Vertex that this VertexEntry enters
  // The previous VertexEntry along this path; null for a path source
  // Length of the path up to this vertex
  // Number of bends in the path up to this vertex
  // Cost of the path up to this vertex
  constructor(vertex: VisibilityVertexRectilinear, prevEntry: VertexEntry, length: number, numberOfBends: number, cost: number) {
    this.Vertex = vertex
    this.Direction = prevEntry != null ? CompassVector.DirectionFromPointToPoint(prevEntry.Vertex.point, vertex.point) : Direction.None
    this.ResetEntry(prevEntry, length, numberOfBends, cost)
  }

  ResetEntry(prevEntry: VertexEntry, length: number, numberOfBends: number, cost: number) {
    // A new prevEntry using the same previous vertex but a different entry to that vertex is valid here;
    // e.g. we could have prevEntry from S, which in turn had a prevEntry from E, replaced by prevEntry from
    // S which has a prevEntry from S.
    // #if (TEST_MSAGL)
    // if ((this.PreviousEntry != null)) {
    //    Assert.assert((this.PreviousEntry.Vertex === prevEntry.Vertex), "Inconsistent prevEntry vertex");
    //    Assert.assert((this.PreviousEntry.Direction !== prevEntry.Direction), "Duplicate prevEntry direction");
    //    Assert.assert((this.Direction === CompassVector.PureDirectionFromPointToPoint(this.PreviousEntry.Vertex.point, this.Vertex.point)), "Inconsistent entryDir");
    // }

    // #endif
    // // TEST_MSAGL
    this.PreviousEntry = prevEntry
    this.Length = length
    this.NumberOfBends = numberOfBends
    this.Cost = cost
  }

  // Cost of the path up to this vertex

  Cost: number

  // The vertex that this VertexEntry enters

  Vertex: VisibilityVertexRectilinear

  // The vertex that this VertexEntry is entered from

  get PreviousVertex(): VisibilityVertexRectilinear {
    return this.PreviousEntry == null ? null : this.PreviousEntry.Vertex
  }

  // The direction of entry to the vertex for this path (i.e. the direction from PreviousVertex to this.Vertex).

  Direction: Direction
  // The length of the path up to this vertex

  Length: number

  // The number of bends in the path up to this vertex

  NumberOfBends: number

  // The previous VertexEntry along this path; null for a path source.

  PreviousEntry: VertexEntry

  // Indicates whether we are allowing further entries into this vertex from this direction.

  IsClosed = false

  toString(): string {
    return this.Vertex.point + (' ' + (this.Direction + (' ' + (this.IsClosed + (' ' + this.Cost)))))
  }
}
