import Long from 'long';
/**
 * Convert the S2 token to the S2 cell ID
 * @param token {string} A string that is the cell's hex token. Zero cell ID is represented as 'X'.
 * @returns {Long} Cell id that is a 64-bit encoding of a face and a Hilbert curve parameter on that face.
 * See {@link https://github.com/google/s2-geometry-library-java/blob/c04b68bf3197a9c34082327eeb3aec7ab7c85da1/src/com/google/common/geometry/S2CellId.java#L439} for more information
 */
export declare function getS2CellIdFromToken(token: string): Long;
/**
 * Convert the S2 cell ID to the S2 token
 * @param cellId {Long} A 64-bit encoding of a face and a Hilbert curve parameter on that face.
 * @returns {string} A string that is the cell's hex token. Zero cell ID is represented as 'X'.
 */
export declare function getS2TokenFromCellId(cellId: Long): string;
/**
 * Get one of four S2 cell's children.
 * @param cellId {Long} A 64-bit encoding of a face and a Hilbert curve parameter on that face.
 * The cell must NOT be a leaf one. So, the cell's level is in the range [0-29].
 * @param index {number} Child index defines one of four S2 cell's children. Must be in the range [0-3].
 * @returns The ID of the cell's child.
 */
export declare function getS2ChildCellId(cellId: Long, index: number): Long;
//# sourceMappingURL=s2-token-functions.d.ts.map