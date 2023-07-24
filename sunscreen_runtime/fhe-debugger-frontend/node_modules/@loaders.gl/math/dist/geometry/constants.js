"use strict";
// Subset of WebGL constants
Object.defineProperty(exports, "__esModule", { value: true });
exports.GL = exports.GL_TYPE = exports.GL_PRIMITIVE_MODE = exports.GL_PRIMITIVE = void 0;
exports.GL_PRIMITIVE = {
    POINTS: 0x0000,
    LINES: 0x0001,
    TRIANGLES: 0x0004 // Triangles. Each set of three vertices creates a separate triangle.
};
// Primitive modes
exports.GL_PRIMITIVE_MODE = {
    POINTS: 0x0000,
    LINES: 0x0001,
    LINE_LOOP: 0x0002,
    LINE_STRIP: 0x0003,
    TRIANGLES: 0x0004,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLE_FAN: 0x0006 // Triangles. A connected group of triangles.
    // Each vertex connects to the previous and the first vertex in the fan.
};
exports.GL_TYPE = {
    BYTE: 5120,
    UNSIGNED_BYTE: 5121,
    SHORT: 5122,
    UNSIGNED_SHORT: 5123,
    INT: 5124,
    UNSIGNED_INT: 5125,
    FLOAT: 5126,
    DOUBLE: 5130
};
exports.GL = {
    ...exports.GL_PRIMITIVE_MODE,
    ...exports.GL_TYPE
};
