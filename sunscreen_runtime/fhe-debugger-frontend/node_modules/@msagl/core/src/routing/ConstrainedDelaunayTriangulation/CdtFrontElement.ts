import {CdtEdge} from './CdtEdge'
import {CdtSite} from './CdtSite'

export class CdtFrontElement {
  // The LeftSite should coincide with the leftmost end of the Edge, and the edge should not be vertical
  LeftSite: CdtSite

  Edge: CdtEdge

  RightSite: CdtSite

  get x(): number {
    return this.LeftSite.point.x
  }

  constructor(leftSite: CdtSite, edge: CdtEdge) {
    /*Assert.assert(
      (edge.upperSite.point.x !== edge.lowerSite.point.x &&
        edge.upperSite.point.x < edge.lowerSite.point.x &&
        leftSite === edge.upperSite) ||
        (edge.upperSite.point.x > edge.lowerSite.point.x &&
          leftSite === edge.lowerSite),
    )*/

    this.RightSite = edge.upperSite === leftSite ? edge.lowerSite : edge.upperSite
    this.LeftSite = leftSite
    this.Edge = edge
  }
  toString() {
    return '(' + this.LeftSite.toString() + ', ' + this.Edge.toString() + ',' + this.RightSite.toString() + ')'
  }
}
