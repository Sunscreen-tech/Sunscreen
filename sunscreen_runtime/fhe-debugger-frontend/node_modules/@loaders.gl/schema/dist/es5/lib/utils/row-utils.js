"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertToArrayRow = convertToArrayRow;
exports.convertToObjectRow = convertToObjectRow;
function convertToObjectRow(arrayRow, headers) {
  if (!arrayRow) {
    throw new Error('null row');
  }
  if (!headers) {
    throw new Error('no headers');
  }
  var objectRow = {};
  for (var i = 0; i < headers.length; i++) {
    objectRow[headers[i]] = arrayRow[i];
  }
  return objectRow;
}
function convertToArrayRow(objectRow, headers) {
  if (!objectRow) {
    throw new Error('null row');
  }
  if (!headers) {
    throw new Error('no headers');
  }
  var arrayRow = new Array(headers.length);
  for (var i = 0; i < headers.length; i++) {
    arrayRow[i] = objectRow[headers[i]];
  }
  return arrayRow;
}
//# sourceMappingURL=row-utils.js.map