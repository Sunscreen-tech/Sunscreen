/**
 * Returns an array of Transferrable objects that can be used with postMessage
 * https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
 * @param object data to be sent via postMessage
 * @param recursive - not for application use
 * @param transfers - not for application use
 * @returns a transfer list that can be passed to postMessage
 */
export declare function getTransferList(object: any, recursive?: boolean, transfers?: Set<any>): Transferable[];
/**
 * Recursively drop non serializable values like functions and regexps.
 * @param object
 */
export declare function getTransferListForWriter(object: object | null): object;
//# sourceMappingURL=get-transfer-list.d.ts.map