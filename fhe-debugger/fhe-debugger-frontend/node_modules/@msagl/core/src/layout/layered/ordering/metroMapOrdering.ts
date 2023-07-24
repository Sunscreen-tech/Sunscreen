// Following "Improving Layered Graph Layouts with Edge Bundling" and
// "Two polynomial time algorithms for the bundle-Line crossing minimization problem"
// Postprocessing minimizing crossings step that works on the layered graph

import {Point} from '../../../math/geometry/point'

import {compareNumbers} from '../../../utils/compare'
import {PointMap} from '../../../utils/PointMap'
import {LayerArrays, layersAreCorrect} from '../LayerArrays'
import {ProperLayeredGraph} from '../ProperLayeredGraph'

export class MetroMapOrdering {
  layerArrays: LayerArrays
  nodePositions: Map<number, Point>
  properLayeredGraph: ProperLayeredGraph

  constructor(properLayeredGraph: ProperLayeredGraph, layerArrays: LayerArrays, nodePositions: Map<number, Point>) {
    this.properLayeredGraph = properLayeredGraph
    this.layerArrays = layerArrays
    this.nodePositions = nodePositions
  }

  // Reorder only points having identical nodePositions

  static UpdateLayerArrays0(properLayeredGraph: ProperLayeredGraph, layerArrays: LayerArrays, nodePositions: Map<number, Point>) {
    new MetroMapOrdering(properLayeredGraph, layerArrays, nodePositions).UpdateLayerArrays()
  }

  // Reorder virtual nodes between the same pair of real nodes

  static UpdateLayerArrays1(properLayeredGraph: ProperLayeredGraph, layerArrays: LayerArrays) {
    /*Assert.assert(layersAreCorrect(layerArrays))*/
    const nodePositions = MetroMapOrdering.BuildInitialNodePositions(properLayeredGraph, layerArrays)
    /*Assert.assert(layersAreCorrect(layerArrays))*/
    this.UpdateLayerArrays0(properLayeredGraph, layerArrays, nodePositions)
    /*Assert.assert(layersAreCorrect(layerArrays))*/
  }

  static BuildInitialNodePositions(properLayeredGraph: ProperLayeredGraph, layerArrays: LayerArrays): Map<number, Point> {
    const result = new Map<number, Point>()
    for (let i = 0; i < layerArrays.Layers.length; i++) {
      let curr = 0
      let prev = 0
      while (curr < layerArrays.Layers[i].length) {
        while (curr < layerArrays.Layers[i].length && properLayeredGraph.IsVirtualNode(layerArrays.Layers[i][curr])) {
          curr++
        }

        for (let j: number = prev; j < curr; j++) {
          result.set(layerArrays.Layers[i][j], new Point(i, prev))
        }

        if (curr < layerArrays.Layers[i].length) {
          result.set(layerArrays.Layers[i][curr], new Point(i, curr))
        }

        curr++
        prev = curr
      }
    }

    return result
  }

  UpdateLayerArrays() {
    // algo stuff here
    let ordering: PointMap<Array<number>> = this.CreateInitialOrdering()
    ordering = this.BuildOrdering(ordering)
    this.RestoreLayerArrays(ordering)
  }

  CreateInitialOrdering(): PointMap<Array<number>> {
    const initialOrdering = new PointMap<Array<number>>()
    for (const layer of this.layerArrays.Layers) {
      for (const node of layer) {
        const p = this.nodePositions.get(node)
        if (!initialOrdering.hasxy(p.x, p.y)) {
          initialOrdering.setxy(p.x, p.y, [])
        }
        initialOrdering.getxy(p.x, p.y).push(node)
      }
    }
    return initialOrdering
  }

  BuildOrdering(initialOrdering: PointMap<Array<number>>): PointMap<Array<number>> {
    // run through nodes points and build order
    const result = new PointMap<Array<number>>()
    const inverseOrder = new Map<number, number>()
    for (const layer of this.layerArrays.Layers) {
      for (const node of layer) {
        // already processed
        const p = this.nodePositions.get(node)
        if (result.hasxy(p.x, p.y)) {
          continue
        }

        this.BuildNodeOrdering(initialOrdering.get(p), inverseOrder)
        result.set(p, initialOrdering.get(p))
      }
    }

    return result
  }

  BuildNodeOrdering(result: Array<number>, inverseToOrder: Map<number, number>) {
    result.sort(this.Comparison(inverseToOrder))
    for (let i = 0; i < result.length; i++) {
      inverseToOrder.set(result[i], i)
    }
  }

  firstSucc(node: number): number {
    for (const s of this.properLayeredGraph.Succ(node)) {
      return s
    }
  }
  firstPred(node: number): number {
    for (const s of this.properLayeredGraph.Pred(node)) {
      return s
    }
  }

  Comparison(inverseToOrder: Map<number, number>) {
    return (node1: number, node2: number) => {
      /*Assert.assert(
        this.properLayeredGraph.IsVirtualNode(node1) &&
          this.properLayeredGraph.IsVirtualNode(node2),
      )*/
      const succ1: number = this.firstSucc(node1)
      const succ2: number = this.firstSucc(node2)
      let pred1: number = this.firstPred(node1)
      let pred2: number = this.firstPred(node2)
      const succPoint1: Point = this.nodePositions.get(succ1)
      const succPoint2: Point = this.nodePositions.get(succ2)
      const predPoint1: Point = this.nodePositions.get(pred1)
      const predPoint2: Point = this.nodePositions.get(pred2)
      if (!succPoint1.equal(succPoint2)) {
        if (!predPoint1.equal(predPoint2)) {
          return predPoint1.compareTo(predPoint2)
        }

        return succPoint1.compareTo(succPoint2)
      }

      if (this.properLayeredGraph.IsVirtualNode(succ1)) {
        if (!predPoint1.equal(predPoint2)) {
          return predPoint1.compareTo(predPoint2)
        }

        const o1: number = inverseToOrder.get(succ1)
        const o2: number = inverseToOrder.get(succ2)
        /*Assert.assert(o1 !== -1 && o2 !== -1)*/
        return compareNumbers(o1, o2)
      }

      while (this.nodePositions.get(pred1).equal(this.nodePositions.get(pred2)) && this.properLayeredGraph.IsVirtualNode(pred1)) {
        pred1 = this.firstPred(pred1)
        pred2 = this.firstPred(pred2)
      }

      if (this.nodePositions.get(pred1).equal(this.nodePositions.get(pred2))) {
        return compareNumbers(node1, node2)
      }

      return this.nodePositions.get(pred1).compareTo(this.nodePositions.get(pred2))
    }
  }

  RestoreLayerArrays(ordering: PointMap<Array<number>>) {
    for (const layer of this.layerArrays.Layers) {
      let tec = 0
      let pred = 0
      while (tec < layer.length) {
        while (tec < layer.length && this.nodePositions.get(layer[pred]).equal(this.nodePositions.get(layer[tec]))) {
          tec++
        }

        const t = ordering.get(this.nodePositions.get(layer[pred]))
        for (let j = pred; j < tec; j++) {
          layer[j] = t[j - pred]
        }

        pred = tec
      }
    }

    this.layerArrays.UpdateXFromLayers()
  }
}
