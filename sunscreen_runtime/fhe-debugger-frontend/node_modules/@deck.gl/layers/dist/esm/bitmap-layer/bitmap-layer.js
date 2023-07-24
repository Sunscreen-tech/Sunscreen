import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { Layer, project32, picking, COORDINATE_SYSTEM } from '@deck.gl/core';
import { Model, Geometry } from '@luma.gl/core';
import { lngLatToWorld } from '@math.gl/web-mercator';
import createMesh from './create-mesh';
import vs from './bitmap-layer-vertex';
import fs from './bitmap-layer-fragment';
const defaultProps = {
  image: {
    type: 'image',
    value: null,
    async: true
  },
  bounds: {
    type: 'array',
    value: [1, 0, 0, 1],
    compare: true
  },
  _imageCoordinateSystem: COORDINATE_SYSTEM.DEFAULT,
  desaturate: {
    type: 'number',
    min: 0,
    max: 1,
    value: 0
  },
  transparentColor: {
    type: 'color',
    value: [0, 0, 0, 0]
  },
  tintColor: {
    type: 'color',
    value: [255, 255, 255]
  },
  textureParameters: {
    type: 'object',
    ignore: true
  }
};
export default class BitmapLayer extends Layer {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "state", void 0);
  }

  getShaders() {
    return super.getShaders({
      vs,
      fs,
      modules: [project32, picking]
    });
  }

  initializeState() {
    const attributeManager = this.getAttributeManager();
    attributeManager.remove(['instancePickingColors']);
    const noAlloc = true;
    attributeManager.add({
      indices: {
        size: 1,
        isIndexed: true,
        update: attribute => attribute.value = this.state.mesh.indices,
        noAlloc
      },
      positions: {
        size: 3,
        type: 5130,
        fp64: this.use64bitPositions(),
        update: attribute => attribute.value = this.state.mesh.positions,
        noAlloc
      },
      texCoords: {
        size: 2,
        update: attribute => attribute.value = this.state.mesh.texCoords,
        noAlloc
      }
    });
  }

  updateState({
    props,
    oldProps,
    changeFlags
  }) {
    const attributeManager = this.getAttributeManager();

    if (changeFlags.extensionsChanged) {
      var _this$state$model;

      const {
        gl
      } = this.context;
      (_this$state$model = this.state.model) === null || _this$state$model === void 0 ? void 0 : _this$state$model.delete();
      this.state.model = this._getModel(gl);
      attributeManager.invalidateAll();
    }

    if (props.bounds !== oldProps.bounds) {
      const oldMesh = this.state.mesh;

      const mesh = this._createMesh();

      this.state.model.setVertexCount(mesh.vertexCount);

      for (const key in mesh) {
        if (oldMesh && oldMesh[key] !== mesh[key]) {
          attributeManager.invalidate(key);
        }
      }

      this.setState({
        mesh,
        ...this._getCoordinateUniforms()
      });
    } else if (props._imageCoordinateSystem !== oldProps._imageCoordinateSystem) {
      this.setState(this._getCoordinateUniforms());
    }
  }

  getPickingInfo(params) {
    const {
      image
    } = this.props;
    const info = params.info;

    if (!info.color || !image) {
      info.bitmap = null;
      return info;
    }

    const {
      width,
      height
    } = image;
    info.index = 0;
    const uv = unpackUVsFromRGB(info.color);
    const pixel = [Math.floor(uv[0] * width), Math.floor(uv[1] * height)];
    info.bitmap = {
      size: {
        width,
        height
      },
      uv,
      pixel
    };
    return info;
  }

  disablePickingIndex() {
    this.setState({
      disablePicking: true
    });
  }

  restorePickingColors() {
    this.setState({
      disablePicking: false
    });
  }

  _updateAutoHighlight(info) {
    super._updateAutoHighlight({ ...info,
      color: this.encodePickingColor(0)
    });
  }

  _createMesh() {
    const {
      bounds
    } = this.props;
    let normalizedBounds = bounds;

    if (isRectangularBounds(bounds)) {
      normalizedBounds = [[bounds[0], bounds[1]], [bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]]];
    }

    return createMesh(normalizedBounds, this.context.viewport.resolution);
  }

  _getModel(gl) {
    if (!gl) {
      return null;
    }

    return new Model(gl, { ...this.getShaders(),
      id: this.props.id,
      geometry: new Geometry({
        drawMode: 4,
        vertexCount: 6
      }),
      isInstanced: false
    });
  }

  draw(opts) {
    const {
      uniforms,
      moduleParameters
    } = opts;
    const {
      model,
      coordinateConversion,
      bounds,
      disablePicking
    } = this.state;
    const {
      image,
      desaturate,
      transparentColor,
      tintColor
    } = this.props;

    if (moduleParameters.pickingActive && disablePicking) {
      return;
    }

    if (image && model) {
      model.setUniforms(uniforms).setUniforms({
        bitmapTexture: image,
        desaturate,
        transparentColor: transparentColor.map(x => x / 255),
        tintColor: tintColor.slice(0, 3).map(x => x / 255),
        coordinateConversion,
        bounds
      }).draw();
    }
  }

  _getCoordinateUniforms() {
    const {
      LNGLAT,
      CARTESIAN,
      DEFAULT
    } = COORDINATE_SYSTEM;
    let {
      _imageCoordinateSystem: imageCoordinateSystem
    } = this.props;

    if (imageCoordinateSystem !== DEFAULT) {
      const {
        bounds
      } = this.props;

      if (!isRectangularBounds(bounds)) {
        throw new Error('_imageCoordinateSystem only supports rectangular bounds');
      }

      const defaultImageCoordinateSystem = this.context.viewport.resolution ? LNGLAT : CARTESIAN;
      imageCoordinateSystem = imageCoordinateSystem === LNGLAT ? LNGLAT : CARTESIAN;

      if (imageCoordinateSystem === LNGLAT && defaultImageCoordinateSystem === CARTESIAN) {
        return {
          coordinateConversion: -1,
          bounds
        };
      }

      if (imageCoordinateSystem === CARTESIAN && defaultImageCoordinateSystem === LNGLAT) {
        const bottomLeft = lngLatToWorld([bounds[0], bounds[1]]);
        const topRight = lngLatToWorld([bounds[2], bounds[3]]);
        return {
          coordinateConversion: 1,
          bounds: [bottomLeft[0], bottomLeft[1], topRight[0], topRight[1]]
        };
      }
    }

    return {
      coordinateConversion: 0,
      bounds: [0, 0, 0, 0]
    };
  }

}

_defineProperty(BitmapLayer, "layerName", 'BitmapLayer');

_defineProperty(BitmapLayer, "defaultProps", defaultProps);

function unpackUVsFromRGB(color) {
  const [u, v, fracUV] = color;
  const vFrac = (fracUV & 0xf0) / 256;
  const uFrac = (fracUV & 0x0f) / 16;
  return [(u + uFrac) / 256, (v + vFrac) / 256];
}

function isRectangularBounds(bounds) {
  return Number.isFinite(bounds[0]);
}
//# sourceMappingURL=bitmap-layer.js.map