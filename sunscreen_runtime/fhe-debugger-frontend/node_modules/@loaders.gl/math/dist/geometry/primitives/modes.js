"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrimitiveModeExpandedLength = exports.isPrimitiveModeExpandable = exports.getPrimitiveModeType = void 0;
const constants_1 = require("../constants");
/**
 * Different methods of working with geometries depending on glType
 /**

/**
 * @param mode
 * @returns draw points | lines | triangles
 */
function getPrimitiveModeType(mode) {
    switch (mode) {
        case constants_1.GL.POINTS: // draw single points.
            return constants_1.GL.POINTS;
        case constants_1.GL.LINES: // draw lines. Each set of two vertices is treated as a separate line segment.
        case constants_1.GL.LINE_STRIP: // draw lines. Each vertex connects to the one after it.
        case constants_1.GL.LINE_LOOP: // draw a connected group of line segments from the first vertex to the last
            return constants_1.GL.LINES;
        case constants_1.GL.TRIANGLES:
        case constants_1.GL.TRIANGLE_STRIP:
        case constants_1.GL.TRIANGLE_FAN: // draw a connected group of triangles.
            return constants_1.GL.TRIANGLES;
        default:
            throw new Error('Unknown primitive mode');
    }
}
exports.getPrimitiveModeType = getPrimitiveModeType;
/**
 * @param mode
 * @returns true | false
 */
function isPrimitiveModeExpandable(mode) {
    switch (mode) {
        case constants_1.GL.LINE_STRIP: // draw lines. Each vertex connects to the one after it.
        case constants_1.GL.LINE_LOOP: // draw a connected group of line segments from the first vertex to the last
        case constants_1.GL.TRIANGLE_STRIP: // draw a connected group of triangles.
        case constants_1.GL.TRIANGLE_FAN: // draw a connected group of triangles.
            return true;
        default:
            return false;
    }
}
exports.isPrimitiveModeExpandable = isPrimitiveModeExpandable;
/**
 * Returns new length depends on glType
 * @param mode
 * @param length
 * @returns new length
 */
function getPrimitiveModeExpandedLength(mode, length) {
    switch (mode) {
        case constants_1.GL.POINTS: // draw single points.
            return length;
        case constants_1.GL.LINES: // draw lines. Each set of two vertices is treated as a separate line segment.
            return length;
        case constants_1.GL.LINE_STRIP: // draw lines. Each vertex connects to the one after it.
            return length;
        case constants_1.GL.LINE_LOOP: // draw a connected group of line segments from the first vertex to the last
            return length + 1;
        case constants_1.GL.TRIANGLES: // draw triangles. Each set of three vertices creates a separate triangle.
            return length;
        case constants_1.GL.TRIANGLE_STRIP: // draw a connected group of triangles.
        case constants_1.GL.TRIANGLE_FAN: // draw a connected group of triangles.
            return (length - 2) * 3;
        default:
            throw new Error('Unknown length');
    }
}
exports.getPrimitiveModeExpandedLength = getPrimitiveModeExpandedLength;
