// Adjust current bundle-routing

import {Point} from '../../..'
import {Curve, CurveFactory, LineSegment, PointLocation, Polyline, Rectangle} from '../../../math/geometry'
import {DebugCurve} from '../../../math/geometry/debugCurve'

import {PointSet} from '../../../utils/PointSet'
import {random} from '../../../utils/random'
import {setsAreEqual, uniteSets} from '../../../utils/setOperations'
import {BundlingSettings} from '../../BundlingSettings'
import {CostCalculator} from './CostCalculator'
import {EdgeNudger} from './EdgeNudger'
import {IntersectionCache} from './IntersectionCache'
import {Intersections} from './Intersections'
import {MetroGraphData} from './MetroGraphData'
import {Station} from './Station'

export class SimulatedAnnealing {
  // bundle data

  metroGraphData: MetroGraphData

  // Algorithm settings

  bundlingSettings: BundlingSettings

  //  calculates rouing cost
  costCalculator: CostCalculator

  //  used for fast calculation of intersections
  cache: IntersectionCache

  // fix routing by simulated annealing algorithm

  static FixRouting(metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings): boolean {
    return this.FixRoutingMBP(metroGraphData, bundlingSettings, null)
  }

  static FixRoutingMBP(metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings, changedPoints: PointSet): boolean {
    return new SimulatedAnnealing(metroGraphData, bundlingSettings).FixRoutingP(changedPoints)
  }

  constructor(metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings) {
    this.metroGraphData = metroGraphData
    this.bundlingSettings = bundlingSettings
    this.costCalculator = new CostCalculator(this.metroGraphData, this.bundlingSettings)
    this.cache = new IntersectionCache(this.metroGraphData, this.bundlingSettings, this.costCalculator, this.metroGraphData.cdt)
  }

  static MaxIterations = 100

  static MaxStep = 50

  static MinStep = 1

  static MinRelativeChange = 0.0005

  stationsForOptimizations: Set<Station>

  // Use constraint edge routing to reduce ink

  FixRoutingP(changedPoints: PointSet): boolean {
    //Assert.assert(SimulatedAnnealing.stationsArePositionedCorrectly(this.metroGraphData))

    this.stationsForOptimizations = this.GetStationsForOptimizations(changedPoints)
    this.cache.InitializeCostCache()
    let step: number = SimulatedAnnealing.MaxStep
    let energy: number = Number.POSITIVE_INFINITY
    let x: Array<Point> = this.metroGraphData.VirtualStations().map((v) => v.Position)
    let iteration = 0
    while (iteration++ < SimulatedAnnealing.MaxIterations) {
      const coordinatesChanged = this.TryMoveStations()
      //TimeMeasurer.DebugOutput("  #iter = " + iteration + " moved: " + cnt + "/" + metroGraphData.VirtualNodes().Count() + " step: " + step);

      if (iteration <= 1 && !coordinatesChanged) return false
      if (!coordinatesChanged) break

      const oldEnergy = energy
      energy = CostCalculator.Cost(this.metroGraphData, this.bundlingSettings)
      //TimeMeasurer.DebugOutput("energy: " + energy);

      step = this.UpdateMaxStep(step, oldEnergy, energy)
      const oldX: Array<Point> = x
      x = this.metroGraphData.VirtualStations().map((v) => v.Position)
      if (step < SimulatedAnnealing.MinStep || this.Converged(step, oldX, x)) {
        break
      }
    }

    // TimeMeasurer.DebugOutput("SA completed after " + iteration + " iterations");
    return true
  }

  static stationsArePositionedCorrectly(metroGraphData: MetroGraphData): boolean {
    for (const e of metroGraphData.VirtualEdges()) {
      if (!this.edgeIsPositionedCorrectly(e, metroGraphData)) return false
    }
    return true
  }

  static edgeIsPositionedCorrectly(e: [Station, Station], metroGraphData: MetroGraphData): boolean {
    const u = e[0]
    const v = e[1]
    const allowedToIntersect = metroGraphData.looseIntersections.ObstaclesToIgnoreForBundle(u, v)

    const ls = LineSegment.mkPP(u.Position, v.Position)
    const intersected = Array.from(metroGraphData.looseIntersections.obstacleTree.GetNodeItemsIntersectingRectangle(ls.boundingBox))
      .filter((poly) => !allowedToIntersect.has(poly))
      .filter((poly) => Curve.CurvesIntersect(ls, poly))
    if (intersected.length > 0) {
      EdgeNudger.ShowHubs(
        metroGraphData,
        null,
        null,
        './tmp/badcross.svg',
        [
          DebugCurve.mkDebugCurveTWCI(200, 1, 'Brown', ls),
          DebugCurve.mkDebugCurveTWCI(200, 1, 'Red', CurveFactory.mkCircle(2, u.Position)),
          DebugCurve.mkDebugCurveTWCI(200, 1, 'Blue', CurveFactory.mkCircle(5, v.Position)),
          DebugCurve.mkDebugCurveTWCI(100, 1, 'Blue', CurveFactory.mkCircle(5, v.Position)),
        ].concat(intersected.map((p) => DebugCurve.mkDebugCurveTWCI(100, 1, 'Pink', p))),
      )
      return false
    } else {
      return true
    }
  }

  GetStationsForOptimizations(changedPoints: PointSet): Set<Station> {
    if (changedPoints == null) {
      return new Set<Station>(this.metroGraphData.VirtualStations())
    } else {
      const result: Set<Station> = new Set<Station>()
      for (const p of changedPoints) {
        const s = this.metroGraphData.PointToStations.get(p)
        if (s && !s.IsReal) result.add(s)
      }
      return result
    }
  }

  // stop SA if relative changes are small

  Converged(step: number, oldx: Array<Point>, newx: Array<Point>): boolean {
    // return false;
    let den = 0
    let num = 0
    for (let i = 0; i < oldx.length; i++) {
      num += oldx[i].sub(newx[i]).lengthSquared
      den += oldx[i].lengthSquared
    }

    const res: number = Math.sqrt(num / den)
    return res < SimulatedAnnealing.MinRelativeChange
  }

  stepsWithProgress = 0

  UpdateMaxStep(step: number, oldEnergy: number, newEnergy: number): number {
    // cooling factor
    const T = 0.8
    if (newEnergy + 1 < oldEnergy) {
      this.stepsWithProgress++
      if (this.stepsWithProgress >= 5) {
        this.stepsWithProgress = 0
        step = Math.min(SimulatedAnnealing.MaxStep, step / T)
      }
    } else {
      this.stepsWithProgress = 0
      step *= T
    }

    return step
  }

  TryMoveStations(): boolean {
    let coordinatesChanged = false
    const movedStations: Set<Station> = new Set<Station>()
    // for (var node of metroGraphData.VirtualNodes()) {
    for (const node of this.stationsForOptimizations) {
      if (this.TryMoveStation(node)) {
        //Assert.assert(this.stationsForOptimizations.has(node))
        coordinatesChanged = true
        movedStations.add(node)
        for (const adj of node.Neighbors) {
          if (!adj.IsReal) {
            movedStations.add(adj)
          }
        }
      }
    }
    this.stationsForOptimizations = movedStations
    return coordinatesChanged
  }

  /** 
    Move node to decrease the cost of the drawing
   Returns true iff position has changed
*/
  TryMoveStation(s: Station): boolean {
    let direction: Point = this.BuildDirection(s)
    if (direction.length === 0) {
      return false
    }

    let stepLength: number = this.BuildStepLength(s, direction)
    if (stepLength < SimulatedAnnealing.MinStep) {
      // try random direction
      direction = RandomPoint()
      stepLength = this.BuildStepLength(s, direction)
      if (stepLength < SimulatedAnnealing.MinStep) {
        return false
      }
    }

    const step: Point = direction.mul(stepLength)
    const newPosition: Point = s.Position.add(step)
    // can this happen?
    if (this.metroGraphData.PointToStations.has(newPosition)) {
      return false
    }

    if (!this.moveIsLegalForAdjacentBundles(s, newPosition)) {
      return false
    }

    this.metroGraphData.MoveNode(s, newPosition)

    this.cache.UpdateCostCache(s)
    return true
  }
  /** checking the node position and neigborhood bundles */
  moveIsLegalForAdjacentBundles(s: Station, sNewPosition: Point): boolean {
    for (const poly of this.metroGraphData.looseIntersections.obstacleTree.AllHitItems(
      Rectangle.mkOnPoints([sNewPosition]),
      (poly) => Curve.PointRelativeToCurveLocation(sNewPosition, poly) !== PointLocation.Outside,
    )) {
      if (s.getELP().has(poly) === false) {
        return false
      }
    }
    for (const t of s.Neighbors) {
      const obstaclesToIgnore = this.metroGraphData.looseIntersections.ObstaclesToIgnoreForBundle(t, s)
      if (!this.metroGraphData.cdtIntersections.EdgeIsLegal_(t.Position, sNewPosition, t.cdtTriangle, obstaclesToIgnore)) return false
    }
    return true
  }

  // Calculate the direction to improve the ink function

  BuildDirection(node: Station): Point {
    const forceInk = this.BuildForceForInk(node)
    const forcePL = this.BuildForceForPathLengths(node)
    const forceR = this.BuildForceForRadius(node)
    const forceBundle = this.BuildForceForBundle(node)
    const force = forceInk.add(forcePL.add(forceR.add(forceBundle)))
    if (force.length < 0.1) {
      return new Point(0, 0)
    }

    return force.normalize()
  }

  BuildStepLength(node: Station, direction: Point): number {
    let stepLength: number = SimulatedAnnealing.MinStep
    let costGain: number = this.CostGain(node, node.Position.add(direction.mul(stepLength)))
    if (costGain < 0.01) {
      return 0
    }

    while (2 * stepLength <= SimulatedAnnealing.MaxStep) {
      const newCostGain: number = this.CostGain(node, node.Position.add(direction.mul(stepLength * 2)))
      if (newCostGain <= costGain) {
        break
      }

      stepLength *= 2
      costGain = newCostGain
    }

    return stepLength
  }

  // Computes cost delta when moving the node
  // the cost will be negative if a new position overlaps obstacles

  CostGain(node: Station, newPosition: Point): number {
    const MInf = -12345678
    const rGain: number = this.costCalculator.RadiusGain(node, newPosition)
    if (rGain < MInf) {
      return MInf
    }

    const bundleGain: number = this.costCalculator.BundleGain(node, newPosition)
    if (bundleGain < MInf) {
      return MInf
    }

    const inkGain: number = this.costCalculator.InkGain(node, newPosition)
    const plGain: number = this.costCalculator.PathLengthsGain(node, newPosition)
    return rGain + inkGain + plGain + bundleGain
  }

  // force to decrease ink

  BuildForceForInk(node: Station): Point {
    //return new Point(0,0);
    let direction = new Point(0, 0)
    for (const adj of node.Neighbors) {
      const p = adj.Position.sub(node.Position)
      direction = direction.add(p.normalize())
    }

    //derivative
    const force = direction.mul(this.bundlingSettings.InkImportance)
    return force
  }

  // direction to decrease path lengths

  BuildForceForPathLengths(node: Station): Point {
    // return new Point(0,0);
    let direction = new Point(0, 0)
    for (const mni of this.metroGraphData.MetroNodeInfosOfNode(node)) {
      const metroline = mni.Metroline
      const u: Point = mni.PolyPoint.next.point
      const v: Point = mni.PolyPoint.prev.point
      const p1 = u.sub(node.Position)
      const p2 = v.sub(node.Position)
      direction = direction.add(p1.div(p1.length * metroline.IdealLength))
      direction = direction.add(p2.div(p2.length * metroline.IdealLength))
    }
    // derivative
    const force: Point = direction.mul(this.bundlingSettings.PathLengthImportance)
    return force
  }

  // direction to increase radii

  BuildForceForRadius(node: Station): Point {
    let direction: Point = new Point(0, 0)
    const idealR: number = node.cachedIdealRadius
    const t: {touchedObstacles: Array<[Polyline, Point]>} = {touchedObstacles: []}
    const res: boolean = this.metroGraphData.looseIntersections.HubAvoidsObstaclesSPNBA(node, node.Position, idealR, t)
    if (!res) {
      EdgeNudger.ShowHubs(this.metroGraphData, null, node, './tmp/hubs.svg', [
        DebugCurve.mkDebugCurveTWCI(255, 1, 'Brown', Intersections.containingPoly),
        DebugCurve.mkDebugCurveTWCI(100, 1, 'Blue', CurveFactory.mkCircle(idealR, node.Position)),
      ])
      throw new Error()
    }
    // throw new Error()
    //Assert.assert(res) // problem here
    for (const d of t.touchedObstacles) {
      const dist: number = d[1].sub(node.Position).length
      //Assert.assert(dist <= idealR)
      const lforce: number = 2 * (1 - dist / idealR)
      const dir: Point = node.Position.sub(d[1]).normalize()
      direction = direction.add(dir.mul(lforce))
    }
    // derivative
    const force: Point = direction.mul(this.bundlingSettings.HubRepulsionImportance)
    return force
  }
  /** calculates the direction to push a bundle away from obstacle*/
  BuildForceForBundle(station: Station): Point {
    let direction = new Point(0, 0)
    for (const adjStation of station.Neighbors) {
      const idealWidth = this.metroGraphData.GetWidthSSN(station, adjStation, this.bundlingSettings.EdgeSeparation)
      const t: {closestDist: Array<[Point, Point]>} = {closestDist: []}
      const res = this.metroGraphData.cdtIntersections.BundleAvoidsObstacles(
        station,
        adjStation,
        station.Position,
        adjStation.Position,
        idealWidth / 2,
        t,
      )
      if (!res && false) {
        EdgeNudger.ShowHubs(this.metroGraphData, null, station, './tmp/inside_forbid.svg', [
          DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Blue', LineSegment.mkPP(station.Position, adjStation.Position)),
          DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Red', CurveFactory.mkCircle(2, station.Position)),
          DebugCurve.mkDebugCurveTWCI(100, 0.2, 'Red', CurveFactory.mkCircle(3, adjStation.Position)),
        ])
      }
      //Assert.assert(res) //todo : still unsolved

      for (const d of t.closestDist) {
        const dist = d[0].sub(d[1]).length
        // Debug.//Assert(LessOrEqual(dist, idealWidth / 2));
        const lforce = 2.0 * (1.0 - dist / (idealWidth / 2))
        const dir = d[0].sub(d[1]).normalize().neg()
        direction = direction.add(dir.mul(lforce))
      }
    }

    //derivative
    const force = direction.mul(this.bundlingSettings.BundleRepulsionImportance)

    return force
  }
}
function RandomPoint(): Point {
  return new Point(1 + 2 * random(), 1 + 2 * random())
}
