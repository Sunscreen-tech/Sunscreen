"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _get2 = _interopRequireDefault(require("@babel/runtime/helpers/get"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _core = require("@deck.gl/core");

var _core2 = require("@luma.gl/core");

var _webMercator = require("@math.gl/web-mercator");

var _createMesh2 = _interopRequireDefault(require("./create-mesh"));

var _bitmapLayerVertex = _interopRequireDefault(require("./bitmap-layer-vertex"));

var _bitmapLayerFragment = _interopRequireDefault(require("./bitmap-layer-fragment"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var defaultProps = {
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
  _imageCoordinateSystem: _core.COORDINATE_SYSTEM.DEFAULT,
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

var BitmapLayer = function (_Layer) {
  (0, _inherits2.default)(BitmapLayer, _Layer);

  var _super = _createSuper(BitmapLayer);

  function BitmapLayer() {
    var _this;

    (0, _classCallCheck2.default)(this, BitmapLayer);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _super.call.apply(_super, [this].concat(args));
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "state", void 0);
    return _this;
  }

  (0, _createClass2.default)(BitmapLayer, [{
    key: "getShaders",
    value: function getShaders() {
      return (0, _get2.default)((0, _getPrototypeOf2.default)(BitmapLayer.prototype), "getShaders", this).call(this, {
        vs: _bitmapLayerVertex.default,
        fs: _bitmapLayerFragment.default,
        modules: [_core.project32, _core.picking]
      });
    }
  }, {
    key: "initializeState",
    value: function initializeState() {
      var _this2 = this;

      var attributeManager = this.getAttributeManager();
      attributeManager.remove(['instancePickingColors']);
      var noAlloc = true;
      attributeManager.add({
        indices: {
          size: 1,
          isIndexed: true,
          update: function update(attribute) {
            return attribute.value = _this2.state.mesh.indices;
          },
          noAlloc: noAlloc
        },
        positions: {
          size: 3,
          type: 5130,
          fp64: this.use64bitPositions(),
          update: function update(attribute) {
            return attribute.value = _this2.state.mesh.positions;
          },
          noAlloc: noAlloc
        },
        texCoords: {
          size: 2,
          update: function update(attribute) {
            return attribute.value = _this2.state.mesh.texCoords;
          },
          noAlloc: noAlloc
        }
      });
    }
  }, {
    key: "updateState",
    value: function updateState(_ref) {
      var props = _ref.props,
          oldProps = _ref.oldProps,
          changeFlags = _ref.changeFlags;
      var attributeManager = this.getAttributeManager();

      if (changeFlags.extensionsChanged) {
        var _this$state$model;

        var gl = this.context.gl;
        (_this$state$model = this.state.model) === null || _this$state$model === void 0 ? void 0 : _this$state$model.delete();
        this.state.model = this._getModel(gl);
        attributeManager.invalidateAll();
      }

      if (props.bounds !== oldProps.bounds) {
        var oldMesh = this.state.mesh;

        var mesh = this._createMesh();

        this.state.model.setVertexCount(mesh.vertexCount);

        for (var key in mesh) {
          if (oldMesh && oldMesh[key] !== mesh[key]) {
            attributeManager.invalidate(key);
          }
        }

        this.setState(_objectSpread({
          mesh: mesh
        }, this._getCoordinateUniforms()));
      } else if (props._imageCoordinateSystem !== oldProps._imageCoordinateSystem) {
        this.setState(this._getCoordinateUniforms());
      }
    }
  }, {
    key: "getPickingInfo",
    value: function getPickingInfo(params) {
      var image = this.props.image;
      var info = params.info;

      if (!info.color || !image) {
        info.bitmap = null;
        return info;
      }

      var _ref2 = image,
          width = _ref2.width,
          height = _ref2.height;
      info.index = 0;
      var uv = unpackUVsFromRGB(info.color);
      var pixel = [Math.floor(uv[0] * width), Math.floor(uv[1] * height)];
      info.bitmap = {
        size: {
          width: width,
          height: height
        },
        uv: uv,
        pixel: pixel
      };
      return info;
    }
  }, {
    key: "disablePickingIndex",
    value: function disablePickingIndex() {
      this.setState({
        disablePicking: true
      });
    }
  }, {
    key: "restorePickingColors",
    value: function restorePickingColors() {
      this.setState({
        disablePicking: false
      });
    }
  }, {
    key: "_updateAutoHighlight",
    value: function _updateAutoHighlight(info) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(BitmapLayer.prototype), "_updateAutoHighlight", this).call(this, _objectSpread(_objectSpread({}, info), {}, {
        color: this.encodePickingColor(0)
      }));
    }
  }, {
    key: "_createMesh",
    value: function _createMesh() {
      var bounds = this.props.bounds;
      var normalizedBounds = bounds;

      if (isRectangularBounds(bounds)) {
        normalizedBounds = [[bounds[0], bounds[1]], [bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]]];
      }

      return (0, _createMesh2.default)(normalizedBounds, this.context.viewport.resolution);
    }
  }, {
    key: "_getModel",
    value: function _getModel(gl) {
      if (!gl) {
        return null;
      }

      return new _core2.Model(gl, _objectSpread(_objectSpread({}, this.getShaders()), {}, {
        id: this.props.id,
        geometry: new _core2.Geometry({
          drawMode: 4,
          vertexCount: 6
        }),
        isInstanced: false
      }));
    }
  }, {
    key: "draw",
    value: function draw(opts) {
      var uniforms = opts.uniforms,
          moduleParameters = opts.moduleParameters;
      var _this$state = this.state,
          model = _this$state.model,
          coordinateConversion = _this$state.coordinateConversion,
          bounds = _this$state.bounds,
          disablePicking = _this$state.disablePicking;
      var _this$props = this.props,
          image = _this$props.image,
          desaturate = _this$props.desaturate,
          transparentColor = _this$props.transparentColor,
          tintColor = _this$props.tintColor;

      if (moduleParameters.pickingActive && disablePicking) {
        return;
      }

      if (image && model) {
        model.setUniforms(uniforms).setUniforms({
          bitmapTexture: image,
          desaturate: desaturate,
          transparentColor: transparentColor.map(function (x) {
            return x / 255;
          }),
          tintColor: tintColor.slice(0, 3).map(function (x) {
            return x / 255;
          }),
          coordinateConversion: coordinateConversion,
          bounds: bounds
        }).draw();
      }
    }
  }, {
    key: "_getCoordinateUniforms",
    value: function _getCoordinateUniforms() {
      var LNGLAT = _core.COORDINATE_SYSTEM.LNGLAT,
          CARTESIAN = _core.COORDINATE_SYSTEM.CARTESIAN,
          DEFAULT = _core.COORDINATE_SYSTEM.DEFAULT;
      var imageCoordinateSystem = this.props._imageCoordinateSystem;

      if (imageCoordinateSystem !== DEFAULT) {
        var bounds = this.props.bounds;

        if (!isRectangularBounds(bounds)) {
          throw new Error('_imageCoordinateSystem only supports rectangular bounds');
        }

        var defaultImageCoordinateSystem = this.context.viewport.resolution ? LNGLAT : CARTESIAN;
        imageCoordinateSystem = imageCoordinateSystem === LNGLAT ? LNGLAT : CARTESIAN;

        if (imageCoordinateSystem === LNGLAT && defaultImageCoordinateSystem === CARTESIAN) {
          return {
            coordinateConversion: -1,
            bounds: bounds
          };
        }

        if (imageCoordinateSystem === CARTESIAN && defaultImageCoordinateSystem === LNGLAT) {
          var bottomLeft = (0, _webMercator.lngLatToWorld)([bounds[0], bounds[1]]);
          var topRight = (0, _webMercator.lngLatToWorld)([bounds[2], bounds[3]]);
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
  }]);
  return BitmapLayer;
}(_core.Layer);

exports.default = BitmapLayer;
(0, _defineProperty2.default)(BitmapLayer, "layerName", 'BitmapLayer');
(0, _defineProperty2.default)(BitmapLayer, "defaultProps", defaultProps);

function unpackUVsFromRGB(color) {
  var _color = (0, _slicedToArray2.default)(color, 3),
      u = _color[0],
      v = _color[1],
      fracUV = _color[2];

  var vFrac = (fracUV & 0xf0) / 256;
  var uFrac = (fracUV & 0x0f) / 16;
  return [(u + uFrac) / 256, (v + vFrac) / 256];
}

function isRectangularBounds(bounds) {
  return Number.isFinite(bounds[0]);
}
//# sourceMappingURL=bitmap-layer.js.map