"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeKTX = encodeKTX;
var _ktxParse = require("ktx-parse");
function encodeKTX(texture) {
  var ktx = (0, _ktxParse.read)(texture);
  return ktx;
}
//# sourceMappingURL=encode-ktx.js.map