"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize3DTileNormalAttribute = void 0;
const core_1 = require("@math.gl/core");
const math_1 = require("@loaders.gl/math");
const scratchNormal = new core_1.Vector3();
function normalize3DTileNormalAttribute(tile, normals) {
    if (!normals) {
        return null;
    }
    if (tile.isOctEncoded16P) {
        const decodedArray = new Float32Array(tile.pointsLength * 3);
        for (let i = 0; i < tile.pointsLength; i++) {
            (0, math_1.octDecode)(normals[i * 2], normals[i * 2 + 1], scratchNormal);
            // @ts-ignore
            scratchNormal.toArray(decodedArray, i * 3);
        }
        return {
            type: math_1.GL.FLOAT,
            size: 2,
            value: decodedArray
        };
    }
    return {
        type: math_1.GL.FLOAT,
        size: 2,
        value: normals
    };
}
exports.normalize3DTileNormalAttribute = normalize3DTileNormalAttribute;
