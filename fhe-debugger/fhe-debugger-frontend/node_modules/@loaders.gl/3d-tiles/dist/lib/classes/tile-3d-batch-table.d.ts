export default class Tile3DBatchTableParser {
    json: any;
    binary: any;
    featureCount: any;
    _extensions: any;
    _properties: any;
    _binaryProperties: any;
    _hierarchy: any;
    constructor(json: any, binary: any, featureCount: any, options?: {});
    getExtension(extensionName: any): any;
    memorySizeInBytes(): number;
    isClass(batchId: any, className: string): boolean;
    isExactClass(batchId: any, className: any): boolean;
    getExactClassName(batchId: any): any;
    hasProperty(batchId: any, name: any): boolean;
    getPropertyNames(batchId: any, results: any): any;
    getProperty(batchId: any, name: any): any;
    setProperty(batchId: any, name: any, value: any): void;
    _checkBatchId(batchId: any): void;
    _getBinaryProperty(binaryProperty: any, index: any): any;
    _setBinaryProperty(binaryProperty: any, index: any, value: any): void;
    _initializeBinaryProperties(): Record<string, any> | null;
    _initializeBinaryProperty(name: any, property: any): {
        typedArray: import("@math.gl/types").TypedArray;
        componentCount: any;
        unpack: any;
        pack: any;
    } | null;
    _hasPropertyInHierarchy(batchId: any, name: any): boolean;
    _getPropertyNamesInHierarchy(batchId: any, results: any): void;
    _getHierarchyProperty(batchId: any, name: any): any;
    _setHierarchyProperty(batchTable: any, batchId: any, name: any, value: any): boolean;
}
//# sourceMappingURL=tile-3d-batch-table.d.ts.map