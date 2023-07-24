import {Point} from '../../..'
import {GeomConstants} from '../../../math/geometry'
import {GenericBinaryHeapPriorityQueue} from '../../../structs/genericBinaryHeapPriorityQueue'
import {compareNumbers} from '../../../utils/compare'
import {BundlingSettings} from '../../BundlingSettings'
import {MetroGraphData} from './MetroGraphData'
import {Station} from './Station'

// Calculates node radii with 'water algorithm'
export class HubRadiiCalculator {
  // bundle data
  metroGraphData: MetroGraphData

  // Algorithm settings
  bundlingSettings: BundlingSettings

  constructor(metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings) {
    this.metroGraphData = metroGraphData
    this.bundlingSettings = bundlingSettings
  }

  // calculate node radii with fixed hubs
  CreateNodeRadii() {
    // set radii to zero
    for (const v of this.metroGraphData.VirtualStations()) {
      v.Radius = 0
      v.cachedIdealRadius = HubRadiiCalculator.CalculateIdealHubRadiusWithNeighborsMBS(this.metroGraphData, this.bundlingSettings, v)
    }
    // TimeMeasurer.DebugOutput("Initial cost of radii: " + Cost());
    this.GrowHubs(false)
    // maximally use free space
    this.GrowHubs(true)
    // TimeMeasurer.DebugOutput("Optimized cost of radii: " + Cost());
    // ensure radii are not zero
    for (const v of this.metroGraphData.VirtualStations()) {
      v.Radius = Math.max(v.Radius, this.bundlingSettings.MinHubRadius)
    }
  }

  // Grow hubs
  GrowHubs(useHalfEdgesAsIdealR: boolean): boolean {
    const queue = new GenericBinaryHeapPriorityQueue<Station>(compareNumbers)
    for (const v of this.metroGraphData.VirtualStations()) {
      queue.Enqueue(v, -this.CalculatePotential(v, useHalfEdgesAsIdealR))
    }
    let progress = false
    // choose a hub with the greatest potential
    while (!queue.IsEmpty()) {
      const t = {priority: 0}
      const v: Station = queue.DequeueAndGetPriority(t)
      if (t.priority >= 0) {
        break
      }

      // grow the hub
      if (this.TryGrowHub(v, useHalfEdgesAsIdealR)) {
        queue.Enqueue(v, -this.CalculatePotential(v, useHalfEdgesAsIdealR))
        progress = true
      }
    }

    return progress
  }

  TryGrowHub(v: Station, useHalfEdgesAsIdealR: boolean): boolean {
    const allowedRadius = this.CalculateAllowedHubRadius(v)
    //Debug.Assert(allowedRadius > 0);
    if (v.Radius >= allowedRadius) return false
    const idealR = useHalfEdgesAsIdealR
      ? HubRadiiCalculator.CalculateIdealHubRadiusWithAdjacentEdges(this.bundlingSettings, v)
      : v.cachedIdealRadius

    //Debug.Assert(idealR > 0);
    if (v.Radius >= idealR) return false
    const step = 0.05
    let delta = step * (idealR - v.Radius)
    if (delta < 1.0) delta = 1.0

    const newR = Math.min(v.Radius + delta, allowedRadius)
    if (newR <= v.Radius) return false

    v.Radius = newR
    return true
  }

  CalculatePotential(v: Station, useHalfEdgesAsIdealR: boolean): number {
    const idealR: number = useHalfEdgesAsIdealR
      ? HubRadiiCalculator.CalculateIdealHubRadiusWithAdjacentEdges(this.bundlingSettings, v)
      : v.cachedIdealRadius
    if (idealR <= v.Radius) {
      return 0
    }

    return (idealR - v.Radius) / idealR
  }

  // Returns the maximal possible radius of the node
  CalculateAllowedHubRadius(node: Station): number {
    let r = this.bundlingSettings.MaxHubRadius

    //adjacent nodes
    for (const adj of node.Neighbors) {
      const dist = adj.Position.sub(node.Position).length
      //Debug.Assert(dist - 0.05 * (node.Radius + adj.Radius) + 1 >= node.Radius + adj.Radius);
      r = Math.min(r, dist / 1.05 - adj.Radius)
    }
    //TODO: still we can have two intersecting hubs for not adjacent nodes

    //obstacles
    const minimalDistance = this.metroGraphData.tightIntersections.GetMinimalDistanceToObstacles(node, node.Position, r)
    if (minimalDistance < r) r = minimalDistance - 0.001

    return Math.max(r, 0.1)
  }

  // Returns the ideal radius of the hub
  static CalculateIdealHubRadius(metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings, node: Station): number {
    let r = 1.0
    for (const adj of node.Neighbors) {
      const width = metroGraphData.GetWidthSSN(adj, node, bundlingSettings.EdgeSeparation)
      const nr = width / 2.0 + bundlingSettings.EdgeSeparation
      r = Math.max(r, nr)
    }

    r = Math.min(r, 2 * bundlingSettings.MaxHubRadius)
    return r
  }

  // Returns the ideal radius of the hub
  static CalculateIdealHubRadiusWithNeighborsMBS(
    metroGraphData: MetroGraphData,
    bundlingSettings: BundlingSettings,
    node: Station,
  ): number {
    return HubRadiiCalculator.CalculateIdealHubRadiusWithNeighborsMBNP(metroGraphData, bundlingSettings, node, node.Position)
  }

  // Returns the ideal radius of the hub
  static CalculateIdealHubRadiusWithNeighborsMBNP(
    metroGraphData: MetroGraphData,
    bundlingSettings: BundlingSettings,
    node: Station,
    newPosition: Point,
  ): number {
    let r: number = HubRadiiCalculator.CalculateIdealHubRadius(metroGraphData, bundlingSettings, node)
    if (node.Neighbors.length > 1) {
      const adjNodes: Station[] = node.Neighbors
      // there must be enough space between neighbor bundles
      for (let i = 0; i < adjNodes.length; i++) {
        const adj: Station = adjNodes[i]
        const nextAdj: Station = adjNodes[(i + 1) % adjNodes.length]
        r = Math.max(
          r,
          HubRadiiCalculator.GetMinRadiusForTwoAdjacentBundles(r, node, newPosition, adj, nextAdj, metroGraphData, bundlingSettings),
        )
      }
    }

    r = Math.min(r, 2 * bundlingSettings.MaxHubRadius)
    return r
  }

  // Returns the ideal radius of the hub
  static CalculateIdealHubRadiusWithAdjacentEdges(bundlingSettings: BundlingSettings, node: Station): number {
    let r: number = bundlingSettings.MaxHubRadius
    for (const adj of node.Neighbors) r = Math.min(r, node.Position.sub(adj.Position).length / 2)
    return r
  }

  static GetMinRadiusForTwoAdjacentBundles(
    r: number,
    node: Station,
    nodePosition: Point,
    adj0: Station,
    adj1: Station,
    metroGraphData: MetroGraphData,
    bundlingSettings: BundlingSettings,
  ): number {
    const w0: number = metroGraphData.GetWidthSSN(node, adj0, bundlingSettings.EdgeSeparation)
    const w1: number = metroGraphData.GetWidthSSN(node, adj1, bundlingSettings.EdgeSeparation)
    return HubRadiiCalculator.GetMinRadiusForTwoAdjacentBundlesNPPPNNB(
      r,
      nodePosition,
      adj0.Position,
      adj1.Position,
      w0,
      w1,
      bundlingSettings,
    )
  }

  // Radius we need to draw to separate adjacent bundles ab and ac
  static GetMinRadiusForTwoAdjacentBundlesNPPPNNB(
    r: number,
    a: Point,
    b: Point,
    c: Point,
    widthAB: number,
    widthAC: number,
    bundlingSettings: BundlingSettings,
  ): number {
    if (widthAB < GeomConstants.distanceEpsilon || widthAC < GeomConstants.distanceEpsilon) {
      return r
    }

    let angle: number = Point.anglePCP(b, a, c)
    angle = Math.min(angle, Math.PI * 2 - angle)
    if (angle < GeomConstants.distanceEpsilon) {
      return 2 * bundlingSettings.MaxHubRadius
    }

    if (angle >= Math.PI / 2) {
      return r * 1.05
    }

    // find the intersection point of two bundles
    const sina: number = Math.sin(angle)
    const cosa: number = Math.cos(angle)
    const aa: number = widthAB / (4 * sina)
    const bb: number = widthAC / (4 * sina)
    let d: number = 2 * Math.sqrt(aa * aa + (bb * bb + 2 * (aa * (bb * cosa))))
    d = Math.min(d, 2 * bundlingSettings.MaxHubRadius)
    d = Math.max(d, r)
    return d
  }
}
