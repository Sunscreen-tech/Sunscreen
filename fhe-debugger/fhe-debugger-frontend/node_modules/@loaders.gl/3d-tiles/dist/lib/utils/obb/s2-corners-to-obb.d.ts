export type S2VolumeInfo = {
    /** S2 key or token */
    token: string;
    /** minimum height in meters */
    minimumHeight: number;
    /** maximum height in meters */
    maximumHeight: number;
};
/**
 * Converts S2VolumeInfo to OrientedBoundingBox
 * @param {S2VolumeInfo} s2VolumeInfo - s2 volume to convert
 * @returns Oriented Bounding Box of type Box
 */
export declare function convertS2BoundingVolumetoOBB(s2VolumeInfo: S2VolumeInfo): number[];
//# sourceMappingURL=s2-corners-to-obb.d.ts.map