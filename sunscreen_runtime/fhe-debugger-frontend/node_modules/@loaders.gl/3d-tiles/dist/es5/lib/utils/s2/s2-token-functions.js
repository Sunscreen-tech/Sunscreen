"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getS2CellIdFromToken = getS2CellIdFromToken;
exports.getS2ChildCellId = getS2ChildCellId;
exports.getS2TokenFromCellId = getS2TokenFromCellId;
var _long = _interopRequireDefault(require("long"));
var MAXIMUM_TOKEN_LENGTH = 16;
function getS2CellIdFromToken(token) {
  if (token === 'X') {
    token = '';
  }
  var paddedToken = token.padEnd(MAXIMUM_TOKEN_LENGTH, '0');
  return _long.default.fromString(paddedToken, true, 16);
}
function getS2TokenFromCellId(cellId) {
  if (cellId.isZero()) {
    return 'X';
  }
  var numZeroDigits = cellId.countTrailingZeros();
  var remainder = numZeroDigits % 4;
  numZeroDigits = (numZeroDigits - remainder) / 4;
  var trailingZeroHexChars = numZeroDigits;
  numZeroDigits *= 4;
  var x = cellId.shiftRightUnsigned(numZeroDigits);
  var hexString = x.toString(16).replace(/0+$/, '');
  var zeroString = Array(17 - trailingZeroHexChars - hexString.length).join('0');
  return zeroString + hexString;
}
function getS2ChildCellId(cellId, index) {
  var newLsb = lsb(cellId).shiftRightUnsigned(2);
  var childCellId = cellId.add(_long.default.fromNumber(2 * index + 1 - 4).multiply(newLsb));
  return childCellId;
}
function lsb(cellId) {
  return cellId.and(cellId.not().add(1));
}
//# sourceMappingURL=s2-token-functions.js.map