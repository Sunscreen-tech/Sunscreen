"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.requireFromFile = requireFromFile;
exports.requireFromString = requireFromString;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _module = _interopRequireDefault(require("module"));
var _path = _interopRequireDefault(require("path"));
function requireFromFile(_x) {
  return _requireFromFile.apply(this, arguments);
}
function _requireFromFile() {
  _requireFromFile = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(filename) {
    var response, code;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!filename.startsWith('http')) {
            _context.next = 8;
            break;
          }
          _context.next = 3;
          return fetch(filename);
        case 3:
          response = _context.sent;
          _context.next = 6;
          return response.text();
        case 6:
          code = _context.sent;
          return _context.abrupt("return", requireFromString(code));
        case 8:
          if (!filename.startsWith('/')) {
            filename = "".concat(process.cwd(), "/").concat(filename);
          }
          return _context.abrupt("return", require(filename));
        case 10:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _requireFromFile.apply(this, arguments);
}
function requireFromString(code) {
  var _options, _options2;
  var filename = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var options = arguments.length > 2 ? arguments[2] : undefined;
  if ((0, _typeof2.default)(filename) === 'object') {
    options = filename;
    filename = '';
  }
  if (typeof code !== 'string') {
    throw new Error("code must be a string, not ".concat((0, _typeof2.default)(code)));
  }
  var paths = _module.default._nodeModulePaths(_path.default.dirname(filename));
  var parent = module.parent;
  var newModule = new _module.default(filename, parent);
  newModule.filename = filename;
  newModule.paths = [].concat(((_options = options) === null || _options === void 0 ? void 0 : _options.prependPaths) || []).concat(paths).concat(((_options2 = options) === null || _options2 === void 0 ? void 0 : _options2.appendPaths) || []);
  newModule._compile(code, filename);
  if (parent && parent.children) {
    parent.children.splice(parent.children.indexOf(newModule), 1);
  }
  return newModule.exports;
}
//# sourceMappingURL=require-utils.node.js.map