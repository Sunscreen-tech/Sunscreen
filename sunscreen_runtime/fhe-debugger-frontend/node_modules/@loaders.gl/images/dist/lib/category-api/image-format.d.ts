/** Run-time browser detection of file formats requires async tests for most precise results */
export declare function getSupportedImageFormats(): Promise<Set<string>>;
/**
 * Check if image MIME type is supported. Result is cached to avoid repeated tests.
 */
export declare function isImageFormatSupported(mimeType: string): boolean;
//# sourceMappingURL=image-format.d.ts.map