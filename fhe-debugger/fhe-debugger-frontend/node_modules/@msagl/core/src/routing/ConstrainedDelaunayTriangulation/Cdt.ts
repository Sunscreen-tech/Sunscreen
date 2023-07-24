/*
Following "Sweep-line algorithm for constrained Delaunay triangulation", by Domiter and Zalik
*/
//triangulates the space between point, line segment and polygons of the Delaunay fashion

import {GeomConstants} from '../../math/geometry/geomConstants'
import {Point, TriangleOrientation} from '../../math/geometry/point'
import {Polyline} from '../../math/geometry/polyline'
import {Rectangle} from '../../math/geometry/rectangle'
import {PointMap} from '../../utils/PointMap'
import {Algorithm} from './../../utils/algorithm'
import {CdtEdge} from './CdtEdge'
import {CdtSite} from './CdtSite'
import {CdtTriangle} from './CdtTriangle'
import {CdtSweeper} from './CdtSweeper'
import {RectangleNode, CreateRectNodeOnArrayOfRectNodes, mkRectangleNode} from '../../math/geometry/RTree/rectangleNode'

export type SymmetricSegment = {A: Point; B: Point}
export class Cdt extends Algorithm {
  isolatedSitesWithObject: Array<[Point, unknown]>

  isolatedSites: Point[] = []

  obstacles: Polyline[] = []

  isolatedSegments: Array<SymmetricSegment>

  P1: CdtSite

  P2: CdtSite

  sweeper: CdtSweeper

  PointsToSites: PointMap<CdtSite> = new PointMap<CdtSite>()

  allInputSites: Array<CdtSite>
  simplifyObstacles = true

  // constructor
  constructor(isolatedSites: Point[], obstacles: Array<Polyline>, isolatedSegments: Array<SymmetricSegment>) {
    super(null)
    this.isolatedSites = isolatedSites
    this.obstacles = obstacles
    this.isolatedSegments = isolatedSegments
  }

  // constructor
  static constructor_(isolatedSitesWithObj: Array<[Point, unknown]>) {
    const r = new Cdt(null, null, null)
    r.isolatedSitesWithObject = isolatedSitesWithObj
    return r
  }

  FillAllInputSites() {
    // for now suppose that the data is correct: no isolatedSites coincide with obstacles or isolatedSegments, obstacles are mutually disjoint, etc
    if (this.isolatedSitesWithObject != null) {
      for (const tuple of this.isolatedSitesWithObject) {
        this.AddSite(tuple[0], tuple[1])
      }
    }

    if (this.isolatedSites != null) {
      for (const isolatedSite of this.isolatedSites) {
        this.AddSite(isolatedSite, null)
      }
    }

    if (this.obstacles != null) {
      for (const poly of this.obstacles) {
        this.AddPolylineToAllInputSites(poly)
      }
    }

    if (this.isolatedSegments != null) {
      for (const isolatedSegment of this.isolatedSegments) {
        this.AddConstrainedEdge(isolatedSegment.A, isolatedSegment.B, null)
      }
    }

    this.AddP1AndP2()
    this.allInputSites = Array.from(this.PointsToSites.values())
  }

  AddSite(point: Point, relatedObject: unknown): CdtSite {
    let site: CdtSite
    if ((site = this.PointsToSites.get(point))) {
      site.Owner = relatedObject
      // set the owner anyway
    } else {
      site = CdtSite.mkSO(point, relatedObject)
      this.PointsToSites.set(point, site)
    }
    return site
  }

  private AddP1AndP2() {
    const box = Rectangle.mkEmpty()
    for (const site of this.PointsToSites.keys()) {
      box.add(site)
    }

    const delx = 10
    const dely = 10
    this.P1 = new CdtSite(box.leftBottom.add(new Point(-delx, -dely)))
    this.P2 = new CdtSite(box.rightBottom.add(new Point(delx, -dely)))
  }

  private AddPolylineToAllInputSites(poly: Polyline) {
    if (this.simplifyObstacles) {
      for (let p = poly.startPoint; p != null; ) {
        const edgeStart = p.point
        p = p.next
        if (!p) break
        while (p.next && Point.getTriangleOrientation(edgeStart, p.point, p.next.point) === TriangleOrientation.Collinear) {
          p = p.next
        }

        this.AddConstrainedEdge(edgeStart, p.point, poly)
      }
    } else {
      for (let pp = poly.startPoint; pp.next != null; pp = pp.next) {
        this.AddConstrainedEdge(pp.point, pp.next.point, poly)
      }
    }

    if (poly.closed) {
      this.AddConstrainedEdge(poly.endPoint.point, poly.startPoint.point, poly)
    }
  }

  private AddConstrainedEdge(a: Point, b: Point, poly: Polyline) {
    const ab = Cdt.AbovePP(a, b)
    /*Assert.assert(ab !== 0)*/
    let upperPoint: CdtSite
    let lowerPoint: CdtSite
    if (ab > 0) {
      // a is above b
      upperPoint = this.AddSite(a, poly)
      lowerPoint = this.AddSite(b, poly)
    } else {
      /*Assert.assert(ab < 0)*/
      upperPoint = this.AddSite(b, poly)
      lowerPoint = this.AddSite(a, poly)
    }

    const edge = Cdt.CreateEdgeOnOrderedCouple(upperPoint, lowerPoint)
    edge.constrained = true
    /*Assert.assert(this.EdgeIsCorrect(edge))*/
  }

  static GetOrCreateEdge(a: CdtSite, b: CdtSite): CdtEdge {
    if (Cdt.AboveCC(a, b) === 1) {
      const e = a.EdgeBetweenUpperSiteAndLowerSite(b)
      if (e != null) {
        return e
      }

      return Cdt.CreateEdgeOnOrderedCouple(a, b)
    } else {
      const e = b.EdgeBetweenUpperSiteAndLowerSite(a)
      if (e != null) {
        return e
      }

      return Cdt.CreateEdgeOnOrderedCouple(b, a)
    }
  }

  private static CreateEdgeOnOrderedCouple(upperPoint: CdtSite, lowerPoint: CdtSite): CdtEdge {
    /*Assert.assert(Cdt.AboveCC(upperPoint, lowerPoint) === 1)*/
    return new CdtEdge(upperPoint, lowerPoint)
  }

  public GetTriangles(): Set<CdtTriangle> {
    return this.sweeper.triangles
  }

  // Executes the actual algorithm.
  run() {
    this.Initialization()
    this.SweepAndFinalize()
  }

  SweepAndFinalize() {
    this.sweeper = new CdtSweeper(this.allInputSites, this.P1, this.P2, Cdt.GetOrCreateEdge)
    this.sweeper.run()
    this.cleanRemovedEdges()
  }
  cleanRemovedEdges() {
    for (const site of this.PointsToSites.values()) {
      site.cleanRemovedEdges()
    }
  }

  private Initialization() {
    this.FillAllInputSites()
    this.allInputSites.sort(Cdt.OnComparison)
  }

  private static OnComparison(a: CdtSite, b: CdtSite): number {
    return Cdt.AboveCC(a, b)
  }

  // compare first y then -x coordinates
  static AbovePP(a: Point, b: Point): number {
    let del = a.y - b.y
    if (del > 0) {
      return 1
    }

    if (del < 0) {
      return -1
    }

    del = a.x - b.x
    // for a horizontal edge return the point with the smaller X
    return del > 0 ? -1 : del < 0 ? 1 : 0
  }

  // compare first y then -x coordinates
  private static AboveCC(a: CdtSite, b: CdtSite): number {
    return Cdt.AbovePP(a.point, b.point)
  }

  RestoreEdgeCapacities() {
    for (const site of this.allInputSites) {
      for (const e of site.Edges) {
        if (!e.constrained) {
          e.ResidualCapacity = e.Capacity
        }
      }
    }
  }

  SetInEdges() {
    for (const site of this.PointsToSites.values()) {
      for (const e of site.Edges) {
        const oSite = e.lowerSite
        /*Assert.assert(oSite !== site)*/
        oSite.AddInEdge(e)
      }
    }
  }

  FindSite(point: Point): CdtSite {
    return this.PointsToSites.get(point)
  }

  static PointIsInsideOfTriangle(point: Point, t: CdtTriangle): boolean {
    for (let i = 0; i < 3; i++) {
      const a = t.Sites.getItem(i).point
      const b = t.Sites.getItem(i + 1).point
      if (Point.signedDoubledTriangleArea(point, a, b) < GeomConstants.distanceEpsilon * -1) {
        return false
      }
    }

    return true
  }

  rectangleNodeOnTriangles: RectangleNode<CdtTriangle, Point> = null

  getRectangleNodeOnTriangles(): RectangleNode<CdtTriangle, Point> {
    if (this.rectangleNodeOnTriangles == null) {
      this.rectangleNodeOnTriangles = CreateRectNodeOnArrayOfRectNodes(
        Array.from(this.GetTriangles().values()).map((t) => mkRectangleNode<CdtTriangle, Point>(t, t.BoundingBox())),
      )
    }
    return this.rectangleNodeOnTriangles
  }
  // EdgeIsCorrect(edge: CdtEdge): boolean {
  //   const us = edge.upperSite
  //   let edgeIsThere = false
  //   for (const e of us.Edges) {
  //     if (e === edge) {
  //       edgeIsThere = true
  //       break
  //     }
  //   }
  //   if (!edgeIsThere) {
  //     return false
  //   }
  //   const usShouldBe = this.PointsToSites.get(us.point)
  //   return usShouldBe === us
  // }
}

export function createCDTOnPolylineRectNode(polylineHierarchy: RectangleNode<Polyline, Point>): Cdt {
  const obstacles = Array.from(polylineHierarchy.GetAllLeaves())
  const rectangle = <Rectangle>polylineHierarchy.irect
  const del = rectangle.diagonal / 4
  const nRect = rectangle.clone()
  nRect.pad(del)
  return getConstrainedDelaunayTriangulation(obstacles.concat([nRect.perimeter()]))
}

function getConstrainedDelaunayTriangulation(obstacles: Array<Polyline>): Cdt {
  const constrainedDelaunayTriangulation = new Cdt(null, obstacles, null)
  constrainedDelaunayTriangulation.run()
  return constrainedDelaunayTriangulation
}
