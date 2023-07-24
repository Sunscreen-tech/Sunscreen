"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _core = require("@deck.gl/core");

var _solidPolygonLayer = _interopRequireDefault(require("../solid-polygon-layer/solid-polygon-layer"));

var _pathLayer = _interopRequireDefault(require("../path-layer/path-layer"));

var Polygon = _interopRequireWildcard(require("../solid-polygon-layer/polygon"));

var _utils = require("../utils");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var defaultLineColor = [0, 0, 0, 255];
var defaultFillColor = [0, 0, 0, 255];
var defaultProps = {
  stroked: true,
  filled: true,
  extruded: false,
  elevationScale: 1,
  wireframe: false,
  _normalize: true,
  _windingOrder: 'CW',
  lineWidthUnits: 'meters',
  lineWidthScale: 1,
  lineWidthMinPixels: 0,
  lineWidthMaxPixels: Number.MAX_SAFE_INTEGER,
  lineJointRounded: false,
  lineMiterLimit: 4,
  getPolygon: {
    type: 'accessor',
    value: function value(f) {
      return f.polygon;
    }
  },
  getFillColor: {
    type: 'accessor',
    value: defaultFillColor
  },
  getLineColor: {
    type: 'accessor',
    value: defaultLineColor
  },
  getLineWidth: {
    type: 'accessor',
    value: 1
  },
  getElevation: {
    type: 'accessor',
    value: 1000
  },
  material: true
};

var PolygonLayer = function (_CompositeLayer) {
  (0, _inherits2.default)(PolygonLayer, _CompositeLayer);

  var _super = _createSuper(PolygonLayer);

  function PolygonLayer() {
    (0, _classCallCheck2.default)(this, PolygonLayer);
    return _super.apply(this, arguments);
  }

  (0, _createClass2.default)(PolygonLayer, [{
    key: "initializeState",
    value: function initializeState() {
      this.state = {
        paths: []
      };

      if (this.props.getLineDashArray) {
        _core.log.removed('getLineDashArray', 'PathStyleExtension')();
      }
    }
  }, {
    key: "updateState",
    value: function updateState(_ref) {
      var _this = this;

      var changeFlags = _ref.changeFlags;
      var geometryChanged = changeFlags.dataChanged || changeFlags.updateTriggersChanged && (changeFlags.updateTriggersChanged.all || changeFlags.updateTriggersChanged.getPolygon);

      if (geometryChanged && Array.isArray(changeFlags.dataChanged)) {
        var paths = this.state.paths.slice();
        var pathsDiff = changeFlags.dataChanged.map(function (dataRange) {
          return (0, _utils.replaceInRange)({
            data: paths,
            getIndex: function getIndex(p) {
              return p.__source.index;
            },
            dataRange: dataRange,
            replace: _this._getPaths(dataRange)
          });
        });
        this.setState({
          paths: paths,
          pathsDiff: pathsDiff
        });
      } else if (geometryChanged) {
        this.setState({
          paths: this._getPaths(),
          pathsDiff: null
        });
      }
    }
  }, {
    key: "_getPaths",
    value: function _getPaths() {
      var dataRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _this$props = this.props,
          data = _this$props.data,
          getPolygon = _this$props.getPolygon,
          positionFormat = _this$props.positionFormat,
          _normalize = _this$props._normalize;
      var paths = [];
      var positionSize = positionFormat === 'XY' ? 2 : 3;
      var startRow = dataRange.startRow,
          endRow = dataRange.endRow;

      var _createIterable = (0, _core.createIterable)(data, startRow, endRow),
          iterable = _createIterable.iterable,
          objectInfo = _createIterable.objectInfo;

      var _iterator = _createForOfIteratorHelper(iterable),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var object = _step.value;
          objectInfo.index++;
          var polygon = getPolygon(object, objectInfo);

          if (_normalize) {
            polygon = Polygon.normalize(polygon, positionSize);
          }

          var _polygon = polygon,
              holeIndices = _polygon.holeIndices;
          var positions = polygon.positions || polygon;

          if (holeIndices) {
            for (var i = 0; i <= holeIndices.length; i++) {
              var path = positions.slice(holeIndices[i - 1] || 0, holeIndices[i] || positions.length);
              paths.push(this.getSubLayerRow({
                path: path
              }, object, objectInfo.index));
            }
          } else {
            paths.push(this.getSubLayerRow({
              path: positions
            }, object, objectInfo.index));
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return paths;
    }
  }, {
    key: "renderLayers",
    value: function renderLayers() {
      var _this$props2 = this.props,
          data = _this$props2.data,
          _dataDiff = _this$props2._dataDiff,
          stroked = _this$props2.stroked,
          filled = _this$props2.filled,
          extruded = _this$props2.extruded,
          wireframe = _this$props2.wireframe,
          _normalize = _this$props2._normalize,
          _windingOrder = _this$props2._windingOrder,
          elevationScale = _this$props2.elevationScale,
          transitions = _this$props2.transitions,
          positionFormat = _this$props2.positionFormat;
      var _this$props3 = this.props,
          lineWidthUnits = _this$props3.lineWidthUnits,
          lineWidthScale = _this$props3.lineWidthScale,
          lineWidthMinPixels = _this$props3.lineWidthMinPixels,
          lineWidthMaxPixels = _this$props3.lineWidthMaxPixels,
          lineJointRounded = _this$props3.lineJointRounded,
          lineMiterLimit = _this$props3.lineMiterLimit,
          lineDashJustified = _this$props3.lineDashJustified;
      var _this$props4 = this.props,
          getFillColor = _this$props4.getFillColor,
          getLineColor = _this$props4.getLineColor,
          getLineWidth = _this$props4.getLineWidth,
          getLineDashArray = _this$props4.getLineDashArray,
          getElevation = _this$props4.getElevation,
          getPolygon = _this$props4.getPolygon,
          updateTriggers = _this$props4.updateTriggers,
          material = _this$props4.material;
      var _this$state = this.state,
          paths = _this$state.paths,
          pathsDiff = _this$state.pathsDiff;
      var FillLayer = this.getSubLayerClass('fill', _solidPolygonLayer.default);
      var StrokeLayer = this.getSubLayerClass('stroke', _pathLayer.default);
      var polygonLayer = this.shouldRenderSubLayer('fill', paths) && new FillLayer({
        _dataDiff: _dataDiff,
        extruded: extruded,
        elevationScale: elevationScale,
        filled: filled,
        wireframe: wireframe,
        _normalize: _normalize,
        _windingOrder: _windingOrder,
        getElevation: getElevation,
        getFillColor: getFillColor,
        getLineColor: extruded && wireframe ? getLineColor : defaultLineColor,
        material: material,
        transitions: transitions
      }, this.getSubLayerProps({
        id: 'fill',
        updateTriggers: updateTriggers && {
          getPolygon: updateTriggers.getPolygon,
          getElevation: updateTriggers.getElevation,
          getFillColor: updateTriggers.getFillColor,
          lineColors: extruded && wireframe,
          getLineColor: updateTriggers.getLineColor
        }
      }), {
        data: data,
        positionFormat: positionFormat,
        getPolygon: getPolygon
      });
      var polygonLineLayer = !extruded && stroked && this.shouldRenderSubLayer('stroke', paths) && new StrokeLayer({
        _dataDiff: pathsDiff && function () {
          return pathsDiff;
        },
        widthUnits: lineWidthUnits,
        widthScale: lineWidthScale,
        widthMinPixels: lineWidthMinPixels,
        widthMaxPixels: lineWidthMaxPixels,
        jointRounded: lineJointRounded,
        miterLimit: lineMiterLimit,
        dashJustified: lineDashJustified,
        _pathType: 'loop',
        transitions: transitions && {
          getWidth: transitions.getLineWidth,
          getColor: transitions.getLineColor,
          getPath: transitions.getPolygon
        },
        getColor: this.getSubLayerAccessor(getLineColor),
        getWidth: this.getSubLayerAccessor(getLineWidth),
        getDashArray: this.getSubLayerAccessor(getLineDashArray)
      }, this.getSubLayerProps({
        id: 'stroke',
        updateTriggers: updateTriggers && {
          getWidth: updateTriggers.getLineWidth,
          getColor: updateTriggers.getLineColor,
          getDashArray: updateTriggers.getLineDashArray
        }
      }), {
        data: paths,
        positionFormat: positionFormat,
        getPath: function getPath(x) {
          return x.path;
        }
      });
      return [!extruded && polygonLayer, polygonLineLayer, extruded && polygonLayer];
    }
  }]);
  return PolygonLayer;
}(_core.CompositeLayer);

exports.default = PolygonLayer;
(0, _defineProperty2.default)(PolygonLayer, "layerName", 'PolygonLayer');
(0, _defineProperty2.default)(PolygonLayer, "defaultProps", defaultProps);
//# sourceMappingURL=polygon-layer.js.map