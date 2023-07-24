/**
 * Remove extra data like `charset` from MIME types
 * @param mimeString
 * @returns A clean MIME type, or an empty string
 *
 * @todo - handle more advanced MIMETYpes, multiple types
 * @todo - extract charset etc
 */
export declare function parseMIMEType(mimeString: string): string;
/**
 * Extract MIME type from data URL
 *
 * @param mimeString
 * @returns A clean MIME type, or an empty string
 *
 * @todo - handle more advanced MIMETYpes, multiple types
 * @todo - extract charset etc
 */
export declare function parseMIMETypeFromURL(url: string): string;
//# sourceMappingURL=mime-type-utils.d.ts.map