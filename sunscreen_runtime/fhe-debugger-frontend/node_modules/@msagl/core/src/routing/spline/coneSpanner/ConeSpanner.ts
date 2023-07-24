import {Point} from '../../..'
import {Polyline, Curve, PointLocation} from '../../../math/geometry'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {Algorithm} from '../../../utils/algorithm'

import {PointSet} from '../../../utils/PointSet'
import {VisibilityGraph} from '../../visibility/VisibilityGraph'
import {LineSweeper} from './LineSweeper'
export class ConeSpanner extends Algorithm {
  _obstacles: Array<Polyline>

  // double coneAngle = Math.PI / 18;// ten degrees
  // double coneAngle = Math.PI / 9;// twenty degrees
  _visibilityGraph: VisibilityGraph

  /** the angle of the cone */
  coneAngle: number =  Math.PI / 6

  _bidirectional: boolean

  constructor(obstacles: Array<Polyline>, visibilityGraph: VisibilityGraph) {
    super(null)
    this._obstacles = Array.from(VisibilityGraph.OrientHolesClockwise(obstacles))
    this._visibilityGraph = visibilityGraph
  }

  static mk(
    obstacles: Array<Polyline>,
    visibilityGraph: VisibilityGraph,
    coneAngle: number,
    ports: PointSet,
    borderPolyline: Polyline,
  ): ConeSpanner {
    const ret = new ConeSpanner(obstacles, visibilityGraph)
    // Assert.assert(borderPolyline == null  || obstacles.every((o) => Curve.CurveIsInsideOther(o, borderPolyline)))
    // Assert.assert(
    //  borderPolyline == null  ||
    //  Array.from(ports.values()).every((o) => Curve.PointRelativeToCurveLocation(o, borderPolyline) === PointLocation.Inside),
    // )
    // Assert.assert(obstacles.All(o => ports.All(p => Curve.PointRelativeToCurveLocation(p, o) === PointLocation.Outside)));
    // todo: uncomment this assert - it failes on D:\progression\src\ddsuites\src\vs\Progression\ScenarioTests\Grouping\GroupingResources\GroupBySelection2.dgml
    // when dragging
    // Assert.assert(coneAngle > Math.PI / (180 * 2) && coneAngle <= Math.PI / 2)
    ret.Ports = ports
    ret.BorderPolyline = borderPolyline
    ret.ConeAngle = coneAngle
    return ret
  }

  get ConeAngle(): number {
    return this.coneAngle
  }
  set ConeAngle(value: number) {
    this.coneAngle = value
  }

  ports: PointSet = new PointSet()
  get Ports(): PointSet {
    return this.ports
  }
  set Ports(value: PointSet) {
    this.ports = value
  }
  borderPolyline: Polyline
  get BorderPolyline(): Polyline {
    return this.borderPolyline
  }
  set BorderPolyline(value: Polyline) {
    this.borderPolyline = value
  }

  // If set to true then a smaller visibility graph is created.
  // An edge is added to the visibility graph only if it is found at least twice:
  // once sweeping with a direction d and the second time with -d

  get Bidirectional(): boolean {
    return this._bidirectional
  }
  set Bidirectional(value: boolean) {
    this._bidirectional = value
  }

  static GetTotalSteps(coneAngle: number): number {
    return Math.floor((2 * Math.PI - coneAngle / 2) / coneAngle) + 1
  }

  run() {
    const offset: number = 2 * Math.PI - this.coneAngle / 2
    if (!this.Bidirectional) {
      let angle: number
      for (let i = 0; (angle = this.coneAngle * i) <= offset; i++) {
        super.ProgressStep()
        this.AddDirection(new Point(Math.cos(angle), Math.sin(angle)), this.BorderPolyline, this._visibilityGraph)
      }
    } else {
      this.HandleBideractionalCase()
    }
  }

  HandleBideractionalCase() {
    const k: number = <number>(Math.PI / this.coneAngle)
    for (let i = 0; i < k; i++) {
      const angle = i * this.coneAngle
      const vg0 = new VisibilityGraph()
      this.AddDirection(new Point(Math.cos(angle), Math.sin(angle)), this.BorderPolyline, vg0)
      const vg1 = new VisibilityGraph()
      this.AddDirection(new Point(Math.cos(angle) * -1, Math.sin(angle) * -1), this.BorderPolyline, vg1)
      this.AddIntersectionOfBothDirectionSweepsToTheResult(vg0, vg1)
    }
  }

  AddIntersectionOfBothDirectionSweepsToTheResult(vg0: VisibilityGraph, vg1: VisibilityGraph) {
    for (const edge of vg0.Edges) {
      if (vg1.FindEdgePP(edge.SourcePoint, edge.TargetPoint) != null) {
        this._visibilityGraph.AddEdgePP(edge.SourcePoint, edge.TargetPoint)
      }
    }
  }

  AddDirection(direction: Point, borderPolyline: Polyline, visibilityGraph: VisibilityGraph) {
    LineSweeper.Sweep(this._obstacles, direction, this.coneAngle, visibilityGraph, this.Ports, borderPolyline)
  }
}
