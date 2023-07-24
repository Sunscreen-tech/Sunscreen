import type { S2Cell } from './s2-geometry';
/**
 * Return the S2Cell from the cell's hex token or the Hilbert quad key
 * @param tokenOrKey {string} A string that is the cell's hex token or the Hilbert quad key (containing /)
 * @returns {@link S2Cell}
 */
export declare function getS2Cell(tokenOrKey: string): S2Cell;
/**
 * Get the underlying Hilbert quad key
 * @param tokenOrKey {string} A string that is the cell's hex token or the Hilbert quad key (containing /)
 * @returns Hilbert quad key
 */
export declare function getS2QuadKey(tokenOrKey: string): string;
//# sourceMappingURL=s2-cell-utils.d.ts.map