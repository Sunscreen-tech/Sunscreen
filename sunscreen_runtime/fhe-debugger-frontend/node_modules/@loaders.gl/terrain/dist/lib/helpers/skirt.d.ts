export type EdgeIndices = {
    westIndices: number[];
    northIndices: number[];
    eastIndices: number[];
    southIndices: number[];
};
/**
 * Add skirt to existing mesh
 * @param {object} attributes - POSITION and TEXCOOD_0 attributes data
 * @param {any} triangles - indices array of the mesh geometry
 * @param skirtHeight - height of the skirt geometry
 * @param outsideIndices - edge indices from quantized mesh data
 * @returns - geometry data with added skirt
 */
export declare function addSkirt(attributes: any, triangles: any, skirtHeight: number, outsideIndices?: EdgeIndices): {
    attributes: any;
    triangles: any;
};
//# sourceMappingURL=skirt.d.ts.map