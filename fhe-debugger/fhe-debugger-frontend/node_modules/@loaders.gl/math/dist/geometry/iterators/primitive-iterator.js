"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePrimitiveIterator = void 0;
const constants_1 = require("../constants");
const modes_1 = require("../primitives/modes");
const loader_utils_1 = require("@loaders.gl/loader-utils");
/**
 * Will iterate over each primitive, expanding (dereferencing) indices
 * @param indices
 * @param attributes
 * @param mode
 * @param start
 * @param end
 */
// eslint-disable-next-line complexity
function* makePrimitiveIterator(indices, attributes = {}, mode, start = 0, end) {
    // support indices being an object with a values array
    if (indices) {
        indices = indices.values || indices.value || indices;
    }
    // Autodeduce length from indices
    if (end === undefined) {
        end = indices ? indices.length : start;
    }
    // iteration info
    const info = {
        attributes,
        type: (0, modes_1.getPrimitiveModeType)(mode),
        i1: 0,
        i2: 0,
        i3: 0
    };
    let i = start;
    // @ts-ignore
    while (i < end) {
        switch (mode) {
            case constants_1.GL.POINTS: // draw single points.
                info.i1 = i;
                i += 1;
                break;
            case constants_1.GL.LINES: // draw lines. Each set of two vertices is treated as a separate line segment.
                info.i1 = i;
                info.i2 = i + 1;
                i += 2;
                break;
            case constants_1.GL.LINE_STRIP: // draw lines. Each vertex connects to the one after it.
                info.i1 = i;
                info.i2 = i + 1;
                i += 1;
                break;
            case constants_1.GL.LINE_LOOP: // draw a connected group of line segments from the first vertex to the last
                info.i1 = i;
                info.i2 = i + 1;
                i += 1;
                break;
            case constants_1.GL.TRIANGLES: // draw triangles. Each set of three vertices creates a separate triangle.
                info.i1 = i;
                info.i2 = i + 1;
                info.i3 = i + 2;
                i += 3;
                break;
            case constants_1.GL.TRIANGLE_STRIP: // draw a connected group of triangles.
                info.i1 = i;
                info.i2 = i + 1;
                i += 1;
                break;
            case constants_1.GL.TRIANGLE_FAN: // draw a connected group of triangles.
                info.i1 = 1;
                info.i2 = i;
                info.i3 = i + 1;
                i += 1;
                break;
            default:
                (0, loader_utils_1.assert)(false);
        }
        // if indices are present, lookup actual vertices in indices
        if (indices) {
            if ('i1' in info) {
                info.i1 = indices[info.i1];
                info.i2 = indices[info.i2];
                info.i3 = indices[info.i3];
            }
        }
        // @ts-ignore
        yield info;
    }
}
exports.makePrimitiveIterator = makePrimitiveIterator;
