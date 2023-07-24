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

var _iconLayerVertex = _interopRequireDefault(require("./icon-layer-vertex.glsl"));

var _iconLayerFragment = _interopRequireDefault(require("./icon-layer-fragment.glsl"));

var _iconManager = _interopRequireDefault(require("./icon-manager"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var DEFAULT_COLOR = [0, 0, 0, 255];
var defaultProps = {
  iconAtlas: {
    type: 'image',
    value: null,
    async: true
  },
  iconMapping: {
    type: 'object',
    value: {},
    async: true
  },
  sizeScale: {
    type: 'number',
    value: 1,
    min: 0
  },
  billboard: true,
  sizeUnits: 'pixels',
  sizeMinPixels: {
    type: 'number',
    min: 0,
    value: 0
  },
  sizeMaxPixels: {
    type: 'number',
    min: 0,
    value: Number.MAX_SAFE_INTEGER
  },
  alphaCutoff: {
    type: 'number',
    value: 0.05,
    min: 0,
    max: 1
  },
  getPosition: {
    type: 'accessor',
    value: function value(x) {
      return x.position;
    }
  },
  getIcon: {
    type: 'accessor',
    value: function value(x) {
      return x.icon;
    }
  },
  getColor: {
    type: 'accessor',
    value: DEFAULT_COLOR
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
  onIconError: {
    type: 'function',
    value: null,
    optional: true
  },
  textureParameters: {
    type: 'object',
    ignore: true
  }
};

var IconLayer = function (_Layer) {
  (0, _inherits2.default)(IconLayer, _Layer);

  var _super = _createSuper(IconLayer);

  function IconLayer() {
    var _this;

    (0, _classCallCheck2.default)(this, IconLayer);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _super.call.apply(_super, [this].concat(args));
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "state", void 0);
    return _this;
  }

  (0, _createClass2.default)(IconLayer, [{
    key: "getShaders",
    value: function getShaders() {
      return (0, _get2.default)((0, _getPrototypeOf2.default)(IconLayer.prototype), "getShaders", this).call(this, {
        vs: _iconLayerVertex.default,
        fs: _iconLayerFragment.default,
        modules: [_core.project32, _core.picking]
      });
    }
  }, {
    key: "initializeState",
    value: function initializeState() {
      this.state = {
        iconManager: new _iconManager.default(this.context.gl, {
          onUpdate: this._onUpdate.bind(this),
          onError: this._onError.bind(this)
        })
      };
      var attributeManager = this.getAttributeManager();
      attributeManager.addInstanced({
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
        instanceOffsets: {
          size: 2,
          accessor: 'getIcon',
          transform: this.getInstanceOffset
        },
        instanceIconFrames: {
          size: 4,
          accessor: 'getIcon',
          transform: this.getInstanceIconFrame
        },
        instanceColorModes: {
          size: 1,
          type: 5121,
          accessor: 'getIcon',
          transform: this.getInstanceColorMode
        },
        instanceColors: {
          size: this.props.colorFormat.length,
          type: 5121,
          normalized: true,
          transition: true,
          accessor: 'getColor',
          defaultValue: DEFAULT_COLOR
        },
        instanceAngles: {
          size: 1,
          transition: true,
          accessor: 'getAngle'
        },
        instancePixelOffset: {
          size: 2,
          transition: true,
          accessor: 'getPixelOffset'
        }
      });
    }
  }, {
    key: "updateState",
    value: function updateState(params) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(IconLayer.prototype), "updateState", this).call(this, params);
      var props = params.props,
          oldProps = params.oldProps,
          changeFlags = params.changeFlags;
      var attributeManager = this.getAttributeManager();
      var iconAtlas = props.iconAtlas,
          iconMapping = props.iconMapping,
          data = props.data,
          getIcon = props.getIcon,
          textureParameters = props.textureParameters;
      var iconManager = this.state.iconManager;
      var prePacked = iconAtlas || this.internalState.isAsyncPropLoading('iconAtlas');
      iconManager.setProps({
        loadOptions: props.loadOptions,
        autoPacking: !prePacked,
        iconAtlas: iconAtlas,
        iconMapping: prePacked ? iconMapping : null,
        textureParameters: textureParameters
      });

      if (prePacked) {
        if (oldProps.iconMapping !== props.iconMapping) {
          attributeManager.invalidate('getIcon');
        }
      } else if (changeFlags.dataChanged || changeFlags.updateTriggersChanged && (changeFlags.updateTriggersChanged.all || changeFlags.updateTriggersChanged.getIcon)) {
        iconManager.packIcons(data, getIcon);
      }

      if (changeFlags.extensionsChanged) {
        var _this$state$model;

        var gl = this.context.gl;
        (_this$state$model = this.state.model) === null || _this$state$model === void 0 ? void 0 : _this$state$model.delete();
        this.state.model = this._getModel(gl);
        attributeManager.invalidateAll();
      }
    }
  }, {
    key: "isLoaded",
    get: function get() {
      return (0, _get2.default)((0, _getPrototypeOf2.default)(IconLayer.prototype), "isLoaded", this) && this.state.iconManager.isLoaded;
    }
  }, {
    key: "finalizeState",
    value: function finalizeState(context) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(IconLayer.prototype), "finalizeState", this).call(this, context);
      this.state.iconManager.finalize();
    }
  }, {
    key: "draw",
    value: function draw(_ref) {
      var uniforms = _ref.uniforms;
      var _this$props = this.props,
          sizeScale = _this$props.sizeScale,
          sizeMinPixels = _this$props.sizeMinPixels,
          sizeMaxPixels = _this$props.sizeMaxPixels,
          sizeUnits = _this$props.sizeUnits,
          billboard = _this$props.billboard,
          alphaCutoff = _this$props.alphaCutoff;
      var iconManager = this.state.iconManager;
      var iconsTexture = iconManager.getTexture();

      if (iconsTexture) {
        this.state.model.setUniforms(uniforms).setUniforms({
          iconsTexture: iconsTexture,
          iconsTextureDim: [iconsTexture.width, iconsTexture.height],
          sizeUnits: _core.UNIT[sizeUnits],
          sizeScale: sizeScale,
          sizeMinPixels: sizeMinPixels,
          sizeMaxPixels: sizeMaxPixels,
          billboard: billboard,
          alphaCutoff: alphaCutoff
        }).draw();
      }
    }
  }, {
    key: "_getModel",
    value: function _getModel(gl) {
      var positions = [-1, -1, -1, 1, 1, 1, 1, -1];
      return new _core2.Model(gl, _objectSpread(_objectSpread({}, this.getShaders()), {}, {
        id: this.props.id,
        geometry: new _core2.Geometry({
          drawMode: 6,
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
  }, {
    key: "_onUpdate",
    value: function _onUpdate() {
      this.setNeedsRedraw();
    }
  }, {
    key: "_onError",
    value: function _onError(evt) {
      var _this$getCurrentLayer;

      var onIconError = (_this$getCurrentLayer = this.getCurrentLayer()) === null || _this$getCurrentLayer === void 0 ? void 0 : _this$getCurrentLayer.props.onIconError;

      if (onIconError) {
        onIconError(evt);
      } else {
        _core.log.error(evt.error.message)();
      }
    }
  }, {
    key: "getInstanceOffset",
    value: function getInstanceOffset(icon) {
      var _this$state$iconManag = this.state.iconManager.getIconMapping(icon),
          width = _this$state$iconManag.width,
          height = _this$state$iconManag.height,
          _this$state$iconManag2 = _this$state$iconManag.anchorX,
          anchorX = _this$state$iconManag2 === void 0 ? width / 2 : _this$state$iconManag2,
          _this$state$iconManag3 = _this$state$iconManag.anchorY,
          anchorY = _this$state$iconManag3 === void 0 ? height / 2 : _this$state$iconManag3;

      return [width / 2 - anchorX, height / 2 - anchorY];
    }
  }, {
    key: "getInstanceColorMode",
    value: function getInstanceColorMode(icon) {
      var mapping = this.state.iconManager.getIconMapping(icon);
      return mapping.mask ? 1 : 0;
    }
  }, {
    key: "getInstanceIconFrame",
    value: function getInstanceIconFrame(icon) {
      var _this$state$iconManag4 = this.state.iconManager.getIconMapping(icon),
          x = _this$state$iconManag4.x,
          y = _this$state$iconManag4.y,
          width = _this$state$iconManag4.width,
          height = _this$state$iconManag4.height;

      return [x, y, width, height];
    }
  }]);
  return IconLayer;
}(_core.Layer);

exports.default = IconLayer;
(0, _defineProperty2.default)(IconLayer, "defaultProps", defaultProps);
(0, _defineProperty2.default)(IconLayer, "layerName", 'IconLayer');
//# sourceMappingURL=icon-layer.js.map