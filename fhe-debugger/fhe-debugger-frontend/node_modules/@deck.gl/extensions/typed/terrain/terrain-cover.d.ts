import { Framebuffer } from '@luma.gl/core';
import type { Layer, Viewport } from '@deck.gl/core/typed';
import { Bounds } from '../utils/projection-utils';
/**
 * Manages the lifecycle of the terrain cover (draped textures over a terrain mesh).
 * One terrain cover is created for each unique terrain layer (primitive layer with operation:terrain).
 * It is updated when the terrain source layer's mesh changes or when any of the terrainDrawMode:drape
 * layers requires redraw.
 * During the draw call of a terrain layer, the drape texture is overlaid on top of the layer's own color.
 */
export declare class TerrainCover {
    isDirty: boolean;
    /** The terrain layer that this instance belongs to */
    targetLayer: Layer;
    /** Viewport used to draw into the texture */
    renderViewport: Viewport | null;
    /** Bounds of the terrain cover texture, in cartesian space */
    bounds: Bounds | null;
    private fbo?;
    private pickingFbo?;
    private layers;
    private tile;
    /** Cached version of targetLayer.getBounds() */
    private targetBounds;
    /** targetBounds in cartesian space */
    private targetBoundsCommon;
    constructor(targetLayer: Layer);
    get id(): string;
    /** returns true if the target layer is still in use (i.e. not finalized) */
    get isActive(): boolean;
    shouldUpdate({ targetLayer, viewport, layers, layerNeedsRedraw }: {
        targetLayer?: Layer;
        viewport?: Viewport;
        layers?: Layer[];
        layerNeedsRedraw?: Record<string, boolean>;
    }): boolean;
    /** Compare layers with the last version. Only rerender if necessary. */
    private _updateLayers;
    /** Compare viewport and terrain bounds with the last version. Only rerender if necesary. */
    private _updateViewport;
    getRenderFramebuffer(): Framebuffer | null;
    getPickingFramebuffer(): Framebuffer | null;
    filterLayers(layers: Layer[]): Layer<{}>[];
    delete(): void;
}
//# sourceMappingURL=terrain-cover.d.ts.map