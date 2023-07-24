// The implementation follows
// "Fast and Simple Horizontal Coordinate Assignment" of Ulrik Brandes and Boris K�opf
// The paper has two serious bugs that this code resolves.

import {TopologicalSort} from '../../math/graphAlgorithms/topologicalSort'
import {BasicGraphOnEdges, mkGraphOnEdgesN} from '../../structs/basicGraphOnEdges'
import {IntPair} from '../../utils/IntPair'
import {IntPairSet} from '../../utils/IntPairSet'
import {Anchor} from './anchor'
import {LayerArrays} from './LayerArrays'
import {LayerEdge} from './layerEdge'
import {PolyIntEdge} from './polyIntEdge'
import {ProperLayeredGraph} from './ProperLayeredGraph'

type MedianType = number | IntPair

export class XCoordsWithAlignment {
  la: LayerArrays

  graph: ProperLayeredGraph

  nOfOriginalVertices: number

  root: number[]

  align: number[]

  // int[] sink;
  // double[] shift;
  nOfVertices: number

  anchors: Anchor[]

  nodeSep: number

  lowMedians: MedianType[]

  upperMedians: MedianType[]

  // each element or int or IntPair
  markedEdges: IntPairSet

  h: number // number of layers

  // We pretend, when calculating the alignment, that we traverse layers from left to right and from bottom to top.
  // The actual directions are defined by variables "LR" and "BT".
  // from left to right
  LR: boolean

  // from bottom to top
  BT: boolean

  get CurrentEnumRightUp(): number {
    return (this.LR ? 0 : 1) + 2 * (this.BT ? 0 : 1)
  }

  // Returns true if v is a virtual vertex

  IsVirtual(v: number): boolean {
    return v >= this.nOfOriginalVertices
  }

  // four arrays for four different direction combinations
  xCoords = new Array<Array<number>>(4)

  x: number[]

  Source(edge: LayerEdge): number {
    return this.BT ? edge.Source : edge.Target
  }

  Target(edge: LayerEdge): number {
    return this.BT ? edge.Target : edge.Source
  }

  static CalculateXCoordinates(
    layerArrays: LayerArrays,
    layeredGraph: ProperLayeredGraph,
    nOfOriginalVs: number,
    anchors: Anchor[],
    nodeSeparation: number,
  ) {
    const x = new XCoordsWithAlignment(layerArrays, layeredGraph, nOfOriginalVs, anchors, nodeSeparation)
    x.Calculate()
  }

  Calculate() {
    this.SortInAndOutEdges()
    this.RightUpSetup()
    this.CalcBiasedAlignment()
    this.LeftUpSetup()
    this.CalcBiasedAlignment()
    this.RightDownSetup()
    this.CalcBiasedAlignment()
    this.LeftDownSetup()
    this.CalcBiasedAlignment()
    this.HorizontalBalancing()
  }

  // We need to find a median of a vertex neighbors from a specific layer. That is, if we have a vertex v and edges (v,coeff), (v,side1), (v,cornerC)
  // going down, and X[coeff]<X[side1]<X[cornerC], then side1 is the median.
  // There is an algorithm that finds the median with expected linear number of steps,
  // see for example http://www.ics.uci.edu/~eppstein/161/960125.html. However, I think we are better off
  // with sorting, since we are taking median at least twice.
  // Notice, that the sorting should be done only for original vertices since dummy vertices
  // have only one incoming edge and one outcoming edge.
  // Consider here reusing the sorting that comes from the ordering step,
  // if it is not broken by layer insertions.
  SortInAndOutEdges() {
    this.FillLowMedians()
    this.FillUpperMedins()
  }

  private FillUpperMedins() {
    this.upperMedians = new Array(this.graph.NodeCount)
    for (let i = 0; i < this.graph.NodeCount; i++) {
      this.FillUpperMediansForNode(i)
    }
  }

  CompareByX(a: number, b: number): number {
    return this.la.x[a] - this.la.x[b]
  }

  private FillUpperMediansForNode(i: number) {
    let count: number = this.graph.InEdgesCount(i)
    if (count > 0) {
      const predecessors: number[] = new Array(count)
      count = 0
      for (const e of this.graph.InEdges(i)) {
        predecessors[count++] = e.Source
      }

      predecessors.sort((a, b) => this.CompareByX(a, b))
      const m: number = Math.floor(count / 2)
      if (m * 2 === count) {
        this.upperMedians[i] = new IntPair(predecessors[m - 1], predecessors[m])
      } else {
        this.upperMedians[i] = predecessors[m]
      }
    } else {
      this.upperMedians[i] = -1
    }
  }

  private FillLowMedians() {
    this.lowMedians = new Array<MedianType>(this.graph.NodeCount)
    for (let i = 0; i < this.graph.NodeCount; i++) {
      this.FillLowMediansForNode(i)
    }
  }

  private FillLowMediansForNode(i: number) {
    let count: number = this.graph.OutEdgesCount(i)
    if (count > 0) {
      const successors: number[] = new Array(count)
      count = 0
      for (const e of this.graph.OutEdges(i)) {
        successors[count++] = e.Target
      }

      successors.sort((a, b) => this.CompareByX(a, b))
      const m: number = Math.floor(count / 2)
      if (m * 2 === count) {
        this.lowMedians[i] = new IntPair(successors[m - 1], successors[m])
      } else {
        this.lowMedians[i] = successors[m]
      }
    } else {
      this.lowMedians[i] = -1
    }
  }

  HorizontalBalancing() {
    let leastWidthAssignment = -1
    const a: number[] = new Array(4)
    const b: number[] = new Array(4)
    let leastWidth = Number.MAX_VALUE
    for (let i = 0; i < 4; i++) {
      const t = {a: 0, b: 0}
      this.AssignmentBounds(i, t)
      a[i] = t.a
      b[i] = t.b
      const w = b[i] - a[i]
      if (w < leastWidth) {
        leastWidthAssignment = i
        leastWidth = w
      }
    }

    for (let i = 0; i < 4; i++) {
      let delta: number
      if (XCoordsWithAlignment.IsLeftMostAssignment(i)) {
        delta = a[leastWidthAssignment] - a[i]
      } else {
        delta = b[leastWidthAssignment] - b[i]
      }

      this.x = this.xCoords[i]
      if (delta !== 0) {
        for (let j = 0; j < this.nOfVertices; j++) {
          this.x[j] = this.x[j] + delta
        }
      }
    }

    const arr: number[] = new Array(4)
    for (let v = 0; v < this.nOfVertices; v++) {
      arr[0] = this.xCoords[0][v]
      arr[1] = this.xCoords[1][v]
      arr[2] = this.xCoords[2][v]
      arr[3] = this.xCoords[3][v]
      arr.sort((a, b) => a - b)
      this.anchors[v].x = (arr[1] + arr[2]) / 2
    }

    //    Layout.ShowDataBase(dataBase);
  }

  static IsLeftMostAssignment(i: number): boolean {
    return i === 0 || i === 2
  }

  AssignmentBounds(i: number, t: {a: number; b: number}) {
    if (this.nOfVertices === 0) {
      t.a = 0
      t.b = 0
    } else {
      this.x = this.xCoords[i]
      t.a = t.b = this.x[0]
      for (let j = 1; j < this.nOfVertices; j++) {
        const r: number = this.x[j]
        if (r < t.a) {
          t.a = r
        } else if (r > t.b) {
          t.b = r
        }
      }
    }
  }

  CalcBiasedAlignment() {
    this.ConflictElimination()
    this.Align()
  }

  LeftUpSetup() {
    this.LR = false
    this.BT = true
  }

  LeftDownSetup() {
    this.LR = false
    this.BT = false
  }

  RightDownSetup() {
    this.LR = true
    this.BT = false
  }

  RightUpSetup() {
    this.LR = true
    this.BT = true
  }

  // The code is written as if we go left up, but in fact the settings define the directions.
  //
  // We need to create a subgraph for alignment:
  // where no edge segments intersect, and every vertex has
  // at most one incoming and at most one outcoming edge.
  // This function marks edges to resolve conflicts with only one inner segment.
  // An inner segment is a segment between two dummy nodes.
  // We mark edges that later will not participate in the alignment.
  // Inner segments are preferred to other ones. So, in a conflict with one inner and one
  // non-inner edges we leave the inner edge to participate in the alignment.
  // At the moment we mark as not participating both of the two intersecting inner segments
  ConflictElimination() {
    this.RemoveMarksFromEdges()
    this.MarkConflictingEdges()
  }

  // iterator
  *UpperEdgeMedians(target: number): IterableIterator<number> {
    const medians = this.BT ? this.upperMedians[target] : this.lowMedians[target]
    const isIp = !(typeof medians === 'number')
    if (isIp) {
      const ip: IntPair = <IntPair>medians
      if (this.LR) {
        yield ip.x
        yield ip.y
      } else {
        yield ip.y
        yield ip.x
      }
    } else {
      const i = <number>medians
      if (i >= 0) {
        yield i
      }
    }
  }

  // here we eliminate all constraints

  MarkConflictingEdges() {
    let i: number = this.LowerOf(0, this.h - 1)
    const lowest: number = i
    const upperBound: number = this.UpperOf(0, this.h - 1)
    const nextBelowUpperBound: number = this.NextLower(upperBound)
    // our top layer has index h-1, our bottom layer has index 0
    // inner segments can appear only between layers with indices i+1 and i where i>0 and i<h-1
    for (; this.IsBelow(i, upperBound); i = this.NextUpper(i)) {
      if (this.IsBelow(lowest, i) && this.IsBelow(i, nextBelowUpperBound)) {
        this.ConflictsWithAtLeastOneInnerEdgeForALayer(i)
      }
    }
  }

  // parameterized next upper
  NextUpper(i: number): number {
    return this.BT ? i + 1 : i - 1
  }

  // parameterized next lower
  NextLower(i: number): number {
    return this.BT ? i - 1 : i + 1
  }

  // parameterize highest of two numbers
  UpperOf(i: number, j: number): number {
    return this.BT ? Math.max(i, j) : Math.min(i, j)
  }

  // parameterized lowest of a pair
  LowerOf(i: number, j: number): number {
    return this.BT ? Math.min(i, j) : Math.max(i, j)
  }

  // returns parameterized below
  IsBelow(i: number, j: number): boolean {
    return this.BT ? i < j : j < i
  }

  // returns the "parameterized" left of the two positions
  LeftMost(pos0: number, pos1: number): number {
    return this.LR ? Math.min(pos0, pos1) : Math.max(pos0, pos1)
  }

  // returns the "parameterized" right of the two positions
  RightMost(pos0: number, pos1: number): number {
    return this.LR ? Math.max(pos0, pos1) : Math.min(pos0, pos1)
  }

  // Return true if i is to the left or equal to pos in a "parameterized" fasion

  IsNotRightFrom(i: number, pos: number): boolean {
    return this.LR ? i <= pos : pos <= i
  }

  // Parameterized left relation

  IsLeftFrom(i: number, j: number): boolean {
    return this.LR ? i < j : j < i
  }

  // parameterized next right
  NextRight(i: number): number {
    return this.LR ? i + 1 : i - 1
  }

  // parameterized next left
  NextLeft(i: number): number {
    return this.LR ? i - 1 : i + 1
  }

  // // Eliminates conflicts with at least one inner edge inside of one layer
  // // <

  ConflictsWithAtLeastOneInnerEdgeForALayer(layerIndex: number) {
    if (layerIndex >= 0 && layerIndex < this.la.Layers.length) {
      const lowerLayer: number[] = this.la.Layers[layerIndex]
      let innerEdge: LayerEdge = null
      // start looking for the first inner edge from the left of lowerLayer
      let targetPos: number = this.LeftMost(0, lowerLayer.length - 1)
      const lastTargetPos: number = this.RightMost(0, lowerLayer.length - 1)

      for (; this.IsNotRightFrom(targetPos, lastTargetPos) && innerEdge == null; targetPos = this.NextRight(targetPos)) {
        innerEdge = this.InnerEdgeByTarget(lowerLayer[targetPos])
      }

      // now targetPos points to the right of the innerEdge target at lowerLayer
      if (innerEdge != null) {
        const positionOfInnerEdgeSource: number = this.Pos(this.Source(innerEdge))
        // We are still not in the main loop.
        // We mark conflicting edges with targets to the left of targetPos,
        // That of course means
        // that the sources of conflicting edges lie to the right of Source(innerEdge)
        for (let j: number = this.LeftMost(0, lowerLayer.length - 1); this.IsLeftFrom(j, targetPos); j = this.NextRight(j)) {
          for (const ie of this.InEdges(lowerLayer[j])) {
            if (this.IsLeftFrom(positionOfInnerEdgeSource, this.Pos(this.Source(ie)))) {
              this.MarkEdge(ie)
            }
          }
        }

        let innerSourcePos: number = this.Pos(this.Source(innerEdge))
        // starting the main loop
        while (this.IsNotRightFrom(targetPos, lastTargetPos)) {
          // Now we look for the next inner edge in the alignment to the right of the current innerEdge,
          // and we mark the conflicts later. Marking the conflicts later makes sense.
          // We would have to go through positions between innerEdge and newInnerEdge targets
          // again anyway to resolve conflicts with not inner edges and newInnerEdge
          const newInnerEdge: LayerEdge = this.AlignmentToTheRightOfInner(lowerLayer, targetPos, positionOfInnerEdgeSource)
          targetPos = this.NextRight(targetPos)
          if (newInnerEdge != null) {
            const newInnerSourcePos: number = this.Pos(this.Source(newInnerEdge))
            this.MarkEdgesBetweenInnerAndNewInnerEdges(lowerLayer, innerEdge, newInnerEdge, innerSourcePos, newInnerSourcePos)
            innerEdge = newInnerEdge
            innerSourcePos = newInnerSourcePos
          }
        }

        // look for conflicting edges with targets to the right from the target of innerEdge
        for (
          let k: number = this.NextRight(this.Pos(this.Target(innerEdge)));
          this.IsNotRightFrom(k, lastTargetPos);
          k = this.NextRight(k)
        ) {
          for (const ie of this.InEdges(lowerLayer[k])) {
            if (this.IsLeftFrom(this.Pos(this.Source(ie)), this.Pos(this.Source(innerEdge)))) {
              this.MarkEdge(ie)
            }
          }
        }
      }
    }
  }

  InEdgeOfVirtualNode(v: number): LayerEdge {
    return this.BT ? this.graph.InEdgeOfVirtualNode(v) : this.graph.OutEdgeOfVirtualNode(v)
  }

  InEdges(v: number): IterableIterator<LayerEdge> {
    return this.BT ? this.graph.InEdges(v) : this.graph.OutEdges(v)
  }

  // // This function marks conflicting edges with targets positioned between innerEdge and newInnerEdge targets.
  // // <

  MarkEdgesBetweenInnerAndNewInnerEdges(
    lowerLayer: number[],
    innerEdge: LayerEdge,
    newInnerEdge: LayerEdge,
    innerEdgeSourcePos: number,
    newInnerEdgeSourcePos: number,
  ) {
    let u: number = this.NextRight(this.Pos(this.Target(innerEdge)))
    for (; this.IsLeftFrom(u, this.Pos(this.Target(newInnerEdge))); u = this.NextRight(u)) {
      for (const ie of this.InEdges(lowerLayer[u])) {
        const ieSourcePos: number = this.Pos(this.Source(ie))
        if (this.IsLeftFrom(ieSourcePos, innerEdgeSourcePos)) {
          this.MarkEdge(ie)
        } else if (this.IsLeftFrom(newInnerEdgeSourcePos, ieSourcePos)) {
          this.MarkEdge(ie)
        }
      }
    }
  }

  // // Returns the inner non-conflicting edge incoming into i-th position
  // // of the layer or null if there is no such edge
  // // <

  private AlignmentToTheRightOfInner(lowLayer: number[], i: number, posInnerSource: number): LayerEdge {
    const numOfInEdges: number = this.NumberOfInEdges(lowLayer[i])
    if (numOfInEdges === 1) {
      let ie: LayerEdge = null
      for (const e of this.InEdges(lowLayer[i])) {
        ie = e
      }

      if (this.IsInnerEdge(ie) && this.IsLeftFrom(posInnerSource, this.Pos(ie.Source))) {
        return ie
      }

      return null
    }

    return null
  }

  private NumberOfInEdges(v: number): number {
    return this.BT ? this.graph.InEdgesCount(v) : this.graph.OutEdgesCount(v)
  }

  Pos(v: number): number {
    return this.la.x[v]
  }

  InnerEdgeByTarget(v: number): LayerEdge {
    if (this.IsVirtual(v)) {
      const ie: LayerEdge = this.InEdgeOfVirtualNode(v)
      // there is exactly one edge entering in to the dummy node
      if (this.IsVirtual(this.Source(ie))) {
        return ie
      }
    }
    return null
  }

  IsInnerEdge(e: LayerEdge): boolean {
    return this.IsVirtual(e.Source) && this.IsVirtual(e.Target)
  }

  private RemoveMarksFromEdges() {
    this.markedEdges.clear()
  }

  // // private constructor
  // // <

  constructor(layerArrays: LayerArrays, layeredGraph: ProperLayeredGraph, nOfOriginalVs: number, anchorsP: Anchor[], ns: number) {
    this.la = layerArrays
    this.graph = layeredGraph
    this.nOfOriginalVertices = nOfOriginalVs
    this.nOfVertices = this.graph.NodeCount
    this.markedEdges = new IntPairSet()
    this.h = this.la.Layers.length
    this.root = new Array(this.nOfVertices)
    this.align = new Array(this.nOfVertices)
    // this.sink = new int[nOfVertices];
    // this.shift = new double[nOfVertices];
    this.anchors = anchorsP
    this.nodeSep = ns
  }

  // Calculate the alignment based on the marked edges and greedily resolve the remaining conflicts on the fly, without marking
  Align() {
    this.CreateBlocks()
    this.AssignCoordinatesByLongestPath()
  }

  AssignCoordinatesByLongestPath() {
    this.x = this.xCoords[this.CurrentEnumRightUp] = new Array(this.nOfVertices)
    // create the graph first
    const edges = new Array<PolyIntEdge>()
    for (let v = 0; v < this.nOfVertices; v++) {
      if (v === this.root[v]) {
        //v is a root
        let w = v //w will be running over the block
        do {
          const rn = {neighbor: 0}
          if (this.TryToGetRightNeighbor(w, rn)) edges.push(new PolyIntEdge(v, this.root[rn.neighbor], null))
          w = this.align[w]
        } while (w !== v)
      }
    }

    const blockGraph: BasicGraphOnEdges<PolyIntEdge> = mkGraphOnEdgesN(edges, this.nOfVertices)
    // sort the graph in the topological order
    const topoSort: number[] = TopologicalSort.getOrderOnGraph(blockGraph)
    // start placing the blocks according to the order
    for (const v of topoSort) {
      if (v === this.root[v]) {
        let vx = 0
        let vIsLeftMost = true
        let w: number = v
        // w is running over the block
        do {
          const wLn = {neighbor: 0}
          if (this.TryToGetLeftNeighbor(w, wLn)) {
            if (vIsLeftMost) {
              vx = this.x[this.root[wLn.neighbor]] + this.DeltaBetweenVertices(wLn.neighbor, w)
              vIsLeftMost = false
            } else {
              vx = this.RightMost(vx, this.x[this.root[wLn.neighbor]] + this.DeltaBetweenVertices(wLn.neighbor, w))
            }
          }
          w = this.align[w]
        } while (w !== v)
        this.x[v] = vx
      }
    }

    // push the roots of the graph maximally to the right
    for (const v of topoSort) {
      if (v === this.root[v]) {
        if (blockGraph.inEdges[v].length === 0) {
          let w: number = v
          // w runs over the block
          let xLeftMost: number = this.RightMost(-XCoordsWithAlignment.infinity, XCoordsWithAlignment.infinity)
          const xl: number = xLeftMost
          do {
            const wRn = {neighbor: 0}
            if (this.TryToGetRightNeighbor(w, wRn)) {
              xLeftMost = this.LeftMost(xLeftMost, this.x[this.root[wRn.neighbor]] - this.DeltaBetweenVertices(w, wRn.neighbor))
            }

            w = this.align[w]
          } while (w !== v)
          if (xl !== xLeftMost) {
            this.x[v] = xLeftMost
          }
        }
      }
    }

    for (let v = 0; v < this.nOfVertices; v++) {
      if (v !== this.root[v]) {
        this.x[v] = this.x[this.root[v]]
      }
    }
  }

  // returns true is u has a right neighbor on its layer
  TryToGetRightNeighbor(u: number, t: {neighbor: number}): boolean {
    const neighborPos: number = this.NextRight(this.Pos(u))
    const layer: number[] = this.la.Layers[this.la.y[u]]
    if (neighborPos >= 0 && neighborPos < layer.length) {
      t.neighbor = layer[neighborPos]
      return true
    } else {
      return false
    }
  }

  // returns true is u has a right neighbor on its layer
  TryToGetLeftNeighbor(u: number, t: {neighbor: number}): boolean {
    const neighborPos: number = this.NextLeft(this.Pos(u))
    const layer: number[] = this.la.Layers[this.la.y[u]]
    if (neighborPos >= 0 && neighborPos < layer.length) {
      t.neighbor = layer[neighborPos]
      return true
    } else {
      return false
    }
  }

  // Organizes the vertices into blocks. A block is a maximal path in the alignment subgraph.
  // The alignment is defined by array align. Every vertex is connected to the top vertex of
  // the block by using root array. The alignment is cyclic. If we start from a root vertex v and
  // apply align then we return to v at some point.

  CreateBlocks() {
    for (let v = 0; v < this.nOfVertices; v++) {
      this.root[v] = this.align[v] = v
    }
    const lowBound: number = this.LowerOf(0, this.h - 1)
    // i points to the last layer before the highest one
    for (let i: number = this.NextLower(this.UpperOf(0, this.h - 1)); !this.IsBelow(i, lowBound); i = this.NextLower(i)) {
      const layer: number[] = this.la.Layers[i]
      let r: number = this.LeftMost(-1, this.la.Layers[this.NextUpper(i)].length)
      // We align vertices of the layer above the i-th one only if their positions are
      // to the right of r. This moves us forward on the layer above the current and resolves the conflicts.
      const rightBound: number = this.RightMost(0, layer.length - 1)
      for (let k: number = this.LeftMost(0, layer.length - 1); this.IsNotRightFrom(k, rightBound); k = this.NextRight(k)) {
        const vk: number = layer[k]
        for (const upperNeighborOfVk of this.UpperEdgeMedians(vk)) {
          if (!this.IsMarked(vk, upperNeighborOfVk)) {
            if (this.IsLeftFrom(r, this.Pos(upperNeighborOfVk))) {
              this.align[upperNeighborOfVk] = vk
              this.root[vk] = this.root[upperNeighborOfVk]
              this.align[vk] = this.root[upperNeighborOfVk]
              r = this.Pos(upperNeighborOfVk)
              break
              // done with the alignement for vk
            }
          }
        }
      }
    }
  }

  private IsMarked(source: number, target: number): boolean {
    if (this.BT) {
      return this.markedEdges.hasxy(target, source)
    } else {
      return this.markedEdges.hasxy(source, target)
    }
  }

  private MarkEdge(ie: LayerEdge) {
    this.markedEdges.addNN(ie.Source, ie.Target)
  }

  // Assigning xcoords starting from roots
  static infinity = 10000000

  // Calculates the minimum separation between two neighboring vertices: if u is to the left of v on the same layer return positive
  // number, otherwise negative.

  DeltaBetweenVertices(u: number, v: number): number {
    let sign: number
    if (this.Pos(u) > this.Pos(v)) {
      // swap u and v
      const t: number = u
      u = v
      v = t
      sign = -1
    } else {
      sign = 1
    }

    return (this.anchors[u].rightAnchor + this.anchors[v].leftAnchor + this.nodeSep) * sign
  }
}
