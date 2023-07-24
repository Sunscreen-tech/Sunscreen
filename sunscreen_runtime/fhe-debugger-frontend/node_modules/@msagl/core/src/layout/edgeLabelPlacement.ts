import {LinkedList} from '@esfx/collections'
import {GeomConstants, ICurve, Point, Rectangle, Size} from '../math/geometry'
import {RTree, mkRTree} from '../math/geometry/RTree/rTree'
import {Algorithm} from '../utils/algorithm'
import {CancelToken} from '../utils/cancelToken'
import {closeDistEps} from '../utils/compare'
import {GeomEdge} from './core/geomEdge'
import {GeomGraph} from './core/geomGraph'
import {GeomLabel} from './core/geomLabel'
import {GeomNode} from './core/geomNode'

export enum LabelPlacementResult {
  /**
     Placement result meaning that another label was overlapped
    */
  OverlapsOtherLabels = 0,
  /**
    Placement result meaning that the label overlaps a node, but not a label
    */
  OverlapsNodes = 1,
  /**
    Placement result meaning that the label overlaps an edge, but not a node or label.
    */
  OverlapsEdges = 2,
  /**
    Placement result meaning that the label overlaps nothing.
    */
  OverlapsNothing = Number.MAX_VALUE,
}

export enum PlacementSide {
  /**
    //Places the label on any side
    */
  Any,

  /**
    //Places the label on the port side of the edge.
    //Port is the left side of the edge if you were facing away from the source and towards the target.
    */
  Port,

  /**
    //Places the label on the starboard side of the edge.
    //Starboard is the right side of the edge if you were facing away from the source and towards the target.
    */
  Starboard,

  /**
    //Places the label on the top side of the line.
    //If the line is vertical, the label is placed on the left.
    */
  Top,

  /**
    //Places the label on the bottom side of the line.
    //If the line is vertical, the label is placed on the right.
    */
  Bottom,

  /**
    //Places the label on the left side of the line.
    //If the line is horizontal, the label is placed on the top.
    */
  Left,

  /**
    //Places the label on the right side of the line.
    //If the line is horizontal, the label is placed on the bottom.
    */
  Right,
}

class PointSet {
  Center: Point
  Inner: Point
  Key: number
  Outer: Point
}
class PointSetList {
  points: LinkedList<PointSet> = new LinkedList<PointSet>()

  coveredLength = 0

  AddFirst(p: PointSet): number {
    if (this.points.size !== 0) {
      const q = this.points.first.value
      this.coveredLength = this.coveredLength + p.Center.sub(q.Center).length
    }

    this.points.insertBefore(null, p)
    return this.coveredLength
  }

  AddLast(p: PointSet): number {
    if (this.points.size !== 0) {
      const q: PointSet = this.points.last.value
      this.coveredLength = this.coveredLength + p.Center.sub(q.Center).length
    }

    this.points.insertAfter(null, p)
    return this.coveredLength
  }
}

enum PlacementStrategy {
  //Try to place the label running along the curve path
  AlongCurve,

  //Standard horizontal label
  Horizontal,
}

interface IObstacle {
  boundingBox: Rectangle
}

class PortObstacle implements IObstacle {
  location: Point
  boundingBox: Rectangle
  constructor(p: Point) {
    this.location = p
    this.boundingBox = Rectangle.rectangleOnPoint(p)
  }
}

class RectangleObstacle implements IObstacle {
  data: any
  boundingBox: Rectangle
  constructor(box: Rectangle, data: any) {
    this.data = data
    this.boundingBox = box
  }
}
class LabelInfo {
  innerPoints: Point[] = []
  outerPoints: Point[] = []
  edgePoints: Array<[number, Point]>
  placementSide = PlacementSide.Any
  placementOffset = 0.5
  placementResult: LabelPlacementResult
  constructor(edgePoints: Array<[number, Point]>) {
    this.edgePoints = edgePoints
    this.placementSide
  }
}

/** The class to place labels */
export class EdgeLabelPlacement extends Algorithm {
  placementStrategy = [PlacementStrategy.Horizontal, PlacementStrategy.AlongCurve]

  //     The list of labels to be placed

  edges: GeomEdge[]

  obstacleMaps: RTree<IObstacle, Point>[] = []

  labelObstacleMap: RTree<IObstacle, Point>

  edgeInfos: Map<GeomEdge, LabelInfo> = new Map<GeomEdge, LabelInfo>()

  /**       The default and minimum granularity for breaking up a curve into many points.*/

  static MinGranularity = 5

  /**       The maximum granulairty for breaking up a curve into many points.*/

  static MaxGranularity = 50
  /**       The number of edges at which to start increasing the granularity.*/

  static LowerEdgeBound = 500

  /**       The number of edges at which to stop increasing the granularity.*/

  static UpperEdgeBound = 3000

  granularity: number = EdgeLabelPlacement.MinGranularity

  //     The granularity with which to break up a curve into sub points.

  public get CollisionGranularity(): number {
    return this.granularity
  }
  public set CollisionGranularity(value: number) {
    this.granularity = value
  }

  /**      True if the edge collision granularity should be degraded as the number of edges increases. */
  ScaleCollisionGranularity = true

  //     Constructs an edge label placer that places all labels in the graph.

  public static constructorG(graph: GeomGraph) {
    return new EdgeLabelPlacement(
      Array.from(graph.nodesBreadthFirst),
      Array.from(graph.deepEdges).filter((e) => e.label),
    )
  }

  //     Constructs an edge label placer that places the given labels in the graph.

  public static constructorGA(graph: GeomGraph, edges: GeomEdge[]) {
    return new EdgeLabelPlacement(
      Array.from(graph.nodesBreadthFirst),
      edges.filter((e) => e.label),
    )
  }

  //     Constructs a edge label placer that will only avoid overlaps with the given nodes and edges.

  constructor(nodes: GeomNode[], edges: GeomEdge[]) {
    super(null)
    this.granularity = this.ScaleCollisionGranularity ? this.interpolateGranularity(edges.length) : EdgeLabelPlacement.MinGranularity
    this.InitializeObstacles(nodes, edges)
    this.edges = edges
  }
  interpolateGranularity(edgeCount: number): number {
    if (edgeCount <= EdgeLabelPlacement.LowerEdgeBound) {
      return EdgeLabelPlacement.MaxGranularity
    }
    if (edgeCount >= EdgeLabelPlacement.UpperEdgeBound) {
      return EdgeLabelPlacement.MinGranularity
    }

    const delta = (EdgeLabelPlacement.UpperEdgeBound - EdgeLabelPlacement.LowerEdgeBound) / (edgeCount - EdgeLabelPlacement.LowerEdgeBound)
    return Math.ceil(EdgeLabelPlacement.MinGranularity + delta)
  }

  InitializeObstacles(nodes: GeomNode[], edgeList: GeomEdge[]) {
    const edgeObstacles = this.GetEdgeObstacles(edgeList)
    this.obstacleMaps[1] = mkRTree(nodes.map((n) => [n.boundingBox, new RectangleObstacle(n.boundingBox, n)]))
    // later we init obstacleMaps[0] to lableObstacleMap
    this.obstacleMaps[2] = mkRTree(edgeObstacles.map((e) => [e.boundingBox, new RectangleObstacle(e.boundingBox, e)]))
    // Avoiding edge overlaps is lowest priority, so put it last
  }

  static CurvePoints(curve: ICurve, granularity: number) {
    const points: Array<[number, Point]> = []
    const delta = curve.end.sub(curve.start).lengthSquared / (granularity * granularity)
    EdgeLabelPlacement.SubdivideCurveSegment(points, curve, delta, curve.parStart, curve.parEnd)

    points.sort(EdgeLabelPlacement.compareByArgument)
    return points
  }

  static compareByArgument(x: [number, Point], y: [number, Point]): number {
    if (x[0] < y[0]) {
      return -1
    }

    if (x[0] > y[0]) {
      return 1
    }

    return 0
  }

  static SubdivideCurveSegment(list: Array<[number, Point]>, curve: ICurve, delta2: number, start: number, end: number) {
    if (list.length > 64) {
      //LN I saw this function never finishing for a very long curve
      return
    }
    const startPoint = curve.value(start)
    const endPoint = curve.value(end)
    if (startPoint.sub(endPoint).lengthSquared > delta2) {
      const mid = (start + end) / 2.0
      EdgeLabelPlacement.SubdivideCurveSegment(list, curve, delta2, start, mid)
      EdgeLabelPlacement.SubdivideCurveSegment(list, curve, delta2, mid, end)
    } else {
      list.push([start, startPoint])
    }
  }
  //Places the given labels at their default positions.  Only avoids overlaps with the edge and source/target node that the label is connected to.
  static PlaceLabelsAtDefaultPositions(cancelToken: CancelToken, edges: GeomEdge[]) {
    for (const edge of edges) {
      if (edge.label) {
        const placer = new EdgeLabelPlacement([edge.source, edge.target], [edge])
        placer.run()
      }
    }
  }

  GetEdgeObstacles(edges: Array<GeomEdge>): Array<IObstacle> {
    const edgeObstacles = []
    for (const e of edges) {
      if (e.curve == null) continue
      const curvePoints = EdgeLabelPlacement.CurvePoints(e.curve, this.CollisionGranularity)
      this.edgeInfos.set(e, new LabelInfo(curvePoints))
      for (const p of curvePoints) {
        edgeObstacles.push(new PortObstacle(p[1]))
      }
    }

    return edgeObstacles
  }

  /**       Adds the label to the label obstacle map.*/

  AddLabelObstacle(label: IObstacle) {
    if (this.labelObstacleMap == null) {
      this.labelObstacleMap = mkRTree([[label.boundingBox, label]])
      this.obstacleMaps[0] = this.labelObstacleMap
    } else {
      this.labelObstacleMap.Add(label.boundingBox, label)
    }
  }

  //     Places the given labels.

  run() {
    // Place labels on short edges before labels on long edges, since short edges have less options.
    this.edges.sort((a, b) => {
      return this.edgeInfos.get(a).edgePoints.length - this.edgeInfos.get(b).edgePoints.length
    })
    for (const edge of this.edges) {
      this.PlaceLabel(edge)
    }
  }

  //     Places the given label in an available location.

  PlaceLabel(edge: GeomEdge) {
    let placed = false
    for (const s of this.placementStrategy) {
      switch (s) {
        case PlacementStrategy.AlongCurve:
          placed = this.PlaceEdgeLabelOnCurve(edge.label)
          break
        case PlacementStrategy.Horizontal:
          placed = this.PlaceEdgeLabelHorizontally(edge)
          break
        default:
          throw new Error('unexpected case')
      }
      if (placed) {
        break
      }
    }

    if (placed) {
      this.CalculateCenterLabelInfoCenter(edge.label)
    } else {
      this.PlaceLabelAtFirstPosition(edge.label)
    }
  }

  getLabelInfo(label: GeomLabel): LabelInfo {
    const ge = label.parent as GeomEdge
    return this.edgeInfos.get(ge)
  }

  //     Places the label at the first position requested.  Ignores all overlaps.

  PlaceLabelAtFirstPosition(label: GeomLabel) {
    const edge = label.parent as GeomEdge
    const curve: ICurve = edge.curve
    const points = this.edgeInfos.get(edge).edgePoints
    const index: number = this.StartIndex(
      label,
      points.map((p) => p[1]),
    )
    const point: Point = points[index][1]
    let derivative: Point = curve.derivative(points[index][0])
    // If the curve is a line of length (close to) 0, the derivative may be (close to) 0.
    // Pick a direction in that case.
    if (derivative.length < GeomConstants.distanceEpsilon) {
      derivative = new Point(1, 1)
    }
    derivative = derivative.normalize()
    const widthHeight = new Size(label.width, label.height)
    const labelInfo = this.getLabelInfo(label)
    const side: number = EdgeLabelPlacement.GetPossibleSides(labelInfo.placementSide, derivative)[0]
    const bounds: Rectangle = EdgeLabelPlacement.GetLabelBounds(point, derivative, widthHeight, side)
    this.SetLabelBounds(this.getLabelInfo(label), bounds)
  }

  StartIndex(label: GeomLabel, points: any[]): number {
    const labelInfo = this.getLabelInfo(label)

    return Math.min(points.length - 1, Math.max(0, <number>Math.floor(points.length * labelInfo.placementOffset)))
  }

  CalculateCenterLabelInfoCenter(label: GeomLabel) {
    const labelInfo = this.getLabelInfo(label)
    let cen = new Point(0, 0)
    for (const p of labelInfo.innerPoints) {
      cen = cen.add(p)
    }

    for (const p of labelInfo.outerPoints) {
      cen = cen.add(p)
    }

    label.positionCenter(cen.div(labelInfo.innerPoints.length + labelInfo.outerPoints.length))
  }

  public PlaceEdgeLabelHorizontally(edge: GeomEdge): boolean {
    const label = edge.label
    // approximate label with a rectangle
    // process candidate points for label ordered by priority
    // check candidate point for conflicts - if none then stop and keep placement
    const labelInfo = this.getLabelInfo(label)
    const curvePoints = labelInfo.edgePoints
    const wh = new Size(label.width, label.height)
    let bestConflictIndex = -1
    let bestRectangle = Rectangle.mkEmpty()
    const curve = edge.curve
    for (const index of EdgeLabelPlacement.ExpandingSearch(
      this.StartIndex(
        label,
        curvePoints.map((p) => p[1]),
      ),
      0,
      curvePoints.length,
    )) {
      const cp = curvePoints[index]

      let der = curve.derivative(cp[0])
      if (closeDistEps(der.lengthSquared, 0)) {
        continue
      }
      der = der.normalize()

      for (const side of EdgeLabelPlacement.GetPossibleSides(this.getLabelInfo(label).placementSide, der)) {
        const queryRect: Rectangle = EdgeLabelPlacement.GetLabelBounds(cp[1], der, wh, side)
        const conflictIndex: number = this.ConflictIndexRL(queryRect, label)
        if (conflictIndex > bestConflictIndex) {
          bestConflictIndex = conflictIndex
          bestRectangle = queryRect
          // If the best location was found, we're done
          if (bestConflictIndex === Number.MAX_VALUE) {
            break
          }
        }
      }

      // If the best location was found, we're done
      if (bestConflictIndex === Number.MAX_VALUE) {
        break
      }
    }

    if (bestConflictIndex >= 0) {
      this.SetLabelBounds(this.getLabelInfo(label), bestRectangle)
      const r = new RectangleObstacle(bestRectangle, null)
      this.AddLabelObstacle(r)
      const labelInfo = this.getLabelInfo(label)
      if (bestConflictIndex === 0) labelInfo.placementResult = LabelPlacementResult.OverlapsOtherLabels
      else if (bestConflictIndex === 1) labelInfo.placementResult = LabelPlacementResult.OverlapsNodes
      else if (bestConflictIndex === 2) labelInfo.placementResult = LabelPlacementResult.OverlapsEdges
      else labelInfo.placementResult = LabelPlacementResult.OverlapsNothing
      return true
    }

    return false
  }

  //     Gets the label placement bounds for the given location, side, and label size.

  // The point along a curve that the label should be placed near.
  // The derivative of the curve at the point position.
  // The width and height of the label.
  // The side (1 or -1) of the line to place the label on.
  // <returns>The label's desired position.</returns>
  static GetLabelBounds(point: Point, derivative: Point, size: Size, side: number): Rectangle {
    const o: Point = derivative.rotate(Math.PI / 2).mul(side)
    const labelPos: Point = point.add(o)
    const oLength = 1
    let left = o.x > 0 ? labelPos.x : labelPos.x - size.width
    let bottom = o.y > 0 ? labelPos.y : labelPos.y - size.height
    // If the line is near horizontal, shift the placement
    // to make it naturally transistion from o.X being negative to positive.
    if (Math.abs(o.x) < 0.75) {
      // _________  /
      // |______w_|/
      //     \   o/
      //      \  /
      //       \/ <-- right angle
      //       /
      //      /
      // Get the angle, 'o', between the line and the label
      const horizontalAngle: number = Math.acos(Math.abs(o.y) / oLength)
      // Get the distance, 'w', from the tip of the normal to the line
      const horizontalShift: number = oLength / Math.sin(horizontalAngle)
      const verticalShift: number = oLength / Math.cos(horizontalAngle)
      // Shift the label by this amount, or by half the width.  Whichever is smaller
      left += (o.x > 0 ? -1 : 1) * Math.min(horizontalShift, size.width / 2.0)
      bottom += (o.y > 0 ? 1 : -1) * verticalShift
    } else if (Math.abs(o.y) < 0.75) {
      const verticalAngle: number = Math.acos(Math.abs(o.x) / oLength)
      const verticalShift: number = oLength / Math.sin(verticalAngle)
      const horizontalShift: number = oLength / Math.cos(verticalAngle)
      left += (o.x > 0 ? 1 : -1) * horizontalShift
      bottom += (o.y > 0 ? -1 : 1) * Math.min(verticalShift, size.height / 2.0)
    }

    return Rectangle.mkLeftBottomSize(left, bottom, size)
  }

  //     Sets the label's position to be the given bounds.

  SetLabelBounds(labelInfo: LabelInfo, bounds: Rectangle) {
    labelInfo.innerPoints = [bounds.leftTop, bounds.rightTop]
    labelInfo.outerPoints = [bounds.leftBottom, bounds.rightBottom]
  }

  //     Gets the possible sides for the given label and the given derivative point.

  // <returns>An enumeration of the possible sides (-1 or 1).</returns>
  static GetPossibleSides(side: PlacementSide, derivative: Point): number[] {
    if (derivative.length === 0) {
      side = PlacementSide.Any
    }

    switch (side) {
      case PlacementSide.Port:
        return [-1]
        break
      case PlacementSide.Starboard:
        return [1]
      case PlacementSide.Top:
        if (closeDistEps(derivative.x, 0)) {
          // If the line is vertical, Top becomes Left
          return EdgeLabelPlacement.GetPossibleSides(PlacementSide.Left, derivative)
        }

        return [1]

      case PlacementSide.Bottom:
        if (closeDistEps(derivative.x, 0)) {
          // If the line is vertical, Bottom becomes Right
          return EdgeLabelPlacement.GetPossibleSides(PlacementSide.Right, derivative)
        }
        return [derivative.x < 0 ? -1 : 1]

      case PlacementSide.Left:
        if (closeDistEps(derivative.y, 0)) {
          // If the line is horizontal, Left becomes Top
          return EdgeLabelPlacement.GetPossibleSides(PlacementSide.Top, derivative)
        }
        return [derivative.y < 0 ? -1 : 1]
      case PlacementSide.Right:
        if (closeDistEps(derivative.y, 0)) {
          // If the line is horizontal, Right becomes Bottom
          return EdgeLabelPlacement.GetPossibleSides(PlacementSide.Bottom, derivative)
        }
        return [derivative.y < 0 ? 1 : -1]
      default:
        return [-1, 1]
    }
  }

  public static *ExpandingSearch(start: number, min: number, max: number): IterableIterator<number> {
    let upper = start + 1
    let lower = upper
    while (lower > min) {
      yield --lower
    }
    while (upper < max) {
      yield upper++
    }
  }

  static PointSetLength(ps: Array<PointSet>): number {
    let l = 0
    let q: Point = null
    for (const p of ps) {
      if (q != null) {
        l += q.sub(p.Center).length
      }

      q = p.Center
    }

    return l
  }

  PlaceEdgeLabelOnCurve(label: GeomLabel): boolean {
    // approximate label with a set of circles
    // generate list of candidate points for label ordered by priority
    // check candidate point for conflicts - if none then stop and keep placement
    const edge = label.parent as GeomEdge
    const labelInfo = this.getLabelInfo(label)
    labelInfo.innerPoints = null
    const curvePoints = labelInfo.edgePoints
    const distanceFromCurve = 3
    const radius: number = label.height / 2
    const wh = new Size(radius, radius)
    const labelLength: number = label.width
    for (const index of EdgeLabelPlacement.ExpandingSearch(this.StartIndex(label, curvePoints), 0, curvePoints.length)) {
      const sides = this.GetSidesAndEdgeCurve(label, edge, curvePoints, index)
      for (const side of sides) {
        const placedPoints = new PointSetList()
        const t = {coveredLength: 0}

        this.ProcessExpandingSearchOnSide(index, curvePoints, edge.curve, side, radius, distanceFromCurve, wh, t, placedPoints, labelLength)
        if (t.coveredLength >= labelLength) {
          this.CaseOfCoveredLengthGreaterThanLabelLength(label, placedPoints, t.coveredLength, labelLength, wh)
          return true
        }
      }
    }

    return false
  }

  CaseOfCoveredLengthGreaterThanLabelLength(
    label: GeomLabel,
    placedPoints: PointSetList,
    coveredLength: number,
    labelLength: number,
    wh: Size,
  ) {
    const innerPoints = new Array<Point>()
    const outerPoints = new Array<Point>()
    const orderedPoints = Array.from(placedPoints.points)
    const excess: number = coveredLength - labelLength
    if (excess > 0) {
      // move back the last point
      let q: PointSet = orderedPoints[orderedPoints.length - 1]
      let p: PointSet = orderedPoints[orderedPoints.length - 2]
      let v: Point = q.Center.sub(p.Center)
      let length: number = v.length
      if (excess > length) {
        q = orderedPoints[0]
        p = orderedPoints[1]
        v = q.Center.sub(p.Center)
        length = v.length
      }

      const w = v.mul((length - excess) / length)
      q.Center = p.Center.add(w)
      q.Inner = p.Inner.add(w)
      q.Outer = p.Outer.add(w)
    }

    this.GoOverOrderedPointsAndAddLabelObstacels(orderedPoints, innerPoints, outerPoints, wh)
    // placed all points in label so we are done
    const labelInfo = this.getLabelInfo(label)
    labelInfo.innerPoints = innerPoints
    labelInfo.outerPoints = outerPoints
  }

  GoOverOrderedPointsAndAddLabelObstacels(orderedPoints: Array<PointSet>, innerPoints: Array<Point>, outerPoints: Array<Point>, wh: Size) {
    for (const p of orderedPoints) {
      const center: Point = p.Center
      innerPoints.push(p.Inner)
      outerPoints.push(p.Outer)
      const r = new RectangleObstacle(Rectangle.mkSizeCenter(new Size(wh.width * 2, wh.height * 2), center), null)
      this.AddLabelObstacle(r)
    }
  }

  ProcessExpandingSearchOnSide(
    index: number,
    curvePoints: Array<[number, Point]>,
    curve: ICurve,
    side: number,
    radius: number,
    distanceFromCurve: number,
    wh: Size,
    t: {coveredLength: number},
    placedPoints: PointSetList,
    labelLength: number,
  ) {
    for (const i of EdgeLabelPlacement.ExpandingSearch(index, 0, curvePoints.length)) {
      const [par, pnt] = curvePoints[i]
      const der: Point = curve.derivative(par)
      if (closeDistEps(der.lengthSquared, 0)) {
        continue
      }

      const o = der
        .rotate(Math.PI / 2)
        .normalize()
        .mul(side)
      const labelPos: Point = pnt.add(o.mul(radius + distanceFromCurve))

      if (!this.Conflict(labelPos, radius, wh)) {
        // found a valid candidate position
        const ps = new PointSet()
        ps.Center = labelPos
        ps.Inner = pnt.add(o.mul(distanceFromCurve))
        ps.Outer = pnt.add(o.mul(2.0 * radius + distanceFromCurve))
        t.coveredLength = i <= index ? placedPoints.AddFirst(ps) : placedPoints.AddLast(ps)

        if (t.coveredLength >= labelLength) {
          break
        }
      } else {
        // not going to work!
        break
      }
    }
  }

  GetSidesAndEdgeCurve(label: GeomLabel, e: GeomEdge, curvePoints: Array<[number, Point]>, index: number): number[] {
    const initialDer = e.curve.derivative(curvePoints[index][0])
    return EdgeLabelPlacement.GetPossibleSides(this.getLabelInfo(label).placementSide, initialDer)
  }

  //     Determines if the query point intersects with any of the obstacles.

  // <returns>True if the query point itnersects with any of the obstacles.</returns>
  Conflict(labelPos: Point, radius: number, wh: Size): boolean {
    return this.ConflictIndex(labelPos, radius, wh) !== Number.MAX_VALUE
  }

  //    Determines the index of the first obstacle map that the rectangle intersects.
  //    Clusters that are parents/grandparents of the label's source/target nodes are not considered intersection.

  // <returns>The index of the first obstacle map that the rectangle intersects. int.MaxValue if there is no intersection.</returns>
  ConflictIndexRL(queryRect: Rectangle, label: GeomLabel): number {
    const edge = <GeomEdge>label.parent
    const source: GeomNode = edge.source
    const target: GeomNode = edge.target
    for (let i = 0; i < this.obstacleMaps.length; i++) {
      if (this.obstacleMaps[i] == null) {
        continue
      }

      for (const obstacle of this.obstacleMaps[i].GetAllIntersecting(queryRect)) {
        // If we're overlapping a node...
        if (<LabelPlacementResult>i === LabelPlacementResult.OverlapsNodes) {
          // ...and the node is a cluster...
          const isRectangleObstacle = obstacle instanceof RectangleObstacle
          if (isRectangleObstacle) {
            const isCluster = obstacle.data instanceof GeomGraph
            // ...and the cluster is a grandparent of the source or target...
            if (isCluster && (source.node.isDescendantOf(obstacle.data.graph) || target.node.isDescendantOf(obstacle.data))) {
              // ...don't consider the overlap to be a conflict.
              continue
            }
          }
        }

        return i
      }
    }

    return Number.MAX_VALUE
  }
  /**   Determines the index of the first obstacle map that the point intersects.
    Returns the index of the first obstacle map that the point intersects. int.MaxValue if there is no intersection.*/
  ConflictIndex(labelPos: Point, radius: number, wh: Size): number {
    const queryRect = Rectangle.creatRectangleWithSize(new Size(wh.width * 2, wh.height * 2), labelPos)
    const r2: number = radius * radius
    for (let i = 0; i < this.obstacleMaps.length; i++) {
      if (this.obstacleMaps[i] == null) {
        continue
      }

      for (let i = 0; i < this.obstacleMaps.length; i++) {
        if (this.obstacleMaps[i] == null) continue

        for (const c of this.obstacleMaps[i].GetAllIntersecting(queryRect)) {
          if (c instanceof PortObstacle) {
            if (labelPos.sub(c.location).lengthSquared < r2) return i
          } else return i
        }
      }

      return Number.MAX_VALUE
    }
  }
}
