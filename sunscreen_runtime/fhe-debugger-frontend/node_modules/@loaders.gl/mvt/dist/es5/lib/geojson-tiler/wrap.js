"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrap = wrap;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _wrapNativeSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapNativeSuper"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _clip = require("./clip");
var _feature = require("./feature");
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function wrap(features, options) {
  var buffer = options.buffer / options.extent;
  var merged = features;
  var left = (0, _clip.clip)(features, 1, -1 - buffer, buffer, 0, -1, 2, options);
  var right = (0, _clip.clip)(features, 1, 1 - buffer, 2 + buffer, 0, -1, 2, options);
  if (left || right) {
    merged = (0, _clip.clip)(features, 1, -buffer, 1 + buffer, 0, -1, 2, options) || [];
    if (left) {
      merged = shiftFeatureCoords(left, 1).concat(merged);
    }
    if (right) {
      merged = merged.concat(shiftFeatureCoords(right, -1));
    }
  }
  return merged;
}
function shiftFeatureCoords(features, offset) {
  var newFeatures = [];
  for (var i = 0; i < features.length; i++) {
    var feature = features[i];
    var type = feature.type;
    var newGeometry = void 0;
    if (type === 'Point' || type === 'MultiPoint' || type === 'LineString') {
      newGeometry = shiftCoords(feature.geometry, offset);
    } else if (type === 'MultiLineString' || type === 'Polygon') {
      newGeometry = [];
      var _iterator = _createForOfIteratorHelper(feature.geometry),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var line = _step.value;
          newGeometry.push(shiftCoords(line, offset));
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    } else if (type === 'MultiPolygon') {
      newGeometry = [];
      var _iterator2 = _createForOfIteratorHelper(feature.geometry),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var polygon = _step2.value;
          var newPolygon = [];
          var _iterator3 = _createForOfIteratorHelper(polygon),
            _step3;
          try {
            for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
              var _line = _step3.value;
              newPolygon.push(shiftCoords(_line, offset));
            }
          } catch (err) {
            _iterator3.e(err);
          } finally {
            _iterator3.f();
          }
          newGeometry.push(newPolygon);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }
    newFeatures.push((0, _feature.createFeature)(feature.id, type, newGeometry, feature.tags));
  }
  return newFeatures;
}
var Points = function (_Array) {
  (0, _inherits2.default)(Points, _Array);
  var _super = _createSuper(Points);
  function Points() {
    var _this;
    (0, _classCallCheck2.default)(this, Points);
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    _this = _super.call.apply(_super, [this].concat(args));
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "size", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "start", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "end", void 0);
    return _this;
  }
  return (0, _createClass2.default)(Points);
}((0, _wrapNativeSuper2.default)(Array));
function shiftCoords(points, offset) {
  var newPoints = [];
  newPoints.size = points.size;
  if (points.start !== undefined) {
    newPoints.start = points.start;
    newPoints.end = points.end;
  }
  for (var i = 0; i < points.length; i += 3) {
    newPoints.push(points[i] + offset, points[i + 1], points[i + 2]);
  }
  return newPoints;
}
//# sourceMappingURL=wrap.js.map