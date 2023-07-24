import {Point} from '../../math/geometry/point'
import {Rectangle} from '../../math/geometry/rectangle'
import {AllPairsDistances} from './AllPairsDistances'
import {MdsLayoutSettings} from './mDSLayoutSettings'
import {PivotDistances} from './pivotDistances'
import {Transform} from './Transform'
import {Algorithm} from '../../utils/algorithm'
import {CancelToken} from '../../utils/cancelToken'
import {GeomNode} from '../core/geomNode'
import {GeomEdge} from '../core/geomEdge'
import {MultidimensionalScaling} from './multiDimensionalScaling'
import {CommonLayoutSettings} from '../commonLayoutSettings'
import {OptimalRectanglePacking} from '../../math/geometry/rectanglePacking/OptimalRectanglePacking'
import {GTreeOverlapRemoval} from '../gTreeOverlapRemoval/gTreeOverlapRemoval'
import {IGeomGraph} from '../initialLayout/iGeomGraph'

// Class for graph layout with multidimensional scaling.
export class MdsGraphLayout extends Algorithm {
  graph: IGeomGraph
  length: (e: GeomEdge) => number
  settings: MdsLayoutSettings

  // Constructs the multidimensional scaling algorithm.
  public constructor(settings: MdsLayoutSettings, geometryGraph: IGeomGraph, cancelToken: CancelToken, length: (e: GeomEdge) => number) {
    super(cancelToken)
    this.settings = settings
    this.graph = geometryGraph
    this.length = length
  }

  // Executes the algorithm
  run() {
    this.LayoutConnectedGraphWithMds()
    this.graph.pumpTheBoxToTheGraphWithMargins()
  }

  // Scales a configuration such that the average edge length in the drawing
  // equals the average of the given edge lengths.
  static ScaleToAverageEdgeLength(g: IGeomGraph, x: number[], y: number[], length: (e: GeomEdge) => number) {
    const index = new Map<GeomNode, number>()
    let c = 0
    for (const node of g.shallowNodes) {
      index.set(node, c)
      c++
    }

    let avgLength = 0
    let avgSum = 0
    for (const edge of g.shallowEdges) {
      const i: number = index.get(edge.source)
      const j: number = index.get(edge.target)
      avgSum += Math.sqrt(Math.pow(x[i] - x[j], 2) + Math.pow(y[i] - y[j], 2))
      avgLength += length(edge)
    }

    if (avgLength > 0) {
      avgSum /= avgLength
    }

    if (avgSum > 0) {
      for (let i = 0; i < x.length; i++) {
        x[i] /= avgSum
        y[i] /= avgSum
      }
    }
  }

  // Layouts a connected graph with Multidimensional Scaling, using
  // shortest-path distances as Euclidean target distances.
  static LayoutGraphWithMds(
    geometryGraph: IGeomGraph,
    settings: MdsLayoutSettings,
    arrays: {x: number[]; y: number[]},
    length: (e: GeomEdge) => number,
  ) {
    arrays.x = new Array(geometryGraph.shallowNodeCount)
    arrays.y = new Array(geometryGraph.shallowNodeCount)
    if (arrays.x.length === 0) {
      return
    }

    if (arrays.x.length === 1) {
      arrays.x[0] = arrays.y[0] = 0
      return
    }

    const k: number = Math.min(settings.PivotNumber, geometryGraph.shallowNodeCount)
    const iter: number = settings.GetNumberOfIterationsWithMajorization(geometryGraph.shallowNodeCount)
    const exponent: number = settings.Exponent
    const pivotArray = new Array(k)
    const pivotDistances = new PivotDistances(geometryGraph, pivotArray, length)
    pivotDistances.run()
    const c = pivotDistances.Result
    MultidimensionalScaling.LandmarkClassicalScaling(c, arrays, pivotArray)
    MdsGraphLayout.ScaleToAverageEdgeLength(geometryGraph, arrays.x, arrays.y, length)
    if (iter > 0) {
      const apd = new AllPairsDistances(geometryGraph, length)
      apd.run()
      const d = apd.Result
      const w = MultidimensionalScaling.ExponentialWeightMatrix(d, exponent)
      // MultidimensionalScaling.DistanceScaling(d, x, y, w, iter);
      MultidimensionalScaling.DistanceScalingSubset(d, arrays.x, arrays.y, w, iter)
    }
  }

  LayoutConnectedGraphWithMds() {
    const arrays: {x: number[]; y: number[]} = {x: [], y: []}
    MdsGraphLayout.LayoutGraphWithMds(this.graph, this.settings, arrays, this.length)
    if (this.settings.RotationAngle !== 0) {
      Transform.Rotate(arrays.x, arrays.y, this.settings.RotationAngle)
    }

    let index = 0
    for (const node of this.graph.shallowNodes) {
      if (node.boundingBox) {
        node.center = new Point(arrays.x[index] * this.settings.ScaleX, arrays.y[index] * this.settings.ScaleY)
      }
      index++
    }

    if (this.settings.removeOverlaps) {
      GTreeOverlapRemoval.RemoveOverlaps(Array.from(this.graph.shallowNodes), this.settings.NodeSeparation)
    }

    this.graph.pumpTheBoxToTheGraphWithMargins()
  }

  ScaleNodes(nodes: GeomNode[], scale: number) {
    for (const node of nodes) {
      node.center = node.center.mul(scale)
    }
  }

  //  static UpdateTree(tree: RectangleNode<Node, Point>) {
  //    if (tree.IsLeaf) {
  //      tree.irect = tree.UserData.BoundingBox
  //    } else {
  //      MdsGraphLayout.UpdateTree(tree.Left)
  //      MdsGraphLayout.UpdateTree(tree.Right)
  //      tree.rectangle = tree.Left.rectangle
  //      tree.rectangle.Add(tree.Right.rectangle)
  //    }
  //  }

  //  static NumberOfHits(
  //    numberOfChecks: number,
  //    random: Random,
  //    tree: RectangleNode<Node, Point>,
  //    maxNumberOfHits: number,
  //  ): number {
  //    //  var l = new Array<Point>();
  //    let numberOfHits = 0
  //    for (let i = 0; i < numberOfChecks; i++) {
  //      const point: Point = MdsGraphLayout.RandomPointFromBox(
  //        random,
  //        <Rectangle>tree.rectangle,
  //      )
  //      //    l.Add(point);
  //      HitTestBehavior.Stop
  //      null
  //      numberOfHits++
  //      if (numberOfHits === maxNumberOfHits) {
  //        return maxNumberOfHits
  //      }
  //    }

  //    // LayoutAlgorithmSettings.ShowDebugCurvesEnumeration(Getdc(tree, l));
  //    return numberOfHits
  //  }

  //  static BuildNodeTree(nodes: IList<Node>): RectangleNode<Node, Point> {
  //    return RectangleNode.CreateRectangleNodeOnListOfNodes(
  //      nodes.Select(() => {}, new RectangleNode<Node, Point>(n, n.BoundingBox)),
  //    )
  //  }

  //  static RandomPointFromBox(random: Random, boundingBox: Rectangle): Point {
  //    const x = random.NextDouble()
  //    const y = random.NextDouble()
  //    const p = new Point(
  //      boundingBox.left + boundingBox.width * x,
  //      boundingBox.bottom + boundingBox.height * y,
  //    )
  //    return p
  //  }

  // Pack the given graph components to the specified aspect ratio
  public static PackGraphs(graphs: IGeomGraph[], settings: CommonLayoutSettings): Rectangle {
    if (graphs.length === 0) {
      return Rectangle.mkEmpty()
    }
    if (graphs.length === 1) return graphs[0].boundingBox
    const rectangles = graphs.map((g) => g.boundingBox)
    const originalLeftBottoms = new Array<{g: IGeomGraph; lb: Point}>()
    for (const g of graphs) {
      originalLeftBottoms.push({g: g, lb: g.boundingBox.leftBottom.clone()})
    }
    const packing = new OptimalRectanglePacking(rectangles, settings.PackingAspectRatio)
    packing.run()
    for (const {g, lb} of originalLeftBottoms) {
      const delta = g.boundingBox.leftBottom.sub(lb)
      g.translate(delta)
    }

    return new Rectangle({
      left: 0,
      bottom: 0,
      right: packing.PackedWidth,
      top: packing.PackedHeight,
    })
  }
}
