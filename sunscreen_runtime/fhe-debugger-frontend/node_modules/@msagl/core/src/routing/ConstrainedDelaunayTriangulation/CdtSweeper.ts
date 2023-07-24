import {Stack} from 'stack-typescript'
import {DebugCurve} from '../../math/geometry/debugCurve'

import {Ellipse} from '../../math/geometry/ellipse'
import {GeomConstants} from '../../math/geometry/geomConstants'
import {ICurve} from '../../math/geometry/icurve'
import {LineSegment} from '../../math/geometry/lineSegment'
import {Point, TriangleOrientation} from '../../math/geometry/point'
import {RBNode} from '../../math/RBTree/rbNode'
import {RBTree} from '../../math/RBTree/rbTree'
import {Algorithm} from '../../utils/algorithm'
import {RealNumberSpan} from '../../utils/RealNumberSpan'

import {Cdt} from './Cdt'
import {CdtEdge} from './CdtEdge'
import {CdtFrontElement} from './CdtFrontElement'
import {CdtSite} from './CdtSite'
import {CdtTriangle} from './CdtTriangle'
import {PerimeterEdge} from './PerimeterEdge'
// this class builds the triangulation by a sweep with a horizontal line
export class CdtSweeper extends Algorithm {
  front: RBTree<CdtFrontElement> = new RBTree<CdtFrontElement>((a, b) => a.x - b.x)

  triangles: Set<CdtTriangle> = new Set<CdtTriangle>()

  listOfSites: Array<CdtSite>

  p_2: CdtSite

  createEdgeDelegate: (a: CdtSite, b: CdtSite) => CdtEdge

  p_1: CdtSite

  constructor(listOfSites: Array<CdtSite>, p_1: CdtSite, p_2: CdtSite, createEdgeDelegate: (a: CdtSite, b: CdtSite) => CdtEdge) {
    super(null)
    this.listOfSites = listOfSites
    if (this.listOfSites.length === 0) {
      return
    }
    this.p_1 = p_1
    this.p_2 = p_2
    this.createEdgeDelegate = createEdgeDelegate

    const firstTriangle = CdtTriangle.mkSSSD(p_1, p_2, this.listOfSites[0], createEdgeDelegate)
    this.triangles.add(firstTriangle)
    this.front.insert(new CdtFrontElement(p_1, firstTriangle.Edges.getItem(2)))
    this.front.insert(new CdtFrontElement(this.listOfSites[0], firstTriangle.Edges.getItem(1)))
    //this.Show('./tmp/front.svg')
  }

  run() {
    if (this.listOfSites.length === 0) {
      return
    }

    for (let i = 1; i < this.listOfSites.length; i++) {
      this.ProcessSite(this.listOfSites[i])
    }

    this.FinalizeTriangulation()
    // #if TEST_MSAGL && TEST_MSAGL
    //             //TestTriangles();
    //             //ShowFront(triangles,null,null,null);
    // #endif
  }

  FinalizeTriangulation() {
    this.RemoveP1AndP2Triangles()
    if (this.triangles.size > 0) this.MakePerimeterConvex()
  }

  MakePerimeterConvex() {
    let firstPerimeterEdge = this.CreateDoubleLinkedListOfPerimeter()
    do {
      const concaveEdge = this.FindConcaveEdge(firstPerimeterEdge)
      if (concaveEdge == null) return
      firstPerimeterEdge = this.ShortcutTwoListElements(concaveEdge)
    } while (true)
  }

  FindConcaveEdge(firstPerimeterEdge: PerimeterEdge): PerimeterEdge {
    let a = firstPerimeterEdge
    let b: PerimeterEdge
    do {
      b = a.Next
      if (Point.getTriangleOrientation(a.Start.point, a.End.point, b.End.point) === TriangleOrientation.Counterclockwise) {
        return a
      } else a = b
    } while (b !== firstPerimeterEdge)
    return null
  }

  static FindPivot(firstPerimeterEdge: PerimeterEdge): PerimeterEdge {
    // eslint-disable-next-line no-var
    let pivot = firstPerimeterEdge
    let e = firstPerimeterEdge
    do {
      e = e.Next
      if (e.Start.point.x < pivot.Start.point.x || (e.Start.point.x === pivot.Start.point.x && e.Start.point.y < pivot.Start.point.y))
        pivot = e
    } while (e !== firstPerimeterEdge)
    return pivot
  }

  FindFirsePerimeterEdge() {
    for (const t of this.triangles) {
      for (const e of t.Edges) {
        if (e.GetOtherTriangle_T(t) == null) return e
      }
    }
    return null
  }

  CreateDoubleLinkedListOfPerimeter(): PerimeterEdge {
    const firstEdge = this.FindFirsePerimeterEdge()
    let edge = firstEdge
    let listStart: PerimeterEdge = null
    let pe: PerimeterEdge
    let prevPe: PerimeterEdge = null
    const debugDC = new Array<ICurve>()
    do {
      pe = CdtSweeper.CreatePerimeterElementFromEdge(edge)
      debugDC.push(LineSegment.mkPP(pe.Start.point, pe.End.point))
      edge = CdtSweeper.FindNextEdgeOnPerimeter(edge)
      if (prevPe != null) {
        pe.Prev = prevPe
        prevPe.Next = pe
      } else {
        listStart = pe
      }

      prevPe = pe
    } while (edge !== firstEdge)

    listStart.Prev = pe
    pe.Next = listStart

    return listStart
  }

  static FindNextEdgeOnPerimeter(e: CdtEdge): CdtEdge {
    let t: CdtTriangle = e.CwTriangle ?? e.CcwTriangle
    e = t.Edges.getItem(t.Edges.index(e) + 2)
    while (e.CwTriangle != null && e.CcwTriangle != null) {
      t = e.GetOtherTriangle_T(t)
      e = t.Edges.getItem(t.Edges.index(e) + 2)
    }
    return e
  }

  static CreatePerimeterElementFromEdge(edge: CdtEdge): PerimeterEdge {
    const pe = new PerimeterEdge(edge)
    if (edge.CwTriangle != null) {
      pe.Start = edge.upperSite
      pe.End = edge.lowerSite
    } else {
      pe.End = edge.upperSite
      pe.Start = edge.lowerSite
    }

    return pe
  }

  RemoveP1AndP2Triangles() {
    const trianglesToRemove = new Set<CdtTriangle>()
    for (const t of this.triangles) {
      if (t.Sites.has(this.p_1) || t.Sites.has(this.p_2)) {
        trianglesToRemove.add(t)
      }
    }

    for (const t of trianglesToRemove) {
      CdtSweeper.RemoveTriangleWithEdges(this.triangles, t)
    }
  }

  static RemoveTriangleWithEdges(cdtTriangles: Set<CdtTriangle>, t: CdtTriangle) {
    cdtTriangles.delete(t)
    for (const e of t.Edges) {
      if (e.CwTriangle === t) {
        e.CwTriangle = null
      } else {
        e.CcwTriangle = null
      }

      if (e.CwTriangle == null && e.CcwTriangle == null) {
        removeFromArray(e.upperSite.Edges, e)
      }
    }
  }

  static RemoveTriangleButLeaveEdges(cdtTriangles: Set<CdtTriangle>, t: CdtTriangle) {
    cdtTriangles.delete(t)
    for (const e of t.Edges) {
      if (e.CwTriangle === t) {
        e.CwTriangle = null
      } else {
        e.CcwTriangle = null
      }
    }
  }

  ProcessSite(site: CdtSite) {
    this.PointEvent(site)
    for (let i = 0; i < site.Edges.length; i++) {
      //console.log('i', i)
      const edge = site.Edges[i]
      if (edge.constrained) {
        this.EdgeEvent(edge)
      }
    }
    //throw new Error()
    // TestThatFrontIsConnected();
  }

  // #if TEST_MSAGL && TEST_MSAGL
  // void TestThatFrontIsConnected() {
  //     CdtFrontElement p = null;
  //     foreach(var cdtFrontElement of front) {
  //         if (p != null)
  //             Assert.assert(p.RightSite === cdtFrontElement.LeftSite);
  //         p = cdtFrontElement;
  //     }
  // }
  // #endif
  EdgeEvent(edge: CdtEdge) {
    /*Assert.assert(edge.Constrained)*/
    if (CdtSweeper.EdgeIsProcessed(edge)) {
      return
    }
    this.traversingEdge = edge
    this.runEdgeInserter()
  }

  static EdgeIsProcessed(edge: CdtEdge): boolean {
    return edge.CwTriangle != null || edge.CcwTriangle != null
  }

  ShowFrontWithSite(site: CdtSite, redCurves: ICurve[] = null) {
    const ls = new Array<DebugCurve>()
    if (site.Edges != null) {
      for (const e of site.Edges) {
        ls.push(
          DebugCurve.mkDebugCurveTWCI(200, 0.8, e.constrained ? 'Pink' : 'Brown', LineSegment.mkPP(e.upperSite.point, e.lowerSite.point)),
        )
      }
    }

    ls.push(DebugCurve.mkDebugCurveTWCI(200, 1, 'Brown', Ellipse.mkFullEllipseNNP(0.5, 0.5, site.point)))
    for (const t of this.triangles) {
      for (let i = 0; i < 3; i++) {
        const e = t.Edges.getItem(i)
        ls.push(
          DebugCurve.mkDebugCurveTWCI(
            e.constrained ? 155 : 100,
            e.constrained ? 0.8 : 0.4,
            e.constrained ? 'Pink' : 'Navy',
            LineSegment.mkPP(e.upperSite.point, e.lowerSite.point),
          ),
        )
      }
    }

    if (redCurves != null)
      for (const c of redCurves) {
        ls.push(DebugCurve.mkDebugCurveTWCI(100, 0.5, 'Red', c))
      }

    for (const frontElement of this.front) {
      ls.push(
        DebugCurve.mkDebugCurveTWCI(
          100,
          5.5,
          'Green',
          LineSegment.mkPP(frontElement.Edge.upperSite.point, frontElement.Edge.lowerSite.point),
        ),
      )
    }
  }

  Show(fn: string) {
    CdtSweeper.ShowCdt(Array.from(this.triangles.values()), this.front, null, null, [], fn)
  }

  static ShowCdt(
    cdtTriangles: CdtTriangle[],
    cdtFrontElements: RBTree<CdtFrontElement>,
    redCurves: Array<ICurve>,
    blueCurves: Array<ICurve>,
    dc: DebugCurve[],
    fn: string,
  ) {
    let ls: Array<DebugCurve> = new Array<DebugCurve>()
    if (redCurves != null) {
      for (const c of redCurves) {
        ls.push(DebugCurve.mkDebugCurveTWCI(200, 0.1, 'Red', c))
      }
    }

    if (blueCurves != null) {
      for (const c of blueCurves) {
        ls.push(DebugCurve.mkDebugCurveTWCI(200, 0.1, 'Blue', c))
      }
    }

    if (cdtFrontElements != null) {
      for (const frontElement of cdtFrontElements) {
        ls.push(
          DebugCurve.mkDebugCurveTWCI(
            200,
            0.1,
            'Green',
            LineSegment.mkPP(frontElement.Edge.upperSite.point, frontElement.Edge.lowerSite.point),
          ),
        )
      }
    }

    for (const t of cdtTriangles) {
      for (let i = 0; i < 3; i++) {
        const e = t.Edges.getItem(i)
        ls.push(CdtSweeper.GetDebugCurveOfCdtEdge(e))
      }
    }
    ls = ls.concat(dc)
    //   SvgDebugWriter.dumpDebugCurves(fn, ls)
  }

  static GetDebugCurveOfCdtEdge(e: CdtEdge): DebugCurve {
    if (e.CcwTriangle == null || e.CwTriangle == null)
      return DebugCurve.mkDebugCurveTWCI(
        255,
        0.5,
        e.constrained ? 'Brown' : 'Black',
        LineSegment.mkPP(e.upperSite.point, e.lowerSite.point),
      )
    return DebugCurve.mkDebugCurveTWCI(
      200,
      e.constrained ? 0.8 : 0.2,
      e.constrained ? 'Pink' : 'Navy',
      LineSegment.mkPP(e.upperSite.point, e.lowerSite.point),
    )
  }

  PointEvent(pi: CdtSite) {
    const hittedFrontElementNode = this.ProjectToFront(pi)
    const t: {rightSite: CdtSite} = {rightSite: null}
    const leftSite: CdtSite =
      hittedFrontElementNode.item.x + GeomConstants.distanceEpsilon < pi.point.x
        ? this.MiddleCase(pi, hittedFrontElementNode, t)
        : this.LeftCase(pi, hittedFrontElementNode, t)

    let piNode = this.InsertSiteIntoFront(leftSite, pi, t.rightSite)
    this.TriangulateEmptySpaceToTheRight(piNode)
    piNode = CdtSweeper.FindNodeInFrontBySite(this.front, leftSite)
    this.TriangulateEmptySpaceToTheLeft(piNode)
  }

  // #if TEST_MSAGL && TEST_MSAGL
  // void TestTriangles() {
  //     var usedSites = new Set<CdtSite>();
  //     foreach(var t of triangles)
  //     usedSites.InsertRange(t.Sites);
  //     foreach(var triangle of triangles) {
  //         TestTriangle(triangle, usedSites);
  //     }
  // }
  // void TestTriangle(CdtTriangle triangle, Set < CdtSite > usedSites) {
  //     var tsites = triangle.Sites;
  //     foreach(var site of usedSites) {
  //         if (!tsites.Contains(site)) {
  //             if (!SeparatedByConstrainedEdge(triangle, site) && InCircle(site, tsites[0], tsites[1], tsites[2])) {
  //                 Array < ICurve > redCurves=new Array<ICurve>();
  //                 redCurves.push(new Ellipse(2, 2, site.point));
  //                 Array < ICurve > blueCurves = new Array<ICurve>();
  //                 blueCurves.push(Circumcircle(tsites[0].point, tsites[1].point, tsites[2].point));
  //                 ShowFront(triangles, front, redCurves, blueCurves);
  //             }
  //         }
  //     }
  // }
  //         static bool SeparatedByConstrainedEdge(CdtTriangle triangle, CdtSite site) {
  //     for (int i = 0; i < 3; i++)
  //     if (SeparatedByEdge(triangle, i, site))
  //         return true;
  //     return false;
  // }
  //         static bool SeparatedByEdge(CdtTriangle triangle, int i, CdtSite site) {
  //     var e = triangle.Edges[i];
  //     var s = triangle.Sites.getItem(i + 2);
  //     var a0 = ApproximateComparer.Sign(Point.SignedDoubledTriangleArea(s.point, e.upperSite.point, e.lowerSite.point));
  //     var a1 = ApproximateComparer.Sign(Point.SignedDoubledTriangleArea(site.point, e.upperSite.point, e.lowerSite.point));
  //     return a0 * a1 <= 0;
  // }
  // #endif
  LeftCase(pi: CdtSite, hittedFrontElementNode: RBNode<CdtFrontElement>, t: {rightSite: CdtSite}): CdtSite {
    // left case
    //                if(db)ShowFrontWithSite(pi, LineSegment.mkPP(pi.point, hittedFrontElementNode.Item.Edge.upperSite.point), LineSegment.mkPP(pi.point, hittedFrontElementNode.Item.Edge.lowerSite.point));
    /*Assert.assert(closeDistEps(pi.point.x, hittedFrontElementNode.item.x))*/
    const hittedFrontElement = hittedFrontElementNode.item
    this.InsertAndLegalizeTriangle(pi, hittedFrontElement)
    const prevToHitted = this.front.previous(hittedFrontElementNode)
    const leftSite = prevToHitted.item.LeftSite
    t.rightSite = hittedFrontElementNode.item.RightSite
    //                if(db)ShowFrontWithSite(pi, LineSegment.mkPP(pi.point, leftSite.point), LineSegment.mkPP(pi.point, prevToHitted.Item.RightSite.point));
    this.InsertAndLegalizeTriangle(pi, prevToHitted.item)
    this.front.deleteNodeInternal(prevToHitted)
    const d = this.front.remove(hittedFrontElement)
    /*Assert.assert(d != null)*/
    return leftSite
  }

  MiddleCase(pi: CdtSite, hittedFrontElementNode: RBNode<CdtFrontElement>, t: {rightSite: CdtSite}): CdtSite {
    //            if(db)
    //                ShowFrontWithSite(pi, LineSegment.mkPP(pi.point, hittedFrontElementNode.Item.Edge.upperSite.point), LineSegment.mkPP(pi.point, hittedFrontElementNode.Item.Edge.lowerSite.point));
    const leftSite = hittedFrontElementNode.item.LeftSite
    t.rightSite = hittedFrontElementNode.item.RightSite
    this.InsertAndLegalizeTriangle(pi, hittedFrontElementNode.item)
    this.front.deleteNodeInternal(hittedFrontElementNode)
    return leftSite
  }

  TriangulateEmptySpaceToTheLeft(leftLegNode: RBNode<CdtFrontElement>) {
    const peakSite = leftLegNode.item.RightSite
    let previousNode = this.front.previous(leftLegNode)
    while (previousNode != null) {
      const prevElement = previousNode.item
      const rp = prevElement.LeftSite
      const r = prevElement.RightSite
      if (r.point.sub(peakSite.point).dot(rp.point.sub(r.point)) < 0) {
        // see figures 9(a) and 9(b) of the paper
        leftLegNode = this.ShortcutTwoFrontElements(previousNode, leftLegNode)
        previousNode = this.front.previous(leftLegNode)
      } else {
        this.TryTriangulateBasinToTheLeft(leftLegNode)
        break
      }
    }
  }

  ShortcutTwoListElements(a: PerimeterEdge): PerimeterEdge {
    const b = a.Next
    /*Assert.assert(a.End === b.Start)*/
    let t = CdtTriangle.mkSSSEE(a.Start, a.End, b.End, a.Edge, b.Edge, this.createEdgeDelegate)
    this.triangles.add(t)
    const newEdge = t.Edges.getItem(2)
    /*Assert.assert(newEdge.IsAdjacent(a.Start) && newEdge.IsAdjacent(b.End))*/
    this.LegalizeEdge(a.Start, t.OppositeEdge(a.Start))
    t = newEdge.CcwTriangle ?? newEdge.CwTriangle
    this.LegalizeEdge(b.End, t.OppositeEdge(b.End))
    const c = new PerimeterEdge(newEdge)
    c.Start = a.Start
    c.End = b.End
    a.Prev.Next = c
    c.Prev = a.Prev
    c.Next = b.Next
    b.Next.Prev = c
    return c
  }

  // aNode is to the left of bNode, and they are consecutive
  ShortcutTwoFrontElements(aNode: RBNode<CdtFrontElement>, bNode: RBNode<CdtFrontElement>): RBNode<CdtFrontElement> {
    const aElem = aNode.item
    const bElem = bNode.item
    /*Assert.assert(aElem.RightSite === bElem.LeftSite)*/
    let t: CdtTriangle = CdtTriangle.mkSSSEED(
      aElem.LeftSite,
      aElem.RightSite,
      bElem.RightSite,
      aElem.Edge,
      bElem.Edge,
      this.createEdgeDelegate,
    )
    this.triangles.add(t)
    this.front.deleteNodeInternal(aNode)
    // now bNode might b not valid anymore
    this.front.remove(bElem)
    const newEdge = t.Edges.getItem(2)
    /*Assert.assert(
      newEdge.IsAdjacent(aElem.LeftSite) && newEdge.IsAdjacent(bElem.RightSite),
    )*/
    this.LegalizeEdge(aElem.LeftSite, t.OppositeEdge(aElem.LeftSite))
    t = newEdge.CcwTriangle ?? newEdge.CwTriangle
    this.LegalizeEdge(bElem.RightSite, t.OppositeEdge(bElem.RightSite))
    return this.front.insert(new CdtFrontElement(aElem.LeftSite, newEdge))
  }

  TryTriangulateBasinToTheLeft(leftLegNode: RBNode<CdtFrontElement>) {
    if (!CdtSweeper.DropsSharpEnoughToTheLeft(leftLegNode.item)) {
      return
    }

    // ShowFrontWithSite(leftLegNode.Item.LeftSite);
    const stack = new Stack<CdtSite>()
    stack.push(leftLegNode.item.LeftSite)
    while (true) {
      const site = stack.pop()
      leftLegNode = CdtSweeper.FindNodeInFrontBySite(this.front, site)
      const prev = this.front.previous(leftLegNode)
      if (prev == null) {
        return
      }

      if (
        Point.getTriangleOrientation(prev.item.LeftSite.point, leftLegNode.item.LeftSite.point, leftLegNode.item.RightSite.point) ==
        TriangleOrientation.Counterclockwise
      ) {
        stack.push(prev.item.LeftSite)
        this.ShortcutTwoFrontElements(prev, leftLegNode)
        //      ShowFrontWithSite(site);
      } else if (leftLegNode.item.LeftSite.point.y > leftLegNode.item.RightSite.point.y) {
        stack.push(prev.item.LeftSite)
      } else {
        if (prev.item.LeftSite.point.y <= prev.item.RightSite.point.y) {
          return
        }

        stack.push(prev.item.LeftSite)
      }
    }
  }

  static DropsSharpEnoughToTheLeft(frontElement: CdtFrontElement): boolean {
    const edge = frontElement.Edge
    if (frontElement.RightSite !== edge.upperSite) {
      return false
    }

    const d = edge.lowerSite.point.sub(edge.upperSite.point)
    /*Assert.assert(d.x < 0 && d.y <= 0)*/
    return d.x >= 0.5 * d.y
  }

  InsertSiteIntoFront(leftSite: CdtSite, pi: CdtSite, rightSite: CdtSite): RBNode<CdtFrontElement> {
    let rightEdge: CdtEdge = null
    let leftEdge: CdtEdge = null
    for (const edge of pi.Edges) {
      if (leftEdge == null && edge.lowerSite === leftSite) {
        leftEdge = edge
      }

      if (rightEdge == null && edge.lowerSite === rightSite) {
        rightEdge = edge
      }

      if (leftEdge != null && rightEdge != null) {
        break
      }
    }

    /*Assert.assert(leftEdge != null && rightEdge != null)*/
    this.front.insert(new CdtFrontElement(leftSite, leftEdge))
    return this.front.insert(new CdtFrontElement(pi, rightEdge))
  }

  TriangulateEmptySpaceToTheRight(piNode: RBNode<CdtFrontElement>) {
    const piSite = piNode.item.LeftSite
    const piPoint = piSite.point
    let piNext = this.front.next(piNode)
    while (piNext != null) {
      const frontElem = piNext.item
      const r = frontElem.LeftSite
      const rp = frontElem.RightSite
      if (r.point.sub(piPoint).dot(rp.point.sub(r.point)) < 0) {
        // see figures 9(a) and 9(b) of the paper
        piNode = this.ShortcutTwoFrontElements(piNode, piNext)
        piNext = this.front.next(piNode)
      } else {
        this.TryTriangulateBasinToTheRight(piNode)
        break
      }
    }
  }

  TryTriangulateBasinToTheRight(piNode: RBNode<CdtFrontElement>) {
    if (!CdtSweeper.DropsSharpEnoughToTheRight(piNode.item)) {
      return
    }

    // ShowFrontWithSite(piNode.Item.LeftSite);
    const stack = new Stack<CdtSite>()
    stack.push(piNode.item.LeftSite)
    while (true) {
      const site = stack.pop()
      piNode = CdtSweeper.FindNodeInFrontBySite(this.front, site)
      const next = this.front.next(piNode)
      if (next == null) {
        return
      }

      if (
        Point.getTriangleOrientation(piNode.item.LeftSite.point, piNode.item.RightSite.point, next.item.RightSite.point) ==
        TriangleOrientation.Counterclockwise
      ) {
        this.ShortcutTwoFrontElements(piNode, next)
        stack.push(site)
      } else if (piNode.item.LeftSite.point.y > piNode.item.RightSite.point.y) {
        stack.push(piNode.item.RightSite)
      } else {
        if (next.item.LeftSite.point.y >= next.item.RightSite.point.y) {
          return
        }

        stack.push(piNode.item.RightSite)
      }
    }
  }

  static DropsSharpEnoughToTheRight(frontElement: CdtFrontElement): boolean {
    const edge = frontElement.Edge
    if (frontElement.LeftSite !== edge.upperSite) {
      return false
    }

    const d = edge.lowerSite.point.sub(edge.upperSite.point)
    /*Assert.assert(d.x > 0 && d.y <= 0)*/
    return d.x <= -0.5 * d.y
  }

  static FindNodeInFrontBySite(cdtFrontElements: RBTree<CdtFrontElement>, piSite: CdtSite): RBNode<CdtFrontElement> {
    return cdtFrontElements.findLast((x) => x.LeftSite.point.x <= piSite.point.x)
  }

  InsertAndLegalizeTriangle(pi: CdtSite, frontElement: CdtFrontElement) {
    if (
      Point.getTriangleOrientation(pi.point, frontElement.LeftSite.point, frontElement.RightSite.point) !== TriangleOrientation.Collinear
    ) {
      const tr = CdtTriangle.mkSED(pi, frontElement.Edge, this.createEdgeDelegate)
      this.triangles.add(tr)
      this.LegalizeEdge(pi, tr.Edges.getItem(0))
    } else {
      // we need to split the triangle below the element of to two triangles and legalize the old edges
      // we also delete, that is forget, the frontElement.Edge
      const e = frontElement.Edge
      removeFromArray(e.upperSite.Edges, e)
      let t = e.CcwTriangle ?? e.CwTriangle
      const oppositeSite = t.OppositeSite(e)
      CdtSweeper.RemoveTriangleButLeaveEdges(this.triangles, t)
      t = CdtTriangle.mkSSSD(frontElement.LeftSite, oppositeSite, pi, this.createEdgeDelegate)
      const t1 = CdtTriangle.mkSSSD(frontElement.RightSite, oppositeSite, pi, this.createEdgeDelegate)
      this.triangles.add(t)
      this.triangles.add(t1)
      this.LegalizeEdge(pi, t.OppositeEdge(pi))
      this.LegalizeEdge(pi, t1.OppositeEdge(pi))
    }
  }

  LegalizeEdge(pi: CdtSite, edge: CdtEdge) {
    /*Assert.assert(pi !== edge.upperSite && pi !== edge.lowerSite)*/
    if (edge.constrained || edge.CcwTriangle == null || edge.CwTriangle == null) {
      return
    }

    if (edge.CcwTriangle.Contains(pi)) {
      this.LegalizeEdgeForOtherCwTriangle(pi, edge)
    } else {
      this.LegalizeEdgeForOtherCcwTriangle(pi, edge)
    }
  }

  LegalizeEdgeForOtherCwTriangle(pi: CdtSite, edge: CdtEdge) {
    const i = edge.CwTriangle.Edges.index(edge)
    //           if (i === -1)
    //           {
    //               Array<DebugCurve> ls = new Array<DebugCurve>();
    //               ls.Add(new DebugCurve(new Ellipse(2, 2, pi.point)));
    //               for (int j = 0; j < 3; j++)
    //               {
    //                   var ee = edge.CwTriangle.Edges[j];
    //                   ls.Add(new DebugCurve(100,1, j === i ? "red" : "blue", new LineSegment(ee.upperSite.point, ee.lowerSite.point)));
    //               }
    //               ls.Add(new DebugCurve("purple", new LineSegment(edge.upperSite.point, edge.lowerSite.point)));
    //
    //               LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(ls);
    //           }
    /*Assert.assert(i >= 0)*/
    if (IsIllegal(pi, edge.upperSite, edge.CwTriangle.Sites.getItem(i + 2), edge.lowerSite)) {
      //ShowIllegalEdge(edge, i, pi);

      const e = Flip(pi, edge)
      this.LegalizeEdge(pi, e.CwTriangle.OppositeEdge(pi))
      this.LegalizeEdge(pi, e.CcwTriangle.OppositeEdge(pi))
    }
  }

  LegalizeEdgeForOtherCcwTriangle(pi: CdtSite, edge: CdtEdge) {
    const i = edge.CcwTriangle.Edges.index(edge)
    if (IsIllegal(pi, edge.lowerSite, edge.CcwTriangle.Sites.getItem(i + 2), edge.upperSite)) {
      const e: CdtEdge = Flip(pi, edge)
      this.LegalizeEdge(pi, e.CwTriangle.OppositeEdge(pi))
      this.LegalizeEdge(pi, e.CcwTriangle.OppositeEdge(pi))
    }
  }

  // #if TEST_MSAGL && TEST_MSAGL
  // Array < DebugCurve > ShowIllegalEdge(CdtEdge edge, CdtSite pi, int i) {
  //     Array < DebugCurve > ls = new Array<DebugCurve>();
  //     ls.push(DebugCurve.mkDebugCurveTWCI(new Ellipse(2, 2, pi.point)));
  //     for (int j = 0; j < 3; j++) {
  //         var ee = edge.CcwTriangle.Edges[j];
  //         ls.push(DebugCurve.mkDebugCurveTWCI(j === i ? "red" : "blue", LineSegment.mkPP(ee.upperSite.point, ee.lowerSite.point)));
  //     }
  //     ls.push(DebugCurve.mkDebugCurveTWCI(100, 1, "black", Circumcircle(edge.CcwTriangle.Sites.getItem(0].point, edge.CcwTriangle.Sites[1].point, edge.CcwTriangle.Sites[2).point)));
  //     LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(ls);
  //     return ls;
  // }
  //         static Ellipse Circumcircle(Point a, Point b, Point c) {
  //     var mab = 0.5 * (a + b);
  //     var mbc = 0.5 * (c + b);
  //     Point center;
  //     Point.LineLineIntersection(mab, mab + (b - a).Rotate(Math.PI / 2), mbc, mbc + (b - c).Rotate(Math.PI / 2), out center);
  //     var r = (center - a).Length;
  //     return new Ellipse(r, r, center);
  // }
  // #endif

  ProjectToFront(site: CdtSite): RBNode<CdtFrontElement> {
    return this.front.findLast((s) => s.x <= site.point.x)
  }
  /** start of edge insert region */
  traversingEdge: CdtEdge

  rightPolygon: Array<CdtSite>

  leftPolygon: Array<CdtSite>

  addedTriangles: Array<CdtTriangle>

  private runEdgeInserter() {
    this.initEdgeInserter()
    this.TraceEdgeThroughTriangles()
    this.TriangulatePolygon0(this.rightPolygon, this.traversingEdge.upperSite, this.traversingEdge.lowerSite, true)
    this.TriangulatePolygon0(this.leftPolygon, this.traversingEdge.upperSite, this.traversingEdge.lowerSite, false)
    this.UpdateFront()
  }
  initEdgeInserter() {
    this.rightPolygon = new Array<CdtSite>()
    this.leftPolygon = new Array<CdtSite>()
    this.addedTriangles = new Array<CdtTriangle>()
    this.piercedEdge = null
    this.piercedTriangle = null
    this.piercedToTheLeftFrontElemNode = null
    this.piercedToTheRightFrontElemNode = null
  }
  UpdateFront() {
    const newFrontEdges = new Set<CdtEdge>()
    for (const t of this.addedTriangles) {
      for (const e of t.Edges)
        if (e.CwTriangle == null || e.CcwTriangle == null) {
          if (e.lowerSite == this.p_2 && e.upperSite == this.p_1) {
            continue
          }

          newFrontEdges.add(e)
        }
    }
    for (const e of newFrontEdges) this.AddEdgeToFront(e)
  }

  AddEdgeToFront(e: CdtEdge) {
    const leftSite = e.upperSite.point.x < e.lowerSite.point.x ? e.upperSite : e.lowerSite
    this.front.insert(new CdtFrontElement(leftSite, e))
  }

  TriangulatePolygon0(polygon: Array<CdtSite>, a: CdtSite, b: CdtSite, reverseTrangleWhenCompare: boolean) {
    if (polygon.length > 0) {
      this.TriangulatePolygon1(0, polygon.length - 1, polygon, a, b, reverseTrangleWhenCompare)
    }
  }

  TriangulatePolygon1(start: number, end: number, polygon: Array<CdtSite>, a: CdtSite, b: CdtSite, reverseTrangleWhenCompare: boolean) {
    //            if(CdtSweeper.db)
    //               CdtSweeper.ShowFront(triangles,front, Enumerable.Range(start, end-start+1).Select(i=> new Ellipse(10,10,polygon[i].point)).ToArray(), new[]{new LineSegment(a.point,b.point)});
    let c = polygon[start]
    let cIndex: number = start
    for (let i: number = start + 1; i <= end; i++) {
      const v = polygon[i]
      if (localInCircle(v)) {
        cIndex = i
        c = v
      }
    }

    const t = CdtTriangle.mkSSSD(a, b, c, this.createEdgeDelegate)
    this.triangles.add(t)
    this.addedTriangles.push(t)
    if (start < cIndex) {
      this.TriangulatePolygon1(start, cIndex - 1, polygon, a, c, reverseTrangleWhenCompare)
    }

    if (cIndex < end) {
      this.TriangulatePolygon1(cIndex + 1, end, polygon, c, b, reverseTrangleWhenCompare)
    }
    function localInCircle(v: CdtSite): boolean {
      return reverseTrangleWhenCompare ? InCircle(v, a, c, b) : InCircle(v, a, b, c)
    }
  }

  TraceEdgeThroughTriangles() {
    this.initEdgeTracer()
    this.Traverse()
  }
  /** edge tracer region */

  // the upper site of the traversing edge
  a: CdtSite
  // the lower site of the traversing edge
  b: CdtSite
  piercedEdge: CdtEdge
  piercedTriangle: CdtTriangle
  piercedToTheLeftFrontElemNode: RBNode<CdtFrontElement>
  piercedToTheRightFrontElemNode: RBNode<CdtFrontElement>
  elementsToBeRemovedFromFront: Array<CdtFrontElement>
  removedTriangles: Array<CdtTriangle>

  Traverse() {
    while (!this.BIsReached()) {
      if (this.piercedToTheLeftFrontElemNode != null) {
        this.ProcessLeftFrontPiercedElement()
      } else if (this.piercedToTheRightFrontElemNode != null) {
        this.ProcessRightFrontPiercedElement()
      } else {
        this.ProcessPiercedEdge()
      }
    }

    if (this.piercedTriangle != null) {
      this.removePiercedTriangle(this.piercedTriangle)
    }

    this.FindMoreRemovedFromFrontElements()
    for (const elem of this.elementsToBeRemovedFromFront) {
      this.front.remove(elem)
    }
  }

  ProcessLeftFrontPiercedElement() {
    // CdtSweeper.ShowFront(triangles, front,new []{new LineSegment(a.point, b.point),new LineSegment(piercedToTheLeftFrontElemNode.item.Edge.lowerSite.point,piercedToTheLeftFrontElemNode.item.Edge.upperSite.point)},null);
    let v = this.piercedToTheLeftFrontElemNode
    do {
      this.elementsToBeRemovedFromFront.push(v.item)
      this.AddSiteToLeftPolygon(v.item.LeftSite)
      v = this.front.previous(v)
    } while (Point.pointToTheLeftOfLine(v.item.LeftSite.point, this.a.point, this.b.point)) //that is why we are adding to the left polygon

    this.elementsToBeRemovedFromFront.push(v.item)
    this.AddSiteToRightPolygon(v.item.LeftSite)
    if (v.item.LeftSite === this.b) {
      this.piercedToTheLeftFrontElemNode = v
      // this will stop the traversal
      return
    }

    this.FindPiercedTriangle(v)
    this.piercedToTheLeftFrontElemNode = null
  }

  FindPiercedTriangle(v: RBNode<CdtFrontElement>) {
    const e = v.item.Edge
    const t = e.CcwTriangle ?? e.CwTriangle
    const eIndex = t.Edges.index(e)
    for (let i = 1; i <= 2; i++) {
      const ei = t.Edges.getItem(i + eIndex)
      const signedArea0 = RealNumberSpan.sign(Point.signedDoubledTriangleArea(ei.lowerSite.point, this.a.point, this.b.point))
      const signedArea1 = RealNumberSpan.sign(Point.signedDoubledTriangleArea(ei.upperSite.point, this.a.point, this.b.point))
      if (signedArea1 * signedArea0 <= 0) {
        this.piercedTriangle = t
        this.piercedEdge = ei
        break
      }
    }
  }

  FindMoreRemovedFromFrontElements() {
    for (const triangle of this.removedTriangles) {
      for (const e of triangle.Edges) {
        if (e.CcwTriangle == null && e.CwTriangle == null) {
          const site = e.upperSite.point.x < e.lowerSite.point.x ? e.upperSite : e.lowerSite
          const frontNode = CdtSweeper.FindNodeInFrontBySite(this.front, site)
          if (frontNode.item.Edge === e) {
            this.elementsToBeRemovedFromFront.push(frontNode.item)
          }
        }
      }
    }
  }
  ProcessPiercedEdge() {
    // if(CdtSweeper.db)
    //          CdtSweeper.ShowFront(triangles, front, new[] { new LineSegment(a.point, b.point) },
    //                      new[] { new LineSegment(piercedEdge.upperSite.point, piercedEdge.lowerSite.point) });
    if (this.piercedEdge.CcwTriangle === this.piercedTriangle) {
      this.AddSiteToLeftPolygon(this.piercedEdge.lowerSite)
      this.AddSiteToRightPolygon(this.piercedEdge.upperSite)
    } else {
      this.AddSiteToLeftPolygon(this.piercedEdge.upperSite)
      this.AddSiteToRightPolygon(this.piercedEdge.lowerSite)
    }

    this.removePiercedTriangle(this.piercedTriangle)
    this.PrepareNextStateAfterPiercedEdge()
  }

  PrepareNextStateAfterPiercedEdge() {
    const t = this.piercedEdge.CwTriangle ?? this.piercedEdge.CcwTriangle
    const eIndex = t.Edges.index(this.piercedEdge)
    for (let i = 1; i <= 2; i++) {
      const e = t.Edges.getItem(i + eIndex)
      const signedArea0 = RealNumberSpan.sign(Point.signedDoubledTriangleArea(e.lowerSite.point, this.a.point, this.b.point))
      const signedArea1 = RealNumberSpan.sign(Point.signedDoubledTriangleArea(e.upperSite.point, this.a.point, this.b.point))
      if (signedArea1 * signedArea0 <= 0) {
        if (e.CwTriangle != null && e.CcwTriangle != null) {
          this.piercedTriangle = t
          this.piercedEdge = e
          break
        }

        // e has to belong to the front, and its triangle has to be removed
        this.piercedTriangle = null
        this.piercedEdge = null
        const leftSite = e.upperSite.point.x < e.lowerSite.point.x ? e.upperSite : e.lowerSite
        const frontElem = CdtSweeper.FindNodeInFrontBySite(this.front, leftSite)
        /*Assert.assert(frontElem != null)*/
        if (leftSite.point.x < this.a.point.x) {
          this.piercedToTheLeftFrontElemNode = frontElem
        } else {
          this.piercedToTheRightFrontElemNode = frontElem
        }

        this.removePiercedTriangle(e.CwTriangle ?? e.CcwTriangle)
        break
      }
    }
  }

  removePiercedTriangle(t: CdtTriangle) {
    this.triangles.delete(t)
    for (const e of t.Edges) {
      if (e.CwTriangle === t) {
        e.CwTriangle = null
      } else {
        e.CcwTriangle = null
      }
      this.removedTriangles.push(t)
    }
  }

  ProcessRightFrontPiercedElement() {
    let v = this.piercedToTheRightFrontElemNode
    do {
      this.elementsToBeRemovedFromFront.push(v.item)
      this.AddSiteToRightPolygon(v.item.RightSite)
      v = this.front.next(v)
    } while (Point.pointToTheRightOfLine(v.item.RightSite.point, this.a.point, this.b.point)) //that is why we are adding to the right polygon
    this.elementsToBeRemovedFromFront.push(v.item)
    this.AddSiteToLeftPolygon(v.item.RightSite)
    if (v.item.RightSite === this.b) {
      this.piercedToTheRightFrontElemNode = v //this will stop the traversal
      return
    }
    this.FindPiercedTriangle(v)
    this.piercedToTheRightFrontElemNode = null
  }

  AddSiteToLeftPolygon(site: CdtSite) {
    this.AddSiteToPolygonWithCheck(site, this.leftPolygon)
  }

  AddSiteToPolygonWithCheck(site: CdtSite, list: Array<CdtSite>) {
    if (site === this.b) {
      return
    }

    if (list.length === 0 || list[list.length - 1] !== site) {
      list.push(site)
    }
  }

  AddSiteToRightPolygon(site: CdtSite) {
    this.AddSiteToPolygonWithCheck(site, this.rightPolygon)
  }

  BIsReached(): boolean {
    const node = this.piercedToTheLeftFrontElemNode ?? this.piercedToTheRightFrontElemNode
    if (node != null) {
      return node.item.Edge.IsAdjacent(this.b)
    }

    return this.piercedEdge.IsAdjacent(this.b)
  }

  initEdgeTracer() {
    this.elementsToBeRemovedFromFront = []
    this.a = this.traversingEdge.upperSite
    this.b = this.traversingEdge.lowerSite
    this.removedTriangles = []
    //            if (CdtSweeper.D)
    //                CdtSweeper.ShowFront(triangles, front, new[] {new LineSegment(a.point, b.point)},null);
    // new[] {new LineSegment(piercedEdge.upperSite.point, piercedEdge.lowerSite.point)});
    const frontElemNodeRightOfA = CdtSweeper.FindNodeInFrontBySite(this.front, this.a)
    const frontElemNodeLeftOfA = this.front.previous(frontElemNodeRightOfA)
    if (Point.pointToTheLeftOfLine(this.b.point, frontElemNodeLeftOfA.item.LeftSite.point, frontElemNodeLeftOfA.item.RightSite.point)) {
      this.piercedToTheLeftFrontElemNode = frontElemNodeLeftOfA
    } else if (
      Point.pointToTheRightOfLine(this.b.point, frontElemNodeRightOfA.item.RightSite.point, frontElemNodeRightOfA.item.LeftSite.point)
    ) {
      this.piercedToTheRightFrontElemNode = frontElemNodeRightOfA
    } else {
      for (const e of this.a.Edges) {
        const t = e.CcwTriangle
        if (t == null) {
          continue
        }

        if (Point.pointToTheLeftOfLine(this.b.point, e.lowerSite.point, e.upperSite.point)) {
          continue
        }

        const eIndex = t.Edges.index(e)
        const site = t.Sites.getItem(eIndex + 2)
        if (Point.pointToTheLeftOfLineOrOnLine(this.b.point, site.point, e.upperSite.point)) {
          this.piercedEdge = t.Edges.getItem(eIndex + 1)
          this.piercedTriangle = t
          // CdtSweeper.ShowFront(triangles, front, new[] { new LineSegment(e.upperSite.point, e.lowerSite.point) },
          // new[] { new LineSegment(piercedEdge.upperSite.point, piercedEdge.lowerSite.point) });
          break
        }
      }
    }
  }
}

function removeFromArray<T>(arr: T[], item: T) {
  if (arr.length === 0) return
  const i = arr.findIndex((e) => item === e)

  if (i >= 0) {
    if (i !== arr.length - 1) {
      arr[i] = arr[arr.length - 1] // save the last element
    }
    arr.pop()
  }
}

function IsIllegal(pi: CdtSite, a: CdtSite, b: CdtSite, c: CdtSite): boolean {
  return InCone(pi, a, b, c) && InCircle(pi, a, b, c)
}

function InCone(pi: CdtSite, a: CdtSite, b: CdtSite, c: CdtSite): boolean {
  /*Assert.assert(
    Point.getTriangleOrientation(a.point, b.point, c.point) ==
      TriangleOrientation.Counterclockwise,
  )*/

  return (
    Point.getTriangleOrientation(a.point, pi.point, b.point) === TriangleOrientation.Clockwise &&
    Point.getTriangleOrientation(b.point, pi.point, c.point) === TriangleOrientation.Clockwise
  )
}
// Testing that d of inside of the circumcircle of (a,b,c).
// The good explanation of this test is of
// "Guibas, Stolfi,"Primitives for the Manipulation of General Subdivisions and the Computation of Voronoi Diagrams
//
export function InCircle(d: CdtSite, a: CdtSite, b: CdtSite, c: CdtSite): boolean {
  /*Assert.assert(
    Point.getTriangleOrientation(a.point, b.point, c.point) ==
      TriangleOrientation.Counterclockwise,
  )*/
  const axdx = a.point.x - d.point.x
  const aydy = a.point.y - d.point.y
  const bxdx = b.point.x - d.point.x
  const bydy = b.point.y - d.point.y
  const cxdx = c.point.x - d.point.x
  const cydy = c.point.y - d.point.y
  const t0 = axdx * axdx + aydy * aydy
  const t1 = bxdx * bxdx + bydy * bydy
  const t2 = cxdx * cxdx + cydy * cydy
  return axdx * (bydy * t2 - cydy * t1) - bxdx * (aydy * t2 - cydy * t0) + cxdx * (aydy * t1 - bydy * t0) > GeomConstants.tolerance
}

function TriangleIsCorrect(t: CdtTriangle) {
  if (
    Point.getTriangleOrientation(t.Sites.getItem(0).point, t.Sites.getItem(1).point, t.Sites.getItem(2).point) !=
    TriangleOrientation.Counterclockwise
  ) {
    return false
  }
  for (let i = 0; i < 3; i++) {
    const e = t.Edges.getItem(i)
    const a = t.Sites.getItem(i)
    const b = t.Sites.getItem(i + 1)
    if (!e.IsAdjacent(a) || !e.IsAdjacent(b)) return false
    if (e.upperSite === a) {
      if (e.CcwTriangle !== t) return false
    } else if (e.CwTriangle !== t) return false
  }
  return true
}

function Flip(pi: CdtSite, edge: CdtEdge): CdtEdge {
  /*Assert.assert(!edge.IsAdjacent(pi))*/
  /*Assert.assert(edge.CcwTriangle.Contains(pi) || edge.CwTriangle.Contains(pi))*/
  //get surrounding data
  let t: CdtTriangle
  let ot: CdtTriangle
  if (edge.CcwTriangle.Contains(pi)) {
    t = edge.CcwTriangle
    ot = edge.CwTriangle
  } else {
    t = edge.CwTriangle
    ot = edge.CcwTriangle
  }
  /*Assert.assert(t.Contains(pi))*/
  const eIndex = t.Edges.index(edge)
  const eOtherIndex = ot.Edges.index(edge)
  /*Assert.assert(eIndex > -1 && eOtherIndex > -1)*/
  const pl = ot.Sites.getItem(eOtherIndex + 2)
  const edgeBeforPi = t.Edges.getItem(eIndex + 1)
  const edgeBeforPl = ot.Edges.getItem(eOtherIndex + 1)

  //changing t
  const newEdge = Cdt.GetOrCreateEdge(pi, pl)
  t.Sites.setItem(eIndex + 1, pl)
  t.Edges.setItem(eIndex, edgeBeforPl)
  t.Edges.setItem(eIndex + 1, newEdge)
  //changing ot
  ot.Sites.setItem(eOtherIndex + 1, pi)
  ot.Edges.setItem(eOtherIndex, edgeBeforPi)
  ot.Edges.setItem(eOtherIndex + 1, newEdge)
  //orient the new edge and the two edges that move from one triangle to another
  if (edgeBeforPl.lowerSite === pl) edgeBeforPl.CcwTriangle = t
  else edgeBeforPl.CwTriangle = t

  if (edgeBeforPi.lowerSite === pi) edgeBeforPi.CcwTriangle = ot
  else edgeBeforPi.CwTriangle = ot

  if (newEdge.upperSite === pi) {
    newEdge.CcwTriangle = ot
    newEdge.CwTriangle = t
  } else {
    newEdge.CcwTriangle = t
    newEdge.CwTriangle = ot
  }
  /*Assert.assert(TriangleIsCorrect(t))*/
  /*Assert.assert(TriangleIsCorrect(t))*/
  //ShowFlip(pi, t, ot);
  removeFromArray(edge.upperSite.Edges, edge) //forget the edge
  return newEdge
}
// #if TEST_MSAGL && TEST_MSAGL
//    static void ShowFlip(CdtSite pi, CdtTriangle t, CdtTriangle ot) {
//        Array<DebugCurve> ls=new Array<DebugCurve>();
//        ls.Add(new DebugCurve(new Ellipse(2,2, pi.point)));
//        for(int i=0;i<3;i++) {
//            var e=t.Edges[i];
//            ls.Add(new DebugCurve(100, 1, "red", new LineSegment(e.upperSite.point,e.lowerSite.point)));
//        }
//        for (int i = 0; i < 3; i++)
//        {
//            var e = ot.Edges[i];
//            ls.Add(new DebugCurve(100, 1, "blue", new LineSegment(e.upperSite.point, e.lowerSite.point)));
//        }
//        ls.Add(new DebugCurve(Circumcircle(t.Sites.getItem(0].point, t.Sites[1].point, t.Sites[2).point)));
//        LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(ls);
//    }
// #endif
