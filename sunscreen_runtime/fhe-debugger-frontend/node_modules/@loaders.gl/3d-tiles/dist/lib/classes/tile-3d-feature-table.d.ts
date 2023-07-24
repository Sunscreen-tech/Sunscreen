export default class Tile3DFeatureTable {
    json: any;
    buffer: any;
    featuresLength: number;
    _cachedTypedArrays: {};
    constructor(featureTableJson: any, featureTableBinary: any);
    getExtension(extensionName: any): any;
    hasProperty(propertyName: any): boolean;
    getGlobalProperty(propertyName: any, componentType?: number, componentLength?: number): any;
    getPropertyArray(propertyName: any, componentType: any, componentLength: any): any;
    getProperty(propertyName: any, componentType: any, componentLength: any, featureId: any, result: any): any;
    _getTypedArrayFromBinary(propertyName: any, componentType: any, componentLength: any, count: any, byteOffset: any): any;
    _getTypedArrayFromArray(propertyName: any, componentType: any, array: any): any;
}
//# sourceMappingURL=tile-3d-feature-table.d.ts.map