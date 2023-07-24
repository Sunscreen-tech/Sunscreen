"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.writeFile = writeFile;
exports.writeFileSync = writeFileSync;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
function writeFile(_x, _x2, _x3) {
  return _writeFile.apply(this, arguments);
}
function _writeFile() {
  _writeFile = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(filePath, arrayBufferOrString, options) {
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          filePath = (0, _loaderUtils.resolvePath)(filePath);
          if (_loaderUtils.isBrowser) {
            _context.next = 4;
            break;
          }
          _context.next = 4;
          return _loaderUtils.fs.writeFile(filePath, (0, _loaderUtils.toBuffer)(arrayBufferOrString), {
            flag: 'w'
          });
        case 4:
          (0, _loaderUtils.assert)(false);
        case 5:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _writeFile.apply(this, arguments);
}
function writeFileSync(filePath, arrayBufferOrString, options) {
  filePath = (0, _loaderUtils.resolvePath)(filePath);
  if (!_loaderUtils.isBrowser) {
    _loaderUtils.fs.writeFileSync(filePath, (0, _loaderUtils.toBuffer)(arrayBufferOrString), {
      flag: 'w'
    });
  }
  (0, _loaderUtils.assert)(false);
}
//# sourceMappingURL=write-file.js.map