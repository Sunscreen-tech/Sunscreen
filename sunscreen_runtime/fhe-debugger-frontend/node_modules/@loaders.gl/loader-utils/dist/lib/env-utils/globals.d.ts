type obj = {
    [key: string]: any;
};
declare const self_: obj;
declare const window_: obj;
declare const global_: obj;
declare const document_: obj;
export { self_ as self, window_ as window, global_ as global, document_ as document };
/** true if running in a browser */
export declare const isBrowser: boolean;
/** true if running in a worker thread */
export declare const isWorker: boolean;
/** Major Node version (as a number) */
export declare const nodeVersion: number;
//# sourceMappingURL=globals.d.ts.map