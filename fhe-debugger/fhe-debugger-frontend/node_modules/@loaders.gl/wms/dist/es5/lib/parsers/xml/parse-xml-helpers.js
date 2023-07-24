"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getXMLArray = getXMLArray;
exports.getXMLBoolean = getXMLBoolean;
exports.getXMLFloat = getXMLFloat;
exports.getXMLInteger = getXMLInteger;
exports.getXMLStringArray = getXMLStringArray;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function getXMLArray(xmlValue) {
  if (Array.isArray(xmlValue)) {
    return xmlValue;
  }
  if (xmlValue) {
    return [xmlValue];
  }
  return [];
}
function getXMLStringArray(xmlValue) {
  var xmlArray = getXMLArray(xmlValue);
  if (xmlArray.length > 0 && xmlArray.every(function (_) {
    return typeof _ === 'string';
  })) {
    return xmlArray;
  }
  return [];
}
function getXMLFloat(xmlValue) {
  var defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
  switch ((0, _typeof2.default)(xmlValue)) {
    case 'number':
      return xmlValue;
    case 'string':
      return parseFloat(xmlValue);
    default:
      return undefined;
  }
}
function getXMLInteger(xmlValue) {
  var defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
  switch ((0, _typeof2.default)(xmlValue)) {
    case 'number':
      return xmlValue;
    case 'string':
      return parseInt(xmlValue, 10);
    default:
      return undefined;
  }
}
function getXMLBoolean(xmlValue) {
  switch (xmlValue) {
    case 'true':
      return true;
    case 'false':
      return false;
    case '1':
      return true;
    case '0':
      return false;
    default:
      return false;
  }
}
//# sourceMappingURL=parse-xml-helpers.js.map