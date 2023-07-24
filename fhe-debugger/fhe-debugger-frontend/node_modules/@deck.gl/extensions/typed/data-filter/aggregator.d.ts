import { Model, Framebuffer } from '@luma.gl/core';
export declare function supportsFloatTarget(gl: WebGLRenderingContext): boolean;
export declare function getFramebuffer(gl: WebGLRenderingContext, useFloatTarget: boolean): Framebuffer;
export declare function getModel(gl: WebGLRenderingContext, shaderOptions: any, useFloatTarget: boolean): Model;
export declare const parameters: {
    blend: boolean;
    blendFunc: number[];
    blendEquation: number[];
    depthTest: boolean;
};
//# sourceMappingURL=aggregator.d.ts.map