import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { Layer, project32, picking, UNIT } from '@deck.gl/core';
import { Model, Geometry } from '@luma.gl/core';
import vs from './line-layer-vertex.glsl';
import fs from './line-layer-fragment.glsl';
const DEFAULT_COLOR = [0, 0, 0, 255];
const defaultProps = {
  getSourcePosition: {
    type: 'accessor',
    value: x => x.sourcePosition
  },
  getTargetPosition: {
    type: 'accessor',
    value: x => x.targetPosition
  },
  getColor: {
    type: 'accessor',
    value: DEFAULT_COLOR
  },
  getWidth: {
    type: 'accessor',
    value: 1
  },
  widthUnits: 'pixels',
  widthScale: {
    type: 'number',
    value: 1,
    min: 0
  },
  widthMinPixels: {
    type: 'number',
    value: 0,
    min: 0
  },
  widthMaxPixels: {
    type: 'number',
    value: Number.MAX_SAFE_INTEGER,
    min: 0
  }
};
export default class LineLayer extends Layer {
  getBounds() {
    var _this$getAttributeMan;

    return (_this$getAttributeMan = this.getAttributeManager()) === null || _this$getAttributeMan === void 0 ? void 0 : _this$getAttributeMan.getBounds(['instanceSourcePositions', 'instanceTargetPositions']);
  }

  getShaders() {
    return super.getShaders({
      vs,
      fs,
      modules: [project32, picking]
    });
  }

  get wrapLongitude() {
    return false;
  }

  initializeState() {
    const attributeManager = this.getAttributeManager();
    attributeManager.addInstanced({
      instanceSourcePositions: {
        size: 3,
        type: 5130,
        fp64: this.use64bitPositions(),
        transition: true,
        accessor: 'getSourcePosition'
      },
      instanceTargetPositions: {
        size: 3,
        type: 5130,
        fp64: this.use64bitPositions(),
        transition: true,
        accessor: 'getTargetPosition'
      },
      instanceColors: {
        size: this.props.colorFormat.length,
        type: 5121,
        normalized: true,
        transition: true,
        accessor: 'getColor',
        defaultValue: [0, 0, 0, 255]
      },
      instanceWidths: {
        size: 1,
        transition: true,
        accessor: 'getWidth',
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
      widthUnits,
      widthScale,
      widthMinPixels,
      widthMaxPixels,
      wrapLongitude
    } = this.props;
    this.state.model.setUniforms(uniforms).setUniforms({
      widthUnits: UNIT[widthUnits],
      widthScale,
      widthMinPixels,
      widthMaxPixels,
      useShortestPath: wrapLongitude ? 1 : 0
    }).draw();

    if (wrapLongitude) {
      this.state.model.setUniforms({
        useShortestPath: -1
      }).draw();
    }
  }

  _getModel(gl) {
    const positions = [0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0];
    return new Model(gl, { ...this.getShaders(),
      id: this.props.id,
      geometry: new Geometry({
        drawMode: 5,
        attributes: {
          positions: new Float32Array(positions)
        }
      }),
      isInstanced: true
    });
  }

}

_defineProperty(LineLayer, "layerName", 'LineLayer');

_defineProperty(LineLayer, "defaultProps", defaultProps);
//# sourceMappingURL=line-layer.js.map