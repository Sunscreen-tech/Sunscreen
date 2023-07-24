"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decodeMajorBrand = decodeMajorBrand;
exports.getISOBMFFMediaType = getISOBMFFMediaType;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
function getISOBMFFMediaType(buffer) {
  if (!checkString(buffer, 'ftyp', 4)) {
    return null;
  }
  if ((buffer[8] & 0x60) === 0x00) {
    return null;
  }
  return decodeMajorBrand(buffer);
}
function decodeMajorBrand(buffer) {
  var brandMajor = getUTF8String(buffer, 8, 12).replace('\0', ' ').trim();
  switch (brandMajor) {
    case 'avif':
    case 'avis':
      return {
        extension: 'avif',
        mimeType: 'image/avif'
      };
    default:
      return null;
  }
}
function getUTF8String(array, start, end) {
  return String.fromCharCode.apply(String, (0, _toConsumableArray2.default)(array.slice(start, end)));
}
function stringToBytes(string) {
  return (0, _toConsumableArray2.default)(string).map(function (character) {
    return character.charCodeAt(0);
  });
}
function checkString(buffer, header) {
  var offset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var headerBytes = stringToBytes(header);
  for (var i = 0; i < headerBytes.length; ++i) {
    if (headerBytes[i] !== buffer[i + offset]) {
      return false;
    }
  }
  return true;
}
//# sourceMappingURL=parse-isobmff-binary.js.map