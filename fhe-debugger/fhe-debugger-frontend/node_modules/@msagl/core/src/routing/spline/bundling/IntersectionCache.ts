import {Point} from '../../..'
import {HitTestBehavior} from '../../../math/geometry/RTree/hitTestBehavior'
import {RectangleNode} from '../../../math/geometry/RTree/rectangleNode'
import {BundlingSettings} from '../../BundlingSettings'
import {Cdt} from '../../ConstrainedDelaunayTriangulation/Cdt'
import {CdtTriangle} from '../../ConstrainedDelaunayTriangulation/CdtTriangle'
import {CostCalculator} from './CostCalculator'
import {HubRadiiCalculator} from './HubRadiiCalculator'
import {MetroGraphData} from './MetroGraphData'
import {Station} from './Station'

// Stores intersections between edges, hubs, and obstacles to speed up simulated annealing
export class IntersectionCache {
  metroGraphData: MetroGraphData

  bundlingSettings: BundlingSettings

  costCalculator: CostCalculator

  cdt: Cdt

  public constructor(metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings, costCalculator: CostCalculator, cdt: Cdt) {
    this.metroGraphData = metroGraphData
    this.bundlingSettings = bundlingSettings
    this.costCalculator = costCalculator
    this.cdt = cdt
  }

  InitializeCostCache() {
    for (const v of this.metroGraphData.VirtualStations()) {
      v.cachedIdealRadius = HubRadiiCalculator.CalculateIdealHubRadiusWithNeighborsMBS(this.metroGraphData, this.bundlingSettings, v)
      v.cachedRadiusCost = this.costCalculator.RadiusCost(v, v.Position)
      v.cachedBundleCost = 0
    }

    for (const edge of this.metroGraphData.VirtualEdges()) {
      const v = edge[0]
      const u = edge[1]
      const edgeInfo = this.metroGraphData.GetIjInfo(v, u)
      edgeInfo.cachedBundleCost = this.costCalculator.BundleCost(v, u, v.Position)
      v.cachedBundleCost += edgeInfo.cachedBundleCost
      u.cachedBundleCost += edgeInfo.cachedBundleCost
    }
  }

  UpdateCostCache(node: Station) {
    const cdtTree: RectangleNode<CdtTriangle, Point> = this.cdt.getRectangleNodeOnTriangles()
    node.cdtTriangle = cdtTree.FirstHitNodeWithPredicate(node.Position, IntersectionCache.testPointInside).UserData
    node.cachedIdealRadius = HubRadiiCalculator.CalculateIdealHubRadiusWithNeighborsMBS(this.metroGraphData, this.bundlingSettings, node)
    node.cachedRadiusCost = this.costCalculator.RadiusCost(node, node.Position)
    node.cachedBundleCost = 0

    for (const adj of node.Neighbors) {
      if (!adj.IsReal) {
        adj.cachedIdealRadius = HubRadiiCalculator.CalculateIdealHubRadiusWithNeighborsMBS(this.metroGraphData, this.bundlingSettings, adj)
        adj.cachedRadiusCost = this.costCalculator.RadiusCost(adj, adj.Position)
      }

      const edgeInfo = this.metroGraphData.GetIjInfo(node, adj)
      adj.cachedBundleCost -= edgeInfo.cachedBundleCost

      edgeInfo.cachedBundleCost = this.costCalculator.BundleCost(node, adj, node.Position)
      node.cachedBundleCost += edgeInfo.cachedBundleCost
      adj.cachedBundleCost += edgeInfo.cachedBundleCost
    }
  }

  static testPointInside(pnt: Point, t: CdtTriangle): HitTestBehavior {
    return Cdt.PointIsInsideOfTriangle(pnt, t) ? HitTestBehavior.Stop : HitTestBehavior.Continue
  }
}
