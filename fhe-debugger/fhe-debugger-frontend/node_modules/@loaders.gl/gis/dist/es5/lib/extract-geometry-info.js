"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractGeometryInfo = extractGeometryInfo;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function extractGeometryInfo(features) {
  var pointPositionsCount = 0;
  var pointFeaturesCount = 0;
  var linePositionsCount = 0;
  var linePathsCount = 0;
  var lineFeaturesCount = 0;
  var polygonPositionsCount = 0;
  var polygonObjectsCount = 0;
  var polygonRingsCount = 0;
  var polygonFeaturesCount = 0;
  var coordLengths = new Set();
  var _iterator = _createForOfIteratorHelper(features),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var feature = _step.value;
      var geometry = feature.geometry;
      switch (geometry.type) {
        case 'Point':
          pointFeaturesCount++;
          pointPositionsCount++;
          coordLengths.add(geometry.coordinates.length);
          break;
        case 'MultiPoint':
          pointFeaturesCount++;
          pointPositionsCount += geometry.coordinates.length;
          var _iterator2 = _createForOfIteratorHelper(geometry.coordinates),
            _step2;
          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var point = _step2.value;
              coordLengths.add(point.length);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
          break;
        case 'LineString':
          lineFeaturesCount++;
          linePositionsCount += geometry.coordinates.length;
          linePathsCount++;
          var _iterator3 = _createForOfIteratorHelper(geometry.coordinates),
            _step3;
          try {
            for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
              var coord = _step3.value;
              coordLengths.add(coord.length);
            }
          } catch (err) {
            _iterator3.e(err);
          } finally {
            _iterator3.f();
          }
          break;
        case 'MultiLineString':
          lineFeaturesCount++;
          var _iterator4 = _createForOfIteratorHelper(geometry.coordinates),
            _step4;
          try {
            for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
              var line = _step4.value;
              linePositionsCount += line.length;
              linePathsCount++;
              var _iterator5 = _createForOfIteratorHelper(line),
                _step5;
              try {
                for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
                  var _coord = _step5.value;
                  coordLengths.add(_coord.length);
                }
              } catch (err) {
                _iterator5.e(err);
              } finally {
                _iterator5.f();
              }
            }
          } catch (err) {
            _iterator4.e(err);
          } finally {
            _iterator4.f();
          }
          break;
        case 'Polygon':
          polygonFeaturesCount++;
          polygonObjectsCount++;
          polygonRingsCount += geometry.coordinates.length;
          var flattened = geometry.coordinates.flat();
          polygonPositionsCount += flattened.length;
          var _iterator6 = _createForOfIteratorHelper(flattened),
            _step6;
          try {
            for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
              var _coord2 = _step6.value;
              coordLengths.add(_coord2.length);
            }
          } catch (err) {
            _iterator6.e(err);
          } finally {
            _iterator6.f();
          }
          break;
        case 'MultiPolygon':
          polygonFeaturesCount++;
          var _iterator7 = _createForOfIteratorHelper(geometry.coordinates),
            _step7;
          try {
            for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
              var polygon = _step7.value;
              polygonObjectsCount++;
              polygonRingsCount += polygon.length;
              var _flattened = polygon.flat();
              polygonPositionsCount += _flattened.length;
              var _iterator8 = _createForOfIteratorHelper(_flattened),
                _step8;
              try {
                for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
                  var _coord3 = _step8.value;
                  coordLengths.add(_coord3.length);
                }
              } catch (err) {
                _iterator8.e(err);
              } finally {
                _iterator8.f();
              }
            }
          } catch (err) {
            _iterator7.e(err);
          } finally {
            _iterator7.f();
          }
          break;
        default:
          throw new Error("Unsupported geometry type: ".concat(geometry.type));
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return {
    coordLength: coordLengths.size > 0 ? Math.max.apply(Math, (0, _toConsumableArray2.default)(coordLengths)) : 2,
    pointPositionsCount: pointPositionsCount,
    pointFeaturesCount: pointFeaturesCount,
    linePositionsCount: linePositionsCount,
    linePathsCount: linePathsCount,
    lineFeaturesCount: lineFeaturesCount,
    polygonPositionsCount: polygonPositionsCount,
    polygonObjectsCount: polygonObjectsCount,
    polygonRingsCount: polygonRingsCount,
    polygonFeaturesCount: polygonFeaturesCount
  };
}
//# sourceMappingURL=extract-geometry-info.js.map