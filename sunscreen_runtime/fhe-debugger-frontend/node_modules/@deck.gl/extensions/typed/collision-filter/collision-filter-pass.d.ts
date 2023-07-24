import { Framebuffer } from '@luma.gl/core';
import { _LayersPass as LayersPass, LayersPassRenderOptions } from '@deck.gl/core/typed';
declare type CollisionFilterPassRenderOptions = LayersPassRenderOptions & {};
export default class CollisionFilterPass extends LayersPass {
    renderCollisionMap(target: Framebuffer, options: CollisionFilterPassRenderOptions): any;
    getModuleParameters(): {
        drawToCollisionMap: boolean;
        pickingActive: number;
        pickingAttribute: boolean;
        lightSources: {};
    };
}
export {};
//# sourceMappingURL=collision-filter-pass.d.ts.map