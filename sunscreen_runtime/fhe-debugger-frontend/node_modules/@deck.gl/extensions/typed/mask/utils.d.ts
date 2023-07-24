import { Layer, Viewport } from '@deck.gl/core/typed';
export declare type MaskBounds = [number, number, number, number];
export declare function getMaskBounds({ layers, viewport }: {
    layers: Layer[];
    viewport: Viewport;
}): MaskBounds;
export declare function getMaskViewport({ bounds, viewport, width, height }: {
    bounds: MaskBounds;
    viewport: Viewport;
    width: number;
    height: number;
}): Viewport | null;
//# sourceMappingURL=utils.d.ts.map