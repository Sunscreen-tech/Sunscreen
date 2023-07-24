
export type GraphStyleSpecification = {
  version: 1
  layers: (GraphNodeLayerStyle | GraphEdgeLayerStyle)[]
}

export const DefaultGraphStyle: GraphStyleSpecification = {
  version: 1,
  layers: [
    { type: 'node' },
    { type: 'edge' }
  ]
}

export type EntityFilter = {
  property: 'id' | 'shape' | 'label' | 'rank' | 'source-id' | 'target-id'
  operator: '=' | '*=' | '^=' | '$=' | '<' | '>' | '<=' | '>=' | '!='
  value: string | number
}

export type InterpolatorContext = {
  zoom: number
}
export type Interpolation<OutputT> = {
  interpolation: 'step' | 'linear' | 'power'
  interpolationParameters?: number[]
  input: keyof InterpolatorContext
  inputStops: number[]
  outputStops: OutputT[]
}

type GraphLayerStyle = {
  id?: string
  type: string
  filter?: EntityFilter | EntityFilter[]
  visible?: boolean
  minZoom?: number
  maxZoom?: number
}

export type GraphNodeLayerStyle = GraphLayerStyle & {
  type: 'node'
  size?: number | Interpolation<number>
  opacity?: number | Interpolation<number>
  fillColor?: string | Interpolation<string>
  strokeWidth?: number | Interpolation<number>
  strokeColor?: string | Interpolation<string>
  labelSize?: number | Interpolation<number>
  labelColor?: string | Interpolation<string>
}

export type GraphEdgeLayerStyle = GraphLayerStyle & {
  type: 'edge'
  opacity?: number | Interpolation<number>
  strokeWidth?: number | Interpolation<number>
  strokeColor?: string | Interpolation<string>
  arrowSize?: number | Interpolation<number>
  arrowColor?: string | Interpolation<string>
  labelSize?: number | Interpolation<number>
  labelColor?: string | Interpolation<string>
}
