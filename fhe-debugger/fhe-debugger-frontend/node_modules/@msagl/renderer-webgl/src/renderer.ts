import {Deck, OrthographicView, LinearInterpolator} from '@deck.gl/core/typed'
import {NonGeoBoundingBox, TileLayer} from '@deck.gl/geo-layers/typed'
// import {PolygonLayer} from '@deck.gl/layers/typed'
import {ClipExtension} from '@deck.gl/extensions/typed'

import {DrawingGraph} from '@msagl/drawing'

import GraphLayer from './layers/graph-layer'

import {layoutGraph, layoutGraphOnWorker, LayoutOptions, deepEqual, TextMeasurer} from '@msagl/renderer-common'
import {Graph, GeomGraph, Rectangle, GeomNode, TileMap, TileData, geometryIsCreated} from '@msagl/core'

import {Matrix4} from '@math.gl/core'

import EventSource, {Event} from './event-source'

import GraphHighlighter from './layers/graph-highlighter'
import {getIconAtlas} from './layers/arrows'

import {GraphStyleSpecification, DefaultGraphStyle} from './styles/graph-style-spec'
import {parseGraphStyle, ParsedGraphStyle} from './styles/graph-style-evaluator'

export interface IRendererControl {
  onAdd(renderer: Renderer): void
  onRemove(renderer: Renderer): void
  getElement(): HTMLElement | null
}

const MaxZoom = 2

/**
 * Renders an MSAGL graph with WebGL
 * @event load - fired once when the renderer is initialized
 * @event graphload - fired when a graph is rendered for the first time
 */
export default class Renderer extends EventSource {
  private _deck: any
  private _graph?: Graph
  private _layoutOptions: LayoutOptions = {}
  private _controls: IRendererControl[] = []
  private _controlsContainer: HTMLDivElement
  private _textMeasurer: TextMeasurer
  private _graphHighlighter: GraphHighlighter
  private _highlightedNodeId: string | null
  private _layoutWorkerUrl?: string
  private _style: ParsedGraphStyle = parseGraphStyle(DefaultGraphStyle)

  constructor(container: HTMLElement = document.body, layoutWorkerUrl?: string) {
    super()

    this._layoutWorkerUrl = layoutWorkerUrl
    this._textMeasurer = new TextMeasurer()

    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }

    const divs = Array.from({length: 2}, () => {
      const c = document.createElement('div')
      Object.assign(c.style, {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      })
      return container.appendChild(c)
    })

    this._deck = new Deck({
      parent: divs[0],
      views: [new OrthographicView({flipY: false})],
      initialViewState: {
        target: [0, 0, 0],
        zoom: 0,
        maxZoom: MaxZoom,
      },
      controller: true,
      onLoad: () => {
        this.emit('load')

        const {gl} = this._deck.deckRenderer
        this._deck._addResources({
          arrowAtlas: getIconAtlas(gl),
        })

        this._update()
      },
      onClick: ({object}) => {
        if (!object && this._highlightedNodeId) {
          // deseclect
          this.highlight(null)
        }
      },
    })

    divs[1].style.pointerEvents = 'none'
    this._controlsContainer = divs[1]
  }

  addControl(control: IRendererControl) {
    if (this._controls.indexOf(control) < 0) {
      this._controls.push(control)
      control.onAdd(this)
      const el = control.getElement()
      if (el) {
        this._controlsContainer.appendChild(el)
      }
    }
  }

  removeControl(control: IRendererControl) {
    const index = this._controls.indexOf(control)
    if (index >= 0) {
      const el = control.getElement()
      if (el) {
        el.remove()
      }
      control.onRemove(this)
      this._controls.splice(index, 1)
    }
  }

  get graph(): Graph {
    return this._graph
  }

  setStyle(style: GraphStyleSpecification) {
    this._style = parseGraphStyle(style)
    const layer = this._deck.props.layers[0]
    if (layer) {
      const newLayer = layer.clone({
        graphStyle: this._style,
      })
      this._deck.setProps({
        layers: [newLayer],
      })
    }
  }

  /** when the graph is set : the geometry for it is created and the layout is done
   * Explicitly set options to null to use existing geometry
   */
  async setGraph(graph: Graph, options: LayoutOptions | null = this._layoutOptions) {
    if (this._graph === graph) {
      if (options) {
        await this.setOptions(options)
      }
    } else {
      this._graph = graph

      if (options && !geometryIsCreated(graph)) {
        this._layoutOptions = options
        this._textMeasurer.setOptions(options.label || {})
        this._highlightedNodeId = null

        const drawingGraph = <DrawingGraph>DrawingGraph.getDrawingObj(graph) || new DrawingGraph(graph)
        drawingGraph.createGeometry(this._textMeasurer.measure)

        await this._layoutGraph(true)
      } else if (this._deck.layerManager) {
        // deck is ready
        this._update()
      }
    }
  }

  async setOptions(options: LayoutOptions) {
    const oldLabelSettings = this._layoutOptions.label
    const newLabelSettings = options.label
    const fontChanged = !deepEqual(oldLabelSettings, newLabelSettings)

    this._layoutOptions = options

    if (!this._graph) {
      return
    }

    const drawingGraph = <DrawingGraph>DrawingGraph.getDrawingObj(this._graph)
    if (fontChanged) {
      this._textMeasurer.setOptions(options.label || {})
      drawingGraph.createGeometry(this._textMeasurer.measure)
    }
    const relayout = fontChanged
    await this._layoutGraph(relayout)
  }

  zoomTo(rectangle: Rectangle) {
    const scale = Math.min(this._deck.width / rectangle.width, this._deck.height / rectangle.height)
    const zoom = Math.min(Math.log2(scale), MaxZoom)

    this._deck.setProps({
      initialViewState: {
        target: [rectangle.center.x, rectangle.center.y, 0],
        zoom: zoom,
        transitionInterpolator: new LinearInterpolator(['target', 'zoom']),
        transitionDuration: 1000,
        maxZoom: MaxZoom,
      },
    })
  }

  highlight(nodeId: string | null) {
    this._highlightedNodeId = nodeId
    this._highlight(nodeId)
  }

  private _highlight(nodeId: string | null, depth = 2) {
    if (this._graph && this._deck.layerManager) {
      this._graphHighlighter.update({
        sourceId: nodeId,
        maxDepth: depth,
        edgeDepth: false,
      })
      this._deck.layerManager.setNeedsRedraw('hightlight changed')
    }
  }

  private async _layoutGraph(forceUpdate: boolean) {
    if (this._layoutWorkerUrl) {
      this._graph = await layoutGraphOnWorker(this._layoutWorkerUrl, this._graph, this._layoutOptions, forceUpdate)
    } else {
      layoutGraph(this._graph, this._layoutOptions, forceUpdate)
    }

    if (this._deck.layerManager) {
      // deck is ready
      this._update()
    }
  }

  private _update() {
    if (!this._graph) return

    const fontSettings = this._textMeasurer.opts

    const geomGraph = GeomGraph.getGeom(this._graph)

    if (!geomGraph) {
      return
    }

    this._graphHighlighter = this._graphHighlighter || new GraphHighlighter(this._deck.deckRenderer.gl)
    this._graphHighlighter.setGraph(geomGraph)

    const boundingBox = geomGraph.boundingBox

    console.time('Generate tiles')
    const rootTileSize = 2 ** Math.ceil(Math.log2(Math.max(boundingBox.width, boundingBox.height)))
    const startZoom = Math.min(MaxZoom, Math.round(9 - Math.log2(rootTileSize))) // tileSize 512 = 2 ** 9
    // Pad boundingBox to square
    const rootTile = new Rectangle({
      left: boundingBox.left - (rootTileSize - boundingBox.width) / 2,
      bottom: boundingBox.bottom - (rootTileSize - boundingBox.height) / 2,
      right: boundingBox.right + (rootTileSize - boundingBox.width) / 2,
      top: boundingBox.top + (rootTileSize - boundingBox.height) / 2,
    })
    const tileMap = new TileMap(geomGraph, rootTile)
    const numberOfLevels = tileMap.buildUpToLevel(20) // MaxZoom - startZoom)
    console.timeEnd('Generate tiles')

    console.time('initial render')

    const modelMatrix = new Matrix4().translate([rootTileSize / 2 - rootTile.center.x, rootTileSize / 2 - rootTile.center.y, 0])

    const layer = new TileLayer<
      TileData,
      {
        graphStyle: ParsedGraphStyle
      }
    >({
      extent: [0, 0, rootTileSize, rootTileSize],
      refinementStrategy: 'no-overlap',
      minZoom: startZoom,
      maxZoom: numberOfLevels - 1 + startZoom,
      tileSize: 512,
      getTileData: (tile) => {
        const {x, y, z} = tile.index
        tile.bbox as NonGeoBoundingBox
        return tileMap.getTileData(x, y, z - startZoom)
      },
      // For debugging
      // onClick: ({sourceLayer}) => {
      //   // @ts-ignore
      //   console.log(sourceLayer.props.tile.id, sourceLayer.props.tile.data)
      // },
      autoHighlight: true,
      onHover: ({object, sourceLayer}) => {
        if (!this._highlightedNodeId) {
          if (object instanceof GeomNode) {
            this._highlight(object.id)
          } else {
            this._highlight(null)
          }
        }
      },
      graphStyle: this._style,

      // @ts-ignore
      renderSubLayers: ({data, graphStyle, id, tile}) => {
        if (!data) return null

        const bbox = data.rect
        // const { left, right, top, bottom } = tile.bbox as NonGeoBoundingBox

        return [
          // For debugging
          // new PolygonLayer({
          //   id: id + 'bounds',
          //   data: [0],
          //   parameters: {
          //     depthMask: false
          //   },
          //   getPolygon: (_) => [
          //     [left, bottom],
          //     [right, bottom],
          //     [right, top],
          //     [left, top],
          //   ],
          //   pickable: true,
          //   autoHighlight: true,
          //   highlightColor: [0, 0, 0, 32],
          //   getFillColor: [0, 0, 0, 0],
          //   getLineColor: [255, 0, 0],
          //   getLineWidth: 2,
          //   lineWidthUnits: 'pixels',
          // }),

          new GraphLayer({
            id: id,
            data,
            modelMatrix,
            highlighter: this._graphHighlighter,
            fontFamily: fontSettings.fontFamily,
            fontWeight: fontSettings.fontWeight,
            lineHeight: fontSettings.lineHeight,
            resolution: 2 ** (tile.index.z - 2),
            pickable: true,
            graphStyle,
            tileMap,
            // @ts-ignore
            clipBounds: [bbox.left, bbox.bottom, bbox.right, bbox.top],
            clipByInstance: false,
            extensions: [new ClipExtension()],
          }),
        ]
      },
      updateTriggers: {
        getTileData: Date.now(),
      },
    })

    this._deck.setProps({
      layers: [layer],
      initialViewState: {
        target: [rootTileSize / 2, rootTileSize / 2, 0],
        zoom: startZoom,
        minZoom: startZoom,
        maxZoom: MaxZoom,
      },
      onAfterRender: () => {
        if (layer.isLoaded) {
          console.timeEnd('initial render')
          this._deck.setProps({
            onAfterRender: noop,
          })
        }
      },
    })

    this.emit({
      type: 'graphload',
      data: this._graph,
    } as Event)
  }
}

// eslint-disable-next-line
function noop() {}
