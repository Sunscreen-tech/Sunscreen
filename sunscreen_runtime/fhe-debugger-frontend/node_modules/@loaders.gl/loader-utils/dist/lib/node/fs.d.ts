import fs from 'fs';
export type { Stats, WriteStream } from 'fs';
export declare let readdir: any;
/** Wrapper for Node.js fs method */
export declare let stat: any;
/** Wrapper for Node.js fs method */
export declare let readFile: any;
/** Wrapper for Node.js fs method */
export declare let readFileSync: any;
/** Wrapper for Node.js fs method */
export declare let writeFile: any;
/** Wrapper for Node.js fs method */
export declare let writeFileSync: any;
/** Wrapper for Node.js fs method */
export declare let open: any;
/** Wrapper for Node.js fs method */
export declare let close: (fd: number) => Promise<void>;
/** Wrapper for Node.js fs method */
export declare let read: any;
/** Wrapper for Node.js fs method */
export declare let fstat: any;
export declare let createWriteStream: typeof fs.createWriteStream;
export declare let isSupported: boolean;
export declare function _readToArrayBuffer(fd: number, start: number, length: number): Promise<any>;
//# sourceMappingURL=fs.d.ts.map