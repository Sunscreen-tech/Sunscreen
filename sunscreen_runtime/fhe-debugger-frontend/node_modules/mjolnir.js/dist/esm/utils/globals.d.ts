/// <reference types="node" />
export declare const userAgent: string;
declare const window_: (Window & typeof globalThis) | (NodeJS.Global & typeof globalThis);
declare const global_: (Window & typeof globalThis) | (NodeJS.Global & typeof globalThis);
declare const document_: {};
export { window_ as window, global_ as global, document_ as document };
declare let passiveSupported: boolean;
export { passiveSupported };
