/**
 * Options for fitBounds
 * @param width - viewport width
 * @param height - viewport height
 * @param bounds - [[lon, lat], [lon, lat]]
 * @param minExtent - The width/height of the bounded area will never be smaller than this
 * @param padding - The amount of padding in pixels
 *  to add to the given bounds. Can also be an object with top, bottom, left and right
 *  properties defining the padding.
 * @param options.offset= - The center of the given bounds relative to the map's center,
 */
export declare type FitBoundsOptions = {
    width: number;
    height: number;
    bounds: [[number, number], [number, number]];
    minExtent?: number;
    maxZoom?: number;
    padding?: number | Padding;
    offset?: number[];
};
/**
 * An object describing the padding to add to the bounds.
 * @property top - Padding from top in pixels to add to the given bounds
 * @property bottom - Padding from bottom in pixels to add to the given bounds
 * @property left - Padding from left in pixels to add to the given bounds
 * @property right - Padding from right in pixels to add to the given bounds
 */
export declare type Padding = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};
declare type ViewportProps = {
    longitude: number;
    latitude: number;
    zoom: number;
};
/**
 * Returns map settings {latitude, longitude, zoom}
 * that will contain the provided corners within the provided width.
 *
 * > _Note: Only supports non-perspective mode._
 *
 * @param options fit bounds parameters
 * @returns - latitude, longitude and zoom
 */
export default function fitBounds(options: FitBoundsOptions): ViewportProps;
export {};
//# sourceMappingURL=fit-bounds.d.ts.map