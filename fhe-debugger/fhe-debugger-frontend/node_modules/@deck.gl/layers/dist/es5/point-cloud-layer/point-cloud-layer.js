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

var _pointCloudLayerVertex = _interopRequireDefault(require("./point-cloud-layer-vertex.glsl"));

var _pointCloudLayerFragment = _interopRequireDefault(require("./point-cloud-layer-fragment.glsl"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var DEFAULT_COLOR = [0, 0, 0, 255];
var DEFAULT_NORMAL = [0, 0, 1];
var defaultProps = {
  sizeUnits: 'pixels',
  pointSize: {
    type: 'number',
    min: 0,
    value: 10
  },
  getPosition: {
    type: 'accessor',
    value: function value(x) {
      return x.position;
    }
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
  var header = data.header,
      attributes = data.attributes;

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

var PointCloudLayer = function (_Layer) {
  (0, _inherits2.default)(PointCloudLayer, _Layer);

  var _super = _createSuper(PointCloudLayer);

  function PointCloudLayer() {
    (0, _classCallCheck2.default)(this, PointCloudLayer);
    return _super.apply(this, arguments);
  }

  (0, _createClass2.default)(PointCloudLayer, [{
    key: "getShaders",
    value: function getShaders() {
      return (0, _get2.default)((0, _getPrototypeOf2.default)(PointCloudLayer.prototype), "getShaders", this).call(this, {
        vs: _pointCloudLayerVertex.default,
        fs: _pointCloudLayerFragment.default,
        modules: [_core.project32, _core.gouraudLighting, _core.picking]
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
  }, {
    key: "updateState",
    value: function updateState(params) {
      var changeFlags = params.changeFlags,
          props = params.props;
      (0, _get2.default)((0, _getPrototypeOf2.default)(PointCloudLayer.prototype), "updateState", this).call(this, params);

      if (changeFlags.extensionsChanged) {
        var _this$state$model;

        var gl = this.context.gl;
        (_this$state$model = this.state.model) === null || _this$state$model === void 0 ? void 0 : _this$state$model.delete();
        this.state.model = this._getModel(gl);
        this.getAttributeManager().invalidateAll();
      }

      if (changeFlags.dataChanged) {
        normalizeData(props.data);
      }
    }
  }, {
    key: "draw",
    value: function draw(_ref) {
      var uniforms = _ref.uniforms;
      var _this$props = this.props,
          pointSize = _this$props.pointSize,
          sizeUnits = _this$props.sizeUnits;
      this.state.model.setUniforms(uniforms).setUniforms({
        sizeUnits: _core.UNIT[sizeUnits],
        radiusPixels: pointSize
      }).draw();
    }
  }, {
    key: "_getModel",
    value: function _getModel(gl) {
      var positions = [];

      for (var i = 0; i < 3; i++) {
        var angle = i / 3 * Math.PI * 2;
        positions.push(Math.cos(angle) * 2, Math.sin(angle) * 2, 0);
      }

      return new _core2.Model(gl, _objectSpread(_objectSpread({}, this.getShaders()), {}, {
        id: this.props.id,
        geometry: new _core2.Geometry({
          drawMode: 4,
          attributes: {
            positions: new Float32Array(positions)
          }
        }),
        isInstanced: true
      }));
    }
  }]);
  return PointCloudLayer;
}(_core.Layer);

exports.default = PointCloudLayer;
(0, _defineProperty2.default)(PointCloudLayer, "layerName", 'PointCloudLayer');
(0, _defineProperty2.default)(PointCloudLayer, "defaultProps", defaultProps);
//# sourceMappingURL=point-cloud-layer.js.map