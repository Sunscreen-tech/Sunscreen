import {Entity, Node, Edge, TileMap} from '@msagl/core'
import {DrawingObject, DrawingNode, DrawingEdge, ShapeEnum} from '@msagl/drawing'
import {
  GraphStyleSpecification,
  EntityFilter,
  InterpolatorContext,
  Interpolation,
  GraphNodeLayerStyle,
  GraphEdgeLayerStyle,
} from './graph-style-spec'
import {scaleLinear} from 'd3-scale'
import {rgb} from 'd3-color'

export type ParsedGraphStyle = {
  layers: (ParsedGraphNodeLayerStyle | ParsedGraphEdgeLayerStyle)[]
}

type ParsedGraphLayerStyle = {
  id: string
  type: string
  filter: ((e: Entity, context: FilterContext) => boolean) | null
  visible: boolean
  minZoom: number
  maxZoom: number
}

type FilterContext = {
  tileMap?: TileMap
}

export type ValueOrInterpolator<OutputT> = ((context: InterpolatorContext) => OutputT) | OutputT | null

export type ParsedGraphNodeLayerStyle = ParsedGraphLayerStyle & {
  type: 'node'
  size: ValueOrInterpolator<number>
  opacity: ValueOrInterpolator<number>
  fillColor: ValueOrInterpolator<number[]>
  strokeWidth: ValueOrInterpolator<number>
  strokeColor: ValueOrInterpolator<number[]>
  labelSize: ValueOrInterpolator<number>
  labelColor: ValueOrInterpolator<number[]>
}
/** Internal only */
export type ParsedGraphEdgeLayerStyle = ParsedGraphLayerStyle & {
  type: 'edge'
  opacity: ValueOrInterpolator<number>
  strokeWidth: ValueOrInterpolator<number>
  strokeColor: ValueOrInterpolator<number[]>
  arrowSize: ValueOrInterpolator<number>
  arrowColor: ValueOrInterpolator<number[]>
  labelSize: ValueOrInterpolator<number>
  labelColor: ValueOrInterpolator<number[]>
}

export function parseGraphStyle(style: GraphStyleSpecification): ParsedGraphStyle {
  const parsedLayers = style.layers.map(parseLayerStyle)
  const ids = new Set<string>()
  for (const layer of parsedLayers) {
    if (ids.has(layer.id)) {
      throw new Error(`Duplicate layer id: ${layer.id}`)
    }
    ids.add(layer.id)
  }

  return {
    layers: parsedLayers,
  }
}

function parseLayerStyle(layer: GraphNodeLayerStyle, layerIndex: number): ParsedGraphNodeLayerStyle
function parseLayerStyle(layer: GraphEdgeLayerStyle, layerIndex: number): ParsedGraphEdgeLayerStyle

function parseLayerStyle(layer: GraphNodeLayerStyle | GraphEdgeLayerStyle, layerIndex: number) {
  const {type, id = `layer-${layerIndex}`, filter, visible = true, minZoom = -Infinity, maxZoom = Infinity} = layer

  let interpolators

  if (type === 'node') {
    interpolators = {
      opacity: parseInterpolation(layer.opacity),
      size: parseInterpolation(layer.size),
      fillColor: parseInterpolation(layer.fillColor, colorToRGB),
      strokeWidth: parseInterpolation(layer.strokeWidth),
      strokeColor: parseInterpolation(layer.strokeColor, colorToRGB),
      labelSize: parseInterpolation(layer.labelSize ?? layer.size),
      labelColor: parseInterpolation(layer.labelColor, colorToRGB),
    }
  } else if (layer.type === 'edge') {
    interpolators = {
      opacity: parseInterpolation(layer.opacity),
      strokeWidth: parseInterpolation(layer.strokeWidth),
      strokeColor: parseInterpolation(layer.strokeColor, colorToRGB),
      arrowSize: parseInterpolation(layer.arrowSize),
      arrowColor: parseInterpolation(layer.arrowColor, colorToRGB),
      labelSize: parseInterpolation(layer.labelSize),
      labelColor: parseInterpolation(layer.labelColor, colorToRGB),
    }
  } else {
    throw new Error(`Unknown layer type: ${type}`)
  }

  return {
    type,
    id,
    filter: parseFilter(filter),
    visible,
    minZoom,
    maxZoom,
    ...interpolators,
  }
}

function parseInterpolation<ValueT extends number | string, OutputT = ValueT>(
  valueOrInterpolation: ValueT | Interpolation<ValueT> | undefined,
  transform?: (input: ValueT) => OutputT,
): ValueOrInterpolator<OutputT> {
  if (!valueOrInterpolation) {
    return null
  }
  // @ts-ignore
  if (valueOrInterpolation.interpolation) {
    const {interpolation, interpolationParameters = [], input, inputStops, outputStops} = valueOrInterpolation as Interpolation<ValueT>

    switch (interpolation) {
      case 'linear': {
        const scale = scaleLinear(inputStops, outputStops)
        scale.clamp(true)
        return (context: InterpolatorContext) => {
          const inputValue = context[input] as number
          const value = scale(inputValue)
          return (transform ? transform(value) : value) as OutputT
        }
      }

      case 'power': {
        const base = interpolationParameters[0] || 2

        const scale = scaleLinear(
          inputStops.map((x) => Math.pow(base, x)),
          outputStops,
        )
        scale.clamp(true)
        return (context: InterpolatorContext) => {
          const inputValue = context[input] as number
          const value = scale(Math.pow(base, inputValue))
          return (transform ? transform(value) : value) as OutputT
        }
      }

      case 'step': {
        return (context: InterpolatorContext) => {
          const inputValue = context[input] as number
          const i = inputStops.findIndex((x) => x > inputValue)
          let value: ValueT
          if (i < 0) {
            value = outputStops[outputStops.length - 1]
          } else {
            value = outputStops[i]
          }
          return (transform ? transform(value) : value) as OutputT
        }
      }

      default:
        throw new Error(`Unknown interpolation ${interpolation}`)
    }
  }
  if (transform) {
    return transform(valueOrInterpolation as ValueT)
  }
  return valueOrInterpolation as unknown as OutputT
}

function colorToRGB(input: string): number[] {
  const color = rgb(input)
  return [color.r, color.g, color.b, color.opacity * 255]
}

function parseFilter(filter: EntityFilter | EntityFilter[] | undefined): ((e: Entity, context: FilterContext) => boolean) | null {
  if (!filter) {
    return null
  }

  if (Array.isArray(filter)) {
    const testFuncs = filter.map(parseFilter)
    return (e: Entity, context: FilterContext) => {
      for (const f of testFuncs) {
        if (!f(e, context)) return false
      }
      return true
    }
  }

  let getProperty: (e: Entity, context: FilterContext) => string | number

  switch (filter.property) {
    case 'id':
      getProperty = (e: Entity) => (e as Node).id
      break
    case 'source-id':
      getProperty = (e: Entity) => (e as Edge).source.id
      break
    case 'target-id':
      getProperty = (e: Entity) => (e as Edge).target.id
      break
    case 'shape':
      getProperty = (e: Entity) => ShapeEnum[getDrawingObj<DrawingNode>(e).shape]
      break
    case 'label':
      getProperty = (e: Entity) => getDrawingObj<DrawingNode | DrawingEdge>(e).labelText
      break
    case 'rank':
      getProperty = (e: Entity, context: FilterContext) => {
        if ('source' in e) {
          // is edge
          return Math.min(context.tileMap?.nodeRank.get((e as Edge).source), context.tileMap?.nodeRank.get((e as Edge).target))
        }
        return context.tileMap?.nodeRank.get(e as Node)
      }
      break
    default:
      throw new Error(`Unknown filter property ${filter.property}`)
  }

  switch (filter.operator) {
    case '=':
      return (e: Entity, context: FilterContext) => getProperty(e, context) === filter.value
    case '<':
      return (e: Entity, context: FilterContext) => getProperty(e, context) < filter.value
    case '>':
      return (e: Entity, context: FilterContext) => getProperty(e, context) > filter.value
    case '<=':
      return (e: Entity, context: FilterContext) => getProperty(e, context) <= filter.value
    case '>=':
      return (e: Entity, context: FilterContext) => getProperty(e, context) >= filter.value
    case '!=':
      return (e: Entity, context: FilterContext) => getProperty(e, context) != filter.value
    case '*=':
      return (e: Entity, context: FilterContext) => String(getProperty(e, context)).includes(String(filter.value))
    case '^=':
      return (e: Entity, context: FilterContext) => String(getProperty(e, context)).startsWith(String(filter.value))
    case '$=':
      return (e: Entity, context: FilterContext) => String(getProperty(e, context)).endsWith(String(filter.value))
    default:
      throw new Error(`Unknown filter operator ${filter.operator}`)
  }
}

function getDrawingObj<T extends DrawingObject>(e: Entity): T {
  return DrawingObject.getDrawingObj(e) as T
}
