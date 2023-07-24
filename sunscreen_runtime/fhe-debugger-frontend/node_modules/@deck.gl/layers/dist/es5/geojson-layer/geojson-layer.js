"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _get2 = _interopRequireDefault(require("@babel/runtime/helpers/get"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _core = require("@deck.gl/core");

var _utils = require("../utils");

var _geojsonBinary = require("./geojson-binary");

var _subLayerMap = require("./sub-layer-map");

var _geojson = require("./geojson");

var _geojsonLayerProps = require("./geojson-layer-props");

var _excluded = ["instancePickingColors"];

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var FEATURE_TYPES = ['points', 'linestrings', 'polygons'];

var defaultProps = _objectSpread(_objectSpread(_objectSpread(_objectSpread(_objectSpread(_objectSpread({}, (0, _subLayerMap.getDefaultProps)(_subLayerMap.POINT_LAYER.circle)), (0, _subLayerMap.getDefaultProps)(_subLayerMap.POINT_LAYER.icon)), (0, _subLayerMap.getDefaultProps)(_subLayerMap.POINT_LAYER.text)), (0, _subLayerMap.getDefaultProps)(_subLayerMap.LINE_LAYER)), (0, _subLayerMap.getDefaultProps)(_subLayerMap.POLYGON_LAYER)), {}, {
  stroked: true,
  filled: true,
  extruded: false,
  wireframe: false,
  _full3d: false,
  iconAtlas: {
    type: 'object',
    value: null
  },
  iconMapping: {
    type: 'object',
    value: {}
  },
  getIcon: {
    type: 'accessor',
    value: function value(f) {
      return f.properties.icon;
    }
  },
  getText: {
    type: 'accessor',
    value: function value(f) {
      return f.properties.text;
    }
  },
  pointType: 'circle',
  getRadius: {
    deprecatedFor: 'getPointRadius'
  }
});

var GeoJsonLayer = function (_CompositeLayer) {
  (0, _inherits2.default)(GeoJsonLayer, _CompositeLayer);

  var _super = _createSuper(GeoJsonLayer);

  function GeoJsonLayer() {
    (0, _classCallCheck2.default)(this, GeoJsonLayer);
    return _super.apply(this, arguments);
  }

  (0, _createClass2.default)(GeoJsonLayer, [{
    key: "initializeState",
    value: function initializeState() {
      this.state = {
        layerProps: {},
        features: {}
      };
    }
  }, {
    key: "updateState",
    value: function updateState(_ref) {
      var props = _ref.props,
          changeFlags = _ref.changeFlags;

      if (!changeFlags.dataChanged) {
        return;
      }

      var data = this.props.data;
      var binary = data && 'points' in data && 'polygons' in data && 'lines' in data;
      this.setState({
        binary: binary
      });

      if (binary) {
        this._updateStateBinary({
          props: props,
          changeFlags: changeFlags
        });
      } else {
        this._updateStateJSON({
          props: props,
          changeFlags: changeFlags
        });
      }
    }
  }, {
    key: "_updateStateBinary",
    value: function _updateStateBinary(_ref2) {
      var props = _ref2.props,
          changeFlags = _ref2.changeFlags;
      var layerProps = (0, _geojsonLayerProps.createLayerPropsFromBinary)(props.data, this.encodePickingColor);
      this.setState({
        layerProps: layerProps
      });
    }
  }, {
    key: "_updateStateJSON",
    value: function _updateStateJSON(_ref3) {
      var props = _ref3.props,
          changeFlags = _ref3.changeFlags;
      var features = (0, _geojson.getGeojsonFeatures)(props.data);
      var wrapFeature = this.getSubLayerRow.bind(this);
      var newFeatures = {};
      var featuresDiff = {};

      if (Array.isArray(changeFlags.dataChanged)) {
        var oldFeatures = this.state.features;

        for (var key in oldFeatures) {
          newFeatures[key] = oldFeatures[key].slice();
          featuresDiff[key] = [];
        }

        var _iterator = _createForOfIteratorHelper(changeFlags.dataChanged),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var dataRange = _step.value;
            var partialFeatures = (0, _geojson.separateGeojsonFeatures)(features, wrapFeature, dataRange);

            for (var _key in oldFeatures) {
              featuresDiff[_key].push((0, _utils.replaceInRange)({
                data: newFeatures[_key],
                getIndex: function getIndex(f) {
                  return f.__source.index;
                },
                dataRange: dataRange,
                replace: partialFeatures[_key]
              }));
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      } else {
        newFeatures = (0, _geojson.separateGeojsonFeatures)(features, wrapFeature);
      }

      var layerProps = (0, _geojsonLayerProps.createLayerPropsFromFeatures)(newFeatures, featuresDiff);
      this.setState({
        features: newFeatures,
        featuresDiff: featuresDiff,
        layerProps: layerProps
      });
    }
  }, {
    key: "getPickingInfo",
    value: function getPickingInfo(params) {
      var _this = this;

      var info = (0, _get2.default)((0, _getPrototypeOf2.default)(GeoJsonLayer.prototype), "getPickingInfo", this).call(this, params);
      var index = info.index,
          sourceLayer = info.sourceLayer;
      info.featureType = FEATURE_TYPES.find(function (ft) {
        return sourceLayer.id.startsWith("".concat(_this.id, "-").concat(ft, "-"));
      });

      if (index >= 0 && sourceLayer.id.startsWith("".concat(this.id, "-points-text")) && this.state.binary) {
        info.index = this.props.data.points.globalFeatureIds.value[index];
      }

      return info;
    }
  }, {
    key: "_updateAutoHighlight",
    value: function _updateAutoHighlight(info) {
      var pointLayerIdPrefix = "".concat(this.id, "-points-");
      var sourceIsPoints = info.featureType === 'points';

      var _iterator2 = _createForOfIteratorHelper(this.getSubLayers()),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var layer = _step2.value;

          if (layer.id.startsWith(pointLayerIdPrefix) === sourceIsPoints) {
            layer.updateAutoHighlight(info);
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }
  }, {
    key: "_renderPolygonLayer",
    value: function _renderPolygonLayer() {
      var _this$props = this.props,
          extruded = _this$props.extruded,
          wireframe = _this$props.wireframe;
      var layerProps = this.state.layerProps;
      var id = 'polygons-fill';
      var PolygonFillLayer = this.shouldRenderSubLayer(id, layerProps.polygons.data) && this.getSubLayerClass(id, _subLayerMap.POLYGON_LAYER.type);

      if (PolygonFillLayer) {
        var forwardedProps = (0, _subLayerMap.forwardProps)(this, _subLayerMap.POLYGON_LAYER.props);
        var useLineColor = extruded && wireframe;

        if (!useLineColor) {
          delete forwardedProps.getLineColor;
        }

        forwardedProps.updateTriggers.lineColors = useLineColor;
        return new PolygonFillLayer(forwardedProps, this.getSubLayerProps({
          id: id,
          updateTriggers: forwardedProps.updateTriggers
        }), layerProps.polygons);
      }

      return null;
    }
  }, {
    key: "_renderLineLayers",
    value: function _renderLineLayers() {
      var _this$props2 = this.props,
          extruded = _this$props2.extruded,
          stroked = _this$props2.stroked;
      var layerProps = this.state.layerProps;
      var polygonStrokeLayerId = 'polygons-stroke';
      var lineStringsLayerId = 'linestrings';
      var PolygonStrokeLayer = !extruded && stroked && this.shouldRenderSubLayer(polygonStrokeLayerId, layerProps.polygonsOutline.data) && this.getSubLayerClass(polygonStrokeLayerId, _subLayerMap.LINE_LAYER.type);
      var LineStringsLayer = this.shouldRenderSubLayer(lineStringsLayerId, layerProps.lines.data) && this.getSubLayerClass(lineStringsLayerId, _subLayerMap.LINE_LAYER.type);

      if (PolygonStrokeLayer || LineStringsLayer) {
        var forwardedProps = (0, _subLayerMap.forwardProps)(this, _subLayerMap.LINE_LAYER.props);
        return [PolygonStrokeLayer && new PolygonStrokeLayer(forwardedProps, this.getSubLayerProps({
          id: polygonStrokeLayerId,
          updateTriggers: forwardedProps.updateTriggers
        }), layerProps.polygonsOutline), LineStringsLayer && new LineStringsLayer(forwardedProps, this.getSubLayerProps({
          id: lineStringsLayerId,
          updateTriggers: forwardedProps.updateTriggers
        }), layerProps.lines)];
      }

      return null;
    }
  }, {
    key: "_renderPointLayers",
    value: function _renderPointLayers() {
      var pointType = this.props.pointType;
      var _this$state = this.state,
          layerProps = _this$state.layerProps,
          binary = _this$state.binary;
      var highlightedObjectIndex = this.props.highlightedObjectIndex;

      if (!binary && Number.isFinite(highlightedObjectIndex)) {
        highlightedObjectIndex = layerProps.points.data.findIndex(function (d) {
          return d.__source.index === highlightedObjectIndex;
        });
      }

      var types = new Set(pointType.split('+'));
      var pointLayers = [];

      var _iterator3 = _createForOfIteratorHelper(types),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var type = _step3.value;
          var id = "points-".concat(type);
          var PointLayerMapping = _subLayerMap.POINT_LAYER[type];
          var PointsLayer = PointLayerMapping && this.shouldRenderSubLayer(id, layerProps.points.data) && this.getSubLayerClass(id, PointLayerMapping.type);

          if (PointsLayer) {
            var forwardedProps = (0, _subLayerMap.forwardProps)(this, PointLayerMapping.props);
            var pointsLayerProps = layerProps.points;

            if (type === 'text' && binary) {
              var _pointsLayerProps$dat = pointsLayerProps.data.attributes,
                  instancePickingColors = _pointsLayerProps$dat.instancePickingColors,
                  rest = (0, _objectWithoutProperties2.default)(_pointsLayerProps$dat, _excluded);
              pointsLayerProps = _objectSpread(_objectSpread({}, pointsLayerProps), {}, {
                data: _objectSpread(_objectSpread({}, pointsLayerProps.data), {}, {
                  attributes: rest
                })
              });
            }

            pointLayers.push(new PointsLayer(forwardedProps, this.getSubLayerProps({
              id: id,
              updateTriggers: forwardedProps.updateTriggers,
              highlightedObjectIndex: highlightedObjectIndex
            }), pointsLayerProps));
          }
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      return pointLayers;
    }
  }, {
    key: "renderLayers",
    value: function renderLayers() {
      var extruded = this.props.extruded;

      var polygonFillLayer = this._renderPolygonLayer();

      var lineLayers = this._renderLineLayers();

      var pointLayers = this._renderPointLayers();

      return [!extruded && polygonFillLayer, lineLayers, pointLayers, extruded && polygonFillLayer];
    }
  }, {
    key: "getSubLayerAccessor",
    value: function getSubLayerAccessor(accessor) {
      var binary = this.state.binary;

      if (!binary || typeof accessor !== 'function') {
        return (0, _get2.default)((0, _getPrototypeOf2.default)(GeoJsonLayer.prototype), "getSubLayerAccessor", this).call(this, accessor);
      }

      return function (object, info) {
        var data = info.data,
            index = info.index;
        var feature = (0, _geojsonBinary.binaryToFeatureForAccesor)(data, index);
        return accessor(feature, info);
      };
    }
  }]);
  return GeoJsonLayer;
}(_core.CompositeLayer);

exports.default = GeoJsonLayer;
(0, _defineProperty2.default)(GeoJsonLayer, "layerName", 'GeoJsonLayer');
(0, _defineProperty2.default)(GeoJsonLayer, "defaultProps", defaultProps);
//# sourceMappingURL=geojson-layer.js.map