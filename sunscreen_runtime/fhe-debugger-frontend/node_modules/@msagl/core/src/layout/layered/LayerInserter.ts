import {BasicGraph} from '../../structs/BasicGraph'
import {GeomNode} from '../core/geomNode'
import {Database} from './Database'
import {EdgePathsInserter} from './EdgePathsInserter'
import {LayerArrays} from './LayerArrays'
import {LayerEdge} from './layerEdge'
import {PolyIntEdge} from './polyIntEdge'
import {ProperLayeredGraph} from './ProperLayeredGraph'
import {SortedMap} from '@esfx/collections-sortedmap'

// Preparing the graph for x-coordinate calculation by inserting dummy nodes into the layers
export class LayerInserter {
  intGraph: BasicGraph<GeomNode, PolyIntEdge>
  database: Database
  // Old layered graph:
  layeredGraph: ProperLayeredGraph
  // new layered graph

  virtNodesToIntEdges: PolyIntEdge[]

  nLayeredGraph: ProperLayeredGraph

  // old layer arrays
  la: LayerArrays

  // new layer arrays
  Nla: LayerArrays
  totalNodes: number

  constructor(layeredGraph: ProperLayeredGraph, la: LayerArrays, database: Database, intGraphP: BasicGraph<GeomNode, PolyIntEdge>) {
    this.la = la
    this.database = database
    this.layeredGraph = layeredGraph
    this.intGraph = intGraphP
  }

  // the entry point of the class
  static InsertLayers(
    layeredGraph: ProperLayeredGraph,
    la: LayerArrays,
    db: Database,
    intGraphP: BasicGraph<GeomNode, PolyIntEdge>,
  ): {layeredGraph: ProperLayeredGraph; la: LayerArrays} {
    const li = new LayerInserter(layeredGraph, la, db, intGraphP)
    li.InsertLayers()

    return {
      layeredGraph: li.nLayeredGraph,
      la: li.Nla.DropEmptyLayers(),
    }
  }
  // new Y-layering
  get NLayering(): number[] {
    return this.Nla.y
  }

  // does the main work
  InsertLayers() {
    this.EditOldLayering()

    this.CreateFullLayeredGraph()

    this.InitNewLayering()

    this.MapVirtualNodesToEdges()

    this.FillUnsortedNewOddLayers()

    this.WidenOriginalLayers()

    this.SortNewOddLayers()
  }
  // virtual nodes inside of an edge should be of the form i,i+1, ....
  EditOldLayering() {
    let curVNode = this.intGraph.nodeCount

    for (const list of this.database.RegularMultiedges()) {
      let span = 0
      const e = list[0]
      span = e.LayerSpan * 2
      if (span > 0) {
        //ignoring flat edges
        for (const le of e.LayerEdges) {
          if (le.Target !== e.target) {
            curVNode++
            this.UpdateOldLayer(curVNode++, le.Target)
          }
        }
        curVNode += (span - 1) * (list.length - 1) + 1
      }
    }
  }

  private UpdateOldLayer(replacingNode: number, prevNode: number) {
    const x = this.la.x[prevNode]
    const y = this.la.y[prevNode]
    const layer = this.la.Layers[y]
    layer[x] = replacingNode
    //  this.la.x[replacingNode] = x;
    // this.la.y[replacingNode] = y;
  }

  // Original layers are represented by even layers of the new layering.
  // Here we add new virtices of such layers and
  // set new x-offsets of original and dummy vertices of these layers.
  WidenOriginalLayers() {
    for (let i = 0; i < this.la.Layers.length; i++) {
      const layer = this.Nla.Layers[i * 2]
      let offset = 0
      for (const v of this.la.Layers[i]) {
        const e = this.virtNodesToIntEdges[v]
        if (e != null) {
          const layerOffsetInTheEdge = this.NLayering[e.source] - this.NLayering[v]
          const list = this.database.Multiedges.get(e.source, e.target)

          for (const ie of list) {
            if (ie !== e) {
              const u = ie.LayerEdges[layerOffsetInTheEdge].Source
              layer[offset] = u
              this.Nla.x[u] = offset++
            } else {
              layer[offset] = v
              this.Nla.x[v] = offset++
            }
          }
        } else {
          layer[offset] = v
          this.Nla.x[v] = offset++
        }
      }
    }
  }

  // filling new layers not corresponding to the original layers
  FillUnsortedNewOddLayers() {
    const c = new Array<number>(this.Nla.Layers.length).fill(0)
    for (let i = this.intGraph.nodeCount; i < this.nLayeredGraph.NodeCount; i++) {
      const layer = this.NLayering[i]
      if (layer % 2 === 1) {
        //new layers have odd numbers
        this.Nla.Layers[layer][c[layer]++] = i
      }
    }
  }

  // create the mapping from the vertices to edges to which they belong
  MapVirtualNodesToEdges() {
    this.virtNodesToIntEdges = new Array<PolyIntEdge>(this.NLayering.length)
    for (const e of this.database.AllIntEdges())
      if (e.source !== e.target && e.LayerEdges != null)
        for (const le of e.LayerEdges) if (le.Target !== e.target) this.virtNodesToIntEdges[le.Target] = e
  }
  // Creating buckets for multi edges and allocating the graph.
  CreateFullLayeredGraph() {
    this.totalNodes = this.intGraph.nodeCount
    for (const list of this.database.RegularMultiedges()) {
      let span = 0
      let first = true
      for (const e of list) {
        if (first) {
          first = false
          span = e.LayerSpan * 2
        }
        if (span > 0) {
          e.LayerEdges = new Array<LayerEdge>(span)
          for (let i = 0; i < span; i++) {
            const bT = {currentVV: this.totalNodes}
            const source = EdgePathsInserter.GetSource(bT, e, i)
            this.totalNodes = bT.currentVV
            const target = EdgePathsInserter.GetTarget(this.totalNodes, e, i, span)
            e.LayerEdges[i] = new LayerEdge(source, target, e.CrossingWeight)
          }
          LayerInserter.RegisterDontStepOnVertex(this.database, e)
        }
      }
    }
    this.nLayeredGraph = new ProperLayeredGraph(this.intGraph)
  }

  // Sort new odd layers by the sum of x-coordinatates of predecessors and the successors of
  // dummy nodes.
  SortNewOddLayers() {
    for (let i = 1; i < this.Nla.Layers.length; i += 2) {
      const sd = new SortedMap<number, number | number[]>()
      const layer = this.Nla.Layers[i]
      for (const v of layer) {
        //find unique predecessor and successor
        let predecessor = -1
        for (const ie of this.nLayeredGraph.InEdges(v)) predecessor = ie.Source
        let successor = -1
        for (const ie of this.nLayeredGraph.OutEdges(v)) successor = ie.Target

        const x = this.Nla.x[predecessor] + this.Nla.x[successor]

        if (sd.has(x)) {
          const o = sd.get(x)
          if (typeof o === 'number') {
            const l = new Array<number>()
            l.push(o)
            l.push(v)
            sd.set(x, l)
          } else {
            const l = o as number[]
            l.push(v)
          }
        } else {
          sd.set(x, v)
        }
      }
      //fill the layer according to this order
      let c = 0
      for (const v of sd.values())
        if (typeof v === 'number') {
          layer[c++] = v
        } else {
          for (const k of v as Array<number>) {
            layer[c++] = k
          }
        }

      //update X now
      for (let m = 0; m < layer.length; m++) this.Nla.x[layer[m]] = m
    }
  }

  // Allocating new layering and filling its y-layers
  InitNewLayering() {
    this.Nla = new LayerArrays(new Array<number>(this.totalNodes))

    for (let i = 0; i < this.layeredGraph.NodeCount; i++) this.NLayering[i] = this.la.y[i] * 2

    for (const [ip, v] of this.database.Multiedges.keyValues()) {
      if (ip.x !== ip.y && this.la.y[ip.x] !== this.la.y[ip.y]) {
        //not a self edge and not a flat edge
        const top = this.la.y[ip.x] * 2
        for (const e of v) {
          let layer = top - 1
          //Assert.assert(e.LayerEdges !== undefined && e.LayerEdges != null)
          for (const le of e.LayerEdges) if (le.Target !== e.target) this.NLayering[le.Target] = layer--
        }
      }
    }

    const newLayers = new Array<Array<number>>(2 * this.la.Layers.length - 1)

    //count new layer widths
    const counts = new Array<number>(newLayers.length).fill(0)

    for (const l of this.NLayering) counts[l]++

    for (let i = 0; i < counts.length; i++) newLayers[i] = new Array<number>(counts[i])

    this.Nla = new LayerArrays(this.NLayering)
    this.Nla.Layers = newLayers
  }
  // mark the vertex as one representing a label
  // or a middle of a multi edge
  static RegisterDontStepOnVertex(db: Database, parent: PolyIntEdge) {
    if (db.Multiedges.get(parent.source, parent.target).length > 1) {
      const e = parent.LayerEdges[parent.LayerEdges.length / 2]
      db.MultipleMiddles.add(e.Source)
    }
  }
}
