// The class calculates obstacles under the shape.
// We assume that the boundaries are not set for the shape children yet

import {Point} from '..'
import {Curve, PointLocation} from '../math/geometry'
import {ConvexHull} from '../math/geometry/convexHull'
import {Polyline} from '../math/geometry/polyline'
import {CreateRectNodeOnArrayOfRectNodes, mkRectangleNode, RectangleNode} from '../math/geometry/RTree/rectangleNode'
import {CrossRectangleNodes} from '../math/geometry/RTree/rectangleNodeUtils'
import {initRandom} from '../utils/random'
import {flattenArray} from '../utils/setOperations'
import {InteractiveObstacleCalculator} from './interactiveObstacleCalculator'
import {Shape} from './shape'
import {TightLooseCouple} from './TightLooseCouple'

export class ShapeObstacleCalculator {
  tightHierarchy: RectangleNode<Polyline, Point>

  coupleHierarchy: RectangleNode<TightLooseCouple, Point>
  loosePolylinesToNodes = new Map<Polyline, Set<Node>>()
  RootOfLooseHierarchy: RectangleNode<Shape, Point>

  constructor(shape: Shape, tightPadding: number, loosePadding: number, shapesToTightLooseCouples: Map<Shape, TightLooseCouple>) {
    this.MainShape = shape
    this.TightPadding = tightPadding
    this.LoosePadding = loosePadding
    this.ShapesToTightLooseCouples = shapesToTightLooseCouples
  }

  ShapesToTightLooseCouples: Map<Shape, TightLooseCouple>
  tightToShape: Map<Polyline, Shape>
  TightPadding: number

  LoosePadding: number
  MainShape: Shape
  OverlapsDetected: boolean

  Calculate(randomizationShift: number) {
    initRandom(3) // keep it the same all the time, otherwise the path optimizer migth not work
    if (this.MainShape.Children.length === 0) {
      return
    }

    this.CreateTightObstacles()
    this.CreateTigthLooseCouples(randomizationShift)
    if (this.OverlapsDetected) {
      this.FillTheMapOfShapeToTightLooseCouples()
    }
  }
  FillTheMapOfShapeToTightLooseCouples() {
    const childrenShapeHierarchy = CreateRectNodeOnArrayOfRectNodes(this.MainShape.Children.map((s) => mkRectangleNode(s, s.BoundingBox)))
    CrossRectangleNodes(childrenShapeHierarchy, this.coupleHierarchy, this.TryMapShapeToTightLooseCouple.bind(this))
  }

  TryMapShapeToTightLooseCouple(shape: Shape, tightLooseCouple: TightLooseCouple) {
    if (ShapeObstacleCalculator.ShapeIsInsideOfPoly(shape, tightLooseCouple.TightPolyline)) {
      this.ShapesToTightLooseCouples.set(shape, tightLooseCouple)
    }
  }

  // this test is valid in our situation where the tight polylines are disjoint and the shape can cross only one of them
  static ShapeIsInsideOfPoly(shape: Shape, tightPolyline: Polyline): boolean {
    return Curve.PointRelativeToCurveLocation(shape.BoundaryCurve.start, tightPolyline) === PointLocation.Inside
  }

  CreateTigthLooseCouples(randomizationShift: number) {
    const couples = new Array<TightLooseCouple>()
    for (const tightPolyline of this.tightHierarchy.GetAllLeaves()) {
      const distance = InteractiveObstacleCalculator.FindMaxPaddingForTightPolyline(this.tightHierarchy, tightPolyline, this.LoosePadding)
      const loosePoly = InteractiveObstacleCalculator.LoosePolylineWithFewCorners(tightPolyline, distance, randomizationShift)
      const looseShape = new Shape(loosePoly)
      const cpl = TightLooseCouple.mk(tightPolyline, looseShape, distance)
      this.ShapesToTightLooseCouples.set(this.tightToShape.get(tightPolyline), cpl)

      couples.push(cpl)
    }

    this.coupleHierarchy = CreateRectNodeOnArrayOfRectNodes(
      couples.map((c) => mkRectangleNode<TightLooseCouple, Point>(c, c.TightPolyline.boundingBox)),
    )
  }

  CreateTightObstacles() {
    this.tightToShape = new Map<Polyline, Shape>()
    const tightObstacles = new Set<Polyline>(this.MainShape.Children.map(this.InitialTightPolyline.bind(this)))
    const initialNumberOfTightObstacles: number = tightObstacles.size
    this.tightHierarchy = InteractiveObstacleCalculator.RemovePossibleOverlapsInTightPolylinesAndCalculateHierarchy(tightObstacles)
    this.OverlapsDetected = initialNumberOfTightObstacles > tightObstacles.size
  }

  InitialTightPolyline(shape: Shape): Polyline {
    let poly = InteractiveObstacleCalculator.PaddedPolylineBoundaryOfNode(shape.BoundaryCurve, this.TightPadding)
    const stickingPointsArray = flattenArray(this.LoosePolylinesUnderShape(shape), (p) => p).filter(
      (p) => Curve.PointRelativeToCurveLocation(p, poly) === PointLocation.Outside,
    )

    if (stickingPointsArray.length == 0) {
      if (this.tightToShape) this.tightToShape.set(poly, shape)
      return poly
    }
    const pts = Array.from(poly).concat(stickingPointsArray)
    poly = Polyline.mkClosedFromPoints(ConvexHull.CalculateConvexHull(pts))
    if (this.tightToShape) this.tightToShape.set(poly, shape)
    return poly
  }

  LoosePolylinesUnderShape(shape: Shape): Array<Polyline> {
    return shape.Children.map((child) => <Polyline>this.ShapesToTightLooseCouples.get(child).LooseShape.BoundaryCurve)
  }
}
