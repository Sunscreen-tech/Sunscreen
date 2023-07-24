import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
export default class BrowserFileSystem {
  constructor(files, options) {
    _defineProperty(this, "_fetch", void 0);
    _defineProperty(this, "files", {});
    _defineProperty(this, "lowerCaseFiles", {});
    _defineProperty(this, "usedFiles", {});
    this._fetch = (options === null || options === void 0 ? void 0 : options.fetch) || fetch;
    for (let i = 0; i < files.length; ++i) {
      const file = files[i];
      this.files[file.name] = file;
      this.lowerCaseFiles[file.name.toLowerCase()] = file;
      this.usedFiles[file.name] = false;
    }
    this.fetch = this.fetch.bind(this);
  }
  async fetch(path, options) {
    if (path.includes('://')) {
      return this._fetch(path, options);
    }
    const file = this.files[path];
    if (!file) {
      return new Response(path, {
        status: 400,
        statusText: 'NOT FOUND'
      });
    }
    const headers = new Headers(options === null || options === void 0 ? void 0 : options.headers);
    const range = headers.get('Range');
    const bytes = range && /bytes=($1)-($2)/.exec(range);
    if (bytes) {
      const start = parseInt(bytes[1]);
      const end = parseInt(bytes[2]);
      const data = await file.slice(start, end).arrayBuffer();
      const response = new Response(data);
      Object.defineProperty(response, 'url', {
        value: path
      });
      return response;
    }
    const response = new Response(file);
    Object.defineProperty(response, 'url', {
      value: path
    });
    return response;
  }
  async readdir(dirname) {
    const files = [];
    for (const path in this.files) {
      files.push(path);
    }
    return files;
  }
  async stat(path, options) {
    const file = this.files[path];
    if (!file) {
      throw new Error(path);
    }
    return {
      size: file.size
    };
  }
  async unlink(path) {
    delete this.files[path];
    delete this.lowerCaseFiles[path];
    this.usedFiles[path] = true;
  }
  async open(pathname, flags, mode) {
    return this.files[pathname];
  }
  async read(fd, buffer) {
    let offset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    let length = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : buffer.byteLength;
    let position = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
    const file = fd;
    const startPosition = 0;
    const arrayBuffer = await file.slice(startPosition, startPosition + length).arrayBuffer();
    return {
      bytesRead: length,
      buffer: arrayBuffer
    };
  }
  async close(fd) {}
  _getFile(path, used) {
    const file = this.files[path] || this.lowerCaseFiles[path];
    if (file && used) {
      this.usedFiles[path] = true;
    }
    return file;
  }
}
//# sourceMappingURL=browser-filesystem.js.map