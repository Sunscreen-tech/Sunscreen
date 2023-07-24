"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _get2 = _interopRequireDefault(require("@babel/runtime/helpers/get"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _core = require("@deck.gl/core");

var _core2 = require("@luma.gl/core");

var _columnGeometry = _interopRequireDefault(require("./column-geometry"));

var _columnLayerVertex = _interopRequireDefault(require("./column-layer-vertex.glsl"));

var _columnLayerFragment = _interopRequireDefault(require("./column-layer-fragment.glsl"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var DEFAULT_COLOR = [0, 0, 0, 255];
var defaultProps = {
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
    value: function value(x) {
      return x.position;
    }
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

var ColumnLayer = function (_Layer) {
  (0, _inherits2.default)(ColumnLayer, _Layer);

  var _super = _createSuper(ColumnLayer);

  function ColumnLayer() {
    (0, _classCallCheck2.default)(this, ColumnLayer);
    return _super.apply(this, arguments);
  }

  (0, _createClass2.default)(ColumnLayer, [{
    key: "getShaders",
    value: function getShaders() {
      var gl = this.context.gl;
      var transpileToGLSL100 = !(0, _core2.isWebGL2)(gl);
      var defines = {};
      var useDerivatives = this.props.flatShading && (0, _core2.hasFeature)(gl, _core2.FEATURES.GLSL_DERIVATIVES);

      if (useDerivatives) {
        defines.FLAT_SHADING = 1;
      }

      return (0, _get2.default)((0, _getPrototypeOf2.default)(ColumnLayer.prototype), "getShaders", this).call(this, {
        vs: _columnLayerVertex.default,
        fs: _columnLayerFragment.default,
        defines: defines,
        transpileToGLSL100: transpileToGLSL100,
        modules: [_core.project32, useDerivatives ? _core.phongLighting : _core.gouraudLighting, _core.picking]
      });
    }
  }, {
    key: "initializeState",
    value: function initializeState() {
      var attributeManager = this.getAttributeManager();
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
  }, {
    key: "updateState",
    value: function updateState(params) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(ColumnLayer.prototype), "updateState", this).call(this, params);
      var props = params.props,
          oldProps = params.oldProps,
          changeFlags = params.changeFlags;
      var regenerateModels = changeFlags.extensionsChanged || props.flatShading !== oldProps.flatShading;

      if (regenerateModels) {
        var _this$state$model;

        var gl = this.context.gl;
        (_this$state$model = this.state.model) === null || _this$state$model === void 0 ? void 0 : _this$state$model.delete();
        this.state.model = this._getModel(gl);
        this.getAttributeManager().invalidateAll();
      }

      if (regenerateModels || props.diskResolution !== oldProps.diskResolution || props.vertices !== oldProps.vertices || (props.extruded || props.stroked) !== (oldProps.extruded || oldProps.stroked)) {
        this._updateGeometry(props);
      }
    }
  }, {
    key: "getGeometry",
    value: function getGeometry(diskResolution, vertices, hasThinkness) {
      var geometry = new _columnGeometry.default({
        radius: 1,
        height: hasThinkness ? 2 : 0,
        vertices: vertices,
        nradial: diskResolution
      });
      var meanVertexDistance = 0;

      if (vertices) {
        for (var i = 0; i < diskResolution; i++) {
          var p = vertices[i];
          var d = Math.sqrt(p[0] * p[0] + p[1] * p[1]);
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
  }, {
    key: "_getModel",
    value: function _getModel(gl) {
      return new _core2.Model(gl, _objectSpread(_objectSpread({}, this.getShaders()), {}, {
        id: this.props.id,
        isInstanced: true
      }));
    }
  }, {
    key: "_updateGeometry",
    value: function _updateGeometry(_ref) {
      var diskResolution = _ref.diskResolution,
          vertices = _ref.vertices,
          extruded = _ref.extruded,
          stroked = _ref.stroked;
      var geometry = this.getGeometry(diskResolution, vertices, extruded || stroked);
      this.setState({
        fillVertexCount: geometry.attributes.POSITION.value.length / 3,
        wireframeVertexCount: geometry.indices.value.length
      });
      this.state.model.setProps({
        geometry: geometry
      });
    }
  }, {
    key: "draw",
    value: function draw(_ref2) {
      var uniforms = _ref2.uniforms;
      var _this$props = this.props,
          lineWidthUnits = _this$props.lineWidthUnits,
          lineWidthScale = _this$props.lineWidthScale,
          lineWidthMinPixels = _this$props.lineWidthMinPixels,
          lineWidthMaxPixels = _this$props.lineWidthMaxPixels,
          radiusUnits = _this$props.radiusUnits,
          elevationScale = _this$props.elevationScale,
          extruded = _this$props.extruded,
          filled = _this$props.filled,
          stroked = _this$props.stroked,
          wireframe = _this$props.wireframe,
          offset = _this$props.offset,
          coverage = _this$props.coverage,
          radius = _this$props.radius,
          angle = _this$props.angle;
      var _this$state = this.state,
          model = _this$state.model,
          fillVertexCount = _this$state.fillVertexCount,
          wireframeVertexCount = _this$state.wireframeVertexCount,
          edgeDistance = _this$state.edgeDistance;
      model.setUniforms(uniforms).setUniforms({
        radius: radius,
        angle: angle / 180 * Math.PI,
        offset: offset,
        extruded: extruded,
        stroked: stroked,
        coverage: coverage,
        elevationScale: elevationScale,
        edgeDistance: edgeDistance,
        radiusUnits: _core.UNIT[radiusUnits],
        widthUnits: _core.UNIT[lineWidthUnits],
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
  }]);
  return ColumnLayer;
}(_core.Layer);

exports.default = ColumnLayer;
(0, _defineProperty2.default)(ColumnLayer, "layerName", 'ColumnLayer');
(0, _defineProperty2.default)(ColumnLayer, "defaultProps", defaultProps);
//# sourceMappingURL=column-layer.js.map