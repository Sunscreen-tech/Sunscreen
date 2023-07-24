"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeAttributeIterator = makeAttributeIterator;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _marked = _regenerator.default.mark(makeAttributeIterator);
function makeAttributeIterator(values, size) {
  var ArrayType, element, i, j;
  return _regenerator.default.wrap(function makeAttributeIterator$(_context) {
    while (1) switch (_context.prev = _context.next) {
      case 0:
        ArrayType = values.constructor;
        element = new ArrayType(size);
        i = 0;
      case 3:
        if (!(i < values.length)) {
          _context.next = 10;
          break;
        }
        for (j = 0; j < size; j++) {
          element[j] = element[i + j];
        }
        _context.next = 7;
        return element;
      case 7:
        i += size;
        _context.next = 3;
        break;
      case 10:
      case "end":
        return _context.stop();
    }
  }, _marked);
}
//# sourceMappingURL=attribute-iterator.js.map