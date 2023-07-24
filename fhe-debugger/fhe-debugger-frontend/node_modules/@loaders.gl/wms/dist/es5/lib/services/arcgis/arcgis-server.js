"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getArcGISServices = getArcGISServices;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function getArcGISServices(_x) {
  return _getArcGISServices.apply(this, arguments);
}
function _getArcGISServices() {
  _getArcGISServices = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(url) {
    var fetchFile,
      serverUrl,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          fetchFile = _args.length > 1 && _args[1] !== undefined ? _args[1] : fetch;
          if (!url.includes('rest/services')) {
            _context.next = 4;
            break;
          }
          serverUrl = url.replace(/rest\/services.*$/i, 'rest/services');
          return _context.abrupt("return", loadServiceDirectory(serverUrl, fetchFile, []));
        case 4:
          return _context.abrupt("return", null);
        case 5:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _getArcGISServices.apply(this, arguments);
}
function loadServiceDirectory(_x2, _x3, _x4) {
  return _loadServiceDirectory.apply(this, arguments);
}
function _loadServiceDirectory() {
  _loadServiceDirectory = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(serverUrl, fetch, path) {
    var serviceUrl, response, directory, services, folders, promises, _iterator2, _step2, folderServices;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          serviceUrl = "".concat(serverUrl, "/").concat(path.join('/'));
          _context2.next = 3;
          return fetch("".concat(serviceUrl, "?f=pjson"));
        case 3:
          response = _context2.sent;
          _context2.next = 6;
          return response.json();
        case 6:
          directory = _context2.sent;
          services = extractServices(directory, serviceUrl);
          folders = directory.folders || [];
          promises = folders.map(function (folder) {
            return loadServiceDirectory("".concat(serverUrl), fetch, [].concat((0, _toConsumableArray2.default)(path), [folder]));
          });
          _context2.t0 = _createForOfIteratorHelper;
          _context2.next = 13;
          return Promise.all(promises);
        case 13:
          _context2.t1 = _context2.sent;
          _iterator2 = (0, _context2.t0)(_context2.t1);
          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              folderServices = _step2.value;
              services.push.apply(services, (0, _toConsumableArray2.default)(folderServices));
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
          return _context2.abrupt("return", services);
        case 17:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _loadServiceDirectory.apply(this, arguments);
}
function extractServices(directory, url) {
  var arcgisServices = directory.services || [];
  var services = [];
  var _iterator = _createForOfIteratorHelper(arcgisServices),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var service = _step.value;
      services.push({
        name: service.name,
        type: "arcgis-".concat(service.type.toLocaleLowerCase().replace('server', '-server')),
        url: "".concat(url).concat(service.name, "/").concat(service.type)
      });
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return services;
}
//# sourceMappingURL=arcgis-server.js.map