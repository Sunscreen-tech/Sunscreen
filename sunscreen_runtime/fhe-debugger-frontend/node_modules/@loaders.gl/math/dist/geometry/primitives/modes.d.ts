/**
 * Different methods of working with geometries depending on glType
 /**

/**
 * @param mode
 * @returns draw points | lines | triangles
 */
export declare function getPrimitiveModeType(mode?: number): number;
/**
 * @param mode
 * @returns true | false
 */
export declare function isPrimitiveModeExpandable(mode: number): boolean;
/**
 * Returns new length depends on glType
 * @param mode
 * @param length
 * @returns new length
 */
export declare function getPrimitiveModeExpandedLength(mode: number, length: number): number;
//# sourceMappingURL=modes.d.ts.map