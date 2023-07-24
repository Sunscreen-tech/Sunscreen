"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.save = save;
exports.saveSync = saveSync;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _encode = require("./encode");
var _writeFile = require("../fetch/write-file");
function save(_x, _x2, _x3, _x4) {
  return _save.apply(this, arguments);
}
function _save() {
  _save = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data, url, writer, options) {
    var encodedData;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return (0, _encode.encode)(data, writer, options);
        case 2:
          encodedData = _context.sent;
          _context.next = 5;
          return (0, _writeFile.writeFile)(url, encodedData);
        case 5:
          return _context.abrupt("return", _context.sent);
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _save.apply(this, arguments);
}
function saveSync(data, url, writer, options) {
  var encodedData = (0, _encode.encodeSync)(data, writer, options);
  return (0, _writeFile.writeFileSync)(url, encodedData);
}
//# sourceMappingURL=save.js.map