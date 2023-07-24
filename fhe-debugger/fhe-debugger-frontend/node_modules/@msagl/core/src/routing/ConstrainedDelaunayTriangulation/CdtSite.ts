import {Point} from '../../math/geometry/point'

import {CdtEdge} from './CdtEdge'
import {CdtTriangle} from './CdtTriangle'
export class CdtSite {
  cleanRemovedEdges() {
    for (const e of this.Edges) {
      if (e.CcwTriangle === null && e.CwTriangle === null) {
        this.Edges.splice(this.Edges.indexOf(e), 1)
      }
    }
  }
  // Object to which this site refers to.
  Owner: any = null

  point: Point

  // each CdtSite points to the edges for which it is the upper virtex ( for horizontal edges it is the left point)
  public Edges: Array<CdtEdge>

  InEdges = new Array<CdtEdge>()

  public constructor(isolatedSite: Point) {
    this.point = isolatedSite
  }
  static mkSO(isolatedSite: Point, owner: unknown) {
    const s = new CdtSite(isolatedSite)
    s.Owner = owner
    return s
  }
  AddEdgeToSite(edge: CdtEdge) {
    if (this.Edges == null) {
      this.Edges = new Array<CdtEdge>()
    }

    this.Edges.push(edge)
  }

  // #if TEST_MSAGL && TEST_MSAGL
  //         // Returns a <see cref="T:System.String"/> that represents the current <see cref="T:System.Object"/>.
  //         // A <see cref="T:System.String"/> that represents the current <see cref="T:System.Object"/>.
  //         // <filterpriority>2</filterpriority>
  //         public override string ToString()
  //         {
  //             return Point.ToString();
  //         }
  // #endif
  EdgeBetweenUpperSiteAndLowerSite(b: CdtSite): CdtEdge {
    /*Assert.assert(Cdt.AboveCC(this, b) > 0)*/
    if (this.Edges != null) {
      for (const edge of this.Edges) {
        if (edge.lowerSite === b) {
          return edge
        }
      }
    }

    return null
  }

  AddInEdge(e: CdtEdge) {
    this.InEdges.push(e)
  }
  *Triangles(): IterableIterator<CdtTriangle> {
    // this function might not work correctly if InEdges are not set

    let edge: CdtEdge
    if (this.Edges != null && this.Edges.length > 0) edge = this.Edges[0]
    else if (this.InEdges != null && this.InEdges.length > 0) edge = this.InEdges[0]
    else return

    //going counterclockwise around the site
    let e = edge
    do {
      const t = e.upperSite === this ? e.CcwTriangle : e.CwTriangle
      if (t == null) {
        e = null
        break
      }
      yield t
      e = t.Edges.getItem(t.Edges.index(e) + 2)
    } while (e !== edge) //full circle

    if (e !== edge) {
      //we have not done the full circle, starting again with edge but now going clockwise around the site
      e = edge
      do {
        const t = e.upperSite === this ? e.CwTriangle : e.CcwTriangle
        if (t == null) {
          break
        }
        yield t
        e = t.Edges.getItem(t.Edges.index(e) + 1)
      } while (true) // we will hit a null triangle for the convex hull border edge
    }
  }
  toString(): string {
    return this.point.toString()
  }
}
