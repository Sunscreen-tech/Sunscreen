"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAttributeIterator = void 0;
/**
 * Iterates over a single attribute
 * NOTE: For performance, re-yields the same modified element
 * @param param0
 */
function* makeAttributeIterator(values, size) {
    const ArrayType = values.constructor;
    const element = new ArrayType(size);
    for (let i = 0; i < values.length; i += size) {
        for (let j = 0; j < size; j++) {
            element[j] = element[i + j];
        }
        yield element;
    }
}
exports.makeAttributeIterator = makeAttributeIterator;
