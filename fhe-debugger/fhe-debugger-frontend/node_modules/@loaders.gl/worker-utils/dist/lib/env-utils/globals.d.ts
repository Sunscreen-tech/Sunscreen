declare const self_: {
    [key: string]: any;
};
declare const window_: {
    [key: string]: any;
};
declare const global_: {
    [key: string]: any;
};
declare const document_: {
    [key: string]: any;
};
export { self_ as self, window_ as window, global_ as global, document_ as document };
/** true if running in the browser, false if running in Node.js */
export declare const isBrowser: boolean;
/** true if running on a worker thread */
export declare const isWorker: boolean;
/** true if running on a mobile device */
export declare const isMobile: boolean;
/** Version of Node.js if running under Node, otherwise 0 */
export declare const nodeVersion: number;
//# sourceMappingURL=globals.d.ts.map