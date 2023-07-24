import {ICurve} from './icurve'
import {Point} from './point'
import {LineSegment} from './lineSegment'
import {Parallelogram} from './parallelogram'
import {GeomConstants} from './geomConstants'

// import {LinearSystem2} from './linearSystem'
// import {allVerticesOfParall} from './parallelogram'
// import {Polyline} from './polyline'
// //import{ {DebugCurve} from './}DebugCurve'
// import {CurveFactory} from './curveFactory'
// Serves to hold a Parallelogram and a ICurve,
// and is used in curve intersections routines.
// The node can be a top of the hierarchy if its sons are non-nulls.
// The sons are either both nulls or both non-nulls

export type PN = {
  parallelogram: Parallelogram
  seg: ICurve
  leafBoxesOffset: number
  node: PNInternal | PNLeaf
}

export function createPNLeaf(start: number, end: number, box: Parallelogram, seg: ICurve, eps: number): PN {
  return {
    parallelogram: box,
    seg: seg,
    leafBoxesOffset: eps,
    node: {
      low: start,
      high: end,
      chord: null, // create a cord only the segment and the chord are within intersectionEpsilon
    },
  }
}

export type PNLeaf = {
  low: number
  high: number
  chord: LineSegment | null
}

export type PNInternal = {
  children: PN[]
}

export class ParallelogramNode {
  static distToSegm(p: Point, s: Point, e: Point): number {
    const l = e.sub(s)
    if (l.length < GeomConstants.intersectionEpsilon) return p.sub(s.add(e).div(2)).length
    let perp = new Point(-l.y, l.x)
    perp = perp.mul(1 / perp.length)
    return Math.abs(p.sub(s).dot(perp))
  }

  static createParallelogramOnSubSeg(start: number, end: number, seg: ICurve): Parallelogram | undefined {
    let tan1 = seg.derivative(start)
    const tan2 = seg.derivative(end)
    const tan2Perp = new Point(-tan2.y, tan2.x)
    const corner = seg.value(start)
    const e = seg.value(end)
    const p = e.sub(corner)

    const numerator = p.dot(tan2Perp)
    const denumerator = tan1.dot(tan2Perp)
    //x  = (p * tan2Perp) / (tan1 * tan2Perp);
    // x*tan1 will be a side of the parallelogram

    const numeratorTiny = Math.abs(numerator) < GeomConstants.distanceEpsilon
    if (!numeratorTiny && Math.abs(denumerator) < GeomConstants.distanceEpsilon) {
      //it is degenerated; the adjacent sides would be parallel, but
      //since p * tan2Perp is big the parallelogram would not contain e
      return
    }

    const x = numeratorTiny ? 0 : numerator / denumerator

    tan1 = tan1.mul(x)

    return Parallelogram.parallelogramByCornerSideSide(corner, tan1, e.sub(corner).sub(tan1))
  }

  static createParallelogramNodeForCurveSeg(start: number, end: number, seg: ICurve, eps: number): PN {
    const closedSeg = start === seg.parStart && end === seg.parEnd && Point.close(seg.start, seg.end, GeomConstants.distanceEpsilon)
    if (closedSeg) return ParallelogramNode.createNodeWithSegmentSplit(start, end, seg, eps)

    const s = seg.value(start)
    const e = seg.value(end)
    const w = e.sub(s)
    const middle = seg.value((start + end) / 2)

    if (
      ParallelogramNode.distToSegm(middle, s, e) <= GeomConstants.intersectionEpsilon &&
      w.dot(w) < GeomConstants.lineSegmentThreshold * GeomConstants.lineSegmentThreshold &&
      end - start < GeomConstants.lineSegmentThreshold
    ) {
      const ls = LineSegment.mkPP(s, e)
      const pn: PN = ls.pNodeOverICurve()
      pn.seg = seg
      const leaf = pn.node as PNLeaf
      leaf.low = start
      leaf.high = end
      leaf.chord = ls
      return pn
    }

    if (ParallelogramNode.WithinEpsilon(seg, start, end, eps)) {
      const box = ParallelogramNode.createParallelogramOnSubSeg(start, end, seg)
      if (box !== undefined) return createPNLeaf(start, end, box, seg, eps)
    }
    return ParallelogramNode.createNodeWithSegmentSplit(start, end, seg, eps)
  }

  static WithinEpsilon(seg: ICurve, start: number, end: number, eps: number) {
    const n = 3 //hack !!!! but maybe can be proven for Bezier curves and other regular curves
    const d = (end - start) / n
    const s = seg.value(start)
    const e = seg.value(end)

    const d0 = ParallelogramNode.distToSegm(seg.value(start + d), s, e)
    if (d0 > eps) return false

    const d1 = ParallelogramNode.distToSegm(seg.value(start + d * (n - 1)), s, e)

    return d1 <= eps
  }

  static createParallelogramNodeForCurveSegDefaultOffset(seg: ICurve) {
    return ParallelogramNode.createParallelogramNodeForCurveSeg(seg.parStart, seg.parEnd, seg, GeomConstants.defaultLeafBoxesOffset)
  }

  static createNodeWithSegmentSplit(start: number, end: number, ell: ICurve, eps: number) {
    const pBNode: PN = {
      parallelogram: null,
      seg: ell,
      leafBoxesOffset: 1,
      node: {children: []},
    }

    const intNode: PNInternal = pBNode.node as PNInternal

    intNode.children.push(ParallelogramNode.createParallelogramNodeForCurveSeg(start, 0.5 * (start + end), ell, eps))
    intNode.children.push(ParallelogramNode.createParallelogramNodeForCurveSeg(0.5 * (start + end), end, ell, eps))

    pBNode.parallelogram = Parallelogram.parallelogramOfTwo(intNode.children[0].parallelogram, intNode.children[1].parallelogram)
    return pBNode
  }
}
