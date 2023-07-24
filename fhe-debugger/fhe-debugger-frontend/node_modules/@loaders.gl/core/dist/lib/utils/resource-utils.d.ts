/**
 * A loadable resource. Includes:
 * `Response`, `Blob` (`File` is a subclass), string URLs and data URLs
 */
export type Resource = Response | Blob | string;
/**
 * Returns the URL associated with this resource.
 * The returned value may include a query string and need further processing.
 * If it cannot determine url, the corresponding value will be an empty string
 *
 * @todo string parameters are assumed to be URLs
 */
export declare function getResourceUrl(resource: unknown): string;
/**
 * Returns the URL associated with this resource.
 * The returned value may include a query string and need further processing.
 * If it cannot determine url, the corresponding value will be an empty string
 *
 * @todo string parameters are assumed to be URLs
 */
export declare function getResourceMIMEType(resource: unknown): string;
/**
  * Returns (approximate) content length for a resource if it can be determined.
  * Returns -1 if content length cannot be determined.
  * @param resource

  * @note string parameters are NOT assumed to be URLs
  */
export declare function getResourceContentLength(resource: unknown): number;
//# sourceMappingURL=resource-utils.d.ts.map