import {CompositeLayer, LayersList, GetPickingInfoParams, UpdateParameters} from '@deck.gl/core/typed'
import {TextLayer, TextLayerProps} from '@deck.gl/layers/typed'
import {GeomNode, TileData, TileMap} from '@msagl/core'
import {Matrix4} from '@math.gl/core'

import {getNodeLayers} from './get-node-layers'
import {getEdgeLayer, getArrowHeadLayer, getEdgeLabelLayer} from './get-edge-layers'
import GraphHighlighter from './graph-highlighter'
import {ParsedGraphStyle, ParsedGraphNodeLayerStyle, ParsedGraphEdgeLayerStyle} from '../styles/graph-style-evaluator'

import type {_Tile2DHeader, NonGeoBoundingBox} from '@deck.gl/geo-layers/typed'

type GraphLayerProps = TextLayerProps<GeomNode> & {
  highlighter: GraphHighlighter
  resolution: number
  graphStyle: ParsedGraphStyle
  tileMap?: TileMap
  tile: _Tile2DHeader
}

export default class GraphLayer extends CompositeLayer<GraphLayerProps> {
  static defaultProps = {
    ...TextLayer.defaultProps,
    resolution: {type: 'number', value: 1},
    highlighter: {type: 'object'},
    fontSize: {type: 'number', value: 16},
  }
  static layerName = 'Graphayer'

  state!: {
    layerMap: Record<string, TileData>
  }

  override updateState({props, oldProps, changeFlags}: UpdateParameters<this>) {
    const {graphStyle} = props
    if (changeFlags.dataChanged || graphStyle !== oldProps.graphStyle) {
      // @ts-ignore
      const data = props.data as TileData
      const filterContext = {
        tileMap: props.tileMap,
      }
      const layerMap: Record<string, TileData> = {}
      for (const layer of graphStyle.layers) {
        const layerData = new TileData(null)
        layerMap[layer.id] = layerData

        if (layer.type === 'node') {
          layerData.nodes = layer.filter ? data.nodes.filter((n) => layer.filter(n.node, filterContext)) : data.nodes
        }
        if (layer.type === 'edge') {
          layerData.curveClips = layer.filter ? data.curveClips.filter((c) => layer.filter(c.edge, filterContext)) : data.curveClips
          layerData.arrowheads = layer.filter ? data.arrowheads.filter((a) => layer.filter(a.edge, filterContext)) : data.arrowheads
          layerData.labels = layer.filter ? data.labels.filter((l) => layer.filter(l.parent.entity, filterContext)) : data.labels
        }
      }
      this.setState({layerMap})
    }
  }

  getPickingInfo({sourceLayer, info}: GetPickingInfoParams) {
    if (sourceLayer.id.endsWith('node-boundary') && info.picked) {
      info.object = this.props.highlighter.getNode(info.index)
    }
    return info
  }

  filterSubLayer({layer, viewport}: any) {
    const layerStyle = layer.props.layerStyle as ParsedGraphNodeLayerStyle | ParsedGraphEdgeLayerStyle
    const {zoom} = viewport
    return layerStyle.minZoom <= zoom && layerStyle.maxZoom >= zoom
  }

  override renderLayers(): LayersList {
    const {layerMap} = this.state
    const {graphStyle, highlighter, resolution, fontFamily, fontWeight, lineHeight, tile, modelMatrix} = this.props
    const layerCount = graphStyle.layers.length
    const tileSize = (tile.bbox as NonGeoBoundingBox).right - (tile.bbox as NonGeoBoundingBox).left

    return graphStyle.layers.map((layer, layerIndex) => {
      const data = layerMap[layer.id]
      const subLayers = []
      const subLayerProps = this.getSubLayerProps({id: layer.id})
      Object.assign(subLayerProps, {
        layerStyle: layer,
        modelMatrix: new Matrix4(modelMatrix).scale([1, 1, -tileSize / 4]),
        parameters: {
          depthRange: [1 - (layerIndex + 1) / layerCount, 1 - layerIndex / layerCount],
        },
      })

      if (data.nodes?.length > 0) {
        subLayers.push(
          getNodeLayers(
            {
              ...subLayerProps,
              data: data.nodes,
              getPickingColor: (n, {target}) => highlighter.encodeNodeIndex(n, target),
              nodeDepth: highlighter.nodeDepth,

              // From renderer layout options
              fontFamily,
              fontWeight,
              lineHeight,
            },
            layer as ParsedGraphNodeLayerStyle,
          ),
        )
      }

      if (data.curveClips?.length > 0) {
        subLayers.push(
          getEdgeLayer(
            {
              ...subLayerProps,
              data: data.curveClips,
              getDepth: highlighter.edgeDepth,
              resolution,
            },
            layer as ParsedGraphEdgeLayerStyle,
          ),
        )
      }

      if (data.arrowheads?.length > 0) {
        subLayers.push(
          getArrowHeadLayer(
            {
              ...subLayerProps,
              data: data.arrowheads,
            },
            layer as ParsedGraphEdgeLayerStyle,
          ),
        )
      }

      if (data.labels?.length > 0) {
        subLayers.push(
          getEdgeLabelLayer(
            {
              ...subLayerProps,
              data: data.labels,
              fontFamily,
              fontWeight,
              lineHeight,
            },
            layer as ParsedGraphEdgeLayerStyle,
          ),
        )
      }

      return subLayers
    })
  }
}
