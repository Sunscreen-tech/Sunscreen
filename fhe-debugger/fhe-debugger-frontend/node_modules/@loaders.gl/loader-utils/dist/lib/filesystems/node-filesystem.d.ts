/// <reference types="node" />
/// <reference types="node" />
import * as fs from '../node/fs';
import { IFileSystem, IRandomAccessReadFileSystem } from '../../types';
type Stat = {
    size: number;
    isDirectory: () => boolean;
    info?: fs.Stats;
};
type ReadOptions = {
    buffer?: Buffer;
    offset?: number;
    length?: number;
    position?: number;
};
/**
 * FileSystem pass-through for Node.js
 * Compatible with BrowserFileSystem.
 * @param options
 */
export default class NodeFileSystem implements IFileSystem, IRandomAccessReadFileSystem {
    constructor(options: {
        [key: string]: any;
    });
    readdir(dirname?: string, options?: {}): Promise<any[]>;
    stat(path: string, options?: {}): Promise<Stat>;
    fetch(path: string, options: {
        [key: string]: any;
    }): Promise<any>;
    open(path: string, flags: string | number, mode?: any): Promise<number>;
    close(fd: number): Promise<void>;
    fstat(fd: number): Promise<Stat>;
    read(fd: number, { buffer, offset, length, position }: ReadOptions): Promise<{
        bytesRead: number;
        buffer: Buffer;
    }>;
}
export {};
//# sourceMappingURL=node-filesystem.d.ts.map