import {Queue} from 'queue-typescript'
import {GeomConstants, Point, Polyline} from '../../math/geometry'
import {TriangleOrientation} from '../../math/geometry/point'
import {Cdt} from '../ConstrainedDelaunayTriangulation/Cdt'
import {CdtEdge, CdtEdge as Ed} from '../ConstrainedDelaunayTriangulation/CdtEdge'
import {CdtSite} from '../ConstrainedDelaunayTriangulation/CdtSite'
import {CdtTriangle as Tr} from '../ConstrainedDelaunayTriangulation/CdtTriangle'
import {ThreeArray} from '../ConstrainedDelaunayTriangulation/ThreeArray'
/** Optimize path locally, without changing its topology.
 * The obstacles are represented by constrained edges of cdd, the Delaunay triangulation.
 * It is not assumed that the polyline passes only through the sites of the cdt.
//  */
// let debCount = 0
// let drawCount = 0
/** the target of s would be otherTriange:  s.edge.getOtherTriangle_T(s.source) */
type FrontEdge = {source: Tr; edge: Ed; leftSign?: number; rightSign?: number}
/** nextR and nextL are defined only for an apex */
type PathPoint = {point: Point; prev?: PathPoint; next?: PathPoint}

type Diagonal = {left: Point; right: Point}
export class PathOptimizer {
  private cdt: Cdt
  poly: Polyline
  private sourcePoly: Polyline
  private targetPoly: Polyline
  private d: Diagonal[]
  setCdt(cdt: Cdt) {
    this.cdt = cdt
    this.cdt.SetInEdges()
    const polys = new Set<Polyline>()
    for (const t of cdt.GetTriangles()) {
      for (const s of t.Sites) {
        if (s.Owner != null) polys.add(s.Owner as Polyline)
      }
    }
  }

  triangles = new Set<Tr>()

  private findChannelTriangles() {
    this.passedTrs.clear()
    //  this.extendPassedTrsByContainingPoint(this.poly.start)
    // this.debugDraw(Array.from(this.cdt.GetTriangles()), null, null, this.poly, Array.from(this.passedTrs).map(trianglePerimeter))
    for (let p = this.poly.startPoint; p.next != null; p = p.next) {
      this.addPiercedTrianglesOnSegment(p.point, p.next.point)
    }

    this.addSourceTargetTriangles()
  }

  addSourceTargetTriangles() {
    this.addPolyTrianglesForEndStart(this.poly.start)
    this.addPolyTrianglesForEndStart(this.poly.end)
  }

  private findSiteTriangle(p: Point): Tr {
    const site = this.cdt.FindSite(p)
    if (site.Edges)
      for (const e of site.Edges) {
        let t = e.CcwTriangle
        if (t && triangleIsInsideOfObstacle(t)) {
          return t
        }
        t = e.CwTriangle
        if (t && triangleIsInsideOfObstacle(t)) {
          return t
        }
      }
    if (site.InEdges)
      for (const e of site.InEdges) {
        let t = e.CcwTriangle
        if (t && triangleIsInsideOfObstacle(t)) {
          return t
        }
        t = e.CwTriangle
        if (t && triangleIsInsideOfObstacle(t)) {
          return t
        }
      }
    return null
  }
  private addPolyTrianglesForEndStart(p: Point) {
    const trs = new Set<Tr>()
    const q = new Queue<Tr>(this.findSiteTriangle(p))
    while (q.length) {
      const t = q.dequeue()
      for (const e of t.Edges) {
        const ot = e.GetOtherTriangle_T(t)
        if (ot && !trs.has(ot) && triangleIsInsideOfObstacle(ot)) {
          q.enqueue(ot)
          trs.add(ot)
        }
      }
    }
    for (const t of trs) {
      this.triangles.add(t)
    }
  }
  /** this.passedTriangles is an array of triangles containing 'end' on the function exit,
   * but on entering the end becomes start of the next segment
   */
  addPiercedTrianglesOnSegment(start: Point, end: Point) {
    this.extendPassedTrsByContainingPoint(start)
    this.createThreader(start, end)
    if (this.passedTrs.size) {
      this.front = new Queue<FrontEdge>()
      return
    }
    for (const tr of this.threadThrough()) {
      this.triangles.add(tr)

      // this.debugDraw(Array.from(this.cdt.GetTriangles()), null, null, this.poly, Array.from(this.triangles).map(trianglePerimeter))
    }
  }
  edgeCanBePierced(e: CdtEdge): boolean {
    const a = e.lowerSite.Owner
    const b = e.upperSite.Owner
    // adjacent to source or target
    if (a == this.sourcePoly || b == this.targetPoly || b == this.sourcePoly || a == this.targetPoly) return true
    // connects to different polylines
    if (a != b && a !== null && b !== null) return true
    return false
  }

  padTriangle(t: Tr, eps: number): ThreeArray<Point> {
    const m = t.Sites.item0.point
      .add(t.Sites.item1.point)
      .add(t.Sites.item2.point)
      .mul(1 / 3)

    const ta = new ThreeArray<Point>()
    ta.setItem(0, padSite(t.Sites.item0))
    ta.setItem(1, padSite(t.Sites.item1))
    ta.setItem(2, padSite(t.Sites.item2))
    return ta

    function padSite(s: CdtSite): Point {
      const d = s.point.sub(m)
      const len = d.length
      return m.add(d.mul((len + eps) / len))
    }
  }

  insideSourceOrTargetPoly(t: Tr): boolean {
    const owner = t.Sites.item0.Owner
    if (owner === this.sourcePoly || owner === this.targetPoly) {
      if (owner === t.Sites.item1.Owner && owner === t.Sites.item2.Owner) return true
    }
    return false
  }
  private outsideOfObstacles(t: Tr): boolean {
    if (t == null) return false
    const owner = t.Sites.item0.Owner ?? t.Sites.item1.Owner
    return owner === this.sourcePoly || owner === this.targetPoly || !triangleIsInsideOfObstacle(t)
  }

  /** following "https://page.mi.fu-berlin.de/mulzer/notes/alggeo/polySP.pdf" */
  run(poly: Polyline) {
    //++debCount
    this.triangles.clear()

    this.poly = poly
    this.d = []
    if (poly.count <= 2 || this.cdt == null) return
    this.sourcePoly = this.findPoly(poly.start)
    this.targetPoly = this.findPoly(poly.end)
    // if (debCount == 123) {
    //   this.debugDraw(Array.from(this.cdt.GetTriangles()), null, null, poly)
    // }
    this.findChannelTriangles()
    // if (debCount == 123) this.debugDraw(Array.from(this.triangles), null, null, poly)

    let perimeter = this.getPerimeterEdges()
    perimeter = this.fillTheCollapedSites(perimeter)
    // this.debugDraw(Array.from(this.cdt.GetTriangles()), perimeter, null, this.poly)
    const localCdt = new Cdt(
      [],
      [],
      Array.from(perimeter).map((e) => {
        return {A: e.lowerSite.point, B: e.upperSite.point}
      }),
    )
    localCdt.run()
    // (debCount == 2835) // this.debugDraw(Array.from(localCdt.GetTriangles()), null, null, poly)

    const sleeve: FrontEdge[] = this.getSleeve(this.findSourceTriangle(localCdt))
    if (sleeve == null) {
      // this.poly remains unchanged in this case
      // in one case the original polyline was crossing a wrong obstacle and it caused the peremiter polyline
      // not having the end inside
      console.log('failed to create sleeve')
      return
    }
    if (sleeve.length == 0) {
      this.poly = Polyline.mkFromPoints([poly.start, poly.end])
      return
    }
    this.initDiagonals(sleeve)
    //const dc = getDebugCurvesFromCdt(localCdt)
    this.refineFunnel() //dc)
  }
  findPoly(p: Point): Polyline {
    const site = this.cdt.FindSite(p)
    for (const edge of site.Edges) {
      const poly = edge.lowerSite.Owner ?? edge.upperSite.Owner
      return poly
    }
  }
  /** Because of the floating point operations we might miss some triangles and get a polygon collapsing to a point somewhere inside of the polyline.
   * This point will correspond to a site adjacent to more than two edges from 'perimeter'.
   * We add to the polygon all the 'legal' triangles adjacent to this cite.
   */
  fillTheCollapedSites(perimeter: Set<Ed>): Set<Ed> {
    const siteToEdges = new Map<CdtSite, Ed[]>()
    for (const e of perimeter) {
      addEdgeToMap(e.lowerSite, e)
      addEdgeToMap(e.upperSite, e)
    }

    const sitesToFix = []
    for (const [site, es] of siteToEdges) {
      if (es.length > 2) {
        sitesToFix.push(site)
      }
    }
    if (sitesToFix.length == 0) return perimeter
    for (const s of sitesToFix) {
      for (const t of s.Triangles()) {
        if (this.outsideOfObstacles(t)) {
          this.triangles.add(t)
        }
      }
    }
    return this.getPerimeterEdges()

    function addEdgeToMap(site: CdtSite, e: CdtEdge) {
      let es = siteToEdges.get(site)
      if (es == null) {
        siteToEdges.set(site, (es = []))
      }
      es.push(e)
    }
  }
  private findSourceTriangle(localCdt: Cdt) {
    let sourceTriangle: Tr
    for (const t of localCdt.GetTriangles()) {
      if (t.containsPoint(this.poly.start)) {
        sourceTriangle = t
        break
      }
    }
    return sourceTriangle
  }

  // debugDraw(triangles: Tr[], perimEdges: Set<Ed>, poly: Polyline, originalPoly: Polyline, strangeObs: ICurve[] = [], ls: ICurve = null) {
  //   const dc = []
  //   if (ls) {
  //     dc.push(DebugCurve.mkDebugCurveTWCI(255, 5, 'PapayaWhip', ls))
  //   }
  //   const box = this.poly.boundingBox.clone()
  //   box.addRec(this.sourcePoly.boundingBox)
  //   box.addRec(this.targetPoly.boundingBox)
  //   for (const t of triangles) {
  //     // if (t.BoundingBox().intersects(box) == false) continue
  //     for (const e of t.Edges) {
  //       dc.push(
  //         DebugCurve.mkDebugCurveTWCI(
  //           e.constrained ? 150 : 100,
  //           e.constrained ? 1.5 : 1,
  //           e.constrained ? 'DarkSeaGreen' : 'Cyan',
  //           LineSegment.mkPP(e.upperSite.point, e.lowerSite.point),
  //         ),
  //       )
  //     }
  //   }
  //   if (perimEdges) {
  //     for (const e of perimEdges) {
  //       dc.push(DebugCurve.mkDebugCurveTWCI(200, 2.5, 'Blue', LineSegment.mkPP(e.lowerSite.point, e.upperSite.point)))
  //     }
  //   }
  //   if (poly) dc.push(DebugCurve.mkDebugCurveTWCI(200, 1, 'Green', poly))
  //   for (const strangeOb of strangeObs) {
  //     dc.push(DebugCurve.mkDebugCurveTWCI(200, 3, 'Pink', strangeOb))
  //   }

  //   if (originalPoly) dc.push(DebugCurve.mkDebugCurveTWCI(200, 1, 'Brown', originalPoly))
  //   dc.push(DebugCurve.mkDebugCurveTWCI(200, 0.5, 'Violet', this.sourcePoly))
  //   dc.push(DebugCurve.mkDebugCurveTWCI(200, 0.5, 'Magenta', this.targetPoly))

  //   SvgDebugWriter.dumpDebugCurves('./tmp/poly' + ++drawCount + '.svg', dc)
  // }

  private refineFunnel(/*dc: Array<DebugCurve>*/) {
    // remove param later:Debug
    const prefix: Point[] = [] // the path befor apex
    let v = this.poly.start // the apex point
    const leftChainStart: PathPoint = {point: v}
    const rightChainStart: PathPoint = {point: v}
    let leftChainEnd: PathPoint = {point: this.d[0].left, prev: leftChainStart}
    let rightChainEnd: PathPoint = {point: this.d[0].right, prev: rightChainStart}
    leftChainStart.next = leftChainEnd
    rightChainStart.next = rightChainEnd

    let z: Point
    for (let i = 1; i < this.d.length; i++) {
      processDiagonal(i, this.d)
    }
    // the shortest path will be on the right chain
    this.d.push({right: this.poly.end, left: leftChainEnd.point})
    processDiagonal(this.d.length - 1, this.d)
    const newPoly = Polyline.mkFromPoints(prefix)
    for (let p = rightChainStart; p != null; p = p.next) {
      newPoly.addPoint(p.point)
    }
    this.poly = newPoly

    function processDiagonal(i: number, d: Diagonal[]) {
      const leftStep = d[i - 1].left !== d[i].left

      // Assert.assert(!leftStep || d[i - 1].left.equal(d[i].left) == false)
      // Assert.assert(leftStep || d[i - 1].right !== d[i].right)
      if (leftStep) {
        z = d[i].left
        //draw(d[i - 1], d[i], dc)
        let p = leftChainEnd
        for (; !(isApex(p) || reflexLeft(p)); p = p.prev) {
          // just stepping back on the left chain
        }
        if (isApex(p)) {
          walkForwardOnTheRigthUntilSeeZ()
        } else {
          extendLeftChainFromP(p)
        }
      } else {
        // right step: the diagonal advanced on the right chain
        z = d[i].right
        let p = rightChainEnd
        for (; !(isApex(p) || reflexRight(p)); p = p.prev) {
          // just stepping back on the right chain
        }
        if (isApex(p)) {
          walkForwardOnTheLeftUntilSeeZ()
        } else {
          extendRightChainFromP(p)
        }
      }
      //draw(d[i - 1], d[i], dc)
    }

    // function draw(d: Diagonal, dn: Diagonal, dc: DebugCurve[]) {
    //   if (debCount < 1000000) return
    //   const ldc = dc.map((d) => d.clone())

    //   ldc.push(DebugCurve.mkDebugCurveTWCI(100, 3, 'Yellow', LineSegment.mkPP(d.left, d.right)))
    //   ldc.push(DebugCurve.mkDebugCurveTWCI(100, 3, 'cyan', LineSegment.mkPP(dn.left, dn.right)))
    //   for (let l: PathPoint = leftChainStart; l && l.next; l = l.next) {
    //     ldc.push(DebugCurve.mkDebugCurveTWCI(100, 3, 'Magenta', LineSegment.mkPP(l.point, l.next.point)))
    //   }
    //   for (let r: PathPoint = rightChainStart; r && r.next; r = r.next) {
    //     ldc.push(DebugCurve.mkDebugCurveTWCI(100, 3, 'Navy', LineSegment.mkPP(r.point, r.next.point)))
    //   }

    //   ldc.push(DebugCurve.mkDebugCurveTWCI(100, 3, 'red', CurveFactory.mkCircle(3, v)))

    //   if (prefix.length) {
    //     for (let i = 0; i < prefix.length - 1; i++) {
    //       ldc.push(DebugCurve.mkDebugCurveTWCI(200, 3, 'Black', LineSegment.mkPP(prefix[i], prefix[i + 1])))
    //     }
    //     ldc.push(DebugCurve.mkDebugCurveTWCI(200, 3, 'Black', LineSegment.mkPP(prefix[prefix.length - 1], v)))
    //   }

    //   //SvgDebugWriter.dumpDebugCurves('/tmp/dc_' + ++debCount + '.svg', ldc)
    // }
    function visibleRight(pp: PathPoint) {
      if (pp.next == null) {
        return true
      }
      return Point.pointToTheLeftOfLineOrOnLine(z, pp.point, pp.next.point)
    }
    function visibleLeft(pp: PathPoint) {
      if (pp.next == null) {
        return true
      }
      return Point.pointToTheRightOfLineOrOnLine(z, pp.point, pp.next.point)
    }
    function reflexLeft(pp: PathPoint): boolean {
      return Point.pointToTheLeftOfLine(z, pp.prev.point, pp.point)
    }
    function reflexRight(pp: PathPoint): boolean {
      return Point.pointToTheRightOfLine(z, pp.prev.point, pp.point)
    }
    function walkForwardOnTheRigthUntilSeeZ() {
      let p = rightChainStart
      while (!visibleRight(p)) {
        p = p.next
      }
      if (!isApex(p)) {
        // got the new apex in p
        let r = rightChainStart
        for (; !r.point.equal(p.point); r = r.next) {
          prefix.push(r.point)
        }
        rightChainStart.point = r.point
        rightChainStart.next = r.next // need to keep rightChainStart and rightChainEnd different while r might be rightChainEnd here
        v = r.point
        if (rightChainEnd.point.equal(rightChainStart.point)) {
          rightChainEnd.prev = rightChainEnd.next = null
        }
      }
      leftChainStart.point = v
      leftChainEnd.point = z
      leftChainEnd.prev = leftChainStart
      leftChainStart.next = leftChainEnd
    }
    function walkForwardOnTheLeftUntilSeeZ() {
      let p = leftChainStart
      while (!visibleLeft(p)) {
        p = p.next
      }
      if (!isApex(p)) {
        // got the new apex at p
        let r = leftChainStart
        for (; !r.point.equal(p.point); r = r.next) {
          prefix.push(r.point)
        }
        leftChainStart.point = r.point //  need to keep leftChainStart and leftChainEnd different while r might be leftChainEnd here
        leftChainStart.next = r.next
        v = r.point
        if (leftChainEnd.point.equal(leftChainStart.point)) {
          leftChainEnd.prev = leftChainStart.next = null
        }
      }
      rightChainStart.point = v
      rightChainEnd.point = z
      rightChainEnd.prev = rightChainStart
      rightChainStart.next = rightChainEnd
    }
    function isApex(pp: PathPoint) {
      const ret = pp.point == v
      //Assert.assert(ret || !pp.point.equal(v))
      return ret
    }

    function extendRightChainFromP(p: PathPoint) {
      if (p != rightChainEnd) {
        rightChainEnd.point = z
        rightChainEnd.prev = p
        p.next = rightChainEnd
      } else {
        rightChainEnd = {point: z, prev: p}
        p.next = rightChainEnd
      }
    }

    function extendLeftChainFromP(p: PathPoint) {
      if (p != leftChainEnd) {
        leftChainEnd.point = z
        leftChainEnd.prev = p
        p.next = leftChainEnd
      } else {
        leftChainEnd = {point: z, prev: p}
        p.next = leftChainEnd
      }
    }
  }
  // test(peremiter: Set<CdtEdge>, originalPoly: Polyline) {
  //   for (const t of this.triangles) {
  //     if (this.insideSourceOrTargetPoly(t)) continue
  //     const per = trianglePerimeter(t)

  //     const x = Curve.intersectionOne(originalPoly, per, false)
  //     if (x == null) {
  //       this.debugDraw(Array.from(this.triangles), peremiter, this.poly, originalPoly, [per])
  //     }
  //     Assert.assert(x != null, 'triangle is separated from the polyline')
  //   }
  //   // for (const obs of this.polyRTree.GetNodeItemsIntersectingRectangle(this.poly.boundingBox)) {
  //   //   if (obs == this.sourcePoly || obs == this.targetPoly) continue
  //   //   const xs = Curve.getAllIntersections(this.poly, obs, false)
  //   //   if (xs.length == 2) {
  //   //     for (const p of pointsBetweenIntersections(this.poly, xs)) {
  //   //       if (Curve.PointRelativeToCurveLocation(p, obs) == PointLocation.Inside) {
  //   //         //// this.debugDraw(Array.from(this.triangles), peremiter, this.poly, originalPoly, [obs])
  //   //         console.log(debCount)
  //   //       }
  //   //     }
  //   //   }
  //   //   function* pointsBetweenIntersections(a: ICurve, xx: Array<IntersectionInfo>): IterableIterator<Point> {
  //   //     xx.sort((x, y) => x.par0 - y.par0)
  //   //     for (let i = 0; i < xx.length - 1; i++) {
  //   //       yield a.value((xx[i].par0 + xx[i + 1].par0) / 2)
  //   //     }
  //   //   }
  //   // }
  // }
  private initDiagonals(sleeve: FrontEdge[]) {
    for (const sleeveEdge of sleeve) {
      const e = sleeveEdge.edge
      const site = sleeveEdge.source.OppositeSite(e)
      if (Point.getTriangleOrientation(site.point, e.lowerSite.point, e.upperSite.point) == TriangleOrientation.Counterclockwise) {
        this.d.push({left: e.upperSite.point, right: e.lowerSite.point})
      } else {
        this.d.push({right: e.upperSite.point, left: e.lowerSite.point})
      }
    }
  }
  private getSleeve(sourceTriangle: Tr): FrontEdge[] {
    const q = new Queue<Tr>()
    //Assert.assert(sourceTriangle != null)
    q.enqueue(sourceTriangle)
    // Assert.assert(sourceTriangle != null)
    const edgeMap = new Map<Tr, Ed>()
    edgeMap.set(sourceTriangle, undefined)
    while (q.length > 0) {
      const t = q.dequeue()
      const edgeIntoT = edgeMap.get(t)
      if (t.containsPoint(this.poly.end)) {
        return this.recoverPath(sourceTriangle, edgeMap, t)
      }
      for (const e of t.Edges) {
        if (e.constrained) continue // do not leave the polygon:
        // we walk a dual graph of a triangulation of a polygon:
        // it is not always a simple polygon, but usually it is
        if (edgeIntoT !== undefined && e === edgeIntoT) continue
        const ot = e.GetOtherTriangle_T(t)
        if (ot == null) continue
        if (edgeMap.has(ot)) continue

        edgeMap.set(ot, e)
        q.enqueue(ot)
      }
    }
  }
  private recoverPath(sourceTriangle: Tr, edgeMap: Map<Tr, Ed>, t: Tr): FrontEdge[] {
    const ret = []
    for (let tr = t; tr != sourceTriangle; ) {
      if (tr === sourceTriangle) break
      const e = edgeMap.get(tr)
      tr = e.GetOtherTriangle_T(tr)
      ret.push({source: tr, edge: e})
    }
    return ret.reverse()
  }

  private getPerimeterEdges(): Set<Ed> {
    const perimeter = new Set<Ed>()
    for (const t of this.triangles) {
      for (const e of t.Edges) {
        if (!this.triangles.has(e.GetOtherTriangle_T(t))) {
          perimeter.add(e)
        }
      }
    }
    return perimeter
  }
  // threader region

  start: Point
  end: Point

  front = new Queue<FrontEdge>()
  passedTrs = new Set<Tr>()
  canPierce(tr: Tr, e: Ed) {
    return tr && !this.visitedInThreader.has(e.GetOtherTriangle_T(tr)) && this.edgeCanBePierced(e)
  }
  visitedInThreader = new Set<Tr>()

  createThreader(start: Point, end: Point) {
    this.start = start
    this.end = end
    this.visitedInThreader.clear()
    const passedTriClone = Array.from(this.passedTrs).map((p) => p)
    this.passedTrs.clear()
    for (const t of passedTriClone) {
      this.initFront(t)
    }

    //Assert.assert(Tr.PointLocationForTriangle(start, startTriangle) !== PointLocation.Outside)
  }
  /**This method finds the edges of the current triangle that 
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

  initFront(tr: Tr) {
    if (tr.containsPoint(this.end)) {
      this.passedTrs.add(tr)
      this.triangles.add(tr)
    }
    const sign0 = this.GetHyperplaneSign(tr.Sites.item0)
    const sign1 = this.GetHyperplaneSign(tr.Sites.item1)

    if (this.canPierce(tr, tr.Edges.item0) && sign0 !== sign1) {
      if (Point.getTriangleOrientation(this.end, tr.Sites.item0.point, tr.Sites.item1.point) == TriangleOrientation.Clockwise) {
        const frontEdge: FrontEdge = {source: tr, edge: tr.Edges.item0, rightSign: sign0, leftSign: sign1}
        this.enqueueInFront(frontEdge)
      }
    }
    const sign2 = this.GetHyperplaneSign(tr.Sites.item2)
    if (this.canPierce(tr, tr.Edges.item1) && sign1 !== sign2) {
      if (Point.getTriangleOrientation(this.end, tr.Sites.item1.point, tr.Sites.item2.point) == TriangleOrientation.Clockwise) {
        const frontEdge: FrontEdge = {source: tr, edge: tr.Edges.item1, rightSign: sign1, leftSign: sign2}
        this.enqueueInFront(frontEdge)
      }
    }

    if (this.canPierce(tr, tr.Edges.item2) && sign0 !== sign2) {
      if (Point.getTriangleOrientation(this.end, tr.Sites.item2.point, tr.Sites.item0.point) == TriangleOrientation.Clockwise) {
        const frontEdge: FrontEdge = {source: tr, edge: tr.Edges.item2, rightSign: sign2, leftSign: sign0}
        this.enqueueInFront(frontEdge)
      }
    }
  }
  enqueueInFront(frontEdge: FrontEdge) {
    this.front.enqueue(frontEdge)
  }
  /** returns true if arrived into the triangle containing end */
  private processFrontEdge(fe: FrontEdge) {
    //Assert.assert(this.negativeSign < this.positiveSign)
    const tr = targetOfFrontEdge(fe)
    if (tr == null) return
    this.visitedInThreader.add(tr)
    if (tr.containsPoint(this.end)) {
      this.passedTrs.add(tr)
      return
    }

    const i = tr.Edges.index(fe.edge)
    // th. pierced edge index
    const oppositeSite = tr.Sites.getItem(i + 2)

    const e1 = this.canPierce(tr, tr.Edges.getItem(i + 1))
    const e2 = this.canPierce(tr, tr.Edges.getItem(i + 2))
    if (!e1 && !e2) return
    const oppositeSiteSign = this.GetHyperplaneSign(oppositeSite)
    if (e1 && oppositeSiteSign < fe.rightSign) {
      this.enqueueInFront({source: tr, edge: tr.Edges.getItem(i + 1), leftSign: oppositeSiteSign, rightSign: fe.rightSign})
    }
    if (e2 && oppositeSiteSign > fe.leftSign) {
      this.enqueueInFront({source: tr, edge: tr.Edges.getItem(i + 2), leftSign: fe.leftSign, rightSign: oppositeSiteSign})
    }
  }
  extendPassedTrsByContainingPoint(p: Point) {
    const site = this.cdt.FindSite(p)
    if (site) {
      for (const t of site.Triangles()) {
        if (this.outsideOfObstacles(t)) {
          this.passedTrs.add(t)
          this.triangles.add(t)
        }
      }
    } else {
      // no site found for p: it must be on the boundary of a triangle
      // t = get one of the triangles in this.passedTrs
      const t = this.passedTrs.values().next().value
      for (const e of t.Edges) {
        const ot = e.GetOtherTriangle_T(t)
        if (this.outsideOfObstacles(ot) && ot.containsPoint(p)) {
          this.passedTrs.add(ot)
          this.triangles.add(ot)
          break // there will be only one
        }
      }
    }
  }
  *neigborsInChannel(t: Tr): IterableIterator<Tr> {
    for (const e of t.Edges) {
      if (this.edgeCanBePierced(e) === false) continue
      const ot = e.GetOtherTriangle_T(t)
      if (this.visitedInThreader.has(ot)) continue
      yield ot
    }
  }

  //        void ShowDebug(Array<Tr> cdtTriangles, CdtEdge cdtEdge, Tr cdtTriangle) {
  //            var l = new Array<DebugCurve> { new DebugCurve(10,"red",new LineSegment(start,end)) };
  //            if(cdtEdge!=null)
  //                l.Add(new DebugCurve(100,3,"navy", new LineSegment(cdtEdge.upperSite.point,cdtEdge.lowerSite.point)));
  //            AddTriangleToListOfDebugCurves(l,cdtTriangle,100,2,"brown");
  //            LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(l);
  //
  //        }
  //        static void AddTriangleToListOfDebugCurves(Array<DebugCurve> debugCurves,Tr triangle,byte transparency,double width,string color) {
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

  *threadThrough(): IterableIterator<Tr> {
    while (this.front.length) {
      const fe = this.front.dequeue()
      this.processFrontEdge(fe)
    }
    for (const tr of this.visitedInThreader) {
      yield tr
    }
  }
}

function triangleIsInsideOfObstacle(t: Tr): boolean {
  if (t.Sites.item0.Owner == null || t.Sites.item1.Owner == null || t.Sites.item2.Owner == null) {
    return true // one of the sites corresponds to a Port
  }
  return t.Sites.item0.Owner == t.Sites.item1.Owner && t.Sites.item0.Owner == t.Sites.item2.Owner
}
// function getDebugCurvesFromCdt(localCdt: Cdt): Array<DebugCurve> {
//   const es = new Set<E>()
//   for (const t of localCdt.GetTriangles()) {
//     for (const e of t.Edges) es.add(e)
//   }
//   return Array.from(es).map((e) => DebugCurve.mkDebugCurveTWCI(100, 1, 'Navy', LineSegment.mkPP(e.lowerSite.point, e.upperSite.point)))
// }
function trianglePerimeter(currentTriangle: Tr): Polyline {
  return Polyline.mkClosedFromPoints(Array.from(currentTriangle.Sites).map((s) => s.point))
}

function targetOfFrontEdge(fe: FrontEdge) {
  return fe.edge.GetOtherTriangle_T(fe.source)
}
