"use strict";
// math.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getS2QuadKey = exports.getS2Cell = void 0;
const s2_geometry_1 = require("./s2-geometry");
const s2_token_functions_1 = require("../s2-token-functions");
/**
 * Return the S2Cell from the cell's hex token or the Hilbert quad key
 * @param tokenOrKey {string} A string that is the cell's hex token or the Hilbert quad key (containing /)
 * @returns {@link S2Cell}
 */
function getS2Cell(tokenOrKey) {
    const key = getS2QuadKey(tokenOrKey);
    const s2cell = (0, s2_geometry_1.getS2CellFromQuadKey)(key);
    return s2cell;
}
exports.getS2Cell = getS2Cell;
/**
 * Get the underlying Hilbert quad key
 * @param tokenOrKey {string} A string that is the cell's hex token or the Hilbert quad key (containing /)
 * @returns Hilbert quad key
 */
function getS2QuadKey(tokenOrKey) {
    if (tokenOrKey.indexOf('/') > 0) {
        // is Hilbert quad key
        return tokenOrKey;
    }
    // is S2 cell's hex token
    const id = (0, s2_token_functions_1.getS2CellIdFromToken)(tokenOrKey);
    return (0, s2_geometry_1.getS2QuadkeyFromCellId)(id);
}
exports.getS2QuadKey = getS2QuadKey;
