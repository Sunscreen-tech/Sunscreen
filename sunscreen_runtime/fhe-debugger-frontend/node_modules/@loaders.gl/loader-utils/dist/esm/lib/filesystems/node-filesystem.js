import * as fs from '../node/fs';
export default class NodeFileSystem {
  constructor(options) {
    this.fetch = options._fetch;
  }
  async readdir() {
    let dirname = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.';
    let options = arguments.length > 1 ? arguments[1] : undefined;
    return await fs.readdir(dirname, options);
  }
  async stat(path, options) {
    const info = await fs.stat(path, options);
    return {
      size: Number(info.size),
      isDirectory: () => false,
      info
    };
  }
  async fetch(path, options) {
    const fallbackFetch = options.fetch || this.fetch;
    return fallbackFetch(path, options);
  }
  async open(path, flags, mode) {
    return await fs.open(path, flags);
  }
  async close(fd) {
    return await fs.close(fd);
  }
  async fstat(fd) {
    const info = await fs.fstat(fd);
    return info;
  }
  async read(fd, _ref) {
    let {
      buffer = null,
      offset = 0,
      length = buffer.byteLength,
      position = null
    } = _ref;
    let totalBytesRead = 0;
    while (totalBytesRead < length) {
      const {
        bytesRead
      } = await fs.read(fd, buffer, offset + totalBytesRead, length - totalBytesRead, position + totalBytesRead);
      totalBytesRead += bytesRead;
    }
    return {
      bytesRead: totalBytesRead,
      buffer
    };
  }
}
//# sourceMappingURL=node-filesystem.js.map