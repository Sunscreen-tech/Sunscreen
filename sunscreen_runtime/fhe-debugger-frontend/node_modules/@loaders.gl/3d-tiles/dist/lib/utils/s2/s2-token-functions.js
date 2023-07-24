"use strict";
// loaders.gl, MIT license
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getS2ChildCellId = exports.getS2TokenFromCellId = exports.getS2CellIdFromToken = void 0;
const long_1 = __importDefault(require("long"));
const MAXIMUM_TOKEN_LENGTH = 16;
/**
 * Convert the S2 token to the S2 cell ID
 * @param token {string} A string that is the cell's hex token. Zero cell ID is represented as 'X'.
 * @returns {Long} Cell id that is a 64-bit encoding of a face and a Hilbert curve parameter on that face.
 * See {@link https://github.com/google/s2-geometry-library-java/blob/c04b68bf3197a9c34082327eeb3aec7ab7c85da1/src/com/google/common/geometry/S2CellId.java#L439} for more information
 */
function getS2CellIdFromToken(token) {
    if (token === 'X') {
        token = '';
    }
    // pad token with zeros to make the length 16 that is defined in MAXIMUM_TOKEN_LENGTH
    const paddedToken = token.padEnd(MAXIMUM_TOKEN_LENGTH, '0');
    return long_1.default.fromString(paddedToken, true, 16); // Hex base
}
exports.getS2CellIdFromToken = getS2CellIdFromToken;
/**
 * Convert the S2 cell ID to the S2 token
 * @param cellId {Long} A 64-bit encoding of a face and a Hilbert curve parameter on that face.
 * @returns {string} A string that is the cell's hex token. Zero cell ID is represented as 'X'.
 */
function getS2TokenFromCellId(cellId) {
    if (cellId.isZero()) {
        return 'X';
    }
    let numZeroDigits = cellId.countTrailingZeros();
    const remainder = numZeroDigits % 4;
    numZeroDigits = (numZeroDigits - remainder) / 4;
    const trailingZeroHexChars = numZeroDigits;
    numZeroDigits *= 4;
    const x = cellId.shiftRightUnsigned(numZeroDigits);
    const hexString = x.toString(16).replace(/0+$/, '');
    const zeroString = Array(17 - trailingZeroHexChars - hexString.length).join('0');
    return zeroString + hexString;
}
exports.getS2TokenFromCellId = getS2TokenFromCellId;
/**
 * Get one of four S2 cell's children.
 * @param cellId {Long} A 64-bit encoding of a face and a Hilbert curve parameter on that face.
 * The cell must NOT be a leaf one. So, the cell's level is in the range [0-29].
 * @param index {number} Child index defines one of four S2 cell's children. Must be in the range [0-3].
 * @returns The ID of the cell's child.
 */
function getS2ChildCellId(cellId, index) {
    // Shift sentinel bit 2 positions to the right.
    const newLsb = lsb(cellId).shiftRightUnsigned(2);
    // Insert child index before the sentinel bit.
    const childCellId = cellId.add(long_1.default.fromNumber(2 * index + 1 - 4).multiply(newLsb));
    return childCellId;
}
exports.getS2ChildCellId = getS2ChildCellId;
/**
 * Return the lowest-numbered bit that is on for this cell id.
 * @private
 * @param cellId {Long} Cell id.
 * @returns {Long} The lowest-numbered bit that is on for this cell id.
 */
function lsb(cellId) {
    return cellId.and(cellId.not().add(1)); // eslint-disable-line
}
