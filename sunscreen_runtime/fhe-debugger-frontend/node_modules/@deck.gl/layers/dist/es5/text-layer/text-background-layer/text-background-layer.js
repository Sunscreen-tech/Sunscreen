"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

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

var _textBackgroundLayerVertex = _interopRequireDefault(require("./text-background-layer-vertex.glsl"));

var _textBackgroundLayerFragment = _interopRequireDefault(require("./text-background-layer-fragment.glsl"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var defaultProps = {
  billboard: true,
  sizeScale: 1,
  sizeUnits: 'pixels',
  sizeMinPixels: 0,
  sizeMaxPixels: Number.MAX_SAFE_INTEGER,
  padding: {
    type: 'array',
    value: [0, 0, 0, 0]
  },
  getPosition: {
    type: 'accessor',
    value: function value(x) {
      return x.position;
    }
  },
  getSize: {
    type: 'accessor',
    value: 1
  },
  getAngle: {
    type: 'accessor',
    value: 0
  },
  getPixelOffset: {
    type: 'accessor',
    value: [0, 0]
  },
  getBoundingRect: {
    type: 'accessor',
    value: [0, 0, 0, 0]
  },
  getFillColor: {
    type: 'accessor',
    value: [0, 0, 0, 255]
  },
  getLineColor: {
    type: 'accessor',
    value: [0, 0, 0, 255]
  },
  getLineWidth: {
    type: 'accessor',
    value: 1
  }
};

var TextBackgroundLayer = function (_Layer) {
  (0, _inherits2.default)(TextBackgroundLayer, _Layer);

  var _super = _createSuper(TextBackgroundLayer);

  function TextBackgroundLayer() {
    var _this;

    (0, _classCallCheck2.default)(this, TextBackgroundLayer);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _super.call.apply(_super, [this].concat(args));
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "state", void 0);
    return _this;
  }

  (0, _createClass2.default)(TextBackgroundLayer, [{
    key: "getShaders",
    value: function getShaders() {
      return (0, _get2.default)((0, _getPrototypeOf2.default)(TextBackgroundLayer.prototype), "getShaders", this).call(this, {
        vs: _textBackgroundLayerVertex.default,
        fs: _textBackgroundLayerFragment.default,
        modules: [_core.project32, _core.picking]
      });
    }
  }, {
    key: "initializeState",
    value: function initializeState() {
      this.getAttributeManager().addInstanced({
        instancePositions: {
          size: 3,
          type: 5130,
          fp64: this.use64bitPositions(),
          transition: true,
          accessor: 'getPosition'
        },
        instanceSizes: {
          size: 1,
          transition: true,
          accessor: 'getSize',
          defaultValue: 1
        },
        instanceAngles: {
          size: 1,
          transition: true,
          accessor: 'getAngle'
        },
        instanceRects: {
          size: 4,
          accessor: 'getBoundingRect'
        },
        instancePixelOffsets: {
          size: 2,
          transition: true,
          accessor: 'getPixelOffset'
        },
        instanceFillColors: {
          size: 4,
          transition: true,
          normalized: true,
          type: 5121,
          accessor: 'getFillColor',
          defaultValue: [0, 0, 0, 255]
        },
        instanceLineColors: {
          size: 4,
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
  }, {
    key: "updateState",
    value: function updateState(params) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(TextBackgroundLayer.prototype), "updateState", this).call(this, params);
      var changeFlags = params.changeFlags;

      if (changeFlags.extensionsChanged) {
        var _this$state$model;

        var gl = this.context.gl;
        (_this$state$model = this.state.model) === null || _this$state$model === void 0 ? void 0 : _this$state$model.delete();
        this.state.model = this._getModel(gl);
        this.getAttributeManager().invalidateAll();
      }
    }
  }, {
    key: "draw",
    value: function draw(_ref) {
      var uniforms = _ref.uniforms;
      var _this$props = this.props,
          billboard = _this$props.billboard,
          sizeScale = _this$props.sizeScale,
          sizeUnits = _this$props.sizeUnits,
          sizeMinPixels = _this$props.sizeMinPixels,
          sizeMaxPixels = _this$props.sizeMaxPixels,
          getLineWidth = _this$props.getLineWidth;
      var padding = this.props.padding;

      if (padding.length < 4) {
        padding = [padding[0], padding[1], padding[0], padding[1]];
      }

      this.state.model.setUniforms(uniforms).setUniforms({
        billboard: billboard,
        stroked: Boolean(getLineWidth),
        padding: padding,
        sizeUnits: _core.UNIT[sizeUnits],
        sizeScale: sizeScale,
        sizeMinPixels: sizeMinPixels,
        sizeMaxPixels: sizeMaxPixels
      }).draw();
    }
  }, {
    key: "_getModel",
    value: function _getModel(gl) {
      var positions = [0, 0, 1, 0, 1, 1, 0, 1];
      return new _core2.Model(gl, _objectSpread(_objectSpread({}, this.getShaders()), {}, {
        id: this.props.id,
        geometry: new _core2.Geometry({
          drawMode: 6,
          vertexCount: 4,
          attributes: {
            positions: {
              size: 2,
              value: new Float32Array(positions)
            }
          }
        }),
        isInstanced: true
      }));
    }
  }]);
  return TextBackgroundLayer;
}(_core.Layer);

exports.default = TextBackgroundLayer;
(0, _defineProperty2.default)(TextBackgroundLayer, "defaultProps", defaultProps);
(0, _defineProperty2.default)(TextBackgroundLayer, "layerName", 'TextBackgroundLayer');
//# sourceMappingURL=text-background-layer.js.map