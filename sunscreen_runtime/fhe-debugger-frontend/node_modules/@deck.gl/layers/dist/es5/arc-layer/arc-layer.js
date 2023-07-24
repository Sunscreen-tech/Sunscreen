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

var _arcLayerVertex = _interopRequireDefault(require("./arc-layer-vertex.glsl"));

var _arcLayerFragment = _interopRequireDefault(require("./arc-layer-fragment.glsl"));

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

var ArcLayer = function (_Layer) {
  (0, _inherits2.default)(ArcLayer, _Layer);

  var _super = _createSuper(ArcLayer);

  function ArcLayer() {
    var _this;

    (0, _classCallCheck2.default)(this, ArcLayer);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _super.call.apply(_super, [this].concat(args));
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "state", void 0);
    return _this;
  }

  (0, _createClass2.default)(ArcLayer, [{
    key: "getBounds",
    value: function getBounds() {
      var _this$getAttributeMan;

      return (_this$getAttributeMan = this.getAttributeManager()) === null || _this$getAttributeMan === void 0 ? void 0 : _this$getAttributeMan.getBounds(['instanceSourcePositions', 'instanceTargetPositions']);
    }
  }, {
    key: "getShaders",
    value: function getShaders() {
      return (0, _get2.default)((0, _getPrototypeOf2.default)(ArcLayer.prototype), "getShaders", this).call(this, {
        vs: _arcLayerVertex.default,
        fs: _arcLayerFragment.default,
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
  }, {
    key: "updateState",
    value: function updateState(opts) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(ArcLayer.prototype), "updateState", this).call(this, opts);

      if (opts.changeFlags.extensionsChanged) {
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
          greatCircle = _this$props.greatCircle,
          wrapLongitude = _this$props.wrapLongitude;
      this.state.model.setUniforms(uniforms).setUniforms({
        greatCircle: greatCircle,
        widthUnits: _core.UNIT[widthUnits],
        widthScale: widthScale,
        widthMinPixels: widthMinPixels,
        widthMaxPixels: widthMaxPixels,
        useShortestPath: wrapLongitude
      }).draw();
    }
  }, {
    key: "_getModel",
    value: function _getModel(gl) {
      var positions = [];
      var NUM_SEGMENTS = 50;

      for (var i = 0; i < NUM_SEGMENTS; i++) {
        positions = positions.concat([i, 1, 0, i, -1, 0]);
      }

      var model = new _core2.Model(gl, _objectSpread(_objectSpread({}, this.getShaders()), {}, {
        id: this.props.id,
        geometry: new _core2.Geometry({
          drawMode: 5,
          attributes: {
            positions: new Float32Array(positions)
          }
        }),
        isInstanced: true
      }));
      model.setUniforms({
        numSegments: NUM_SEGMENTS
      });
      return model;
    }
  }]);
  return ArcLayer;
}(_core.Layer);

exports.default = ArcLayer;
(0, _defineProperty2.default)(ArcLayer, "layerName", 'ArcLayer');
(0, _defineProperty2.default)(ArcLayer, "defaultProps", defaultProps);
//# sourceMappingURL=arc-layer.js.map