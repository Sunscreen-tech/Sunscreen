"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Checking if it is geometry
 * @param geometry
 */
function isGeometry(geometry) {
    return (geometry &&
        typeof geometry === 'object' &&
        geometry.mode &&
        geometry.attributes &&
        typeof geometry.attributes === 'object');
}
exports.default = isGeometry;
