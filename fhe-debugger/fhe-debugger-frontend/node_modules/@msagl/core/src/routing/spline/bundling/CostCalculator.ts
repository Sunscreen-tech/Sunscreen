import {Point} from '../../..'
import {Polyline} from '../../../math/geometry'
import {BundlingSettings} from '../../BundlingSettings'
import {HubRadiiCalculator} from './HubRadiiCalculator'
import {GreaterOrEqual, MetroGraphData} from './MetroGraphData'
import {Station} from './Station'

// Calculates the cost of the routing
export class CostCalculator {
  static Inf = 1000000000

  metroGraphData: MetroGraphData

  bundlingSettings: BundlingSettings

  constructor(metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings) {
    this.metroGraphData = metroGraphData
    this.bundlingSettings = bundlingSettings
  }

  // Error of ink
  static InkError(oldInk: number, newInk: number, bundlingSettings: BundlingSettings): number {
    return (oldInk - newInk) * bundlingSettings.InkImportance
  }

  // Error of path lengths
  static PathLengthsError(oldLength: number, newLength: number, idealLength: number, bundlingSettings: BundlingSettings): number {
    return (oldLength - newLength) * (bundlingSettings.PathLengthImportance / idealLength)
  }

  // Error of hubs
  static RError(idealR: number, nowR: number, bundlingSettings: BundlingSettings): number {
    if (idealR <= nowR) {
      return 0
    }

    const res: number = bundlingSettings.HubRepulsionImportance * ((1 - nowR / idealR) * (idealR - nowR))
    return res
  }

  // Error of bundles
  static BundleError(idealWidth: number, nowWidth: number, bundlingSettings: BundlingSettings): number {
    if (idealWidth <= nowWidth) {
      return 0
    }

    const res: number = bundlingSettings.BundleRepulsionImportance * ((1 - nowWidth / idealWidth) * (idealWidth - nowWidth))
    return res
  }

  // Cost of the whole graph
  static Cost(metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings): number {
    let cost = bundlingSettings.InkImportance * metroGraphData.Ink
    //path lengths
    for (const metroline of metroGraphData.Metrolines) {
      cost += (bundlingSettings.PathLengthImportance * metroline.Length) / metroline.IdealLength
    }

    cost += this.CostOfForces(metroGraphData)

    return cost
  }

  // Cost of the whole graph (hubs and bundles)
  static CostOfForces(metroGraphData: MetroGraphData): number {
    let cost = 0
    // hubs
    for (const v of metroGraphData.VirtualStations()) {
      cost = cost + v.cachedRadiusCost
    }
    // bundles
    for (const edge of metroGraphData.VirtualEdges()) {
      const v = edge[0]
      const u = edge[1]
      cost += metroGraphData.GetIjInfo(v, u).cachedBundleCost
    }
    return cost
  }

  // Gain of ink
  InkGain(node: Station, newPosition: Point): number {
    // ink
    const oldInk: number = this.metroGraphData.Ink
    let newInk: number = this.metroGraphData.Ink
    for (const adj of node.Neighbors) {
      const adjPosition: Point = adj.Position
      newInk -= adjPosition.sub(node.Position).length
      newInk += adjPosition.sub(newPosition).length
    }
    return CostCalculator.InkError(oldInk, newInk, this.bundlingSettings)
  }

  // Gain of path lengths
  PathLengthsGain(node: Station, newPosition: Point): number {
    let gain = 0
    //edge lengths
    for (const e of this.metroGraphData.MetroNodeInfosOfNode(node)) {
      const oldLength = e.Metroline.Length

      const prev = e.PolyPoint.prev.point
      const next = e.PolyPoint.next.point

      const newLength =
        e.Metroline.Length +
        next.sub(newPosition).length +
        prev.sub(newPosition).length -
        next.sub(node.Position).length -
        prev.sub(node.Position).length

      gain += CostCalculator.PathLengthsError(oldLength, newLength, e.Metroline.IdealLength, this.bundlingSettings)
    }

    return gain
  }

  // Gain of radii
  RadiusGain(node: Station, newPosition: Point): number {
    let gain = 0
    gain = gain + node.cachedRadiusCost
    gain = gain - this.RadiusCost(node, newPosition)
    return gain
  }

  RadiusCost(node: Station, newPosition: Point): number {
    let idealR: number
    if (Point.closeDistEps(node.Position, newPosition)) {
      idealR = node.cachedIdealRadius
    } else {
      idealR = HubRadiiCalculator.CalculateIdealHubRadiusWithNeighborsMBNP(this.metroGraphData, this.bundlingSettings, node, newPosition)
    }

    const t: {touchedObstacles: Array<[Polyline, Point]>} = {touchedObstacles: []}
    if (!this.metroGraphData.looseIntersections.HubAvoidsObstaclesSPNBA(node, newPosition, idealR, t)) {
      return CostCalculator.Inf
    }

    let cost = 0
    for (const d of t.touchedObstacles) {
      const dist = d[1].sub(newPosition).length
      cost += CostCalculator.RError(idealR, dist, this.bundlingSettings)
    }

    return cost
  }

  // Gain of bundles
  // if a newPosition is not valid (e.g. intersect obstacles) the result is -inf
  BundleGain(node: Station, newPosition: Point): number {
    let gain = node.cachedBundleCost
    for (const adj of node.Neighbors) {
      const lgain = this.BundleCost(node, adj, newPosition)
      if (GreaterOrEqual(lgain, CostCalculator.Inf)) return -CostCalculator.Inf
      gain -= lgain
    }

    return gain
  }

  BundleCost(node: Station, adj: Station, newPosition: Point): number {
    const idealWidth = this.metroGraphData.GetWidthSSN(node, adj, this.bundlingSettings.EdgeSeparation)

    const t: {closestDist: Array<[Point, Point]>} = {closestDist: []}
    //find conflicting obstacles
    if (!this.metroGraphData.cdtIntersections.BundleAvoidsObstacles(node, adj, newPosition, adj.Position, idealWidth, t)) {
      return CostCalculator.Inf
    }
    let cost = 0

    for (const pair of t.closestDist) {
      const dist = pair[0].sub(pair[1]).length
      cost += CostCalculator.BundleError(idealWidth / 2, dist, this.bundlingSettings)
    }

    return cost
  }
}
