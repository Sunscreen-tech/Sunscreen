"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parse3DTileTablesHeaderSync = parse3DTileTablesHeaderSync;
exports.parse3DTileTablesSync = parse3DTileTablesSync;
var _parseUtils = require("./parse-utils");
var SIZEOF_UINT32 = 4;
var DEPRECATION_WARNING = 'b3dm tile in legacy format.';
function parse3DTileTablesHeaderSync(tile, arrayBuffer, byteOffset) {
  var view = new DataView(arrayBuffer);
  var batchLength;
  tile.header = tile.header || {};
  var featureTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  var batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  if (batchTableJsonByteLength >= 570425344) {
    byteOffset -= SIZEOF_UINT32 * 2;
    batchLength = featureTableJsonByteLength;
    batchTableJsonByteLength = featureTableBinaryByteLength;
    batchTableBinaryByteLength = 0;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    console.warn(DEPRECATION_WARNING);
  } else if (batchTableBinaryByteLength >= 570425344) {
    byteOffset -= SIZEOF_UINT32;
    batchLength = batchTableJsonByteLength;
    batchTableJsonByteLength = featureTableJsonByteLength;
    batchTableBinaryByteLength = featureTableBinaryByteLength;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    console.warn(DEPRECATION_WARNING);
  }
  tile.header.featureTableJsonByteLength = featureTableJsonByteLength;
  tile.header.featureTableBinaryByteLength = featureTableBinaryByteLength;
  tile.header.batchTableJsonByteLength = batchTableJsonByteLength;
  tile.header.batchTableBinaryByteLength = batchTableBinaryByteLength;
  tile.header.batchLength = batchLength;
  return byteOffset;
}
function parse3DTileTablesSync(tile, arrayBuffer, byteOffset, options) {
  byteOffset = parse3DTileFeatureTable(tile, arrayBuffer, byteOffset, options);
  byteOffset = parse3DTileBatchTable(tile, arrayBuffer, byteOffset, options);
  return byteOffset;
}
function parse3DTileFeatureTable(tile, arrayBuffer, byteOffset, options) {
  var _tile$header = tile.header,
    featureTableJsonByteLength = _tile$header.featureTableJsonByteLength,
    featureTableBinaryByteLength = _tile$header.featureTableBinaryByteLength,
    batchLength = _tile$header.batchLength;
  tile.featureTableJson = {
    BATCH_LENGTH: batchLength || 0
  };
  if (featureTableJsonByteLength > 0) {
    var featureTableString = (0, _parseUtils.getStringFromArrayBuffer)(arrayBuffer, byteOffset, featureTableJsonByteLength);
    tile.featureTableJson = JSON.parse(featureTableString);
  }
  byteOffset += featureTableJsonByteLength;
  tile.featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
  byteOffset += featureTableBinaryByteLength;
  return byteOffset;
}
function parse3DTileBatchTable(tile, arrayBuffer, byteOffset, options) {
  var _tile$header2 = tile.header,
    batchTableJsonByteLength = _tile$header2.batchTableJsonByteLength,
    batchTableBinaryByteLength = _tile$header2.batchTableBinaryByteLength;
  if (batchTableJsonByteLength > 0) {
    var batchTableString = (0, _parseUtils.getStringFromArrayBuffer)(arrayBuffer, byteOffset, batchTableJsonByteLength);
    tile.batchTableJson = JSON.parse(batchTableString);
    byteOffset += batchTableJsonByteLength;
    if (batchTableBinaryByteLength > 0) {
      tile.batchTableBinary = new Uint8Array(arrayBuffer, byteOffset, batchTableBinaryByteLength);
      tile.batchTableBinary = new Uint8Array(tile.batchTableBinary);
      byteOffset += batchTableBinaryByteLength;
    }
  }
  return byteOffset;
}
//# sourceMappingURL=parse-3d-tile-tables.js.map