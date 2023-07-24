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

var _lineLayerVertex = _interopRequireDefault(require("./line-layer-vertex.glsl"));

var _lineLayerFragment = _interopRequireDefault(require("./line-layer-fragment.glsl"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var DEFAULT_COLOR = [0, 0, 0, 255];
var defaultProps = {
  getSourcePosition: {
    type: 'accessor',
    value: function value(x) {
      return x.sourcePosition;
    }
  },
  getTargetPosition: {
    type: 'accessor',
    value: function value(x) {
      return x.targetPosition;
    }
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

var LineLayer = function (_Layer) {
  (0, _inherits2.default)(LineLayer, _Layer);

  var _super = _createSuper(LineLayer);

  function LineLayer() {
    (0, _classCallCheck2.default)(this, LineLayer);
    return _super.apply(this, arguments);
  }

  (0, _createClass2.default)(LineLayer, [{
    key: "getBounds",
    value: function getBounds() {
      var _this$getAttributeMan;

      return (_this$getAttributeMan = this.getAttributeManager()) === null || _this$getAttributeMan === void 0 ? void 0 : _this$getAttributeMan.getBounds(['instanceSourcePositions', 'instanceTargetPositions']);
    }
  }, {
    key: "getShaders",
    value: function getShaders() {
      return (0, _get2.default)((0, _getPrototypeOf2.default)(LineLayer.prototype), "getShaders", this).call(this, {
        vs: _lineLayerVertex.default,
        fs: _lineLayerFragment.default,
        modules: [_core.project32, _core.picking]
      });
    }
  }, {
    key: "wrapLongitude",
    get: function get() {
      return false;
    }
  }, {
    key: "initializeState",
    value: function initializeState() {
      var attributeManager = this.getAttributeManager();
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
  }, {
    key: "updateState",
    value: function updateState(params) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(LineLayer.prototype), "updateState", this).call(this, params);

      if (params.changeFlags.extensionsChanged) {
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
          widthUnits = _this$props.widthUnits,
          widthScale = _this$props.widthScale,
          widthMinPixels = _this$props.widthMinPixels,
          widthMaxPixels = _this$props.widthMaxPixels,
          wrapLongitude = _this$props.wrapLongitude;
      this.state.model.setUniforms(uniforms).setUniforms({
        widthUnits: _core.UNIT[widthUnits],
        widthScale: widthScale,
        widthMinPixels: widthMinPixels,
        widthMaxPixels: widthMaxPixels,
        useShortestPath: wrapLongitude ? 1 : 0
      }).draw();

      if (wrapLongitude) {
        this.state.model.setUniforms({
          useShortestPath: -1
        }).draw();
      }
    }
  }, {
    key: "_getModel",
    value: function _getModel(gl) {
      var positions = [0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0];
      return new _core2.Model(gl, _objectSpread(_objectSpread({}, this.getShaders()), {}, {
        id: this.props.id,
        geometry: new _core2.Geometry({
          drawMode: 5,
          attributes: {
            positions: new Float32Array(positions)
          }
        }),
        isInstanced: true
      }));
    }
  }]);
  return LineLayer;
}(_core.Layer);

exports.default = LineLayer;
(0, _defineProperty2.default)(LineLayer, "layerName", 'LineLayer');
(0, _defineProperty2.default)(LineLayer, "defaultProps", defaultProps);
//# sourceMappingURL=line-layer.js.map