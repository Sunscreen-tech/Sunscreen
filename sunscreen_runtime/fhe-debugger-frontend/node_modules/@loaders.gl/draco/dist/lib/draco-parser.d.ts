import type { TypedArray, MeshAttribute, MeshGeometry } from '@loaders.gl/schema';
import type { Draco3D, Decoder, Mesh, PointCloud, PointAttribute, Metadata, MetadataQuerier } from '../draco3d/draco3d-types';
import type { DracoMesh, DracoLoaderData, DracoAttribute, DracoMetadataEntry, DracoQuantizationTransform, DracoOctahedronTransform } from './draco-types';
/**
 * @param topology - How triangle indices should be generated (mesh only)
 * @param attributeNameEntry
 * @param extraAttributes
 * @param quantizedAttributes
 * @param octahedronAttributes
 */
export type DracoParseOptions = {
    topology?: 'triangle-list' | 'triangle-strip';
    attributeNameEntry?: string;
    extraAttributes?: {
        [uniqueId: string]: number;
    };
    quantizedAttributes?: ('POSITION' | 'NORMAL' | 'COLOR' | 'TEX_COORD' | 'GENERIC')[];
    octahedronAttributes?: ('POSITION' | 'NORMAL' | 'COLOR' | 'TEX_COORD' | 'GENERIC')[];
};
export default class DracoParser {
    draco: Draco3D;
    decoder: Decoder;
    metadataQuerier: MetadataQuerier;
    constructor(draco: Draco3D);
    /**
     * Destroy draco resources
     */
    destroy(): void;
    /**
     * NOTE: caller must call `destroyGeometry` on the return value after using it
     * @param arrayBuffer
     * @param options
     */
    parseSync(arrayBuffer: ArrayBuffer, options?: DracoParseOptions): DracoMesh;
    /**
     * Extract
     * @param dracoGeometry
     * @param geometry_type
     * @param options
     * @returns
     */
    _getDracoLoaderData(dracoGeometry: Mesh | PointCloud, geometry_type: any, options: DracoParseOptions): DracoLoaderData;
    /**
     * Extract all draco provided information and metadata for each attribute
     * @param dracoGeometry
     * @param options
     * @returns
     */
    _getDracoAttributes(dracoGeometry: Mesh | PointCloud, options: DracoParseOptions): {
        [unique_id: number]: DracoAttribute;
    };
    /**
     * Get standard loaders.gl mesh category data
     * Extracts the geometry from draco
     * @param dracoGeometry
     * @param options
     */
    _getMeshData(dracoGeometry: Mesh | PointCloud, loaderData: DracoLoaderData, options: DracoParseOptions): MeshGeometry;
    _getMeshAttributes(loaderData: DracoLoaderData, dracoGeometry: Mesh | PointCloud, options: DracoParseOptions): {
        [attributeName: string]: MeshAttribute;
    };
    /**
     * For meshes, we need indices to define the faces.
     * @param dracoGeometry
     */
    _getTriangleListIndices(dracoGeometry: Mesh): Uint32Array;
    /**
     * For meshes, we need indices to define the faces.
     * @param dracoGeometry
     */
    _getTriangleStripIndices(dracoGeometry: Mesh): Int32Array;
    /**
     *
     * @param dracoGeometry
     * @param dracoAttribute
     * @param attributeName
     */
    _getAttributeValues(dracoGeometry: Mesh | PointCloud, attribute: DracoAttribute): {
        value: TypedArray;
        size: number;
    };
    /**
     * DRACO does not store attribute names - We need to deduce an attribute name
     * for each attribute
    _getAttributeNames(
      dracoGeometry: Mesh | PointCloud,
      options: DracoParseOptions
    ): {[unique_id: number]: string} {
      const attributeNames: {[unique_id: number]: string} = {};
      for (let attributeId = 0; attributeId < dracoGeometry.num_attributes(); attributeId++) {
        const dracoAttribute = this.decoder.GetAttribute(dracoGeometry, attributeId);
        const attributeName = this._deduceAttributeName(dracoAttribute, options);
        attributeNames[attributeName] = attributeName;
      }
      return attributeNames;
    }
     */
    /**
     * Deduce an attribute name.
     * @note DRACO does not save attribute names, just general type (POSITION, COLOR)
     * to help optimize compression. We generate GLTF compatible names for the Draco-recognized
     * types
     * @param attributeData
     */
    _deduceAttributeName(attribute: DracoAttribute, options: DracoParseOptions): string;
    /** Get top level metadata */
    _getTopLevelMetadata(dracoGeometry: Mesh | PointCloud): {
        [entry: string]: DracoMetadataEntry;
    };
    /** Get per attribute metadata */
    _getAttributeMetadata(dracoGeometry: Mesh | PointCloud, attributeId: number): {
        [entry: string]: DracoMetadataEntry;
    };
    /**
     * Extract metadata field values
     * @param dracoMetadata
     * @returns
     */
    _getDracoMetadata(dracoMetadata: Metadata): {
        [entry: string]: DracoMetadataEntry;
    };
    /**
     * Extracts possible values for one metadata entry by name
     * @param dracoMetadata
     * @param entryName
     */
    _getDracoMetadataField(dracoMetadata: Metadata, entryName: string): DracoMetadataEntry;
    /** Skip transforms for specific attribute types */
    _disableAttributeTransforms(options: DracoParseOptions): void;
    /**
     * Extract (and apply?) Position Transform
     * @todo not used
     */
    _getQuantizationTransform(dracoAttribute: PointAttribute, options: DracoParseOptions): DracoQuantizationTransform | null;
    _getOctahedronTransform(dracoAttribute: PointAttribute, options: DracoParseOptions): DracoOctahedronTransform | null;
}
//# sourceMappingURL=draco-parser.d.ts.map