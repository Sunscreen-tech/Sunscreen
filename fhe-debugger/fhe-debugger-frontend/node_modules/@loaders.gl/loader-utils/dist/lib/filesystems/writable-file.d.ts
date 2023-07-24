/// <reference types="node" />
/// <reference types="node" />
import type { Writable } from 'stream';
export type WritableFile = {
    write: (buf: Buffer) => Promise<void>;
    close: () => Promise<void>;
};
export interface WriteStreamOptions {
    flags?: string;
    encoding?: 'utf8';
    fd?: number;
    mode?: number;
    autoClose?: boolean;
    start?: number;
}
/** Helper function to create an envelope reader for a binary memory input */
export declare function makeWritableFile(pathOrStream: string | Writable, options?: WriteStreamOptions): WritableFile;
//# sourceMappingURL=writable-file.d.ts.map