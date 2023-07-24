"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseCompressedTexture = parseCompressedTexture;
var _parseKtx = require("./parse-ktx");
var _parseDds = require("./parse-dds");
var _parsePvr = require("./parse-pvr");
function parseCompressedTexture(data) {
  if ((0, _parseKtx.isKTX)(data)) {
    return (0, _parseKtx.parseKTX)(data);
  }
  if ((0, _parseDds.isDDS)(data)) {
    return (0, _parseDds.parseDDS)(data);
  }
  if ((0, _parsePvr.isPVR)(data)) {
    return (0, _parsePvr.parsePVR)(data);
  }
  throw new Error('Texture container format not recognized');
}
//# sourceMappingURL=parse-compressed-texture.js.map