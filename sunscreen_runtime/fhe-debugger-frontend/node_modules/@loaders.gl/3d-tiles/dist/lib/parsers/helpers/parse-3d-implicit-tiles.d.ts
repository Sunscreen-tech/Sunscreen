import type { Subtree } from '../../../types';
import type { S2VolumeInfo } from '../../utils/obb/s2-corners-to-obb';
/**
 *  S2VolumeBox is an extention of BoundingVolume of type "box"
 */
export type S2VolumeBox = {
    /** BoundingVolume of type "box" has the "box" field. S2VolumeBox contains it as well. */
    box: number[];
    /** s2VolumeInfo provides additional info about the box - specifically the token, min and max height */
    s2VolumeInfo: S2VolumeInfo;
};
/**
 * Recursively parse implicit tiles tree
 * Spec - https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_implicit_tiling
 * TODO Check out do we able to use Tile3D class as return type here.
 * @param subtree
 * @param lodMetricValue
 * @param options
 * @param parentData
 * @param childIndex
 * @param level
 * @param globalData
 */
export declare function parseImplicitTiles(params: {
    subtree: Subtree;
    options: any;
    parentData?: {
        mortonIndex: number;
        x: number;
        y: number;
        z: number;
    };
    childIndex?: number;
    level?: number;
    globalData?: {
        level: number;
        mortonIndex: number;
        x: number;
        y: number;
        z: number;
    };
    s2VolumeBox?: S2VolumeBox;
}): Promise<{
    children: never[];
    lodMetricValue: number;
    contentUrl: string;
}>;
/**
 * Replace implicit tile content url with real coordinates.
 * @param templateUrl
 * @param level
 * @param x
 * @param y
 * @param z
 */
export declare function replaceContentUrlTemplate(templateUrl: string, level: number, x: number, y: number, z: number): string;
//# sourceMappingURL=parse-3d-implicit-tiles.d.ts.map