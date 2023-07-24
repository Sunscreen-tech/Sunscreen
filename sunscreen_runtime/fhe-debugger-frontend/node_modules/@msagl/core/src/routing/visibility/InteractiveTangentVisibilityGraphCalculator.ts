import {Point} from '../..'
import {TriangleOrientation} from '../../math/geometry/point'
import {RBNode} from '../../math/RBTree/rbNode'
import {RBTree} from '../../math/RBTree/rbTree'
import {Polygon} from './Polygon'
import {TangentPair} from './TangentPair'
import {VisibilityGraph} from './VisibilityGraph'
import {Algorithm} from '../../utils/algorithm'
import {Diagonal} from './Diagonal'
import {Tangent} from './Tangent'
import {ActiveDiagonalComparerWithRay} from './ActiveDiagonalComparerWithRay'
import {PolylinePoint} from '../../math/geometry/polylinePoint'
import {VisibilityVertex} from './VisibilityVertex'
import {StemStartPointComparer} from './StemStartPointComparer'

export class InteractiveTangentVisibilityGraphCalculator extends Algorithm {
  // the list of obstacles

  polygons: Array<Polygon> = []

  // From these polygons we calculate visibility edges to all other polygons

  addedPolygons: Array<Polygon>

  visibilityGraph: VisibilityGraph

  diagonals: Array<Diagonal>

  tangents: Array<Tangent>

  activeDiagonalTree: RBTree<Diagonal>

  currentPolygon: Polygon

  activeDiagonalComparer: ActiveDiagonalComparerWithRay = new ActiveDiagonalComparerWithRay()

  useLeftPTangents: boolean

  // we calculate tangents between activePolygons and between activePolygons and existingObsacles

  run() {
    this.useLeftPTangents = true
    this.CalculateAndAddEdges()
    // use another family of tangents
    this.useLeftPTangents = false
    this.CalculateAndAddEdges()
  }

  CalculateAndAddEdges() {
    for (const p of this.addedPolygons) {
      this.CalculateVisibleTangentsFromPolygon(p)
    }
    this.ProgressStep()
  }

  private CalculateVisibleTangentsFromPolygon(polygon: Polygon) {
    this.currentPolygon = polygon
    this.AllocateDataStructures()
    this.OrganizeTangents()
    this.InitActiveDiagonals()
    this.Sweep()
  }

  private AllocateDataStructures() {
    this.tangents = new Array<Tangent>()
    this.diagonals = new Array<Diagonal>()
    this.activeDiagonalTree = new RBTree<Diagonal>(this.activeDiagonalComparer.Compare.bind(this.activeDiagonalComparer))
  }

  private Sweep() {
    if (this.tangents.length < 2) {
      return
    }

    for (let i = 1; i < this.tangents.length; i++) {
      // we processed the first element already
      const t: Tangent = this.tangents[i]
      if (t.Diagonal != null) {
        if (t.Diagonal.RbNode === this.activeDiagonalTree.treeMinimum()) {
          this.AddVisibleEdge(t)
        }

        if (t.IsHigh) {
          this.RemoveDiagonalFromActiveNodes(t.Diagonal)
        }
      } else if (t.IsLow) {
        this.activeDiagonalComparer.PointOnTangentAndInsertedDiagonal = t.End.point
        this.InsertActiveDiagonal(new Diagonal(t, t.Comp))
        if (t.Diagonal.RbNode === this.activeDiagonalTree.treeMinimum()) {
          this.AddVisibleEdge(t)
        }
      }
    }
  }

  private AddVisibleEdge(t: Tangent) {
    VisibilityGraph.AddEdgeVV(getVertex(this.visibilityGraph, t.start), getVertex(this.visibilityGraph, t.End))
  }

  // this function will also add the first tangent to the visible edges if needed

  private InitActiveDiagonals() {
    if (this.tangents.length === 0) {
      return
    }

    const firstTangent: Tangent = this.tangents[0]
    const firstTangentStart: Point = firstTangent.start.point
    const firstTangentEnd: Point = firstTangent.End.point
    for (const diagonal of this.diagonals) {
      if (InteractiveTangentVisibilityGraphCalculator.RayIntersectDiagonal(firstTangentStart, firstTangentEnd, diagonal)) {
        this.activeDiagonalComparer.PointOnTangentAndInsertedDiagonal = ActiveDiagonalComparerWithRay.IntersectDiagonalWithRay(
          firstTangentStart,
          firstTangentEnd,
          diagonal,
        )
        this.InsertActiveDiagonal(diagonal)
      }
    }
    if (firstTangent.Diagonal.RbNode === this.activeDiagonalTree.treeMinimum()) {
      this.AddVisibleEdge(firstTangent)
    }

    if (firstTangent.IsLow === false) {
      // remove the diagonal of the top tangent from active edges
      const diag: Diagonal = firstTangent.Diagonal
      this.RemoveDiagonalFromActiveNodes(diag)
    }
  }

  private RemoveDiagonalFromActiveNodes(diag: Diagonal) {
    const changedNode: RBNode<Diagonal> = this.activeDiagonalTree.deleteSubTree(diag.RbNode)
    if (changedNode != null) {
      if (changedNode.item != null) {
        changedNode.item.RbNode = changedNode
      }
    }

    diag.LeftTangent.Diagonal = null
    diag.RightTangent.Diagonal = null
  }

  private InsertActiveDiagonal(diagonal: Diagonal) {
    diagonal.RbNode = this.activeDiagonalTree.insert(diagonal)
    InteractiveTangentVisibilityGraphCalculator.MarkDiagonalAsActiveInTangents(diagonal)
  }

  private static MarkDiagonalAsActiveInTangents(diagonal: Diagonal) {
    diagonal.LeftTangent.Diagonal = diagonal
    diagonal.RightTangent.Diagonal = diagonal
  }

  static RayIntersectDiagonal(pivot: Point, pointOnRay: Point, diagonal: Diagonal): boolean {
    const a: Point = diagonal.Start
    const b: Point = diagonal.End
    return (
      Point.getTriangleOrientation(pivot, a, b) === TriangleOrientation.Counterclockwise &&
      Point.getTriangleOrientation(pivot, pointOnRay, a) !== TriangleOrientation.Counterclockwise &&
      Point.getTriangleOrientation(pivot, pointOnRay, b) !== TriangleOrientation.Clockwise
    )
  }

  // compare tangents by measuring the counterclockwise angle between the tangent and the edge

  static TangentComparison(e0: Tangent, e1: Tangent): number {
    return StemStartPointComparer.CompareVectorsByAngleToXAxis(e0.End.point.sub(e0.start.point), e1.End.point.sub(e1.start.point))
  }

  *AllObstacles(): IterableIterator<Polygon> {
    for (const p of this.addedPolygons) {
      yield p
    }
    if (this.polygons) {
      for (const p of this.polygons) {
        yield p
      }
    }
  }

  private OrganizeTangents() {
    for (const q of this.AllObstacles()) {
      if (q !== this.currentPolygon) {
        this.ProcessPolygonQ(q)
      }
    }

    this.tangents.sort(InteractiveTangentVisibilityGraphCalculator.TangentComparison)
  }

  private ProcessPolygonQ(q: Polygon) {
    const tangentPair: TangentPair = new TangentPair(this.currentPolygon, q)
    if (this.useLeftPTangents) {
      tangentPair.CalculateLeftTangents()
    } else {
      tangentPair.CalculateRightTangents()
    }

    let couple = this.useLeftPTangents ? tangentPair.leftPLeftQ : tangentPair.rightPLeftQ
    const t0: Tangent = new Tangent(this.currentPolygon.pp(couple[0]), q.pp(couple[1]))
    t0.IsLow = true
    t0.SeparatingPolygons = !this.useLeftPTangents
    couple = this.useLeftPTangents ? tangentPair.leftPRightQ : tangentPair.rightPRightQ
    const t1: Tangent = new Tangent(this.currentPolygon.pp(couple[0]), q.pp(couple[1]))
    t1.IsLow = false
    t1.SeparatingPolygons = this.useLeftPTangents
    t0.Comp = t1
    t1.Comp = t0
    this.tangents.push(t0)
    this.tangents.push(t1)
    this.diagonals.push(new Diagonal(t0, t1))
  }

  public constructor(holes: Array<Polygon>, addedPolygons: Array<Polygon>, visibilityGraph: VisibilityGraph) {
    super(null) // TODO: add cancelToken
    this.polygons = holes
    this.visibilityGraph = visibilityGraph
    this.addedPolygons = addedPolygons
  }
}
function getVertex(vg: VisibilityGraph, pp: PolylinePoint): VisibilityVertex {
  return vg.FindVertex(pp.point)
}
