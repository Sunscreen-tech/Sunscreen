import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { Layer, project32, gouraudLighting, picking, UNIT } from '@deck.gl/core';
import { Model, Geometry } from '@luma.gl/core';
import vs from './point-cloud-layer-vertex.glsl';
import fs from './point-cloud-layer-fragment.glsl';
const DEFAULT_COLOR = [0, 0, 0, 255];
const DEFAULT_NORMAL = [0, 0, 1];
const defaultProps = {
  sizeUnits: 'pixels',
  pointSize: {
    type: 'number',
    min: 0,
    value: 10
  },
  getPosition: {
    type: 'accessor',
    value: x => x.position
  },
  getNormal: {
    type: 'accessor',
    value: DEFAULT_NORMAL
  },
  getColor: {
    type: 'accessor',
    value: DEFAULT_COLOR
  },
  material: true,
  radiusPixels: {
    deprecatedFor: 'pointSize'
  }
};

function normalizeData(data) {
  const {
    header,
    attributes
  } = data;

  if (!header || !attributes) {
    return;
  }

  data.length = header.vertexCount;

  if (attributes.POSITION) {
    attributes.instancePositions = attributes.POSITION;
  }

  if (attributes.NORMAL) {
    attributes.instanceNormals = attributes.NORMAL;
  }

  if (attributes.COLOR_0) {
    attributes.instanceColors = attributes.COLOR_0;
  }
}

export default class PointCloudLayer extends Layer {
  getShaders() {
    return super.getShaders({
      vs,
      fs,
      modules: [project32, gouraudLighting, picking]
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
      instanceNormals: {
        size: 3,
        transition: true,
        accessor: 'getNormal',
        defaultValue: DEFAULT_NORMAL
      },
      instanceColors: {
        size: this.props.colorFormat.length,
        type: 5121,
        normalized: true,
        transition: true,
        accessor: 'getColor',
        defaultValue: DEFAULT_COLOR
      }
    });
  }

  updateState(params) {
    const {
      changeFlags,
      props
    } = params;
    super.updateState(params);

    if (changeFlags.extensionsChanged) {
      var _this$state$model;

      const {
        gl
      } = this.context;
      (_this$state$model = this.state.model) === null || _this$state$model === void 0 ? void 0 : _this$state$model.delete();
      this.state.model = this._getModel(gl);
      this.getAttributeManager().invalidateAll();
    }

    if (changeFlags.dataChanged) {
      normalizeData(props.data);
    }
  }

  draw({
    uniforms
  }) {
    const {
      pointSize,
      sizeUnits
    } = this.props;
    this.state.model.setUniforms(uniforms).setUniforms({
      sizeUnits: UNIT[sizeUnits],
      radiusPixels: pointSize
    }).draw();
  }

  _getModel(gl) {
    const positions = [];

    for (let i = 0; i < 3; i++) {
      const angle = i / 3 * Math.PI * 2;
      positions.push(Math.cos(angle) * 2, Math.sin(angle) * 2, 0);
    }

    return new Model(gl, { ...this.getShaders(),
      id: this.props.id,
      geometry: new Geometry({
        drawMode: 4,
        attributes: {
          positions: new Float32Array(positions)
        }
      }),
      isInstanced: true
    });
  }

}

_defineProperty(PointCloudLayer, "layerName", 'PointCloudLayer');

_defineProperty(PointCloudLayer, "defaultProps", defaultProps);
//# sourceMappingURL=point-cloud-layer.js.map