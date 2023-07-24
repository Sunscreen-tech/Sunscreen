import Long from 'long';
/**
 * An object describing the S2 cell
 * @param face {number} Selects one of the six cube faces. The value is in the range [0..5]
 * @param ij {[number, number]} “i” and “j” are integers in the range [0..2**30-1] that identify the cell.
 * @param level {number} The number of times the cell has been subdivided (starting with a face cell). The value is in the range [0..30]
 */
export type S2Cell = {
    face: number;
    ij: [number, number];
    level: number;
};
/**
 * Return the S2Cell
 * @param hilbertQuadkey {string} A string that is the Hilbert quad key (containing /)
 * @returns {@link S2Cell}
 */
export declare function getS2CellFromQuadKey(hilbertQuadkey: string): S2Cell;
/**
 * Convets S2 cell ID to the Hilbert quad key
 * @param cellId {Long} Cell id that is a 64-bit encoding of a face and a Hilbert curve parameter on that face
 * @returns {string} the Hilbert quad key (containing /) as a string in the format 'face/pos', where
 *  - face is a 10-base representation of the face number
 *  - pos is a 4-base representation of the position along the Hilbert curve. For example,
 *    pos == '13' means the following:
 *       The face is divided two times. After the first time the child cell with position 1 will be selected.
 *       Then, this cell will be divided the second time, and the child cell with position 3 will be selected.
 */
export declare function getS2QuadkeyFromCellId(cellId: Long): string;
/**
 * Convets S2 the Hilbert quad key to cell ID.
 * @param quadkey {string} The Hilbert quad key (containing /) as a string in the format 'face/pos'
 * @returns {Long} Cell id that is a 64-bit encoding of a face and a Hilbert curve parameter on that face
 */
export declare function getS2CellIdFromQuadkey(hilbertQuadkey: string): Long;
export declare function IJToST(ij: [number, number], level: number, offsets: [number, number]): [number, number];
export declare function STToUV(st: [number, number]): [number, number];
export declare function FaceUVToXYZ(face: number, [u, v]: [number, number]): [number, number, number];
export declare function XYZToLngLat([x, y, z]: [number, number, number]): [number, number];
/**
 * Retrieve S2 geometry center
 * @param s2cell {S2Cell} S2 cell
 * @returns {[number, number]} Longitude and Latitude coordinates of the S2 cell's center
 */
export declare function getS2LngLatFromS2Cell(s2Cell: S2Cell): [number, number];
/**
 * Return longitude and latitude of four corners of the cell.
 * @param s2Cell {S2Cell} S2 cell
 * @returns {Array<[number, number]>} Array of longitude and latitude pairs (in degrees) for four corners of the cell.
 */
export declare function getCornerLngLats(s2Cell: S2Cell): Array<[number, number]>;
//# sourceMappingURL=s2-geometry.d.ts.map