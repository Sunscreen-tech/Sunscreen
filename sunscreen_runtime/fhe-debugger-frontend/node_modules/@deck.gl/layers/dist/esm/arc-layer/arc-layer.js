import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { Layer, project32, picking, UNIT } from '@deck.gl/core';
import { Model, Geometry } from '@luma.gl/core';
import vs from './arc-layer-vertex.glsl';
import fs from './arc-layer-fragment.glsl';
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
  getSourceColor: {
    type: 'accessor',
    value: DEFAULT_COLOR
  },
  getTargetColor: {
    type: 'accessor',
    value: DEFAULT_COLOR
  },
  getWidth: {
    type: 'accessor',
    value: 1
  },
  getHeight: {
    type: 'accessor',
    value: 1
  },
  getTilt: {
    type: 'accessor',
    value: 0
  },
  greatCircle: false,
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
export default class ArcLayer extends Layer {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "state", void 0);
  }

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
      instanceSourceColors: {
        size: this.props.colorFormat.length,
        type: 5121,
        normalized: true,
        transition: true,
        accessor: 'getSourceColor',
        defaultValue: DEFAULT_COLOR
      },
      instanceTargetColors: {
        size: this.props.colorFormat.length,
        type: 5121,
        normalized: true,
        transition: true,
        accessor: 'getTargetColor',
        defaultValue: DEFAULT_COLOR
      },
      instanceWidths: {
        size: 1,
        transition: true,
        accessor: 'getWidth',
        defaultValue: 1
      },
      instanceHeights: {
        size: 1,
        transition: true,
        accessor: 'getHeight',
        defaultValue: 1
      },
      instanceTilts: {
        size: 1,
        transition: true,
        accessor: 'getTilt',
        defaultValue: 0
      }
    });
  }

  updateState(opts) {
    super.updateState(opts);

    if (opts.changeFlags.extensionsChanged) {
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
      greatCircle,
      wrapLongitude
    } = this.props;
    this.state.model.setUniforms(uniforms).setUniforms({
      greatCircle,
      widthUnits: UNIT[widthUnits],
      widthScale,
      widthMinPixels,
      widthMaxPixels,
      useShortestPath: wrapLongitude
    }).draw();
  }

  _getModel(gl) {
    let positions = [];
    const NUM_SEGMENTS = 50;

    for (let i = 0; i < NUM_SEGMENTS; i++) {
      positions = positions.concat([i, 1, 0, i, -1, 0]);
    }

    const model = new Model(gl, { ...this.getShaders(),
      id: this.props.id,
      geometry: new Geometry({
        drawMode: 5,
        attributes: {
          positions: new Float32Array(positions)
        }
      }),
      isInstanced: true
    });
    model.setUniforms({
      numSegments: NUM_SEGMENTS
    });
    return model;
  }

}

_defineProperty(ArcLayer, "layerName", 'ArcLayer');

_defineProperty(ArcLayer, "defaultProps", defaultProps);
//# sourceMappingURL=arc-layer.js.map