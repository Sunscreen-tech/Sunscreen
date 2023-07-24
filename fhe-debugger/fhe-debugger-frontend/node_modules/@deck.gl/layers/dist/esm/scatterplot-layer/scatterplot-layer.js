import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { Layer, project32, picking, UNIT } from '@deck.gl/core';
import { Model, Geometry } from '@luma.gl/core';
import vs from './scatterplot-layer-vertex.glsl';
import fs from './scatterplot-layer-fragment.glsl';
const DEFAULT_COLOR = [0, 0, 0, 255];
const defaultProps = {
  radiusUnits: 'meters',
  radiusScale: {
    type: 'number',
    min: 0,
    value: 1
  },
  radiusMinPixels: {
    type: 'number',
    min: 0,
    value: 0
  },
  radiusMaxPixels: {
    type: 'number',
    min: 0,
    value: Number.MAX_SAFE_INTEGER
  },
  lineWidthUnits: 'meters',
  lineWidthScale: {
    type: 'number',
    min: 0,
    value: 1
  },
  lineWidthMinPixels: {
    type: 'number',
    min: 0,
    value: 0
  },
  lineWidthMaxPixels: {
    type: 'number',
    min: 0,
    value: Number.MAX_SAFE_INTEGER
  },
  stroked: false,
  filled: true,
  billboard: false,
  antialiasing: true,
  getPosition: {
    type: 'accessor',
    value: x => x.position
  },
  getRadius: {
    type: 'accessor',
    value: 1
  },
  getFillColor: {
    type: 'accessor',
    value: DEFAULT_COLOR
  },
  getLineColor: {
    type: 'accessor',
    value: DEFAULT_COLOR
  },
  getLineWidth: {
    type: 'accessor',
    value: 1
  },
  strokeWidth: {
    deprecatedFor: 'getLineWidth'
  },
  outline: {
    deprecatedFor: 'stroked'
  },
  getColor: {
    deprecatedFor: ['getFillColor', 'getLineColor']
  }
};
export default class ScatterplotLayer extends Layer {
  getShaders() {
    return super.getShaders({
      vs,
      fs,
      modules: [project32, picking]
    });
  }

  initializeState() {
    this.getAttributeManager().addInstanced({
      instancePositions: {
        size: 3,
        type: 5130,
        fp64: this.use64bitPositions(),
        transition: true,
        accessor: 'getPosition'
      },
      instanceRadius: {
        size: 1,
        transition: true,
        accessor: 'getRadius',
        defaultValue: 1
      },
      instanceFillColors: {
        size: this.props.colorFormat.length,
        transition: true,
        normalized: true,
        type: 5121,
        accessor: 'getFillColor',
        defaultValue: [0, 0, 0, 255]
      },
      instanceLineColors: {
        size: this.props.colorFormat.length,
        transition: true,
        normalized: true,
        type: 5121,
        accessor: 'getLineColor',
        defaultValue: [0, 0, 0, 255]
      },
      instanceLineWidths: {
        size: 1,
        transition: true,
        accessor: 'getLineWidth',
        defaultValue: 1
      }
    });
  }

  updateState(params) {
    super.updateState(params);

    if (params.changeFlags.extensionsChanged) {
      var _this$state$model;

      const {
        gl
      } = this.context;
      (_this$state$model = this.state.model) === null || _this$state$model === void 0 ? void 0 : _this$state$model.delete();
      this.state.model = this._getModel(gl);
      this.getAttributeManager().invalidateAll();
    }
  }

  draw({
    uniforms
  }) {
    const {
      radiusUnits,
      radiusScale,
      radiusMinPixels,
      radiusMaxPixels,
      stroked,
      filled,
      billboard,
      antialiasing,
      lineWidthUnits,
      lineWidthScale,
      lineWidthMinPixels,
      lineWidthMaxPixels
    } = this.props;
    this.state.model.setUniforms(uniforms).setUniforms({
      stroked: stroked ? 1 : 0,
      filled,
      billboard,
      antialiasing,
      radiusUnits: UNIT[radiusUnits],
      radiusScale,
      radiusMinPixels,
      radiusMaxPixels,
      lineWidthUnits: UNIT[lineWidthUnits],
      lineWidthScale,
      lineWidthMinPixels,
      lineWidthMaxPixels
    }).draw();
  }

  _getModel(gl) {
    const positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
    return new Model(gl, { ...this.getShaders(),
      id: this.props.id,
      geometry: new Geometry({
        drawMode: 6,
        vertexCount: 4,
        attributes: {
          positions: {
            size: 3,
            value: new Float32Array(positions)
          }
        }
      }),
      isInstanced: true
    });
  }

}

_defineProperty(ScatterplotLayer, "defaultProps", defaultProps);

_defineProperty(ScatterplotLayer, "layerName", 'ScatterplotLayer');
//# sourceMappingURL=scatterplot-layer.js.map