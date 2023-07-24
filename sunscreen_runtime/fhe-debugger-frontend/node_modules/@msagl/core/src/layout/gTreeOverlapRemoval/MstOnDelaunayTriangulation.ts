import {MinimumSpanningTreeByPrim} from '../../math/graphAlgorithms/MinimumSpanningTreeByPrim'
import {Cdt} from '../../routing/ConstrainedDelaunayTriangulation/Cdt'
import {CdtEdge} from '../../routing/ConstrainedDelaunayTriangulation/CdtEdge'
import {CdtSite} from '../../routing/ConstrainedDelaunayTriangulation/CdtSite'
import {mkGraphOnEdgesArray, mkGraphOnEdgesN} from '../../structs/basicGraphOnEdges'
import {IntPair} from '../../utils/IntPair'
import {IntPairMap} from '../../utils/IntPairMap'

export type MstEdge = {
  source: number
  target: number
  overlapFactor: number
  idealDistance: number
  weight: number
}

// Computes the minimum spanning tree on a triangulation or on a set of edges given by a list of tuples
export class MstOnDelaunayTriangulation {
  // Computes the minimum spanning tree on a set of edges
  static GetMst(proximityEdges: Array<MstEdge>, size: number): Array<MstEdge> {
    if (proximityEdges.length === 0) {
      return null
    }

    const intPairs = proximityEdges.map((t) => new IntPair(t.source, t.target))
    const n = intPairs.reduce((a, t) => Math.max(a, Math.max(t.x, t.y)), 0)
    const weighting = new IntPairMap<MstEdge>(n + 1)
    for (let i = 0; i < proximityEdges.length; i++) {
      weighting.setPair(intPairs[i], proximityEdges[i])
    }

    const graph = mkGraphOnEdgesN<IntPair>(intPairs, size)

    const mstOnBasicGraph = new MinimumSpanningTreeByPrim(
      graph,
      (intPair) => weighting.get(intPair.source, intPair.target).weight,
      intPairs[0].source,
    )

    return mstOnBasicGraph.GetTreeEdges().map((e) => weighting.get(e.source, e.target))
  }

  // Computes the minimum spanning tree on a DT with given weights.
  static GetMstOnCdt(cdt: Cdt, weights: (e: CdtEdge) => number): CdtEdge[] {
    const siteArray = Array.from(cdt.PointsToSites.values())
    const siteIndex = new Map<CdtSite, number>()
    for (let i = 0; i < siteArray.length; i++) {
      siteIndex.set(siteArray[i], i)
    }

    const intPairsToCdtEdges: IntPairMap<CdtEdge> = MstOnDelaunayTriangulation.GetEdges(siteArray, siteIndex)
    const graph = mkGraphOnEdgesArray(Array.from(intPairsToCdtEdges.keys()))
    const mstOnBasicGraph = new MinimumSpanningTreeByPrim(graph, (e) => weights(intPairsToCdtEdges.get(e.source, e.target)), 0)
    return mstOnBasicGraph.GetTreeEdges().map((e) => intPairsToCdtEdges.get(e.source, e.target))
  }

  static GetEdges(siteArray: CdtSite[], siteIndex: Map<CdtSite, number>): IntPairMap<CdtEdge> {
    const d = new IntPairMap<CdtEdge>(siteArray.length)
    for (let i = 0; i < siteArray.length; i++) {
      const site = siteArray[i]
      const sourceIndex = siteIndex.get(site)
      for (const e of site.Edges) {
        d.set(sourceIndex, siteIndex.get(e.lowerSite), e)
      }
    }

    return d
  }

  //
}
