"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getS2Cell = getS2Cell;
exports.getS2QuadKey = getS2QuadKey;
var _s2Geometry = require("./s2-geometry");
var _s2TokenFunctions = require("../s2-token-functions");
function getS2Cell(tokenOrKey) {
  var key = getS2QuadKey(tokenOrKey);
  var s2cell = (0, _s2Geometry.getS2CellFromQuadKey)(key);
  return s2cell;
}
function getS2QuadKey(tokenOrKey) {
  if (tokenOrKey.indexOf('/') > 0) {
    return tokenOrKey;
  }
  var id = (0, _s2TokenFunctions.getS2CellIdFromToken)(tokenOrKey);
  return (0, _s2Geometry.getS2QuadkeyFromCellId)(id);
}
//# sourceMappingURL=s2-cell-utils.js.map