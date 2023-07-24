"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.removeNontransferableOptions = removeNontransferableOptions;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function removeNontransferableOptions(object) {
  if (object === null) {
    return {};
  }
  var clone = Object.assign({}, object);
  Object.keys(clone).forEach(function (key) {
    if ((0, _typeof2.default)(object[key]) === 'object' && !ArrayBuffer.isView(object[key])) {
      clone[key] = removeNontransferableOptions(object[key]);
    } else if (typeof clone[key] === 'function' || clone[key] instanceof RegExp) {
      clone[key] = {};
    } else {
      clone[key] = object[key];
    }
  });
  return clone;
}
//# sourceMappingURL=remove-nontransferable-options.js.map