/// <reference types="node" />
export type ReadableFile = {
    read: (position: number, length: number) => Promise<Buffer>;
    close: () => Promise<void>;
    /** Length of file in bytes */
    size: number;
};
/** Helper function to create an envelope reader for a binary memory input */
export declare function makeReadableFile(data: Blob | ArrayBuffer): ReadableFile;
//# sourceMappingURL=readable-file.d.ts.map