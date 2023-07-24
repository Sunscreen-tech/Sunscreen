import {Layer, LayerExtension} from '@deck.gl/core/typed'

import {InterpolatorContext} from '../styles/graph-style-spec'
import {ValueOrInterpolator} from '../styles/graph-style-evaluator'

export type GraphStyleExtensionOptions = {
  overrideProps: Record<string, ValueOrInterpolator<unknown>>
};

export default class GraphStyleExtension extends LayerExtension<GraphStyleExtensionOptions> {
  private isEnabled: boolean = false
  private isDynamic: boolean = false

  constructor(opts: GraphStyleExtensionOptions) {
    const overrideProps: Record<string, ValueOrInterpolator<unknown>> = {}
    let isEnabled = false
    let isDynamic = false
    for (const propName in opts.overrideProps) {
      const propValue = opts.overrideProps[propName]
      if (propValue !== null) {
        overrideProps[propName] = propValue
        isEnabled = true
        if (typeof propValue === 'function') {
          isDynamic = true
        }
      }
    }
    super({
      overrideProps
    })
    this.isEnabled = isEnabled
    this.isDynamic = isDynamic
  }

  updateState(this: Layer, params: any, extension: this): void {
    if (!extension.isEnabled) return

    const attributeManager = this.getAttributeManager()
    if (!attributeManager) return

    if (Object.isFrozen(this.props)) {
      const originalProps = this.props
      const dynamicAttributes: any = {}
      const modifiedProps = Object.create(this.props)
      const {overrideProps} = extension.opts
      for (const propName in overrideProps) {
        Object.defineProperty(modifiedProps, propName, {
          // @ts-ignore
          get: () => evaluateProp(propName, overrideProps[propName], getInterpolationContext(this), originalProps[propName])
        })
        if (typeof overrideProps[propName] === 'function' && propName.startsWith('get')) {
          const attributeName = attributeManager.updateTriggers[propName][0]
          dynamicAttributes[propName] = attributeManager.attributes[attributeName]
        }
      }
      this.setState({
        modifiedProps,
        dynamicAttributes
      })
      this.props = modifiedProps
    }
  }

  draw(this: Layer, params: any, extension: this): void {
    if (!extension.isEnabled) return

    const {modifiedProps, dynamicAttributes} = this.state
    this.props = modifiedProps

    if ('opacity' in extension.opts.overrideProps) {
      params.uniforms.opacity = Math.pow(modifiedProps.opacity, 1 / 2.2)
    }

    if (!extension.isDynamic) return

    for (const propName in dynamicAttributes) {
      // @ts-ignore
      dynamicAttributes[propName].setConstantValue(modifiedProps[propName])
    }
  }

}

function getInterpolationContext(layer: Layer): InterpolatorContext {
  return {
    zoom: layer.context.viewport.zoom
  }
}

function evaluateProp(
  propName: string,
  interpolator: ValueOrInterpolator<unknown>,
  context: InterpolatorContext,
  originalValue: unknown
) {
  let value: unknown
  if (typeof interpolator === 'function') {
    value = interpolator(context)
  } else {
    value = interpolator
  }
  if (typeof value === 'number' && propName.endsWith('Scale')) {
    value *= originalValue as number
  }
  return value
}
