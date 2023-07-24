import type { FileSystem } from './filesystem';
type BrowserFileSystemOptions = {
    fetch?: typeof fetch;
};
/**
 * FileSystem adapter for a browser FileList.
 * Holds a list of browser 'File' objects.
 */
export default class BrowserFileSystem implements FileSystem {
    private _fetch;
    private files;
    private lowerCaseFiles;
    private usedFiles;
    /**
     * A FileSystem API wrapper around a list of browser 'File' objects
     * @param files
     * @param options
     */
    constructor(files: FileList | File[], options?: BrowserFileSystemOptions);
    /**
     * Implementation of fetch against this file system
     * Delegates to global fetch for http{s}:// or data://
     */
    fetch(path: string, options?: RequestInit): Promise<Response>;
    /**
     * List filenames in this filesystem
     * @param dirname
     * @returns
     */
    readdir(dirname?: string): Promise<string[]>;
    /**
     * Return information (size) about files in this file system
     */
    stat(path: string, options?: object): Promise<{
        size: number;
    }>;
    /**
     * Just removes the file from the list
     */
    unlink(path: string): Promise<void>;
    open(pathname: string, flags: any, mode?: any): Promise<any>;
    /**
     * Read a range into a buffer
     * @todo - handle position memory
     * @param buffer is the buffer that the data (read from the fd) will be written to.
     * @param offset is the offset in the buffer to start writing at.
     * @param length is an integer specifying the number of bytes to read.
     * @param position is an argument specifying where to begin reading from in the file. If position is null, data will be read from the current file position, and the file position will be updated. If position is an integer, the file position will remain unchanged.
     */
    read(fd: any, buffer: ArrayBuffer, offset?: number, length?: number, position?: number | null): Promise<{
        bytesRead: number;
        buffer: ArrayBuffer;
    }>;
    close(fd: number): Promise<void>;
    _getFile(path: any, used: any): File;
}
export {};
//# sourceMappingURL=browser-filesystem.d.ts.map