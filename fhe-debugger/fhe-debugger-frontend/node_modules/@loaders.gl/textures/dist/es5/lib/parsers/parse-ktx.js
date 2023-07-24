"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isKTX = isKTX;
exports.parseKTX = parseKTX;
var _ktxParse = require("ktx-parse");
var _extractMipmapImages = require("../utils/extract-mipmap-images");
var _ktxFormatHelper = require("../utils/ktx-format-helper");
var KTX2_ID = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
function isKTX(data) {
  var id = new Uint8Array(data);
  var notKTX = id.byteLength < KTX2_ID.length || id[0] !== KTX2_ID[0] || id[1] !== KTX2_ID[1] || id[2] !== KTX2_ID[2] || id[3] !== KTX2_ID[3] || id[4] !== KTX2_ID[4] || id[5] !== KTX2_ID[5] || id[6] !== KTX2_ID[6] || id[7] !== KTX2_ID[7] || id[8] !== KTX2_ID[8] || id[9] !== KTX2_ID[9] || id[10] !== KTX2_ID[10] || id[11] !== KTX2_ID[11];
  return !notKTX;
}
function parseKTX(arrayBuffer) {
  var uint8Array = new Uint8Array(arrayBuffer);
  var ktx = (0, _ktxParse.read)(uint8Array);
  var mipMapLevels = Math.max(1, ktx.levels.length);
  var width = ktx.pixelWidth;
  var height = ktx.pixelHeight;
  var internalFormat = (0, _ktxFormatHelper.mapVkFormatToWebGL)(ktx.vkFormat);
  return (0, _extractMipmapImages.extractMipmapImages)(ktx.levels, {
    mipMapLevels: mipMapLevels,
    width: width,
    height: height,
    sizeFunction: function sizeFunction(level) {
      return level.uncompressedByteLength;
    },
    internalFormat: internalFormat
  });
}
//# sourceMappingURL=parse-ktx.js.map