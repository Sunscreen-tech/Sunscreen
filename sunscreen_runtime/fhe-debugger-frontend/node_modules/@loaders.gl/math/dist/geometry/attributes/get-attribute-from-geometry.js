"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPositions = void 0;
const is_geometry_1 = __importDefault(require("../is-geometry"));
const assert_1 = require("../utils/assert");
/**
 * analyze positions of geometry
 *
 * @param geometry
 * @returns Position| New geometry |assert
 */
function getPositions(geometry) {
    // If geometry, extract positions
    if ((0, is_geometry_1.default)(geometry)) {
        const { attributes } = geometry;
        const position = attributes.POSITION || attributes.positions;
        (0, assert_1.assert)(position);
        return position;
    }
    // If arraybuffer, assume 3 components
    if (ArrayBuffer.isView(geometry)) {
        return { values: geometry, size: 3 };
    }
    // Else assume accessor object
    if (geometry) {
        (0, assert_1.assert)(geometry.values);
        return geometry;
    }
    return (0, assert_1.assert)(false);
}
exports.getPositions = getPositions;
