import { Framebuffer, Texture2D } from '@luma.gl/core';
import type { Effect, Layer, PreRenderOptions } from '@deck.gl/core/typed';
export default class CollisionFilterEffect implements Effect {
    id: string;
    props: null;
    useInPicking: boolean;
    order: number;
    private channels;
    private collisionFilterPass?;
    private collisionFBOs;
    private dummyCollisionMap?;
    private lastViewport?;
    preRender(gl: WebGLRenderingContext, { effects: allEffects, layers, layerFilter, viewports, onViewportActive, views, isPicking, preRenderStats }: PreRenderOptions): void;
    private _render;
    /**
     * Group layers by collisionGroup
     * Returns a map from collisionGroup to render info
     */
    private _groupByCollisionGroup;
    getModuleParameters(layer: Layer): {
        collisionFBO: Framebuffer;
        dummyCollisionMap: Texture2D;
    };
    cleanup(): void;
    createFBO(gl: WebGLRenderingContext, collisionGroup: string): void;
    destroyFBO(collisionGroup: string): void;
}
//# sourceMappingURL=collision-filter-effect.d.ts.map