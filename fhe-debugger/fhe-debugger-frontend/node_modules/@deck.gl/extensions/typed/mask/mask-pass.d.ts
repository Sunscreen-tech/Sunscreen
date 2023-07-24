import { Framebuffer, Texture2D } from '@luma.gl/core';
import { _LayersPass as LayersPass, LayersPassRenderOptions } from '@deck.gl/core/typed';
declare type MaskPassRenderOptions = LayersPassRenderOptions & {
    /** The channel to render into, 0:red, 1:green, 2:blue, 3:alpha */
    channel: number;
};
export default class MaskPass extends LayersPass {
    maskMap: Texture2D;
    fbo: Framebuffer;
    constructor(gl: any, props: {
        id: string;
        mapSize?: number;
    });
    render(options: MaskPassRenderOptions): any;
    shouldDrawLayer(layer: any): any;
    delete(): void;
}
export {};
//# sourceMappingURL=mask-pass.d.ts.map