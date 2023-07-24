import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { log } from '@deck.gl/core';
import IconLayer from '../../icon-layer/icon-layer';
import fs from './multi-icon-layer-fragment.glsl';
const DEFAULT_BUFFER = 192.0 / 256;
const EMPTY_ARRAY = [];
const defaultProps = {
  getIconOffsets: {
    type: 'accessor',
    value: x => x.offsets
  },
  alphaCutoff: 0.001,
  smoothing: 0.1,
  outlineWidth: 0,
  outlineColor: {
    type: 'color',
    value: [0, 0, 0, 255]
  }
};
export default class MultiIconLayer extends IconLayer {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "state", void 0);
  }

  getShaders() {
    return { ...super.getShaders(),
      fs
    };
  }

  initializeState() {
    super.initializeState();
    const attributeManager = this.getAttributeManager();
    attributeManager.addInstanced({
      instanceOffsets: {
        size: 2,
        accessor: 'getIconOffsets'
      },
      instancePickingColors: {
        type: 5121,
        size: 3,
        accessor: (object, {
          index,
          target: value
        }) => this.encodePickingColor(index, value)
      }
    });
  }

  updateState(params) {
    super.updateState(params);
    const {
      props,
      oldProps
    } = params;
    let {
      outlineColor
    } = props;

    if (outlineColor !== oldProps.outlineColor) {
      outlineColor = outlineColor.map(x => x / 255);
      outlineColor[3] = Number.isFinite(outlineColor[3]) ? outlineColor[3] : 1;
      this.setState({
        outlineColor
      });
    }

    if (!props.sdf && props.outlineWidth) {
      log.warn("".concat(this.id, ": fontSettings.sdf is required to render outline"))();
    }
  }

  draw(params) {
    const {
      sdf,
      smoothing,
      outlineWidth
    } = this.props;
    const {
      outlineColor
    } = this.state;
    const outlineBuffer = outlineWidth ? Math.max(smoothing, DEFAULT_BUFFER * (1 - outlineWidth)) : -1;
    params.uniforms = { ...params.uniforms,
      sdfBuffer: DEFAULT_BUFFER,
      outlineBuffer,
      gamma: smoothing,
      sdf: Boolean(sdf),
      outlineColor
    };
    super.draw(params);

    if (sdf && outlineWidth) {
      const {
        iconManager
      } = this.state;
      const iconsTexture = iconManager.getTexture();

      if (iconsTexture) {
        this.state.model.draw({
          uniforms: {
            outlineBuffer: DEFAULT_BUFFER
          }
        });
      }
    }
  }

  getInstanceOffset(icons) {
    return icons ? Array.from(icons).flatMap(icon => super.getInstanceOffset(icon)) : EMPTY_ARRAY;
  }

  getInstanceColorMode(icons) {
    return 1;
  }

  getInstanceIconFrame(icons) {
    return icons ? Array.from(icons).flatMap(icon => super.getInstanceIconFrame(icon)) : EMPTY_ARRAY;
  }

}

_defineProperty(MultiIconLayer, "defaultProps", defaultProps);

_defineProperty(MultiIconLayer, "layerName", 'MultiIconLayer');
//# sourceMappingURL=multi-icon-layer.js.map