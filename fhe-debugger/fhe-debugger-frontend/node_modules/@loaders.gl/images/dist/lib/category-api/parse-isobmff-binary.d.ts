/**
 * Box is a container format that can contain a variety of media related files,
 * so we want to return information about which type of file is actually contained inside
 */
export type BoxFileType = {
    extension: string;
    mimeType: string;
};
/**
 * Tests if a buffer is in ISO base media file format (ISOBMFF) @see https://en.wikipedia.org/wiki/ISO_base_media_file_format
 * (ISOBMFF is a media container standard based on the Apple QuickTime container format)
 */
export declare function getISOBMFFMediaType(buffer: Uint8Array): BoxFileType | null;
/**
 * brands explained @see https://github.com/strukturag/libheif/issues/83
 * code adapted from @see https://github.com/sindresorhus/file-type/blob/main/core.js#L489-L492
 */
export declare function decodeMajorBrand(buffer: Uint8Array): BoxFileType | null;
//# sourceMappingURL=parse-isobmff-binary.d.ts.map