import type { Layer, Viewport } from '@deck.gl/core/typed';
/** Bounds in CARTESIAN coordinates */
export declare type Bounds = [minX: number, minY: number, maxX: number, maxY: number];
export declare function joinLayerBounds(
/** The layers to combine */
layers: Layer[], 
/** A Viewport instance that is used to determine the type of the view */
viewport: Viewport): Bounds | null;
/** Construct a viewport that just covers the target bounds. Used for rendering to common space indexed texture. */
export declare function makeViewport(opts: {
    /** The cartesian bounds of layers that will render into this texture */
    bounds: Bounds;
    /** Target width. If not specified, will be deduced from zoom */
    width?: number;
    /** Target height. If not specified, will be deduced from zoom */
    height?: number;
    /** Target zoom. If not specified, will be deduced from width and height */
    zoom?: number;
    /** Border around the viewport in pixels */
    border?: number;
    /** A viewport used to determine the output type */
    viewport: Viewport;
}): Viewport | null;
/** Returns viewport bounds in CARTESIAN coordinates */
export declare function getViewportBounds(viewport: Viewport, zRange?: [number, number]): Bounds;
export declare function getRenderBounds(layerBounds: Bounds, viewport: Viewport, zRange?: [number, number]): Bounds;
//# sourceMappingURL=projection-utils.d.ts.map