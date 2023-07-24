// calculates the pair of tangent line segments between two convex non-intersecting polygons H and Q

import {LineSegment} from '../../math/geometry/lineSegment'
import {Point} from '../../math/geometry/point'
import {Polygon} from './Polygon'

// we suppose that polygons are clockwise oriented
export class TangentPair {
  // left tangent means that the polygon lies to the left of the tangent
  // right tangent means that the polygon lies to the right of the tangent
  // the first element of a couple referse to P and the second to Q
  // the left at P and left at Q tangent
  P: Polygon

  Q: Polygon

  leftPLeftQ: [number, number]

  // the left at P and right at Q tangent
  leftPRightQ: [number, number]

  lowerBranchOnQ: boolean

  // the right at P and left at Q tangent
  rightPLeftQ: [number, number]

  // the right at P and right at Q tangent
  rightPRightQ: [number, number]

  upperBranchOnP: boolean

  constructor(polygonP: Polygon, polygonQ: Polygon) {
    this.P = polygonP
    this.Q = polygonQ
  }

  LeftFromLineOnP(vertexIndex: number, lineStart: Point, lineEnd: Point): boolean {
    const p: Point = this.P.pnt(vertexIndex)
    if (this.upperBranchOnP) {
      return Point.pointToTheLeftOfLineOrOnLine(lineEnd, p, lineStart)
    }

    return Point.pointToTheRightOfLineOrOnLine(lineEnd, p, lineStart)
  }

  LeftFromLineOnQ(vertexIndex: number, lineStart: Point, lineEnd: Point): boolean {
    const point: Point = this.Q.pnt(vertexIndex)
    if (this.lowerBranchOnQ) {
      return Point.pointToTheLeftOfLineOrOnLine(lineEnd, point, lineStart)
    }

    return Point.pointToTheRightOfLineOrOnLine(lineEnd, point, lineStart)
  }

  PrevOnP(i: number): number {
    if (this.upperBranchOnP) {
      return this.P.Prev(i)
    }

    return this.P.Next(i)
  }

  PrevOnQ(i: number): number {
    if (this.lowerBranchOnQ) {
      return this.Q.Prev(i)
    }

    return this.Q.Next(i)
  }

  NextOnP(i: number): number {
    if (this.upperBranchOnP) {
      return this.P.Next(i)
    }

    return this.P.Prev(i)
  }

  NextOnQ(i: number): number {
    if (this.lowerBranchOnQ) {
      return this.Q.Next(i)
    }

    return this.Q.Prev(i)
  }

  MedianOnP(i: number, j: number): number {
    if (this.upperBranchOnP) {
      return this.P.Median(i, j)
    }

    return this.P.Median(j, i)
  }

  MedianOnQ(i: number, j: number): number {
    if (this.lowerBranchOnQ) {
      return this.Q.Median(i, j)
    }

    return this.Q.Median(j, i)
  }

  ModuleP(p0: number, p1: number): number {
    if (this.upperBranchOnP) {
      return this.P.Module(p1 - p0)
    }

    return this.P.Module(p0 - p1)
  }

  ModuleQ(q0: number, q1: number): number {
    if (this.lowerBranchOnQ) {
      return this.Q.Module(q1 - q0)
    }

    return this.Q.Module(q0 - q1)
  }

  // we pretend here that the branches go clockwise from p0 to p1, and from q0 to q1
  TangentBetweenBranches(p0: number, p1: number, q0: number, q1: number): [number, number] {
    while (p1 !== p0 || q1 !== q0) {
      const mp = p1 !== p0 ? this.MedianOnP(p0, p1) : p0
      const mq = q1 !== q0 ? this.MedianOnQ(q0, q1) : q0
      const mpp: Point = this.P.pnt(mp)
      const mqp: Point = this.Q.pnt(mq)
      // SugiyamaLayoutSettings.Show(P.Polyline, ls(mp, mq), ls(p1,q0), ls(p0,q1), Q.Polyline);
      let moveOnP = true
      if (this.ModuleP(p0, p1) > 1) {
        if (this.LeftFromLineOnP(this.NextOnP(mp), mpp, mqp)) {
          p0 = mp
        } else if (this.LeftFromLineOnP(this.PrevOnP(mp), mpp, mqp)) {
          p1 = mp
        } else {
          moveOnP = false
        }
      } else if (p1 !== p0) {
        // we have only two point in the branch
        // try to move p0 clockwise
        if (this.LeftFromLineOnP(p1, this.P.pnt(p0), mqp)) {
          p0 = p1
        } else if (this.LeftFromLineOnP(p0, this.P.pnt(p1), mqp)) {
          p1 = p0
        } else {
          moveOnP = false
        }
      } else {
        moveOnP = false
      }

      let moveOnQ = true
      if (this.ModuleQ(q0, q1) > 1) {
        if (this.LeftFromLineOnQ(this.NextOnQ(mq), mqp, mpp)) {
          q0 = mq
        } else if (this.LeftFromLineOnQ(this.PrevOnQ(mq), mqp, mpp)) {
          q1 = mq
        } else {
          moveOnQ = false
        }
      } else if (q1 !== q0) {
        // we have only two points in the branch
        if (this.LeftFromLineOnQ(q1, this.Q.pnt(q0), mpp)) {
          q0 = q1
        } else if (this.LeftFromLineOnQ(q0, this.Q.pnt(q1), mpp)) {
          q1 = q0
        } else {
          moveOnQ = false
        }
      } else {
        moveOnQ = false
      }

      if (!moveOnP && !moveOnQ) {
        p0 = mp
        p1 = mp
        q0 = mq
        q1 = mq
      }
    }

    return [p0, q1]
  }

  // following the paper of Edelsbrunner
  FindDividingBisector(t: {bisectorPivot: Point; bisectorRay: Point; p1: number; p2: number; q1: number; q2: number}) {
    const m: {
      pClosest: Point
      qClosest: Point
      p1: number
      p2: number
      q1: number
      q2: number
    } = {
      pClosest: undefined,
      qClosest: undefined,
      p1: undefined,
      p2: undefined,
      q1: undefined,
      q2: undefined,
    }
    this.FindClosestFeatures(m)
    t.bisectorPivot = Point.middle(m.pClosest, m.qClosest)
    t.bisectorRay = m.pClosest.sub(m.qClosest).rotate(Math.PI / 2)
    t.p1 = m.p1
    t.p2 = m.p2
    t.q1 = m.q1
    t.q2 = m.q2
    // number p=P.FindTheFurthestVertexFromBisector(
    // #if TEST_MSAGL
    //             //if (!Point.closeDistEps(pClosest, qClosest))
    //             //    SugiyamaLayoutSettings.Show(this.P.Polyline, this.Q.Polyline, new LineSegment(pClosest, qClosest));
    // #endif
  }

  FindClosestPoints() {
    const m: {
      q2: number
      p1: number
      p2: number
      q1: number
      pClosest: Point
      qClosest: Point
    } = {
      q2: undefined,
      p1: undefined,
      p2: undefined,
      q1: undefined,
      pClosest: undefined,
      qClosest: undefined,
    }
    this.FindClosestFeatures(m)
    return {pClosest: m.pClosest, qClosest: m.qClosest}
  }

  FindClosestFeatures(m: {p1: number; p2: number; q1: number; q2: number; pClosest: Point; qClosest: Point}) {
    const r: {leftTangentPoint: number; rightTangentPoint: number} = {
      leftTangentPoint: undefined,
      rightTangentPoint: undefined,
    }

    this.P.GetTangentPoints(r, this.Q.pp(0).point)
    // LayoutAlgorithmSettings.ShowDebugCurves(new DebugCurve(P.Polyline), new DebugCurve(Q.Polyline), new DebugCurve("red",Ls(p2, 0)), new DebugCurve("blue",Ls(p1, 0)));
    m.p2 = r.leftTangentPoint
    m.p1 = r.rightTangentPoint
    if (m.p2 === m.p1) m.p2 += this.P.count

    this.Q.GetTangentPoints(r, this.P.pp(0).point)
    // LayoutAlgorithmSettings.Show(P.Polyline, Q.Polyline, Ls(0, q1), Ls(0, q2));
    m.q1 = r.leftTangentPoint
    m.q2 = r.rightTangentPoint
    if (m.q2 === m.q1) {
      m.q2 += this.Q.count
    }

    this.FindClosestPoints_(m)
  }

  //chunks go clockwise from p1 to p2 and from q2 to q1
  FindClosestPoints_(t: {p1: number; p2: number; q2: number; q1: number; pClosest: Point; qClosest: Point}) {
    while (this.ChunksAreLong(t.p2, t.p1, t.q2, t.q1)) this.ShrinkChunks(t)

    if (t.p1 === t.p2) {
      t.pClosest = this.P.pp(t.p2).point
      if (t.q1 === t.q2) t.qClosest = this.Q.pp(t.q1).point
      else {
        //                   if(debug) LayoutAlgorithmSettings.Show(new LineSegment(P.Pnt(p2), Q.Pnt(q2)), new LineSegment(P.Pnt(p1), Q.Pnt(q1)), P.Polyline, Q.Polyline);
        t.qClosest = Point.ClosestPointAtLineSegment(t.pClosest, this.Q.pp(t.q1).point, this.Q.pp(t.q2).point)
        if (Point.closeDistEps(t.qClosest, this.Q.pnt(t.q1))) t.q2 = t.q1
        else if (Point.closeDistEps(t.qClosest, this.Q.pnt(t.q2))) t.q1 = t.q2
      }
    } else {
      /*Assert.assert(t.q1 === t.q2)*/
      t.qClosest = this.Q.pp(t.q1).point
      t.pClosest = Point.ClosestPointAtLineSegment(t.qClosest, this.P.pp(t.p1).point, this.P.pp(t.p2).point)
      if (Point.closeDistEps(t.pClosest, this.P.pnt(t.p1))) t.p2 = t.p1
      else if (Point.closeDistEps(t.qClosest, this.P.pnt(t.p2))) t.p1 = t.p2
    }
  }

  ChunksAreLong(p2: number, p1: number, q2: number, q1: number): boolean {
    const pLength: number = this.P.Module(p2 - p1) + 1
    if (pLength > 2) {
      return true
    }

    const qLength: number = this.Q.Module(q1 - q2) + 1
    if (qLength > 2) {
      return true
    }

    if (pLength === 2 && qLength === 2) {
      return true
    }

    return false
  }

  ShrinkChunks(t: {p2: number; p1: number; q2: number; q1: number}) {
    const mp = t.p1 === t.p2 ? t.p1 : this.P.Median(t.p1, t.p2)
    const mq = t.q1 === t.q2 ? t.q1 : this.Q.Median(t.q2, t.q1)
    const mP = this.P.pp(mp).point
    const mQ = this.Q.pp(mq).point

    const angles: {
      a1: number
      a2: number
      b1: number
      b2: number
    } = {
      a1: undefined,
      a2: undefined,
      b1: undefined,
      b2: undefined,
    }
    this.GetAnglesAtTheMedian(mp, mq, mP, mQ, angles)
    //           Core.Layout.LayoutAlgorithmSettings.Show(new LineSegment(P.Pnt(t.p2), Q.Pnt(t.t.q2)), new LineSegment(P.Pnt(t.p1), Q.Pnt(t.q1)), new LineSegment(P.Pnt(mp),Q.Pnt( mq)), P.Polyline, Q.Polyline);
    //if (MovingAlongHiddenSide(ref t.p1, ref t.p2, ref t.q1, ref t.q2, mp, mq, a1, a2, b1, b2)) {
    // //  SugiyamaLayoutSettings.Show(ls(t.p2, t.q2), ls(t.p1, t.q1), ls(mp, mq), P.Polyline, Q.Polyline);
    //   return;
    //}

    if (this.InternalCut(t, mp, mq, angles.a1, angles.a2, angles.b1, angles.b2)) {
      //              if(debug) LayoutAlgorithmSettings.Show(P.Polyline, Q.Polyline, Ls(t.p1, q1), Ls(t.p2,q2));
      return
    }

    //case 1
    if (TangentPair.OneOfChunksContainsOnlyOneVertex(t, mp, mq, angles.a1, angles.b1)) return
    //case 2
    if (this.OnlyOneChunkContainsExactlyTwoVertices(t, {mp: mp, mq: mq}, angles)) return

    // the case where we have exactly two vertices in each chunk
    if (t.p2 === this.P.Next(t.p1) && t.q1 === this.Q.Next(t.q2)) {
      const md = LineSegment.minDistBetweenLineSegments(this.P.pnt(t.p1), this.P.pnt(t.p2), this.Q.pnt(t.q1), this.Q.pnt(t.q2))
      //Assert.assert(res);
      if (md.parab === 0) t.p2 = t.p1
      else if (md.parab === 1) t.p1 = t.p2
      else if (md.parcd === 0) t.q2 = t.q1
      else if (md.parcd === 1) t.q1 = t.q2

      /*Assert.assert(t.p1 === t.p2 || t.q1 === t.q2)*/
      return
      //we have trapeze {t.p1,t.p2,q2,q1} here
      //let t.p1,t.p2 be the low base of the trapes
      //where is the closest vertex , on the left side or on the rigth side?
      //if (Point.angle(P.Pnt(t.p2), P.Pnt(t.p1), Q.Pnt(q1)) + Point.angle(P.Pnt(t.p1), Q.Pnt(q1), Q.Pnt(q2)) >= Math.PI)
      //   ProcessLeftSideOfTrapez(ref t.p1, ref t.p2, ref q2, ref q1);
      //else {
      //   SwapPQ();
      //   ProcessLeftSideOfTrapez(ref q2, ref q1, ref t.p1, ref t.p2);
      //   SwapPQ();
      //}
      //return;
    }

    //case 3
    if (angles.a1 <= Math.PI && angles.a2 <= Math.PI && angles.b1 <= Math.PI && angles.b2 <= Math.PI) {
      if (angles.a1 + angles.b1 > Math.PI) {
        if (angles.a1 >= Math.PI / 2) t.p1 = mp
        else t.q1 = mq
      } else {
        /*Assert.assert(
          angles.a2 + angles.b2 >= Math.PI - GeomConstants.tolerance,
        )*/
        if (angles.a2 >= Math.PI / 2) t.p2 = mp
        else t.q2 = mq
      }
    } else {
      if (angles.a1 > Math.PI) t.p1 = mp
      else if (angles.a2 > Math.PI) t.p2 = mp
      else if (angles.b1 > Math.PI) t.q1 = mq
      else {
        /*Assert.assert(angles.b2 > Math.PI)*/
        t.q2 = mq
      }
    }
  }

  InternalCut(
    t: {
      p1: number
      p2: number
      q1: number
      q2: number
    },
    mp: number,
    mq: number,
    a1: number,
    a2: number,
    b1: number,
    b2: number,
  ): boolean {
    let ret = false
    if (a1 >= Math.PI && a2 >= Math.PI) {
      //Find out who is on the same side from [mq,mp] as Q[0], the next or the prev. Remember that we found the first chunk from Q[0]

      //System.Diagnostics.Debug.WriteLine("cutting P");
      //               if(debug) LayoutAlgorithmSettings.Show(P.Polyline, Q.Polyline, Ls(p1, q1), Ls(p2, q2), Ls(mp, mq));
      const mpp = this.P.pp(mp).point
      const mqp = this.Q.pp(mq).point
      const mpnp = this.P.pp(this.P.Next(mp)).point
      const orientation = Point.getTriangleOrientation(mpp, mqp, this.Q.pp(0).point)
      const nextOrientation = Point.getTriangleOrientation(mpp, mqp, mpnp)

      if (orientation === nextOrientation) t.p1 = this.P.Next(mp)
      else t.p2 = this.P.Prev(mp)
      ret = true
    }
    if (b1 >= Math.PI && b2 >= Math.PI) {
      //Find out who is on the same side from [mq,mp] as P[0], the next or the prev. Remember that we found the first chunk from P[0]
      //System.Diagnostics.Debug.WriteLine("cutting Q");
      //               if (debug) LayoutAlgorithmSettings.Show(P.Polyline, Q.Polyline, Ls(p1, q1), Ls(p2, q2), Ls(mp, mq));
      const mpp = this.P.pp(mp).point
      const mqp = this.Q.pp(mq).point
      const mqnp = this.Q.pp(this.Q.Next(mq)).point
      const orientation = Point.getTriangleOrientation(mpp, mqp, this.P.pp(0).point)
      const nextOrientation = Point.getTriangleOrientation(mpp, mqp, mqnp)
      if (orientation === nextOrientation) t.q2 = this.Q.Next(mq)
      else t.q1 = this.Q.Prev(mq)
      ret = true
    }
    return ret
  }

  // void ProcessLeftSideOfTrapez(ref number p1, ref number p2, ref number q2, ref number q1) {
  //   //the closest vertex is on the left side
  //   Point pn1 = P.Pnt(p1); Point pn2 = P.Pnt(p2);
  //   Point qn1 = Q.Pnt(q1); Point qn2 = Q.Pnt(q2);

  //  //SugiyamaLayoutSettings.Show(new LineSegment(pn1, pn2), new LineSegment(pn2, qn2), new LineSegment(qn2, qn1), new LineSegment(qn1, pn1));
  //   number ap1 = Point.angle(pn2, pn1, qn1);
  //   number aq1 = Point.angle(pn1, qn1, qn2);
  //   Assert.assert(ap1 + aq1 >= Math.PI);
  //   //the point is on the left side
  //   if (ap1 >= Math.PI / 2 && aq1 >= Math.PI / 2) {
  //       q2 = q1; //the vertices of the left side gives the solution
  //       p2 = p1;
  //   } else if (ap1 < Math.PI / 2) {
  //       q2 = q1;
  //       if (!Point.CanProject(qn1, pn1, pn2))
  //           p1 = p2;
  //   } else { //aq1<Pi/2
  //       p2 = p1;
  //       if (!Point.CanProject(pn1, qn1, qn2))
  //           q1 = q2;
  //   }
  //}

  GetAnglesAtTheMedian(
    mp: number,
    mq: number,
    mP: Point,
    mQ: Point,
    t: {
      a1: number
      a2: number
      b1: number
      b2: number
    },
  ) {
    t.a1 = Point.anglePCP(mQ, mP, this.P.pnt(this.P.Prev(mp)))
    t.a2 = Point.anglePCP(this.P.pnt(this.P.Next(mp)), mP, mQ)
    t.b1 = Point.anglePCP(this.Q.pnt(this.Q.Next(mq)), mQ, mP)
    t.b2 = Point.anglePCP(mP, mQ, this.Q.pnt(this.Q.Prev(mq)))
  }

  // we know here that p1!=p2 and q1!=q2
  OnlyOneChunkContainsExactlyTwoVertices(
    t: {p2: number; p1: number; q2: number; q1: number},
    l: {mp: number; mq: number},
    angles: {a1: number; b1: number; a2: number; b2: number},
  ): boolean {
    const pSideIsShort = t.p2 === this.P.Next(t.p1)
    const qSideIsShort = t.q1 === this.Q.Next(t.q2)
    if (pSideIsShort && !qSideIsShort) {
      this.ProcessShortSide(t, l.mp, l.mq, angles.a1, angles.b1, angles.a2, angles.b2)
      return true
    }

    if (qSideIsShort && !pSideIsShort) {
      this.SwapEverything(t, l, angles)
      this.ProcessShortSide(t, l.mp, l.mq, angles.a1, angles.b1, angles.a2, angles.b2)
      this.SwapEverything(t, l, angles)
      return true
    }

    return false
  }

  SwapEverything(
    t: {p2: number; p1: number; q2: number; q1: number},
    l: {mp: number; mq: number},
    angles: {a1: number; b1: number; a2: number; b2: number},
  ) {
    this.SwapPq()
    let u = t.p2
    t.p2 = t.q1
    t.q1 = u

    u = t.q2
    t.q2 = t.p1
    t.p1 = u

    u = l.mq
    l.mq = l.mp
    l.mp = u

    u = angles.a2
    angles.a2 = angles.b1
    angles.b1 = u

    u = angles.b2
    angles.b2 = angles.a1
    angles.a1 = u
  }

  ProcessShortSide(
    t: {p2: number; p1: number; q2: number; q1: number},
    mp: number,
    mq: number,
    a1: number,
    b1: number,
    a2: number,
    b2: number,
  ) {
    //case 2.1
    if (mp === t.p2) this.ProcessSide(t, mq, a1, b1, b2)
    else {
      if (a2 <= Math.PI) {
        if (a2 + b2 >= Math.PI) {
          if (a2 >= Math.PI / 2) t.p2 = t.p1
          else t.q2 = mq
        } else {
          if (b1 >= Math.PI / 2) t.q1 = mq
          else if (a2 < b2) {
            //SugiyamaLayoutSettings.Show(new LineSegment(P.Pnt(p2), Q.Pnt(q2)), new LineSegment(P.Pnt(p1), Q.Pnt(q1)), new LineSegment(P.Pnt(p1), Q.Pnt(mq)), P.Polyline, Q.Polyline);
            if (Point.canProject(this.Q.pnt(mq), this.P.pp(t.p1).point, this.P.pp(t.p2).point)) t.q1 = mq
            else t.p1 = t.p2
          }
        }
      } else {
        //a2>Pi , case 2.2
        if (a1 + b1 <= Math.PI) t.p1 = t.p2
        else t.p2 = t.p1
      }
    }
  }

  SwapPq() {
    const t = this.P
    this.P = this.Q
    this.Q = t
  }

  ProcessSide(t: {p2: number; p1: number; q2: number; q1: number}, mq: number, a1: number, b1: number, b2: number) {
    //SugiyamaLayoutSettings.Show(new LineSegment(P.Pnt(p2), Q.Pnt(q2)), new LineSegment(P.Pnt(p1), Q.Pnt(q1)),new LineSegment(P.Pnt(p1), Q.Pnt(mq)), P.Polyline, Q.Polyline);
    const mQ = this.Q.pnt(mq)
    if (a1 <= Math.PI) {
      if (a1 + b1 >= Math.PI) {
        if (a1 >= Math.PI / 2) t.p1 = t.p2
        else t.q1 = mq
      } else if (b2 >= Math.PI / 2) t.q2 = mq
      else if (a1 < b2) {
        if (Point.canProject(mQ, this.P.pp(t.p1).point, this.P.pp(t.p2).point)) t.q2 = mq
        else t.p2 = t.p1
      }
    } else {
      //a1>Pi , case 2.2
      t.p2 = t.p1
      if (b1 >= Math.PI) t.q1 = mq
      else if (b2 >= Math.PI) t.q2 = mq
    }
  }

  static OneOfChunksContainsOnlyOneVertex(
    t: {p2: number; p1: number; q2: number; q1: number},
    mp: number,
    mq: number,
    a1: number,
    b1: number,
  ): boolean {
    if (t.p1 === t.p2) {
      if (b1 >= Math.PI / 2) t.q1 = mq
      else t.q2 = mq

      return true
    }
    if (t.q1 === t.q2) {
      if (a1 >= Math.PI / 2) t.p1 = mp
      else t.p2 = mp
      return true
    }
    return false
  }

  CalculateLeftTangents() {
    const t: {
      bisectorPivot: Point
      bisectorRay: Point
      p1: number
      p2: number
      q1: number
      q2: number
    } = {
      bisectorPivot: null,
      bisectorRay: null,
      p1: 0,
      p2: 0,
      q1: 0,
      q2: 0,
    }

    this.FindDividingBisector(t)
    const pFurthest = this.P.FindTheFurthestVertexFromBisector(t.p1, t.p2, t.bisectorPivot, t.bisectorRay)
    const qFurthest = this.Q.FindTheFurthestVertexFromBisector(t.q2, t.q1, t.bisectorPivot, t.bisectorRay)

    this.upperBranchOnP = false
    this.lowerBranchOnQ = true
    this.leftPLeftQ = this.TangentBetweenBranches(pFurthest, t.p1, qFurthest, t.q1) //we need to take maximally wide branches
    this.lowerBranchOnQ = false
    this.leftPRightQ = this.TangentBetweenBranches(pFurthest, t.p1, qFurthest, t.q2)
  }

  // bool QContains(number x ,number y) {
  //   foreach (Point p of Q.Polyline) {
  //       if (p.x === x && p.y === y)
  //           return true;
  //   }
  //   return false;
  //}

  //bool PContains(number x, number y) {
  //   foreach (Point p of P.Polyline) {
  //       if (p.x === x && p.y === y)
  //           return true;
  //   }
  //   return false;
  //}

  CalculateRightTangents() {
    const t: {
      bisectorPivot: Point
      bisectorRay: Point
      p1: number
      p2: number
      q1: number
      q2: number
    } = {bisectorPivot: null, bisectorRay: null, p1: 0, p2: 0, q1: 0, q2: 0}
    this.FindDividingBisector(t)

    const pFurthest = this.P.FindTheFurthestVertexFromBisector(t.p1, t.p2, t.bisectorPivot, t.bisectorRay)
    const qFurthest = this.Q.FindTheFurthestVertexFromBisector(t.q2, t.q1, t.bisectorPivot, t.bisectorRay)
    //SugiyamaLayoutSettings.Show(ls(p1, q1), ls(p2, q2), ls(pFurthest, qFurthest), P.Polyline, Q.Polyline);

    this.upperBranchOnP = true
    this.lowerBranchOnQ = true
    this.rightPLeftQ = this.TangentBetweenBranches(pFurthest, t.p2, qFurthest, t.q1)
    this.lowerBranchOnQ = false
    this.rightPRightQ = this.TangentBetweenBranches(pFurthest, t.p2, qFurthest, t.q2)
  }
}
