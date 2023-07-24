import { isBrowser } from '../env-utils/globals';
import * as fs from '../node/fs';
export function makeWritableFile(pathOrStream, options) {
  if (isBrowser) {
    return {
      write: async () => {},
      close: async () => {}
    };
  }
  const outputStream = typeof pathOrStream === 'string' ? fs.createWriteStream(pathOrStream, options) : pathOrStream;
  return {
    write: async buffer => new Promise((resolve, reject) => {
      outputStream.write(buffer, err => err ? reject(err) : resolve());
    }),
    close: () => new Promise((resolve, reject) => {
      outputStream.close(err => err ? reject(err) : resolve());
    })
  };
}
//# sourceMappingURL=writable-file.js.map