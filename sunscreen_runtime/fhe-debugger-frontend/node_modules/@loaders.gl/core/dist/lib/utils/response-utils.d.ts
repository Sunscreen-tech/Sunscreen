/**
 * Returns a Response object
 * Adds content-length header when possible
 *
 * @param resource
 */
export declare function makeResponse(resource: any): Promise<Response>;
/**
 * Checks response status (async) and throws a helpful error message if status is not OK.
 * @param response
 */
export declare function checkResponse(response: Response): Promise<void>;
/**
 * Checks response status (sync) and throws a helpful error message if status is not OK.
 * @param response
 */
export declare function checkResponseSync(response: Response): void;
//# sourceMappingURL=response-utils.d.ts.map