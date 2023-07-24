"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _get2 = _interopRequireDefault(require("@babel/runtime/helpers/get"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var Polygon = _interopRequireWildcard(require("./polygon"));

var _core = require("@deck.gl/core");

var _polygon2 = require("@math.gl/polygon");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var PolygonTesselator = function (_Tesselator) {
  (0, _inherits2.default)(PolygonTesselator, _Tesselator);

  var _super = _createSuper(PolygonTesselator);

  function PolygonTesselator(opts) {
    (0, _classCallCheck2.default)(this, PolygonTesselator);
    var fp64 = opts.fp64,
        _opts$IndexType = opts.IndexType,
        IndexType = _opts$IndexType === void 0 ? Uint32Array : _opts$IndexType;
    return _super.call(this, _objectSpread(_objectSpread({}, opts), {}, {
      attributes: {
        positions: {
          size: 3,
          type: fp64 ? Float64Array : Float32Array
        },
        vertexValid: {
          type: Uint8ClampedArray,
          size: 1
        },
        indices: {
          type: IndexType,
          size: 1
        }
      }
    }));
  }

  (0, _createClass2.default)(PolygonTesselator, [{
    key: "get",
    value: function get(attributeName) {
      var attributes = this.attributes;

      if (attributeName === 'indices') {
        return attributes.indices && attributes.indices.subarray(0, this.vertexCount);
      }

      return attributes[attributeName];
    }
  }, {
    key: "updateGeometry",
    value: function updateGeometry(opts) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(PolygonTesselator.prototype), "updateGeometry", this).call(this, opts);
      var externalIndices = this.buffers.indices;

      if (externalIndices) {
        this.vertexCount = (externalIndices.value || externalIndices).length;
      } else if (this.data && !this.getGeometry) {
        throw new Error('missing indices buffer');
      }
    }
  }, {
    key: "normalizeGeometry",
    value: function normalizeGeometry(polygon) {
      if (this.normalize) {
        var normalizedPolygon = Polygon.normalize(polygon, this.positionSize);

        if (this.opts.resolution) {
          return (0, _polygon2.cutPolygonByGrid)(Polygon.getPositions(normalizedPolygon), Polygon.getHoleIndices(normalizedPolygon), {
            size: this.positionSize,
            gridResolution: this.opts.resolution,
            edgeTypes: true
          });
        }

        if (this.opts.wrapLongitude) {
          return (0, _polygon2.cutPolygonByMercatorBounds)(Polygon.getPositions(normalizedPolygon), Polygon.getHoleIndices(normalizedPolygon), {
            size: this.positionSize,
            maxLatitude: 86,
            edgeTypes: true
          });
        }

        return normalizedPolygon;
      }

      return polygon;
    }
  }, {
    key: "getGeometrySize",
    value: function getGeometrySize(polygon) {
      if (isCut(polygon)) {
        var size = 0;

        var _iterator = _createForOfIteratorHelper(polygon),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var subPolygon = _step.value;
            size += this.getGeometrySize(subPolygon);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        return size;
      }

      return Polygon.getPositions(polygon).length / this.positionSize;
    }
  }, {
    key: "getGeometryFromBuffer",
    value: function getGeometryFromBuffer(buffer) {
      if (this.normalize || !this.buffers.indices) {
        return (0, _get2.default)((0, _getPrototypeOf2.default)(PolygonTesselator.prototype), "getGeometryFromBuffer", this).call(this, buffer);
      }

      return null;
    }
  }, {
    key: "updateGeometryAttributes",
    value: function updateGeometryAttributes(polygon, context) {
      if (polygon && isCut(polygon)) {
        var _iterator2 = _createForOfIteratorHelper(polygon),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var subPolygon = _step2.value;
            var geometrySize = this.getGeometrySize(subPolygon);
            context.geometrySize = geometrySize;
            this.updateGeometryAttributes(subPolygon, context);
            context.vertexStart += geometrySize;
            context.indexStart = this.indexStarts[context.geometryIndex + 1];
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      } else {
        this._updateIndices(polygon, context);

        this._updatePositions(polygon, context);

        this._updateVertexValid(polygon, context);
      }
    }
  }, {
    key: "_updateIndices",
    value: function _updateIndices(polygon, _ref) {
      var geometryIndex = _ref.geometryIndex,
          offset = _ref.vertexStart,
          indexStart = _ref.indexStart;
      var attributes = this.attributes,
          indexStarts = this.indexStarts,
          typedArrayManager = this.typedArrayManager;
      var target = attributes.indices;

      if (!target || !polygon) {
        return;
      }

      var i = indexStart;
      var indices = Polygon.getSurfaceIndices(polygon, this.positionSize, this.opts.preproject, this.opts.full3d);
      target = typedArrayManager.allocate(target, indexStart + indices.length, {
        copy: true
      });

      for (var j = 0; j < indices.length; j++) {
        target[i++] = indices[j] + offset;
      }

      indexStarts[geometryIndex + 1] = indexStart + indices.length;
      attributes.indices = target;
    }
  }, {
    key: "_updatePositions",
    value: function _updatePositions(polygon, _ref2) {
      var vertexStart = _ref2.vertexStart,
          geometrySize = _ref2.geometrySize;
      var positions = this.attributes.positions,
          positionSize = this.positionSize;

      if (!positions || !polygon) {
        return;
      }

      var polygonPositions = Polygon.getPositions(polygon);

      for (var i = vertexStart, j = 0; j < geometrySize; i++, j++) {
        var x = polygonPositions[j * positionSize];
        var y = polygonPositions[j * positionSize + 1];
        var z = positionSize > 2 ? polygonPositions[j * positionSize + 2] : 0;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
    }
  }, {
    key: "_updateVertexValid",
    value: function _updateVertexValid(polygon, _ref3) {
      var vertexStart = _ref3.vertexStart,
          geometrySize = _ref3.geometrySize;
      var positionSize = this.positionSize;
      var vertexValid = this.attributes.vertexValid;
      var holeIndices = polygon && Polygon.getHoleIndices(polygon);

      if (polygon && polygon.edgeTypes) {
        vertexValid.set(polygon.edgeTypes, vertexStart);
      } else {
        vertexValid.fill(1, vertexStart, vertexStart + geometrySize);
      }

      if (holeIndices) {
        for (var j = 0; j < holeIndices.length; j++) {
          vertexValid[vertexStart + holeIndices[j] / positionSize - 1] = 0;
        }
      }

      vertexValid[vertexStart + geometrySize - 1] = 0;
    }
  }]);
  return PolygonTesselator;
}(_core.Tesselator);

exports.default = PolygonTesselator;

function isCut(polygon) {
  return Array.isArray(polygon) && polygon.length > 0 && !Number.isFinite(polygon[0]);
}
//# sourceMappingURL=polygon-tesselator.js.map