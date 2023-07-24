"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkFetchResponseStatus = checkFetchResponseStatus;
exports.checkFetchResponseStatusSync = checkFetchResponseStatusSync;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function checkFetchResponseStatus(_x) {
  return _checkFetchResponseStatus.apply(this, arguments);
}
function _checkFetchResponseStatus() {
  _checkFetchResponseStatus = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(response) {
    var errorMessage, text;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (response.ok) {
            _context.next = 12;
            break;
          }
          errorMessage = "fetch failed ".concat(response.status, " ").concat(response.statusText);
          _context.prev = 2;
          _context.next = 5;
          return response.text();
        case 5:
          text = _context.sent;
          if (text) {
            errorMessage += ": ".concat(getErrorText(text));
          }
          _context.next = 11;
          break;
        case 9:
          _context.prev = 9;
          _context.t0 = _context["catch"](2);
        case 11:
          throw new Error(errorMessage);
        case 12:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[2, 9]]);
  }));
  return _checkFetchResponseStatus.apply(this, arguments);
}
function checkFetchResponseStatusSync(response) {
  if (!response.ok) {
    throw new Error("fetch failed ".concat(response.status));
  }
}
function getErrorText(text) {
  var matches = text.match('<pre>(.*)</pre>');
  return matches ? matches[1] : " ".concat(text.slice(0, 10), "...");
}
//# sourceMappingURL=check-errors.js.map