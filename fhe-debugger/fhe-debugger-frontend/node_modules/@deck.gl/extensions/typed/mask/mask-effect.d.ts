import { Effect, PreRenderOptions, CoordinateSystem } from '@deck.gl/core/typed';
import { Texture2D } from '@luma.gl/core';
import { Bounds } from '../utils/projection-utils';
declare type Mask = {
    /** The channel index */
    index: number;
    bounds: Bounds;
    coordinateOrigin: [number, number, number];
    coordinateSystem: CoordinateSystem;
};
export declare type MaskPreRenderStats = {
    didRender: boolean;
};
export default class MaskEffect implements Effect {
    id: string;
    props: null;
    useInPicking: boolean;
    order: number;
    private dummyMaskMap?;
    private channels;
    private masks;
    private maskPass?;
    private maskMap?;
    private lastViewport?;
    preRender(gl: WebGLRenderingContext, { layers, layerFilter, viewports, onViewportActive, views, isPicking }: PreRenderOptions): MaskPreRenderStats;
    private _renderChannel;
    /**
     * Find a channel to render each mask into
     * If a maskId already exists, diff and update the existing channel
     * Otherwise replace a removed mask
     * Otherwise create a new channel
     * Returns a map from mask layer id to channel info
     */
    private _sortMaskChannels;
    getModuleParameters(): {
        maskMap: Texture2D;
        maskChannels: Record<string, Mask> | null;
    };
    cleanup(): void;
}
export {};
//# sourceMappingURL=mask-effect.d.ts.map