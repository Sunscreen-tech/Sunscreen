import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { Layer, project32, gouraudLighting, phongLighting, picking, UNIT } from '@deck.gl/core';
import { Model, isWebGL2, hasFeature, FEATURES } from '@luma.gl/core';
import ColumnGeometry from './column-geometry';
import vs from './column-layer-vertex.glsl';
import fs from './column-layer-fragment.glsl';
const DEFAULT_COLOR = [0, 0, 0, 255];
const defaultProps = {
  diskResolution: {
    type: 'number',
    min: 4,
    value: 20
  },
  vertices: null,
  radius: {
    type: 'number',
    min: 0,
    value: 1000
  },
  angle: {
    type: 'number',
    value: 0
  },
  offset: {
    type: 'array',
    value: [0, 0]
  },
  coverage: {
    type: 'number',
    min: 0,
    max: 1,
    value: 1
  },
  elevationScale: {
    type: 'number',
    min: 0,
    value: 1
  },
  radiusUnits: 'meters',
  lineWidthUnits: 'meters',
  lineWidthScale: 1,
  lineWidthMinPixels: 0,
  lineWidthMaxPixels: Number.MAX_SAFE_INTEGER,
  extruded: true,
  wireframe: false,
  filled: true,
  stroked: false,
  getPosition: {
    type: 'accessor',
    value: x => x.position
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
  getElevation: {
    type: 'accessor',
    value: 1000
  },
  material: true,
  getColor: {
    deprecatedFor: ['getFillColor', 'getLineColor']
  }
};
export default class ColumnLayer extends Layer {
  getShaders() {
    const {
      gl
    } = this.context;
    const transpileToGLSL100 = !isWebGL2(gl);
    const defines = {};
    const useDerivatives = this.props.flatShading && hasFeature(gl, FEATURES.GLSL_DERIVATIVES);

    if (useDerivatives) {
      defines.FLAT_SHADING = 1;
    }

    return super.getShaders({
      vs,
      fs,
      defines,
      transpileToGLSL100,
      modules: [project32, useDerivatives ? phongLighting : gouraudLighting, picking]
    });
  }

  initializeState() {
    const attributeManager = this.getAttributeManager();
    attributeManager.addInstanced({
      instancePositions: {
        size: 3,
        type: 5130,
        fp64: this.use64bitPositions(),
        transition: true,
        accessor: 'getPosition'
      },
      instanceElevations: {
        size: 1,
        transition: true,
        accessor: 'getElevation'
      },
      instanceFillColors: {
        size: this.props.colorFormat.length,
        type: 5121,
        normalized: true,
        transition: true,
        accessor: 'getFillColor',
        defaultValue: DEFAULT_COLOR
      },
      instanceLineColors: {
        size: this.props.colorFormat.length,
        type: 5121,
        normalized: true,
        transition: true,
        accessor: 'getLineColor',
        defaultValue: DEFAULT_COLOR
      },
      instanceStrokeWidths: {
        size: 1,
        accessor: 'getLineWidth',
        transition: true
      }
    });
  }

  updateState(params) {
    super.updateState(params);
    const {
      props,
      oldProps,
      changeFlags
    } = params;
    const regenerateModels = changeFlags.extensionsChanged || props.flatShading !== oldProps.flatShading;

    if (regenerateModels) {
      var _this$state$model;

      const {
        gl
      } = this.context;
      (_this$state$model = this.state.model) === null || _this$state$model === void 0 ? void 0 : _this$state$model.delete();
      this.state.model = this._getModel(gl);
      this.getAttributeManager().invalidateAll();
    }

    if (regenerateModels || props.diskResolution !== oldProps.diskResolution || props.vertices !== oldProps.vertices || (props.extruded || props.stroked) !== (oldProps.extruded || oldProps.stroked)) {
      this._updateGeometry(props);
    }
  }

  getGeometry(diskResolution, vertices, hasThinkness) {
    const geometry = new ColumnGeometry({
      radius: 1,
      height: hasThinkness ? 2 : 0,
      vertices,
      nradial: diskResolution
    });
    let meanVertexDistance = 0;

    if (vertices) {
      for (let i = 0; i < diskResolution; i++) {
        const p = vertices[i];
        const d = Math.sqrt(p[0] * p[0] + p[1] * p[1]);
        meanVertexDistance += d / diskResolution;
      }
    } else {
      meanVertexDistance = 1;
    }

    this.setState({
      edgeDistance: Math.cos(Math.PI / diskResolution) * meanVertexDistance
    });
    return geometry;
  }

  _getModel(gl) {
    return new Model(gl, { ...this.getShaders(),
      id: this.props.id,
      isInstanced: true
    });
  }

  _updateGeometry({
    diskResolution,
    vertices,
    extruded,
    stroked
  }) {
    const geometry = this.getGeometry(diskResolution, vertices, extruded || stroked);
    this.setState({
      fillVertexCount: geometry.attributes.POSITION.value.length / 3,
      wireframeVertexCount: geometry.indices.value.length
    });
    this.state.model.setProps({
      geometry
    });
  }

  draw({
    uniforms
  }) {
    const {
      lineWidthUnits,
      lineWidthScale,
      lineWidthMinPixels,
      lineWidthMaxPixels,
      radiusUnits,
      elevationScale,
      extruded,
      filled,
      stroked,
      wireframe,
      offset,
      coverage,
      radius,
      angle
    } = this.props;
    const {
      model,
      fillVertexCount,
      wireframeVertexCount,
      edgeDistance
    } = this.state;
    model.setUniforms(uniforms).setUniforms({
      radius,
      angle: angle / 180 * Math.PI,
      offset,
      extruded,
      stroked,
      coverage,
      elevationScale,
      edgeDistance,
      radiusUnits: UNIT[radiusUnits],
      widthUnits: UNIT[lineWidthUnits],
      widthScale: lineWidthScale,
      widthMinPixels: lineWidthMinPixels,
      widthMaxPixels: lineWidthMaxPixels
    });

    if (extruded && wireframe) {
      model.setProps({
        isIndexed: true
      });
      model.setVertexCount(wireframeVertexCount).setDrawMode(1).setUniforms({
        isStroke: true
      }).draw();
    }

    if (filled) {
      model.setProps({
        isIndexed: false
      });
      model.setVertexCount(fillVertexCount).setDrawMode(5).setUniforms({
        isStroke: false
      }).draw();
    }

    if (!extruded && stroked) {
      model.setProps({
        isIndexed: false
      });
      model.setVertexCount(fillVertexCount * 2 / 3).setDrawMode(5).setUniforms({
        isStroke: true
      }).draw();
    }
  }

}

_defineProperty(ColumnLayer, "layerName", 'ColumnLayer');

_defineProperty(ColumnLayer, "defaultProps", defaultProps);
//# sourceMappingURL=column-layer.js.map