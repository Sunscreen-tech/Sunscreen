"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeBoundingBox = void 0;
const attribute_iterator_1 = require("../iterators/attribute-iterator");
const assert_1 = require("../utils/assert");
/**
 * Getting bounding box geometry according to positions parameters
 * @param positions
 * @returns Bounding Box
 */
function computeBoundingBox(positions = []) {
    const min = [Number(Infinity), Number(Infinity), Number(Infinity)];
    const max = [-Infinity, -Infinity, -Infinity];
    // @ts-ignore
    for (const position of (0, attribute_iterator_1.makeAttributeIterator)(positions)) {
        const x = position[0];
        const y = position[1];
        const z = position[2];
        if (x < min[0])
            min[0] = x;
        if (y < min[1])
            min[1] = y;
        if (z < min[2])
            min[2] = z;
        if (x > max[0])
            max[0] = x;
        if (y > max[1])
            max[1] = y;
        if (z > max[2])
            max[2] = z;
    }
    const boundingBox = { min, max };
    validateBoundingBox(boundingBox);
    return boundingBox;
}
exports.computeBoundingBox = computeBoundingBox;
function validateBoundingBox(boundingBox) {
    (0, assert_1.assert)(Number.isFinite(boundingBox.min[0]) &&
        Number.isFinite(boundingBox.min[1]) &&
        Number.isFinite(boundingBox.min[2]) &&
        Number.isFinite(boundingBox.max[0]) &&
        Number.isFinite(boundingBox.max[1]) &&
        Number.isFinite(boundingBox.max[2]));
}
