import { Vector3 } from '@math.gl/core';
import { BoundingSphere, OrientedBoundingBox } from '@math.gl/culling';
import { BoundingRectangle } from '../../types';
/**
 * Calculate appropriate zoom value for a particular boundingVolume
 * @param boundingVolume - the instance of bounding volume
 * @param cartorgraphicCenter - cartographic center of the bounding volume
 * @returns {number} - zoom value
 */
export declare function getZoomFromBoundingVolume(boundingVolume: BoundingSphere | OrientedBoundingBox | BoundingRectangle, cartorgraphicCenter: Vector3): number;
/**
 * Calculate initial zoom for the tileset from 3D `fullExtent` defined in
 * the tileset metadata
 * @param fullExtent - 3D extent of the tileset
 * @param fullExtent.xmin - minimal longitude in decimal degrees
 * @param fullExtent.xmax - maximal longitude in decimal degrees
 * @param fullExtent.ymin - minimal latitude in decimal degrees
 * @param fullExtent.ymax - maximal latitude in decimal degrees
 * @param fullExtent.zmin - minimal elevation in meters
 * @param fullExtent.zmax - maximal elevation in meters
 * @param cartorgraphicCenter - tileset center in cartographic coordinate system
 * @param cartesianCenter - tileset center in cartesian coordinate system
 * @returns - initial zoom for the tileset
 */
export declare function getZoomFromFullExtent(fullExtent: {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    zmin: number;
    zmax: number;
}, cartorgraphicCenter: Vector3, cartesianCenter: Vector3): number;
/**
 * Calculate initial zoom for the tileset from 2D `extent` defined in
 * the tileset metadata
 * @param extent - 2D extent of the tileset. It is array of 4 elements [xmin, ymin, xmax, ymax]
 * @param extent[0] - minimal longitude in decimal degrees
 * @param extent[1] - minimal latitude in decimal degrees
 * @param extent[2] - maximal longitude in decimal degrees
 * @param extent[3] - maximal latitude in decimal degrees
 * @param cartorgraphicCenter - tileset center in cartographic coordinate system
 * @param cartesianCenter - tileset center in cartesian coordinate system
 * @returns - initial zoom for the tileset
 */
export declare function getZoomFromExtent(extent: [number, number, number, number], cartorgraphicCenter: Vector3, cartesianCenter: Vector3): number;
//# sourceMappingURL=zoom.d.ts.map