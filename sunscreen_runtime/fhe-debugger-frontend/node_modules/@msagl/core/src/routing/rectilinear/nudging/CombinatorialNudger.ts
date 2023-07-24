// sets the order of connector paths on the edges

//
import {Queue} from 'queue-typescript'
import {Point} from '../../../math/geometry/point'
import {CompassVector} from '../../../math/geometry/compassVector'
import {Direction} from '../../../math/geometry/direction'

import {compareNumbers} from '../../../utils/compare'
import {VisibilityEdge} from '../../visibility/VisibilityEdge'
import {VisibilityGraph} from '../../visibility/VisibilityGraph'
import {VisibilityVertex} from '../../visibility/VisibilityVertex'
import {AxisEdge} from './AxisEdge'
import {LinkedPoint} from './LinkedPoint'
import {Path} from './Path'
import {PathEdge} from './PathEdge'

export class CombinatorialNudger {
  static readonly NotOrdered: number = Number.MAX_VALUE

  // A new visibility graph is needed; the DAG of AxisEdges.
  pathVisibilityGraph: VisibilityGraph = new VisibilityGraph()

  get PathVisibilityGraph(): VisibilityGraph {
    return this.pathVisibilityGraph
  }

  axisEdgesToPathOrders: Map<AxisEdge, Array<PathEdge>> = new Map<AxisEdge, Array<PathEdge>>()

  constructor(paths: Array<Path>) {
    this.OriginalPaths = paths
  }

  OriginalPaths: Iterable<Path>

  GetOrder(): Map<AxisEdge, Array<PathEdge>> {
    this.FillTheVisibilityGraphByWalkingThePaths()
    this.InitPathOrder()
    this.OrderPaths()
    return this.axisEdgesToPathOrders
  }

  FillTheVisibilityGraphByWalkingThePaths() {
    for (const path of this.OriginalPaths) {
      this.FillTheVisibilityGraphByWalkingPath(path)
    }
  }

  FillTheVisibilityGraphByWalkingPath(path: Path) {
    const pathEdgesEnum = this.CreatePathEdgesFromPoints(it(), path.Width)
    let t = pathEdgesEnum.next()
    if (!t.done) {
      path.SetFirstEdge(t.value)
    }

    while ((t = pathEdgesEnum.next()).done === false) {
      path.AddEdge(t.value)
    }

    function* it(): IterableIterator<Point> {
      if (path.PathPoints instanceof LinkedPoint) {
        for (let p = <LinkedPoint>path.PathPoints; p != null; p = p.Next) {
          yield p.Point
        }
      } else {
        for (const p of path.PathPoints) yield p
      }
    }
  }

  *CreatePathEdgesFromPoints(pathPoints: IterableIterator<Point>, width: number): IterableIterator<PathEdge> {
    let t = pathPoints.next()
    let p0: Point = t.value
    while (!(t = pathPoints.next()).done) {
      yield this.CreatePathEdge(p0, t.value, width)
      p0 = t.value
    }
  }

  CreatePathEdge(p0: Point, p1: Point, width: number): PathEdge {
    const dir = CompassVector.DirectionFromPointToPoint(p0, p1)
    switch (dir) {
      case Direction.East:
      case Direction.North:
        return new PathEdge(this.GetAxisEdge(p0, p1), width)

      case Direction.South:
      case Direction.West: {
        const e = new PathEdge(this.GetAxisEdge(p1, p0), width)
        e.Reversed = true
        return e
      }

      default:
        throw new Error('Not a rectilinear path')
    }
  }

  GetAxisEdge(p0: Point, p1: Point): AxisEdge {
    return this.PathVisibilityGraph.AddEdgeF(p0, p1, (m, n) => new AxisEdge(m, n)) as AxisEdge
  }

  InitPathOrder() {
    for (const axisEdge of this.PathVisibilityGraph.Edges) {
      this.axisEdgesToPathOrders.set(<AxisEdge>axisEdge, new Array<PathEdge>())
    }

    for (const p of this.OriginalPaths) {
      for (const pathEdge of p.PathEdges()) {
        this.axisEdgesToPathOrders.get(pathEdge.AxisEdge).push(pathEdge)
      }
    }
  }

  OrderPaths() {
    for (const axisEdge of CombinatorialNudger.WalkGraphEdgesInTopologicalOrderIfPossible(this.PathVisibilityGraph)) {
      this.OrderPathEdgesSharingEdge(axisEdge)
    }
  }

  OrderPathEdgesSharingEdge(edge: AxisEdge) {
    const pathOrder = this.PathOrderOfVisEdge(edge)
    pathOrder.sort(CombinatorialNudger.CompareTwoPathEdges)
    let i = 0
    // fill the index
    for (const pathEdge of pathOrder) {
      pathEdge.Index = i++
    }
  }

  static CompareTwoPathEdges(x: PathEdge, y: PathEdge): number {
    if (x === y) {
      return 0
    }

    /*Assert.assert(x.AxisEdge === y.AxisEdge)*/
    // Nudger.ShowOrderedPaths(null, new[] { x.Path, y.Path }, x.AxisEdge.SourcePoint, x.AxisEdge.TargetPoint);
    const r: number = CombinatorialNudger.CompareInDirectionStartingFromAxisEdge(x, y, x.AxisEdge, x.AxisEdge.Direction)
    return r !== 0
      ? r
      : -CombinatorialNudger.CompareInDirectionStartingFromAxisEdge(x, y, x.AxisEdge, CompassVector.OppositeDir(x.AxisEdge.Direction))
  }

  //

  // axisEdge together with the axisEdgeIsReversed parameter define direction of the movement over the paths

  static CompareInDirectionStartingFromAxisEdge(x: PathEdge, y: PathEdge, axisEdge: AxisEdge, direction: Direction): number {
    while (true) {
      x = CombinatorialNudger.GetNextPathEdgeInDirection(x, axisEdge, direction)
      if (x == null) {
        return 0
      }

      y = CombinatorialNudger.GetNextPathEdgeInDirection(y, axisEdge, direction)
      if (y == null) {
        return 0
      }

      if (x.AxisEdge === y.AxisEdge) {
        direction = CombinatorialNudger.FindContinuedDirection(axisEdge, direction, x.AxisEdge)
        axisEdge = x.AxisEdge
        const r: number = CombinatorialNudger.GetExistingOrder(x, y)
        if (r === CombinatorialNudger.NotOrdered) {
          continue
        }

        return direction === axisEdge.Direction ? r : -r
      }

      // there is a fork
      const forkVertex = direction === axisEdge.Direction ? axisEdge.Target : axisEdge.Source
      const xFork = CombinatorialNudger.OtherVertex(x.AxisEdge, forkVertex)
      const yFork = CombinatorialNudger.OtherVertex(y.AxisEdge, forkVertex)
      const projection = CombinatorialNudger.ProjectionForCompare(axisEdge, direction !== axisEdge.Direction)
      return compareNumbers(projection(xFork.point), projection(yFork.point))
    }
  }

  static FindContinuedDirection(edge: AxisEdge, direction: Direction, nextAxisEdge: AxisEdge): Direction {
    if (edge.Direction === direction)
      return nextAxisEdge.Source === edge.Target ? nextAxisEdge.Direction : CompassVector.OppositeDir(nextAxisEdge.Direction)

    return nextAxisEdge.Source === edge.Source ? nextAxisEdge.Direction : CompassVector.OppositeDir(nextAxisEdge.Direction)
  }

  static OtherVertex(axisEdge: VisibilityEdge, v: VisibilityVertex): VisibilityVertex {
    return axisEdge.Source === v ? axisEdge.Target : axisEdge.Source
  }

  static ProjectionForCompare(axisEdge: AxisEdge, isReversed: boolean): (p: Point) => number {
    return axisEdge.Direction === Direction.North
      ? isReversed
        ? (p: Point) => -p.x
        : (p: Point) => p.x
      : isReversed
      ? (p: Point) => p.y
      : (p: Point) => -p.y
  }

  static GetNextPathEdgeInDirection(e: PathEdge, axisEdge: AxisEdge, direction: Direction): PathEdge {
    /*Assert.assert(e.AxisEdge === axisEdge)*/
    return axisEdge.Direction === direction ? (e.Reversed ? e.Prev : e.Next) : e.Reversed ? e.Next : e.Prev
  }

  static GetExistingOrder(x: PathEdge, y: PathEdge): number {
    const xi: number = x.Index
    if (xi === -1) {
      return CombinatorialNudger.NotOrdered
    }

    const yi: number = y.Index
    /*Assert.assert(yi !== -1)*/
    return compareNumbers(xi, yi)
  }

  PathOrderOfVisEdge(axisEdge: AxisEdge): Array<PathEdge> {
    return this.axisEdgesToPathOrders.get(axisEdge)
  }

  static InitQueueOfSources(queue: Queue<VisibilityVertex>, dictionary: Map<VisibilityVertex, number>, graph: VisibilityGraph) {
    for (const v of graph.Vertices()) {
      const inDegree: number = v.InEdgesLength()
      dictionary.set(v, inDegree)
      if (inDegree === 0) {
        queue.enqueue(v)
      }
    }

    /*Assert.assert(queue.length > 0)*/
  }

  static *WalkGraphEdgesInTopologicalOrderIfPossible(visibilityGraph: VisibilityGraph): IterableIterator<AxisEdge> {
    // Here the visibility graph is always a DAG since the edges point only to North and East
    // where possible
    const sourcesQueue = new Queue<VisibilityVertex>()
    const inDegreeLeftUnprocessed = new Map<VisibilityVertex, number>()
    CombinatorialNudger.InitQueueOfSources(sourcesQueue, inDegreeLeftUnprocessed, visibilityGraph)
    while (sourcesQueue.length > 0) {
      const visVertex = sourcesQueue.dequeue()
      for (const edge of visVertex.OutEdges) {
        const incomingEdges = inDegreeLeftUnprocessed.get(edge.Target)
        inDegreeLeftUnprocessed.set(edge.Target, incomingEdges - 1)
        if (incomingEdges === 1) {
          sourcesQueue.enqueue(edge.Target)
        }

        yield <AxisEdge>edge
      }
    }
  }
}
