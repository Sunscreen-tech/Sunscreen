"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * FileSystem adapter for a browser FileList.
 * Holds a list of browser 'File' objects.
 */
class BrowserFileSystem {
    /**
     * A FileSystem API wrapper around a list of browser 'File' objects
     * @param files
     * @param options
     */
    constructor(files, options) {
        this.files = {};
        this.lowerCaseFiles = {};
        this.usedFiles = {};
        this._fetch = options?.fetch || fetch;
        for (let i = 0; i < files.length; ++i) {
            const file = files[i];
            this.files[file.name] = file;
            this.lowerCaseFiles[file.name.toLowerCase()] = file;
            this.usedFiles[file.name] = false;
        }
        this.fetch = this.fetch.bind(this);
    }
    // implements IFileSystem
    /**
     * Implementation of fetch against this file system
     * Delegates to global fetch for http{s}:// or data://
     */
    async fetch(path, options) {
        // Fallback to handle https:/http:/data: etc fetches
        if (path.includes('://')) {
            return this._fetch(path, options);
        }
        // Local fetches are served from the list of files
        const file = this.files[path];
        if (!file) {
            return new Response(path, { status: 400, statusText: 'NOT FOUND' });
        }
        const headers = new Headers(options?.headers);
        const range = headers.get('Range');
        const bytes = range && /bytes=($1)-($2)/.exec(range);
        if (bytes) {
            const start = parseInt(bytes[1]);
            const end = parseInt(bytes[2]);
            // The trick when reading File objects is to read successive "slices" of the File
            // Per spec https://w3c.github.io/FileAPI/, slicing a File should only update the start and end fields
            // Actually reading from file should happen in `readAsArrayBuffer` (and as far we can tell it does)
            const data = await file.slice(start, end).arrayBuffer();
            const response = new Response(data);
            Object.defineProperty(response, 'url', { value: path });
            return response;
        }
        // return makeResponse()
        const response = new Response(file);
        Object.defineProperty(response, 'url', { value: path });
        return response;
    }
    /**
     * List filenames in this filesystem
     * @param dirname
     * @returns
     */
    async readdir(dirname) {
        const files = [];
        for (const path in this.files) {
            files.push(path);
        }
        // TODO filter by dirname
        return files;
    }
    /**
     * Return information (size) about files in this file system
     */
    async stat(path, options) {
        const file = this.files[path];
        if (!file) {
            throw new Error(path);
        }
        return { size: file.size };
    }
    /**
     * Just removes the file from the list
     */
    async unlink(path) {
        delete this.files[path];
        delete this.lowerCaseFiles[path];
        this.usedFiles[path] = true;
    }
    // implements IRandomAccessFileSystem
    // RANDOM ACCESS
    async open(pathname, flags, mode) {
        return this.files[pathname];
    }
    /**
     * Read a range into a buffer
     * @todo - handle position memory
     * @param buffer is the buffer that the data (read from the fd) will be written to.
     * @param offset is the offset in the buffer to start writing at.
     * @param length is an integer specifying the number of bytes to read.
     * @param position is an argument specifying where to begin reading from in the file. If position is null, data will be read from the current file position, and the file position will be updated. If position is an integer, the file position will remain unchanged.
     */
    async read(fd, buffer, offset = 0, length = buffer.byteLength, position = null) {
        const file = fd;
        const startPosition = 0; // position
        const arrayBuffer = await file.slice(startPosition, startPosition + length).arrayBuffer();
        // copy into target buffer
        return { bytesRead: length, buffer: arrayBuffer };
    }
    async close(fd) {
        // NO OP
    }
    // fstat(fd: number): Promise<object>; // Stat
    // PRIVATE
    // Supports case independent paths, and file usage tracking
    _getFile(path, used) {
        // Prefer case match, but fall back to case indepent.
        const file = this.files[path] || this.lowerCaseFiles[path];
        if (file && used) {
            this.usedFiles[path] = true;
        }
        return file;
    }
}
exports.default = BrowserFileSystem;
