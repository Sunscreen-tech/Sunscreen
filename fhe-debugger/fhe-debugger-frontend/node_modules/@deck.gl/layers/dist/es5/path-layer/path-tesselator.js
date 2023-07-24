"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

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

var _core = require("@deck.gl/core");

var _path = require("./path");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var START_CAP = 1;
var END_CAP = 2;
var INVALID = 4;

var PathTesselator = function (_Tesselator) {
  (0, _inherits2.default)(PathTesselator, _Tesselator);

  var _super = _createSuper(PathTesselator);

  function PathTesselator(opts) {
    (0, _classCallCheck2.default)(this, PathTesselator);
    return _super.call(this, _objectSpread(_objectSpread({}, opts), {}, {
      attributes: {
        positions: {
          size: 3,
          padding: 18,
          initialize: true,
          type: opts.fp64 ? Float64Array : Float32Array
        },
        segmentTypes: {
          size: 1,
          type: Uint8ClampedArray
        }
      }
    }));
  }

  (0, _createClass2.default)(PathTesselator, [{
    key: "get",
    value: function get(attributeName) {
      return this.attributes[attributeName];
    }
  }, {
    key: "getGeometryFromBuffer",
    value: function getGeometryFromBuffer(buffer) {
      if (this.normalize) {
        return (0, _get2.default)((0, _getPrototypeOf2.default)(PathTesselator.prototype), "getGeometryFromBuffer", this).call(this, buffer);
      }

      return null;
    }
  }, {
    key: "normalizeGeometry",
    value: function normalizeGeometry(path) {
      if (this.normalize) {
        return (0, _path.normalizePath)(path, this.positionSize, this.opts.resolution, this.opts.wrapLongitude);
      }

      return path;
    }
  }, {
    key: "getGeometrySize",
    value: function getGeometrySize(path) {
      if (isCut(path)) {
        var size = 0;

        var _iterator = _createForOfIteratorHelper(path),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var subPath = _step.value;
            size += this.getGeometrySize(subPath);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        return size;
      }

      var numPoints = this.getPathLength(path);

      if (numPoints < 2) {
        return 0;
      }

      if (this.isClosed(path)) {
        return numPoints < 3 ? 0 : numPoints + 2;
      }

      return numPoints;
    }
  }, {
    key: "updateGeometryAttributes",
    value: function updateGeometryAttributes(path, context) {
      if (context.geometrySize === 0) {
        return;
      }

      if (path && isCut(path)) {
        var _iterator2 = _createForOfIteratorHelper(path),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var subPath = _step2.value;
            var geometrySize = this.getGeometrySize(subPath);
            context.geometrySize = geometrySize;
            this.updateGeometryAttributes(subPath, context);
            context.vertexStart += geometrySize;
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      } else {
        this._updateSegmentTypes(path, context);

        this._updatePositions(path, context);
      }
    }
  }, {
    key: "_updateSegmentTypes",
    value: function _updateSegmentTypes(path, context) {
      var segmentTypes = this.attributes.segmentTypes;
      var isPathClosed = path ? this.isClosed(path) : false;
      var vertexStart = context.vertexStart,
          geometrySize = context.geometrySize;
      segmentTypes.fill(0, vertexStart, vertexStart + geometrySize);

      if (isPathClosed) {
        segmentTypes[vertexStart] = INVALID;
        segmentTypes[vertexStart + geometrySize - 2] = INVALID;
      } else {
        segmentTypes[vertexStart] += START_CAP;
        segmentTypes[vertexStart + geometrySize - 2] += END_CAP;
      }

      segmentTypes[vertexStart + geometrySize - 1] = INVALID;
    }
  }, {
    key: "_updatePositions",
    value: function _updatePositions(path, context) {
      var positions = this.attributes.positions;

      if (!positions || !path) {
        return;
      }

      var vertexStart = context.vertexStart,
          geometrySize = context.geometrySize;
      var p = new Array(3);

      for (var i = vertexStart, ptIndex = 0; ptIndex < geometrySize; i++, ptIndex++) {
        this.getPointOnPath(path, ptIndex, p);
        positions[i * 3] = p[0];
        positions[i * 3 + 1] = p[1];
        positions[i * 3 + 2] = p[2];
      }
    }
  }, {
    key: "getPathLength",
    value: function getPathLength(path) {
      return path.length / this.positionSize;
    }
  }, {
    key: "getPointOnPath",
    value: function getPointOnPath(path, index) {
      var target = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      var positionSize = this.positionSize;

      if (index * positionSize >= path.length) {
        index += 1 - path.length / positionSize;
      }

      var i = index * positionSize;
      target[0] = path[i];
      target[1] = path[i + 1];
      target[2] = positionSize === 3 && path[i + 2] || 0;
      return target;
    }
  }, {
    key: "isClosed",
    value: function isClosed(path) {
      if (!this.normalize) {
        return Boolean(this.opts.loop);
      }

      var positionSize = this.positionSize;
      var lastPointIndex = path.length - positionSize;
      return path[0] === path[lastPointIndex] && path[1] === path[lastPointIndex + 1] && (positionSize === 2 || path[2] === path[lastPointIndex + 2]);
    }
  }]);
  return PathTesselator;
}(_core.Tesselator);

exports.default = PathTesselator;

function isCut(path) {
  return Array.isArray(path[0]);
}
//# sourceMappingURL=path-tesselator.js.map