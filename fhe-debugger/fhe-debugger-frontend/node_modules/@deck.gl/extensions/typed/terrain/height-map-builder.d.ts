import { Framebuffer } from '@luma.gl/core';
import { Bounds } from '../utils/projection-utils';
import type { Viewport, Layer } from '@deck.gl/core/typed';
/**
 * Manages the lifecycle of the height map (a framebuffer that encodes elevation).
 * One instance of height map is is shared across all layers. It is updated when the viewport changes
 * or when some terrain source layer's data changes.
 * During the draw call of any terrainDrawMode:offset layers,
 * the vertex shader reads from this framebuffer to retrieve its z offset.
 */
export declare class HeightMapBuilder {
    /** Viewport used to draw into the texture */
    renderViewport: Viewport | null;
    /** Bounds of the height map texture, in cartesian space */
    bounds: Bounds | null;
    protected fbo?: Framebuffer;
    protected gl: WebGLRenderingContext;
    /** Last rendered layers */
    private layers;
    /** Last layer.getBounds() */
    private layersBounds;
    /** The union of layersBounds in cartesian space */
    private layersBoundsCommon;
    private lastViewport;
    static isSupported(gl: WebGLRenderingContext): boolean;
    constructor(gl: WebGLRenderingContext);
    /** Returns the height map framebuffer for read/write access.
     * Returns null when the texture is invalid.
     */
    getRenderFramebuffer(): Framebuffer | null;
    /** Called every render cycle to check if the framebuffer needs update */
    shouldUpdate({ layers, viewport }: {
        layers: Layer[];
        viewport: Viewport;
    }): boolean;
    delete(): void;
}
//# sourceMappingURL=height-map-builder.d.ts.map