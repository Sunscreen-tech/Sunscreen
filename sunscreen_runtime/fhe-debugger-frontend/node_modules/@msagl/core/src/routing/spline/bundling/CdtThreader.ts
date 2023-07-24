import {Point} from '../../..'
import {GeomConstants} from '../../../math/geometry'
import {TriangleOrientation} from '../../../math/geometry/point'

import {CdtEdge} from '../../ConstrainedDelaunayTriangulation/CdtEdge'
import {CdtSite} from '../../ConstrainedDelaunayTriangulation/CdtSite'
import {CdtTriangle} from '../../ConstrainedDelaunayTriangulation/CdtTriangle'

export class CdtThreader {
  start: Point

  end: Point
  /** >0, if one of the ends of piercedEdge is to the right of (start, end) line, 0 - if it is on the line */
  positiveSign: number
  /** <0, if one of the ends of piercedEdge is to the left of (start, end) line, 0 - if it is on the line */
  negativeSign: number

  private currentPiercedEdge: CdtEdge

  get CurrentPiercedEdge(): CdtEdge {
    return this.currentPiercedEdge
  }

  private currentTriangle: CdtTriangle

  get CurrentTriangle(): CdtTriangle {
    return this.currentTriangle
  }

  constructor(startTriangle: CdtTriangle, start: Point, end: Point) {
    this.currentTriangle = startTriangle
    this.start = start
    this.end = end
    //Assert.assert(CdtTriangle.PointLocationForTriangle(start, startTriangle) !== PointLocation.Outside)
  }
  /**This method finds the first edge of the current triangle that 
   * is pierced by a segment (start,end). It assumes that the start 
   * point is inside or on the boundary of the current triangle, 
   *  and the end point is outside. 
   * The function works by computing the sign of each vertex
   *  of the current triangle with respect to the segment.
   *  The sign is zero if the vertex is on the segment, 
   * positive if it is to the right of the segment  (when looking from the start point to the end point), 
   * and negative if it is to the left.
   * The function then checks if there are two consecutive 
   * vertices with different signs. If so, it means that the edge between them is pierced by the segment. The function returns that edge as the result.

The function also sets the positiveSign and negativeSign fields to store the signs of the vertices on either side of the pierced edge. This is useful for finding the next triangle in the path of the segment. */

  private FindFirstPiercedEdge(): CdtEdge {
    //Assert.assert(CdtTriangle.PointLocationForTriangle(this.start, this.currentTriangle) !== PointLocation.Outside)
    //Assert.assert(CdtTriangle.PointLocationForTriangle(this.end, this.currentTriangle) === PointLocation.Outside)
    const sign0 = this.GetHyperplaneSign(this.currentTriangle.Sites.item0)
    const sign1 = this.GetHyperplaneSign(this.currentTriangle.Sites.item1)
    if (sign0 !== sign1) {
      if (
        Point.getTriangleOrientation(this.end, this.currentTriangle.Sites.item0.point, this.currentTriangle.Sites.item1.point) ==
        TriangleOrientation.Clockwise
      ) {
        this.positiveSign = sign0
        this.negativeSign = sign1
        return this.currentTriangle.Edges.item0
      }
    }

    const sign2 = this.GetHyperplaneSign(this.currentTriangle.Sites.item2)
    if (sign1 !== sign2) {
      if (
        Point.getTriangleOrientation(this.end, this.currentTriangle.Sites.item1.point, this.currentTriangle.Sites.item2.point) ==
        TriangleOrientation.Clockwise
      ) {
        this.positiveSign = sign1
        this.negativeSign = sign2
        return this.currentTriangle.Edges.item1
      }
    }

    this.positiveSign = sign2
    this.negativeSign = sign0
    //Assert.assert(this.positiveSign > this.negativeSign)
    return this.currentTriangle.Edges.item2
  }

  private FindNextPierced() {
    //Assert.assert(this.negativeSign < this.positiveSign)
    this.currentTriangle = this.currentPiercedEdge.GetOtherTriangle_T(this.currentTriangle)
    //            ShowDebug(null,currentPiercedEdge,currentTriangle);
    if (this.currentTriangle == null) {
      this.currentPiercedEdge = null
      return
    }

    const i = this.currentTriangle.Edges.index(this.currentPiercedEdge)
    let j: number
    // pierced index
    const oppositeSite = this.currentTriangle.Sites.getItem(i + 2)
    const oppositeSiteSign = this.GetHyperplaneSign(oppositeSite)
    if (this.negativeSign === 0) {
      //Assert.assert(this.positiveSign === 1)
      if (oppositeSiteSign === -1 || oppositeSiteSign === 0) {
        this.negativeSign = oppositeSiteSign
        j = i + 1
      } else {
        j = i + 2
      }
    } else if (this.positiveSign === 0) {
      //Assert.assert(this.negativeSign === -1)
      if (oppositeSiteSign === 1 || oppositeSiteSign === 0) {
        this.positiveSign = oppositeSiteSign
        j = i + 2
      } else {
        j = i + 1
      }
    } else if (oppositeSiteSign !== this.positiveSign) {
      this.negativeSign = oppositeSiteSign
      j = i + 1
    } else {
      //Assert.assert(this.negativeSign !== oppositeSiteSign)
      this.positiveSign = oppositeSiteSign
      j = i + 2
    }

    this.currentPiercedEdge =
      Point.signedDoubledTriangleArea(
        this.end,
        this.currentTriangle.Sites.getItem(j).point,
        this.currentTriangle.Sites.getItem(j + 1).point,
      ) < -GeomConstants.distanceEpsilon
        ? this.currentTriangle.Edges.getItem(j)
        : null
  }

  //        void ShowDebug(Array<CdtTriangle> cdtTriangles, CdtEdge cdtEdge, CdtTriangle cdtTriangle) {
  //            var l = new Array<DebugCurve> { new DebugCurve(10,"red",new LineSegment(start,end)) };
  //            if(cdtEdge!=null)
  //                l.Add(new DebugCurve(100,3,"navy", new LineSegment(cdtEdge.upperSite.point,cdtEdge.lowerSite.point)));
  //            AddTriangleToListOfDebugCurves(l,cdtTriangle,100,2,"brown");
  //            LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  //
  //        }
  //        static void AddTriangleToListOfDebugCurves(Array<DebugCurve> debugCurves,CdtTriangle triangle,byte transparency,double width,string color) {
  //            foreach(var cdtEdge of triangle.Edges) {
  //                debugCurves.Add(new DebugCurve(transparency,width,color,new LineSegment(cdtEdge.upperSite.point,cdtEdge.lowerSite.point)));
  //            }
  //        }
  private GetHyperplaneSign(cdtSite: CdtSite): number {
    const area = Point.signedDoubledTriangleArea(this.start, cdtSite.point, this.end)
    if (area > GeomConstants.distanceEpsilon) {
      return 1
    }

    if (area < -GeomConstants.distanceEpsilon) {
      return -1
    }

    return 0
  }

  MoveNext(): boolean {
    if (this.currentPiercedEdge == null) {
      this.currentPiercedEdge = this.FindFirstPiercedEdge()
    } else {
      this.FindNextPierced()
    }

    return this.currentPiercedEdge != null
  }
}
