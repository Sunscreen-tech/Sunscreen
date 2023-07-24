"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertXMLFieldToArrayInPlace = convertXMLFieldToArrayInPlace;
exports.convertXMLValueToArray = convertXMLValueToArray;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function convertXMLValueToArray(xmlValue) {
  if (Array.isArray(xmlValue)) {
    return xmlValue;
  }
  if (xmlValue && (0, _typeof2.default)(xmlValue) === 'object' && xmlValue['0']) {}
  if (xmlValue) {
    return [xmlValue];
  }
  return [];
}
function convertXMLFieldToArrayInPlace(xml, key) {
  xml[key] = convertXMLValueToArray(xml[key]);
}
//# sourceMappingURL=xml-utils.js.map