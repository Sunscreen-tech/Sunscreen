import {
  GeomGraph,
  layoutGeomGraph,
  MdsLayoutSettings,
  SugiyamaLayoutSettings,
  Graph,
  EdgeRoutingMode,
  routeEdges,
  LayerDirectionEnum,
  FastIncrementalLayoutSettings,
  ILayoutSettings,
} from '@msagl/core'

import {parseJSON, graphToJSON} from '@msagl/parser'
import {LayoutOptions} from '.'
import {DrawingGraph} from '@msagl/drawing'

let layoutWorker: Worker = null
let layoutInProgress = false

export async function layoutGraphOnWorker(workerUrl: string, graph: Graph, options: LayoutOptions, forceUpdate = false): Promise<Graph> {
  if (layoutInProgress) {
    layoutWorker.terminate()
    layoutWorker = null
  }
  if (!layoutWorker) {
    // Resolve relative URL
    workerUrl = new URL(workerUrl, location.href).href
    // Worker cannot be constructed directly cross-origin
    const content = `importScripts( "${workerUrl}" )`
    const blobUrl = URL.createObjectURL(new Blob([content], {type: 'text/javascript'}))
    layoutWorker = new Worker(blobUrl)
  }

  return new Promise((resolve, reject) => {
    layoutWorker.onmessage = ({data}) => {
      if (data.type === 'error') {
        reject(data.message)
      } else if (data.type === 'layout-done') {
        try {
          graph = parseJSON(data.graph)
          console.debug('graph transfer to main thread', Date.now() - data.timestamp + ' ms')

          resolve(graph)
        } catch (err) {
          reject(err.message)
        }
      }
    }

    layoutWorker.postMessage({
      type: 'layout',
      timestamp: Date.now(),
      graph: graphToJSON(graph),
      options,
      forceUpdate,
    })
    layoutInProgress = true
  })
}

/** lay out the given graph */
export function layoutGraph(graph: Graph, options: LayoutOptions, forceUpdate = false): Graph {
  let needsReroute = false
  let needsLayout = forceUpdate
  const drawingGraph: DrawingGraph = <DrawingGraph>DrawingGraph.getDrawingObj(graph)
  const geomGraph: GeomGraph = GeomGraph.getGeom(graph) // grab the GeomGraph from the underlying Graph

  function updateLayoutSettings(gg: GeomGraph) {
    if (!gg) return
    for (const subgraph of gg.subgraphs()) {
      updateLayoutSettings(subgraph)
    }

    const settings = resolveLayoutSettings(drawingGraph, gg, options)
    const diff = diffLayoutSettings(gg.layoutSettings, settings)
    needsLayout = needsLayout || diff.layoutChanged
    needsReroute = needsReroute || diff.routingChanged
    gg.layoutSettings = settings
  }

  updateLayoutSettings(geomGraph)

  // Clear cached curves
  if (needsLayout || needsReroute) {
    for (const e of geomGraph.deepEdges) {
      e.requireRouting()
    }
  }

  if (needsLayout) {
    layoutGeomGraph(geomGraph, null)
  } else if (needsReroute) {
    // console.time('routeEdges')
    routeEdges(geomGraph, Array.from(geomGraph.deepEdges), null)
    // console.timeEnd('routeEdges')
  }
  return graph
}

function resolveLayoutSettings(root: DrawingGraph, subgraph: GeomGraph, overrides: LayoutOptions): ILayoutSettings {
  // directed is true iff the dot starts with keyword 'digraph'
  let directed = false
  for (const e of subgraph.deepEdges) {
    if (e.sourceArrowhead != null || e.targetArrowhead != null) {
      directed = true
      break
    }
  }

  let layoutSettings: any
  switch (overrides.layoutType) {
    case 'Sugiyama LR': {
      const ss: SugiyamaLayoutSettings = <SugiyamaLayoutSettings>(layoutSettings = new SugiyamaLayoutSettings())
      ss.layerDirection = LayerDirectionEnum.LR
      break
    }

    case 'Sugiyama RL': {
      const ss: SugiyamaLayoutSettings = <SugiyamaLayoutSettings>(layoutSettings = new SugiyamaLayoutSettings())
      ss.layerDirection = LayerDirectionEnum.RL
      break
    }

    case 'Sugiyama TB': {
      const ss: SugiyamaLayoutSettings = <SugiyamaLayoutSettings>(layoutSettings = new SugiyamaLayoutSettings())
      ss.layerDirection = LayerDirectionEnum.TB
      break
    }
    case 'Sugiyama BT': {
      const ss: SugiyamaLayoutSettings = <SugiyamaLayoutSettings>(layoutSettings = new SugiyamaLayoutSettings())
      ss.layerDirection = LayerDirectionEnum.BT
      break
    }

    case 'MDS':
      layoutSettings = new MdsLayoutSettings()
      break
    case 'IPsepCola':
      layoutSettings = new FastIncrementalLayoutSettings()
      break
    default: {
      // figure out if the graph is too large for the layered layout
      const tooLargeForLayered = subgraph.graph.shallowNodeCount > 2001 || subgraph.graph.deepEdgesCount > 4000
      if (directed && !tooLargeForLayered) {
        // the graph is not too large and has directed edges: use layered layout
        const ss = (layoutSettings = new SugiyamaLayoutSettings())
        if (root) {
          if (root.rankdir) {
            ss.layerDirection = root.rankdir
          }
        }
      } else {
        // the graph is more suitable for the pivot mds layout
        layoutSettings = new FastIncrementalLayoutSettings()
      }
    }
  }

  if (overrides.edgeRoutingMode == null) {
    // Use default
    if (layoutSettings instanceof SugiyamaLayoutSettings) {
      layoutSettings.edgeRoutingSettings.EdgeRoutingMode = EdgeRoutingMode.SugiyamaSplines
    } else {
      layoutSettings.edgeRoutingSettings.EdgeRoutingMode = EdgeRoutingMode.Spline
    }
  } else {
    layoutSettings.edgeRoutingSettings.EdgeRoutingMode = overrides.edgeRoutingMode
  }

  return layoutSettings
}

function diffLayoutSettings(
  oldSettings: ILayoutSettings | null,
  newSettings: ILayoutSettings,
): {
  layoutChanged: boolean
  routingChanged: boolean
} {
  if (!oldSettings) return {layoutChanged: true, routingChanged: true}

  const routingChanged =
    oldSettings.commonSettings.edgeRoutingSettings.EdgeRoutingMode !== newSettings.commonSettings.edgeRoutingSettings.EdgeRoutingMode
  const specialCaseSugiamaRelayout =
    routingChanged && newSettings.commonSettings.edgeRoutingSettings.EdgeRoutingMode === EdgeRoutingMode.SugiyamaSplines

  const layerDirectionChange =
    oldSettings instanceof SugiyamaLayoutSettings &&
    newSettings instanceof SugiyamaLayoutSettings &&
    (<SugiyamaLayoutSettings>oldSettings).layerDirection != (<SugiyamaLayoutSettings>newSettings).layerDirection
  return {
    layoutChanged: oldSettings.constructor !== newSettings.constructor || specialCaseSugiamaRelayout || layerDirectionChange,
    routingChanged,
  }
}
