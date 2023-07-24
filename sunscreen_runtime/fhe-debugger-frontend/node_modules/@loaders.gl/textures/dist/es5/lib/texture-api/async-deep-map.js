"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.asyncDeepMap = asyncDeepMap;
exports.mapSubtree = mapSubtree;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var isObject = function isObject(value) {
  return value && (0, _typeof2.default)(value) === 'object';
};
function asyncDeepMap(_x, _x2) {
  return _asyncDeepMap.apply(this, arguments);
}
function _asyncDeepMap() {
  _asyncDeepMap = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(tree, func) {
    var options,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          options = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
          _context.next = 3;
          return mapSubtree(tree, func, options);
        case 3:
          return _context.abrupt("return", _context.sent);
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _asyncDeepMap.apply(this, arguments);
}
function mapSubtree(_x3, _x4, _x5) {
  return _mapSubtree.apply(this, arguments);
}
function _mapSubtree() {
  _mapSubtree = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(object, func, options) {
    var url;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          if (!Array.isArray(object)) {
            _context2.next = 4;
            break;
          }
          _context2.next = 3;
          return mapArray(object, func, options);
        case 3:
          return _context2.abrupt("return", _context2.sent);
        case 4:
          if (!isObject(object)) {
            _context2.next = 8;
            break;
          }
          _context2.next = 7;
          return mapObject(object, func, options);
        case 7:
          return _context2.abrupt("return", _context2.sent);
        case 8:
          url = object;
          _context2.next = 11;
          return func(url, options);
        case 11:
          return _context2.abrupt("return", _context2.sent);
        case 12:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _mapSubtree.apply(this, arguments);
}
function mapObject(_x6, _x7, _x8) {
  return _mapObject.apply(this, arguments);
}
function _mapObject() {
  _mapObject = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(object, func, options) {
    var promises, values, _loop, key;
    return _regenerator.default.wrap(function _callee3$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          promises = [];
          values = {};
          _loop = _regenerator.default.mark(function _loop(key) {
            var url, promise;
            return _regenerator.default.wrap(function _loop$(_context3) {
              while (1) switch (_context3.prev = _context3.next) {
                case 0:
                  url = object[key];
                  promise = mapSubtree(url, func, options).then(function (value) {
                    values[key] = value;
                  });
                  promises.push(promise);
                case 3:
                case "end":
                  return _context3.stop();
              }
            }, _loop);
          });
          _context4.t0 = _regenerator.default.keys(object);
        case 4:
          if ((_context4.t1 = _context4.t0()).done) {
            _context4.next = 9;
            break;
          }
          key = _context4.t1.value;
          return _context4.delegateYield(_loop(key), "t2", 7);
        case 7:
          _context4.next = 4;
          break;
        case 9:
          _context4.next = 11;
          return Promise.all(promises);
        case 11:
          return _context4.abrupt("return", values);
        case 12:
        case "end":
          return _context4.stop();
      }
    }, _callee3);
  }));
  return _mapObject.apply(this, arguments);
}
function mapArray(_x9, _x10) {
  return _mapArray.apply(this, arguments);
}
function _mapArray() {
  _mapArray = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee4(urlArray, func) {
    var options,
      promises,
      _args5 = arguments;
    return _regenerator.default.wrap(function _callee4$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          options = _args5.length > 2 && _args5[2] !== undefined ? _args5[2] : {};
          promises = urlArray.map(function (url) {
            return mapSubtree(url, func, options);
          });
          _context5.next = 4;
          return Promise.all(promises);
        case 4:
          return _context5.abrupt("return", _context5.sent);
        case 5:
        case "end":
          return _context5.stop();
      }
    }, _callee4);
  }));
  return _mapArray.apply(this, arguments);
}
//# sourceMappingURL=async-deep-map.js.map