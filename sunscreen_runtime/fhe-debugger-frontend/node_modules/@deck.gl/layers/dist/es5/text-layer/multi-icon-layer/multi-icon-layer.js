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

var _iconLayer = _interopRequireDefault(require("../../icon-layer/icon-layer"));

var _multiIconLayerFragment = _interopRequireDefault(require("./multi-icon-layer-fragment.glsl"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var DEFAULT_BUFFER = 192.0 / 256;
var EMPTY_ARRAY = [];
var defaultProps = {
  getIconOffsets: {
    type: 'accessor',
    value: function value(x) {
      return x.offsets;
    }
  },
  alphaCutoff: 0.001,
  smoothing: 0.1,
  outlineWidth: 0,
  outlineColor: {
    type: 'color',
    value: [0, 0, 0, 255]
  }
};

var MultiIconLayer = function (_IconLayer) {
  (0, _inherits2.default)(MultiIconLayer, _IconLayer);

  var _super = _createSuper(MultiIconLayer);

  function MultiIconLayer() {
    var _this;

    (0, _classCallCheck2.default)(this, MultiIconLayer);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _super.call.apply(_super, [this].concat(args));
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "state", void 0);
    return _this;
  }

  (0, _createClass2.default)(MultiIconLayer, [{
    key: "getShaders",
    value: function getShaders() {
      return _objectSpread(_objectSpread({}, (0, _get2.default)((0, _getPrototypeOf2.default)(MultiIconLayer.prototype), "getShaders", this).call(this)), {}, {
        fs: _multiIconLayerFragment.default
      });
    }
  }, {
    key: "initializeState",
    value: function initializeState() {
      var _this2 = this;

      (0, _get2.default)((0, _getPrototypeOf2.default)(MultiIconLayer.prototype), "initializeState", this).call(this);
      var attributeManager = this.getAttributeManager();
      attributeManager.addInstanced({
        instanceOffsets: {
          size: 2,
          accessor: 'getIconOffsets'
        },
        instancePickingColors: {
          type: 5121,
          size: 3,
          accessor: function accessor(object, _ref) {
            var index = _ref.index,
                value = _ref.target;
            return _this2.encodePickingColor(index, value);
          }
        }
      });
    }
  }, {
    key: "updateState",
    value: function updateState(params) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(MultiIconLayer.prototype), "updateState", this).call(this, params);
      var props = params.props,
          oldProps = params.oldProps;
      var outlineColor = props.outlineColor;

      if (outlineColor !== oldProps.outlineColor) {
        outlineColor = outlineColor.map(function (x) {
          return x / 255;
        });
        outlineColor[3] = Number.isFinite(outlineColor[3]) ? outlineColor[3] : 1;
        this.setState({
          outlineColor: outlineColor
        });
      }

      if (!props.sdf && props.outlineWidth) {
        _core.log.warn("".concat(this.id, ": fontSettings.sdf is required to render outline"))();
      }
    }
  }, {
    key: "draw",
    value: function draw(params) {
      var _this$props = this.props,
          sdf = _this$props.sdf,
          smoothing = _this$props.smoothing,
          outlineWidth = _this$props.outlineWidth;
      var outlineColor = this.state.outlineColor;
      var outlineBuffer = outlineWidth ? Math.max(smoothing, DEFAULT_BUFFER * (1 - outlineWidth)) : -1;
      params.uniforms = _objectSpread(_objectSpread({}, params.uniforms), {}, {
        sdfBuffer: DEFAULT_BUFFER,
        outlineBuffer: outlineBuffer,
        gamma: smoothing,
        sdf: Boolean(sdf),
        outlineColor: outlineColor
      });
      (0, _get2.default)((0, _getPrototypeOf2.default)(MultiIconLayer.prototype), "draw", this).call(this, params);

      if (sdf && outlineWidth) {
        var iconManager = this.state.iconManager;
        var iconsTexture = iconManager.getTexture();

        if (iconsTexture) {
          this.state.model.draw({
            uniforms: {
              outlineBuffer: DEFAULT_BUFFER
            }
          });
        }
      }
    }
  }, {
    key: "getInstanceOffset",
    value: function getInstanceOffset(icons) {
      var _this3 = this;

      return icons ? Array.from(icons).flatMap(function (icon) {
        return (0, _get2.default)((0, _getPrototypeOf2.default)(MultiIconLayer.prototype), "getInstanceOffset", _this3).call(_this3, icon);
      }) : EMPTY_ARRAY;
    }
  }, {
    key: "getInstanceColorMode",
    value: function getInstanceColorMode(icons) {
      return 1;
    }
  }, {
    key: "getInstanceIconFrame",
    value: function getInstanceIconFrame(icons) {
      var _this4 = this;

      return icons ? Array.from(icons).flatMap(function (icon) {
        return (0, _get2.default)((0, _getPrototypeOf2.default)(MultiIconLayer.prototype), "getInstanceIconFrame", _this4).call(_this4, icon);
      }) : EMPTY_ARRAY;
    }
  }]);
  return MultiIconLayer;
}(_iconLayer.default);

exports.default = MultiIconLayer;
(0, _defineProperty2.default)(MultiIconLayer, "defaultProps", defaultProps);
(0, _defineProperty2.default)(MultiIconLayer, "layerName", 'MultiIconLayer');
//# sourceMappingURL=multi-icon-layer.js.map