import {IIntEdge} from './iIntEdge'
import {GeomEdge} from './../core/geomEdge'
import {ICurve} from './../../math/geometry/icurve'
import {LayerEdge} from './layerEdge'
import {Anchor} from './anchor'

import {LineSegment} from '../../math/geometry/lineSegment'
import {Curve} from '../../math/geometry/curve'
import {Point} from '../../math/geometry/point'

class Routing {
  static FindClosestPoints(segmentInFrontOfLabel: ICurve, labelSide: LineSegment): {curveClosestPoint: Point; labelSideClosest: Point} {
    const minDistOutput = Curve.minDistWithinIntervals(
      segmentInFrontOfLabel,
      labelSide,
      segmentInFrontOfLabel.parStart,
      segmentInFrontOfLabel.parEnd,
      labelSide.parStart,
      labelSide.parEnd,
      (segmentInFrontOfLabel.parStart + segmentInFrontOfLabel.parEnd) / 2,
      (labelSide.parStart + labelSide.parEnd) / 2,
    )
    if (minDistOutput) {
      return {
        curveClosestPoint: minDistOutput.aX,
        labelSideClosest: minDistOutput.bX,
      }
    }
    return
  }

  static GetSegmentInFrontOfLabel(edgeCurve: ICurve, labelY: number): ICurve {
    if (edgeCurve instanceof Curve) {
      for (const seg of (<Curve>edgeCurve).segs) if ((seg.start.y - labelY) * (seg.end.y - labelY) <= 0) return seg
    } else {
      /*Assert.assert(false)*/
    }
    return null
  }

  static ShiftLabel(e: GeomEdge, curveClosestPoint: Point, labelSideClosest: Point) {
    const w = e.lineWidth / 2
    const shift = curveClosestPoint.sub(labelSideClosest)
    const shiftLength = shift.length
    //  SugiyamaLayoutSettings.Show(e.Curve, shiftLength > 0 ? new LineSegment(curveClosestPoint, labelSideClosest) : null, PolyFromBox(e.label.boundingBox));
    if (shiftLength > w) e.label.positionCenter(e.label.center.add(shift.div(shiftLength * (shiftLength - w))))
  }

  static updateLabel(e: GeomEdge, anchor: Anchor) {
    let labelSide: LineSegment = null
    if (anchor.labelIsToTheRightOfTheSpline) {
      e.label.positionCenter(new Point(anchor.x + anchor.rightAnchor / 2, anchor.y))
      labelSide = LineSegment.mkPP(e.label.boundingBox.leftTop, e.label.boundingBox.leftBottom)
    } else if (anchor.labelIsToTheLeftOfTheSpline) {
      e.label.positionCenter(new Point(anchor.x - anchor.leftAnchor / 2, anchor.y))
      labelSide = LineSegment.mkPP(e.label.boundingBox.rightTop, e.label.boundingBox.rightBottom)
    }
    const segmentInFrontOfLabel = Routing.GetSegmentInFrontOfLabel(e.curve, e.label.center.y)
    if (segmentInFrontOfLabel == null) return
    if (Curve.getAllIntersections(e.curve, Curve.polyFromBox(e.label.boundingBox), false).length === 0) {
      const t = Routing.FindClosestPoints(segmentInFrontOfLabel, labelSide)
      if (t) {
        //shift the label if needed
        Routing.ShiftLabel(e, t.curveClosestPoint, t.labelSideClosest)
      } else {
        let curveClosestPoint: Point
        let labelSideClosest: Point
        //assume that the distance is reached at the ends of labelSideClosest
        const u = segmentInFrontOfLabel.closestParameter(labelSide.start)
        const v = segmentInFrontOfLabel.closestParameter(labelSide.end)
        if (segmentInFrontOfLabel.value(u).sub(labelSide.start).length < segmentInFrontOfLabel.value(v).sub(labelSide.end).length) {
          curveClosestPoint = segmentInFrontOfLabel.value(u)
          labelSideClosest = labelSide.start
        } else {
          curveClosestPoint = segmentInFrontOfLabel.value(v)
          labelSideClosest = labelSide.end
        }
        Routing.ShiftLabel(e, curveClosestPoint, labelSideClosest)
      }
    }
  }
}

// An edge with source and target represented as integers,
// they point to the array of Nodes of the graph
export class PolyIntEdge implements IIntEdge {
  source: number
  target: number
  reversed = false
  // separation request in the number of layers between the source and the target layers
  separation: number
  weight: number
  get CrossingWeight() {
    return 1
  }
  // If true it is a dummy edge that will not be drawn; serves as a place holder.
  IsVirtualEdge: boolean
  LayerEdges: LayerEdge[]
  // the original edge
  edge: GeomEdge

  constructor(source: number, target: number, geomEdge: GeomEdge, weight = 1, separation = 1) {
    this.source = source
    this.target = target
    this.edge = geomEdge
    this.weight = weight
    this.separation = separation
  }

  get hasLabel(): boolean {
    return this.edge.label != null
  }

  get labelWidth() {
    return this.edge.label.width
  }
  get labelHeight() {
    return this.edge.label.height
  }

  // This function changes the edge by swapping source and target.
  reverse() {
    const t = this.source
    this.source = this.target
    this.target = t
    this.reversed = !this.reversed
  }

  toString(): string {
    return 'edge(' + this.source + '->' + this.target + ')'
  }

  get curve(): ICurve {
    return this.edge.curve
  }

  set curve(value) {
    this.edge.curve = value
  }

  get underlyingPolyline() {
    return this.edge.smoothedPolyline
  }
  set underlyingPolyline(value) {
    this.edge.smoothedPolyline = value
  }

  get LayerSpan() {
    return this.LayerEdges != null ? this.LayerEdges.length : 0
  }

  isSelfEdge(): boolean {
    return this.source === this.target
  }

  reversedClone() {
    const ret = new PolyIntEdge(this.target, this.source, this.edge)
    if (this.LayerEdges != null) {
      const len = this.LayerEdges.length
      ret.LayerEdges = new Array<LayerEdge>(len)
      for (let i = 0; i < len; i++) {
        const le = this.LayerEdges[len - 1 - i]
        ret.LayerEdges[i] = new LayerEdge(le.Target, le.Source, le.CrossingWeight)
      }
      ret.LayerEdges[0].Source = this.target
      ret.LayerEdges[this.LayerEdges.length - 1].Target = this.source
    }
    return ret
  }

  get count(): number {
    return this.LayerEdges.length
  }

  getNode(i: number): number {
    if (i >= 0) {
      if (i < this.LayerEdges.length) return this.LayerEdges[i].Source
      if (i === this.LayerEdges.length) return this.LayerEdges[i - 1].Target
    }
    throw new Error('wrong index ' + i)
  }

  updateEdgeLabelPosition(anchors: Anchor[]) {
    if (this.edge.label != null) {
      const m = this.LayerEdges.length / 2
      const layerEdge = this.LayerEdges[m]
      Routing.updateLabel(this.edge, anchors[layerEdge.Source])
    }
  }
  [Symbol.iterator]() {
    return this.nodes()
  }

  // enumerates over virtual virtices corresponding to the original edge
  *nodes(): IterableIterator<number> {
    yield this.LayerEdges[0].Source
    for (const le of this.LayerEdges) yield le.Target
  }
}
