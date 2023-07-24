"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.TEST_EXPORTS = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _binaryUtilFunctions = require("../../helpers/binary-util-functions");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var endPos;
var cmd;
var cmdLen;
var length;
var x;
var y;
var i;
var TEST_EXPORTS = {
  classifyRings: _binaryUtilFunctions.classifyRings
};
exports.TEST_EXPORTS = TEST_EXPORTS;
var VectorTileFeature = function () {
  function VectorTileFeature(pbf, end, extent, keys, values, geometryInfo) {
    (0, _classCallCheck2.default)(this, VectorTileFeature);
    (0, _defineProperty2.default)(this, "properties", void 0);
    (0, _defineProperty2.default)(this, "extent", void 0);
    (0, _defineProperty2.default)(this, "type", void 0);
    (0, _defineProperty2.default)(this, "id", void 0);
    (0, _defineProperty2.default)(this, "_pbf", void 0);
    (0, _defineProperty2.default)(this, "_geometry", void 0);
    (0, _defineProperty2.default)(this, "_keys", void 0);
    (0, _defineProperty2.default)(this, "_values", void 0);
    (0, _defineProperty2.default)(this, "_geometryInfo", void 0);
    this.properties = {};
    this.extent = extent;
    this.type = 0;
    this.id = null;
    this._pbf = pbf;
    this._geometry = -1;
    this._keys = keys;
    this._values = values;
    this._geometryInfo = geometryInfo;
    pbf.readFields(_binaryUtilFunctions.readFeature, this, end);
  }
  (0, _createClass2.default)(VectorTileFeature, [{
    key: "loadGeometry",
    value: function loadGeometry() {
      var pbf = this._pbf;
      pbf.pos = this._geometry;
      endPos = pbf.readVarint() + pbf.pos;
      cmd = 1;
      length = 0;
      x = 0;
      y = 0;
      i = 0;
      var indices = [];
      var data = [];
      while (pbf.pos < endPos) {
        if (length <= 0) {
          cmdLen = pbf.readVarint();
          cmd = cmdLen & 0x7;
          length = cmdLen >> 3;
        }
        length--;
        if (cmd === 1 || cmd === 2) {
          x += pbf.readSVarint();
          y += pbf.readSVarint();
          if (cmd === 1) {
            indices.push(i);
          }
          data.push(x, y);
          i += 2;
        } else if (cmd === 7) {
          if (i > 0) {
            var start = indices[indices.length - 1];
            data.push(data[start], data[start + 1]);
            i += 2;
          }
        } else {
          throw new Error("unknown command ".concat(cmd));
        }
      }
      return {
        data: data,
        indices: indices
      };
    }
  }, {
    key: "_toBinaryCoordinates",
    value: function _toBinaryCoordinates(transform) {
      var geom = this.loadGeometry();
      var geometry;
      transform(geom.data, this);
      var coordLength = 2;
      switch (this.type) {
        case 1:
          this._geometryInfo.pointFeaturesCount++;
          this._geometryInfo.pointPositionsCount += geom.indices.length;
          geometry = _objectSpread({
            type: 'Point'
          }, geom);
          break;
        case 2:
          this._geometryInfo.lineFeaturesCount++;
          this._geometryInfo.linePathsCount += geom.indices.length;
          this._geometryInfo.linePositionsCount += geom.data.length / coordLength;
          geometry = _objectSpread({
            type: 'LineString'
          }, geom);
          break;
        case 3:
          geometry = (0, _binaryUtilFunctions.classifyRings)(geom);
          this._geometryInfo.polygonFeaturesCount++;
          this._geometryInfo.polygonObjectsCount += geometry.indices.length;
          var _iterator = _createForOfIteratorHelper(geometry.indices),
            _step;
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var indices = _step.value;
              this._geometryInfo.polygonRingsCount += indices.length;
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
          this._geometryInfo.polygonPositionsCount += geometry.data.length / coordLength;
          break;
        default:
          throw new Error("Invalid geometry type: ".concat(this.type));
      }
      var result = {
        type: 'Feature',
        geometry: geometry,
        properties: this.properties
      };
      if (this.id !== null) {
        result.id = this.id;
      }
      return result;
    }
  }, {
    key: "toBinaryCoordinates",
    value: function toBinaryCoordinates(options) {
      if (typeof options === 'function') {
        return this._toBinaryCoordinates(options);
      }
      var x = options.x,
        y = options.y,
        z = options.z;
      var size = this.extent * Math.pow(2, z);
      var x0 = this.extent * x;
      var y0 = this.extent * y;
      return this._toBinaryCoordinates(function (data) {
        return (0, _binaryUtilFunctions.project)(data, x0, y0, size);
      });
    }
  }]);
  return VectorTileFeature;
}();
exports.default = VectorTileFeature;
//# sourceMappingURL=vector-tile-feature.js.map