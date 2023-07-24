"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeKTX = void 0;
const ktx_parse_1 = require("ktx-parse");
function encodeKTX(texture) {
    const ktx = (0, ktx_parse_1.read)(texture);
    // post process
    return ktx;
}
exports.encodeKTX = encodeKTX;
