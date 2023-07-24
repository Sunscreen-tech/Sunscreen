import {CdtEdge} from './CdtEdge'
import {CdtSite} from './CdtSite'

export class PerimeterEdge {
  Start: CdtSite

  End: CdtSite

  Prev: PerimeterEdge

  Next: PerimeterEdge

  Edge: CdtEdge

  constructor(edge: CdtEdge) {
    /*Assert.assert(
      edge.CcwTriangle == null  || edge.CwTriangle == null ,
      'one of the edge triangles has to be null',
    )*/
    this.Edge = edge
  }
}
