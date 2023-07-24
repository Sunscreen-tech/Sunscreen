import { BoundingSphere, OrientedBoundingBox } from '@math.gl/culling';
/**
 * Create a bounding volume from the tile's bounding volume header.
 * @param {Object} boundingVolumeHeader The tile's bounding volume header.
 * @param {Matrix4} transform The transform to apply to the bounding volume.
 * @param [result] The object onto which to store the result.
 * @returns The modified result parameter or a new TileBoundingVolume instance if none was provided.
 */
export declare function createBoundingVolume(boundingVolumeHeader: any, transform: any, result: any): any;
/** [min, max] each in [longitude, latitude, altitude] */
export type CartographicBounds = [min: number[], max: number[]];
/**
 * Calculate the cartographic bounding box the tile's bounding volume.
 * @param {Object} boundingVolumeHeader The tile's bounding volume header.
 * @param {BoundingVolume} boundingVolume The bounding volume.
 * @returns {CartographicBounds}
 */
export declare function getCartographicBounds(boundingVolumeHeader: any, boundingVolume: OrientedBoundingBox | BoundingSphere): CartographicBounds;
//# sourceMappingURL=bounding-volume.d.ts.map