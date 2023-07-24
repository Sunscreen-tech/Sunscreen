import {Polyline} from '../../math/geometry'
import {Point, TriangleOrientation} from '../../math/geometry/point'
import {PolylinePoint} from '../../math/geometry/polylinePoint'

import {PointMap} from '../../utils/PointMap'
import {VisibilityEdge} from './VisibilityEdge'
import {VisibilityVertex} from './VisibilityVertex'

export class VisibilityGraph {
  activeVertices: Set<VisibilityVertex> = new Set<VisibilityVertex>()
  private *edges_(): IterableIterator<VisibilityEdge> {
    for (const u of this.pointToVertexMap.values()) {
      for (const e of u.OutEdges) yield e
    }
  }

  get Edges(): IterableIterator<VisibilityEdge> {
    return this.edges_()
  }
  ClearPrevEdgesTable() {
    for (const v of this.activeVertices) v.prevEdge = null
    this.activeVertices.clear()
  }

  ShrinkLengthOfPrevEdge(v: VisibilityVertex, lengthMultiplier: number) {
    v.prevEdge.LengthMultiplier = lengthMultiplier
  }

  // needed for shortest path calculations
  PreviosVertex(v: VisibilityVertex): VisibilityVertex {
    const prev: VisibilityEdge = v.prevEdge
    if (!prev) return null

    if (prev.Source === v) {
      return prev.Target
    }

    return prev.Source
  }

  SetPreviousEdge(v: VisibilityVertex, e: VisibilityEdge) {
    /*Assert.assert(v === e.Source || v === e.Target)*/
    this.activeVertices.add(v)
    v.prevEdge = e
  }

  // the default is just to return a new VisibilityVertex
  VertexFactory = (p: Point) => new VisibilityVertex(p)
  pointToVertexMap: PointMap<VisibilityVertex> = new PointMap<VisibilityVertex>()

  //  static GetVisibilityGraphForShortestPath(pathStart: Point, pathEnd: Point, obstacles: Array<Polyline>, /* out */sourceVertex: VisibilityVertex, /* out */targetVertex: VisibilityVertex): VisibilityGraph {
  //      let holes = new Array<Polyline>(VisibilityGraph.OrientHolesClockwise(obstacles));
  //      let visibilityGraph = VisibilityGraph.CalculateGraphOfBoundaries(holes);
  //      let polygons = holes.Select(() => {  }, new Polygon(holes)).ToList();
  //      TangentVisibilityGraphCalculator.AddTangentVisibilityEdgesToGraph(polygons, visibilityGraph);
  //      PointVisibilityCalculator.CalculatePointVisibilityGraph(holes, visibilityGraph, pathStart, VisibilityKind.Tangent, /* out */sourceVertex);
  //      PointVisibilityCalculator.CalculatePointVisibilityGraph(holes, visibilityGraph, pathEnd, VisibilityKind.Tangent, /* out */targetVertex);
  //      return visibilityGraph;
  //  }

  //  //  Calculates the tangent visibility graph

  //  public static FillVisibilityGraphForShortestPath(obstacles: Array<Polyline>): VisibilityGraph {
  //      let holes = new Array<Polyline>(VisibilityGraph.OrientHolesClockwise(obstacles));
  //      let visibilityGraph = VisibilityGraph.CalculateGraphOfBoundaries(holes);
  //      let polygons = holes.Select(() => {  }, new Polygon(hole)).ToList();
  //      TangentVisibilityGraphCalculator.AddTangentVisibilityEdgesToGraph(polygons, visibilityGraph);
  //      return visibilityGraph;
  //  }

  //  static CalculateGraphOfBoundaries(holes: Array<Polyline>): VisibilityGraph {
  //      let graphOfHoleBoundaries = new VisibilityGraph();
  //      for (let polyline: Polyline of holes) {
  //          graphOfHoleBoundaries.AddHole(polyline);
  //      }

  //      return graphOfHoleBoundaries;
  //  }

  AddHole(polyline: Polyline) {
    let p = polyline.startPoint
    while (p !== polyline.endPoint) {
      this.AddEdgePlPl(p, p.next)
      p = p.next
    }

    this.AddEdgePlPl(polyline.endPoint, polyline.startPoint)
  }

  static *OrientHolesClockwise(holes: Iterable<Polyline>): IterableIterator<Polyline> {
    for (const poly of holes) {
      for (let p = poly.startPoint; ; p = p.next) {
        // Find the first non-collinear segments and see which direction the triangle is.
        // If it's consistent with Clockwise, then return the polyline, else return its Reverse.
        const orientation = Point.getTriangleOrientation(p.point, p.next.point, p.next.next.point)
        if (orientation !== TriangleOrientation.Collinear) {
          yield orientation === TriangleOrientation.Clockwise ? poly : <Polyline>poly.reverse()
          break
        }
      }
    }
  }

  //  static CheckThatPolylinesAreConvex(holes: Array<Polyline>) {
  //      for (let polyline of holes) {
  //          VisibilityGraph.CheckThatPolylineIsConvex(polyline);
  //      }

  //  }

  //  static CheckThatPolylineIsConvex(polyline: Polyline) {
  //      Assert.assert(polyline.closed, "Polyline is not closed");
  //      let a: PolylinePoint = polyline.startPoint;
  //      let b: PolylinePoint = a.next;
  //      let c: PolylinePoint = b.next;
  //      let orient: TriangleOrientation = Point.getTriangleOrientation(a.point, b.point, c.point);
  //      while ((c !== polyline.endPoint)) {
  //          a = a.next;
  //          b = b.next;
  //          c = c.next;
  //          let currentOrient = Point.getTriangleOrientation(a.point, b.point, c.point);
  //          if ((currentOrient === TriangleOrientation.Collinear)) {
  //              continue
  //          }

  //          if ((orient === TriangleOrientation.Collinear)) {
  //              orient = currentOrient;
  //          }
  //          else if ((orient !== currentOrient)) {
  //              throw new InvalidOperationException();
  //          }

  //      }

  //      let o = Point.getTriangleOrientation(polyline.endPoint.Point, polyline.startPoint.Point, polyline.startPoint.Next.Point);
  //      if (((o !== TriangleOrientation.Collinear)
  //                  && (o !== orient))) {
  //          throw new InvalidOperationException();
  //      }

  //  }

  //  //  TEST || VERIFY

  //  //  Enumerate all VisibilityEdges in the VisibilityGraph.

  //  public get Edges(): Array<VisibilityEdge> {
  //      return PointToVertexMap.Values.SelectMany(() => {  }, vertex.OutEdges);
  //  }

  //  get PointToVertexMap(): Map<Point, VisibilityVertex> {
  //      return this.pointToVertexMap;
  //  }

  //  get VertexCount(): number {
  //      return this.PointToVertexMap.Count;
  //  }

  //  AddVertex(polylinePoint: PolylinePoint): VisibilityVertex {
  //      return this.AddVertex(polylinePoint.point);
  //  }

  AddVertexP(point: Point): VisibilityVertex {
    const currentVertex = this.pointToVertexMap.get(point)
    if (currentVertex) {
      return currentVertex
    }

    const newVertex = this.VertexFactory(point)
    this.pointToVertexMap.set(point, newVertex)
    return newVertex
  }

  AddVertexV(vertex: VisibilityVertex) {
    /*Assert.assert(
      !this.pointToVertexMap.hasP(vertex.point),
      'A vertex already exists at this location',
    )*/
    this.pointToVertexMap.set(vertex.point, vertex)
  }

  ContainsVertex(point: Point): boolean {
    return this.pointToVertexMap.has(point)
  }

  static AddEdgeVV(source: VisibilityVertex, target: VisibilityVertex): VisibilityEdge {
    let visEdge: VisibilityEdge
    if ((visEdge = source.get(target))) {
      return visEdge
    }

    if (source === target) {
      //Assert.assert(false, 'Self-edges are not allowed')
      throw new Error('Self-edges are not allowed')
    }

    const edge = new VisibilityEdge(source, target)
    source.OutEdges.insert(edge)
    target.InEdges.push(edge)
    return edge
  }

  AddEdgePlPl(source: PolylinePoint, target: PolylinePoint) {
    this.AddEdgePP(source.point, target.point)
  }

  static AddEdge(edge: VisibilityEdge) {
    /*Assert.assert(edge.Source !== edge.Target)*/
    edge.Source.OutEdges.insert(edge)
    edge.Target.addInEdge(edge)
  }

  AddEdgeF(source: Point, target: Point, edgeCreator: (a: VisibilityVertex, b: VisibilityVertex) => VisibilityEdge): VisibilityEdge {
    let sourceV = this.FindVertex(source)
    let targetV: VisibilityVertex = null
    if (sourceV != null) {
      targetV = this.FindVertex(target)
      if (targetV != null) {
        const edge: VisibilityEdge = sourceV.get(targetV)
        if (edge) return edge
      }
    }

    if (sourceV == null) {
      // then targetV is also null
      sourceV = this.AddVertexP(source)
      targetV = this.AddVertexP(target)
    } else if (targetV == null) {
      targetV = this.AddVertexP(target)
    }

    const edge = edgeCreator(sourceV, targetV)
    sourceV.OutEdges.insert(edge)
    targetV.addInEdge(edge)
    return edge
  }

  AddEdgePP(source: Point, target: Point): VisibilityEdge {
    return this.AddEdgeF(source, target, (a, b) => new VisibilityEdge(a, b))
  }

  FindVertex(point: Point): VisibilityVertex {
    return this.pointToVertexMap.get(point)
  }

  Vertices(): IterableIterator<VisibilityVertex> {
    return this.pointToVertexMap.values()
  }

  RemoveVertex(vertex: VisibilityVertex) {
    // Assert.assert(PointToVertexMap.ContainsKey(vertex.Point), "Cannot find vertex in PointToVertexMap");
    for (const edge of vertex.OutEdges) {
      edge.Target.RemoveInEdge(edge)
    }

    for (const edge of vertex.InEdges) {
      edge.Source.RemoveOutEdge(edge)
    }

    this.pointToVertexMap.deleteP(vertex.point)
  }

  //  RemoveEdge(v1: VisibilityVertex, v2: VisibilityVertex) {
  //      let edge: VisibilityEdge;
  //      if (!v1.TryGetEdge(v2, /* out */edge)) {
  //          return;
  //      }

  //      edge.Source.RemoveOutEdge(edge);
  //      edge.Target.RemoveInEdge(edge);
  //  }

  //  RemoveEdge(p1: Point, p2: Point) {
  //      //  the order of p1 and p2 is not important.
  //      let edge: VisibilityEdge = this.FindEdge(p1, p2);
  //      if ((edge == null )) {
  //          return;
  //      }

  //      edge.Source.RemoveOutEdge(edge);
  //      edge.Target.RemoveInEdge(edge);
  //  }

  //  static FindEdge(edge: VisibilityEdge): VisibilityEdge {
  //      if (edge.Source.TryGetEdge(edge.Target, /* out */edge)) {
  //          return edge;
  //      }

  //      return null;
  //  }

  FindEdgePP(source: Point, target: Point): VisibilityEdge {
    const sourceV = this.FindVertex(source)
    if (sourceV == null) {
      return null
    }

    const targetV = this.FindVertex(target)
    if (targetV == null) {
      return null
    }

    return sourceV.get(targetV)
  }

  static RemoveEdge(edge: VisibilityEdge) {
    edge.Source.RemoveOutEdge(edge)
    // not efficient!
    edge.Target.RemoveInEdge(edge)
  }

  public ClearEdges() {
    for (const visibilityVertex of this.Vertices()) {
      visibilityVertex.ClearEdges()
    }
  }
}
